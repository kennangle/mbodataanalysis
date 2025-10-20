import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, Database, Play } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";

interface ImportConfig {
  startDate: string;
  endDate: string;
  dataTypes: {
    clients: boolean;
    classes: boolean;
    visits: boolean;
    sales: boolean;
  };
}

interface JobProgress {
  clients?: {
    current: number;
    total: number;
    imported: number;
    updated: number;
    completed: boolean;
  };
  classes?: { current: number; total: number; imported: number; completed: boolean };
  visits?: { current: number; total: number; imported: number; completed: boolean };
  sales?: { current: number; total: number; imported: number; completed: boolean };
  apiCallCount?: number;
  importStartTime?: string;
}

interface JobStatus {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "paused" | "cancelled";
  dataTypes: string[];
  startDate?: string;
  endDate?: string;
  progress: JobProgress;
  existingCounts?: {
    students: number;
    classes: number;
    visits: number;
    sales: number;
  };
  currentDataType: string | null;
  error: string | null;
  pausedAt?: string | null;
  updatedAt?: string;
}

// Map internal data type names to user-friendly display names
const getDisplayName = (dataType: string): string => {
  const displayNames: Record<string, string> = {
    clients: "Students",
    classes: "Classes",
    visits: "Visits",
    sales: "Sales",
  };
  return displayNames[dataType] || dataType;
};

// Parse date string without timezone issues
// Handles formats like "2024-01-01", "2024-01-01T00:00:00", "2024-01-01 00:00:00"
const parseDateSafe = (dateStr: string): Date => {
  // Extract just the date part (YYYY-MM-DD)
  const datePart = dateStr.split("T")[0].split(" ")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day);
};

export function DataImportCard() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoadingActiveJob, setIsLoadingActiveJob] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Track last progress snapshot to detect stalled imports
  const lastProgressRef = useRef<{ snapshot: string; timestamp: number } | null>(null);

  // Helper to create progress snapshot for staleness detection (memoized to prevent effect restarts)
  const getProgressSnapshot = useCallback((progress: JobProgress): string => {
    return JSON.stringify({
      clients: {
        current: progress.clients?.current || 0,
        imported: progress.clients?.imported || 0,
      },
      classes: {
        current: progress.classes?.current || 0,
        imported: progress.classes?.imported || 0,
      },
      visits: { current: progress.visits?.current || 0, imported: progress.visits?.imported || 0 },
      sales: { current: progress.sales?.current || 0, imported: progress.sales?.imported || 0 },
    });
  }, []);

  // Fetch active job on mount to restore progress after page reload
  useEffect(() => {
    const fetchActiveJob = async () => {
      try {
        const response = await apiRequest("GET", "/api/mindbody/import/active");
        if (response.ok) {
          const job = (await response.json()) as JobStatus;

          // Validate job has updatedAt and check if it's stale
          if (job.updatedAt && job.status === "running") {
            const lastUpdate = new Date(job.updatedAt);
            const now = new Date();
            const minutesSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60);

            if (minutesSinceUpdate > 2) {
              // Job is stale - clear it and show message
              setCurrentJobId(null);
              setJobStatus(null);
              toast({
                variant: "destructive",
                title: "Previous import was stalled",
                description:
                  "Found an import that hasn't updated in over 2 minutes. Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) to ensure a clean state, then start a new import.",
                duration: 10000,
              });
              setIsLoadingActiveJob(false);
              return;
            }
          }

          setCurrentJobId(job.id);
          setJobStatus(job);
        }
      } catch (error) {
        // No active job found or error fetching - reset to clean state
        setCurrentJobId(null);
        setJobStatus(null);
      } finally {
        setIsLoadingActiveJob(false);
      }
    };

    fetchActiveJob();
  }, [toast]);

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split("T")[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  // Calculate API rate and estimated time to reach 5000 calls (monthly free tier)
  const calculateApiMetrics = (progress: JobProgress) => {
    const apiCallCount = progress.apiCallCount || 0;
    const importStartTime = progress.importStartTime;

    if (!importStartTime || apiCallCount === 0) {
      return {
        apiCallCount,
        rate: 0,
        estimatedTimeToLimit: null,
        limitReachedAt: null,
      };
    }

    const startTime = new Date(importStartTime);
    const now = new Date();
    const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

    if (elapsedMinutes === 0) {
      return {
        apiCallCount,
        rate: 0,
        estimatedTimeToLimit: null,
        limitReachedAt: null,
      };
    }

    const rate = apiCallCount / elapsedMinutes; // calls per minute
    const remainingCalls = 5000 - apiCallCount;

    if (remainingCalls <= 0) {
      return {
        apiCallCount,
        rate,
        estimatedTimeToLimit: 0,
        limitReachedAt: now,
        limitExceeded: true,
      };
    }

    const minutesToLimit = remainingCalls / rate;
    const limitReachedAt = new Date(now.getTime() + minutesToLimit * 60 * 1000);

    return {
      apiCallCount,
      rate,
      estimatedTimeToLimit: minutesToLimit,
      limitReachedAt,
      limitExceeded: false,
    };
  };

  const [importConfig, setImportConfig] = useState<ImportConfig>({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    dataTypes: {
      clients: false,
      classes: false,
      visits: false,
      sales: false,
    },
  });

  // Poll for job status
  useEffect(() => {
    if (!currentJobId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/mindbody/import/${currentJobId}/status`);

        // Check for 404 directly from response
        if (response.status === 404) {
          clearInterval(pollInterval);
          setCurrentJobId(null);
          setJobStatus(null);
          toast({
            variant: "destructive",
            title: "Import job not found",
            description:
              "The import job no longer exists. Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) and start a new import.",
            duration: 10000,
          });
          return;
        }

        const status = (await response.json()) as JobStatus;

        // Check for stalled import - progress hasn't changed in 2+ minutes
        if (status.status === "running") {
          const currentSnapshot = getProgressSnapshot(status.progress);
          const now = Date.now();

          if (lastProgressRef.current) {
            const { snapshot: lastSnapshot, timestamp: lastTimestamp } = lastProgressRef.current;

            // If progress hasn't changed
            if (currentSnapshot === lastSnapshot) {
              const minutesSinceChange = (now - lastTimestamp) / (1000 * 60);

              if (minutesSinceChange > 2) {
                // Import is stalled - no progress in 2+ minutes
                clearInterval(pollInterval);
                setCurrentJobId(null);
                setJobStatus(null);
                lastProgressRef.current = null;
                toast({
                  variant: "destructive",
                  title: "Import appears stalled",
                  description:
                    "The import hasn't made progress in over 2 minutes. Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) and start a new import.",
                  duration: 10000,
                });
                return;
              }
            } else {
              // Progress changed - update snapshot
              lastProgressRef.current = { snapshot: currentSnapshot, timestamp: now };
            }
          } else {
            // First snapshot
            lastProgressRef.current = { snapshot: currentSnapshot, timestamp: now };
          }
        }

        setJobStatus(status);

        if (status.status === "completed") {
          clearInterval(pollInterval);
          lastProgressRef.current = null;
          queryClient.invalidateQueries();
          toast({
            title: "Import completed",
            description: "All data has been imported successfully",
          });
        } else if (status.status === "failed") {
          clearInterval(pollInterval);
          lastProgressRef.current = null;
          toast({
            variant: "destructive",
            title: "Import failed",
            description: status.error || "Unknown error occurred",
          });
        } else if (status.status === "paused") {
          clearInterval(pollInterval);
          lastProgressRef.current = null;
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
        clearInterval(pollInterval);
        setCurrentJobId(null);
        setJobStatus(null);
        lastProgressRef.current = null;
        toast({
          variant: "destructive",
          title: "Error checking import status",
          description:
            "Please refresh your browser (Ctrl+Shift+R or Cmd+Shift+R) and start a new import.",
          duration: 10000,
        });
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      clearInterval(pollInterval);
      lastProgressRef.current = null;
    };
  }, [currentJobId, queryClient, toast, getProgressSnapshot]);

  const startImportMutation = useMutation({
    mutationFn: async (config: ImportConfig) => {
      const response = await apiRequest("POST", "/api/mindbody/import/start", { config });
      const result = (await response.json()) as {
        success: boolean;
        jobId: string;
        message: string;
      };
      return result;
    },
    onSuccess: (data) => {
      setCurrentJobId(data.jobId);
      toast({
        title: "Import started",
        description: "Your import is running in the background",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to start import",
        description: error.message,
      });
    },
  });

  const resumeImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/mindbody/import/${jobId}/resume`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      // Handle 404 - job not found
      if (response.status === 404) {
        throw new Error("Import job not found. It may have been deleted or completed.");
      }

      // Handle 429 rate limit error with detailed message
      if (response.status === 429) {
        const lastDownload = new Date(data.lastDownloadTime);
        const nextAvailable = new Date(data.nextAvailableTime);
        const hoursRemaining = data.hoursRemaining || 0;

        throw new Error(
          `Rate limit: Please wait ${hoursRemaining} more hour${hoursRemaining !== 1 ? "s" : ""} before resuming. Last download was at ${lastDownload.toLocaleString()}. Next available at ${nextAvailable.toLocaleString()}.`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || "Failed to resume import");
      }

      return data as { success: boolean; message: string };
    },
    onSuccess: () => {
      toast({
        title: "Import resumed",
        description: "Your import is continuing in the background",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to resume import",
        description: error.message,
      });

      // If job not found, reset state
      if (error.message.includes("not found")) {
        setCurrentJobId(null);
        setJobStatus(null);
      }
    },
  });

  const pauseImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/mindbody/import/${jobId}/cancel`);
      const result = (await response.json()) as { success: boolean; message: string };
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Import paused",
        description: "Your import has been paused and can be resumed later",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to pause import",
        description: error.message,
      });
    },
  });

  const forceStopImportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/mindbody/import/force-cancel");
      const result = (await response.json()) as {
        success: boolean;
        message: string;
        jobId?: string;
      };
      return result;
    },
    onSuccess: (data) => {
      setCurrentJobId(null);
      setJobStatus(null);
      toast({
        title: "Import stopped",
        description: "All active imports have been cancelled. You can now start a new import.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to stop import",
        description: error.message,
      });
    },
  });

  const handleStartImport = () => {
    // Validate date range
    const startDate = new Date(importConfig.startDate);
    const endDate = new Date(importConfig.endDate);

    if (endDate < startDate) {
      toast({
        variant: "destructive",
        title: "Invalid date range",
        description: "End date must be after start date. Please check your date selection.",
        duration: 5000,
      });
      return;
    }

    startImportMutation.mutate(importConfig);
  };

  const handleResumeImport = () => {
    if (currentJobId) {
      resumeImportMutation.mutate(currentJobId);
    }
  };

  const handlePauseImport = () => {
    if (currentJobId) {
      pauseImportMutation.mutate(currentJobId);
    }
  };

  const handleForceStopImport = () => {
    forceStopImportMutation.mutate();
  };

  const handleReset = () => {
    setCurrentJobId(null);
    setJobStatus(null);
    startImportMutation.reset();
  };

  // Calculate overall progress
  const calculateProgress = (): number => {
    if (!jobStatus || !jobStatus.progress) return 0;

    // Filter to only data type progress (not apiCallCount or importStartTime)
    const dataTypes = Object.keys(jobStatus.progress).filter(
      (key) => key !== "apiCallCount" && key !== "importStartTime"
    );
    if (dataTypes.length === 0) return 0;

    let totalProgress = 0;
    let completedTypes = 0;

    dataTypes.forEach((type) => {
      const typeProgress = jobStatus.progress[type as keyof JobProgress];
      if (typeProgress && typeof typeProgress === "object" && "completed" in typeProgress) {
        if (typeProgress.completed) {
          completedTypes++;
        } else if (typeProgress.total > 0) {
          totalProgress += (typeProgress.current / typeProgress.total) * 100;
        }
      }
    });

    const avgProgress =
      dataTypes.length > 0 ? (completedTypes * 100 + totalProgress) / dataTypes.length : 0;

    return Math.min(Math.round(avgProgress), 100);
  };

  const isJobActive = jobStatus?.status === "running" || jobStatus?.status === "pending";
  const isJobResumable = jobStatus?.status === "failed" || jobStatus?.status === "paused";
  const isJobCompleted = jobStatus?.status === "completed";
  const isJobCancelled = jobStatus?.status === "cancelled";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mindbody Data Import</CardTitle>
            <CardDescription>Import your Mindbody account data</CardDescription>
          </div>
          {isJobCompleted && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
          {jobStatus?.status === "failed" && <AlertCircle className="h-5 w-5 text-destructive" />}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentJobId && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Import your students, classes, schedules, attendance records, and revenue data from
              Mindbody.
            </p>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">
                      Start Date
                    </Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={importConfig.startDate}
                      onChange={(e) =>
                        setImportConfig((prev) => ({ ...prev, startDate: e.target.value }))
                      }
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={importConfig.endDate}
                      onChange={(e) =>
                        setImportConfig((prev) => ({ ...prev, endDate: e.target.value }))
                      }
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Data Types to Import</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clients"
                      checked={importConfig.dataTypes.clients}
                      onCheckedChange={(checked) =>
                        setImportConfig((prev) => ({
                          ...prev,
                          dataTypes: { ...prev.dataTypes, clients: checked as boolean },
                        }))
                      }
                      data-testid="checkbox-clients"
                    />
                    <label htmlFor="clients" className="text-sm font-normal cursor-pointer">
                      Students
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="classes"
                      checked={importConfig.dataTypes.classes}
                      onCheckedChange={(checked) =>
                        setImportConfig((prev) => ({
                          ...prev,
                          dataTypes: { ...prev.dataTypes, classes: checked as boolean },
                        }))
                      }
                      data-testid="checkbox-classes"
                    />
                    <label htmlFor="classes" className="text-sm font-normal cursor-pointer">
                      Classes (Schedules)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="visits"
                      checked={importConfig.dataTypes.visits}
                      onCheckedChange={(checked) =>
                        setImportConfig((prev) => ({
                          ...prev,
                          dataTypes: { ...prev.dataTypes, visits: checked as boolean },
                        }))
                      }
                      data-testid="checkbox-visits"
                    />
                    <label htmlFor="visits" className="text-sm font-normal cursor-pointer">
                      Visits (Attendance Records)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sales"
                      checked={importConfig.dataTypes.sales}
                      onCheckedChange={(checked) =>
                        setImportConfig((prev) => ({
                          ...prev,
                          dataTypes: { ...prev.dataTypes, sales: checked as boolean },
                        }))
                      }
                      data-testid="checkbox-sales"
                    />
                    <label htmlFor="sales" className="text-sm font-normal cursor-pointer">
                      Sales (Revenue Transactions)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartImport}
              className="w-full gap-2"
              disabled={startImportMutation.isPending}
              data-testid="button-start-import"
            >
              {startImportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              Start Import
            </Button>
            <p className="text-xs text-muted-foreground">
              Import runs in the background. You can close this page and check back later.
            </p>
          </div>
        )}

        {isJobActive && jobStatus && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Importing{" "}
                  {jobStatus.currentDataType
                    ? getDisplayName(jobStatus.currentDataType).toLowerCase()
                    : "data"}
                  ...
                </span>
                <span className="font-medium">{calculateProgress()}%</span>
              </div>
              {jobStatus.startDate && jobStatus.endDate && (
                <div className="text-xs text-muted-foreground">
                  {format(parseDateSafe(jobStatus.startDate), "MMM d, yyyy")} -{" "}
                  {format(parseDateSafe(jobStatus.endDate), "MMM d, yyyy")}
                </div>
              )}
              <Progress value={calculateProgress()} />
            </div>

            {/* Show detailed progress for each data type */}
            <div className="space-y-2 text-xs">
              {Object.entries(jobStatus.progress)
                .filter(([type]) => type !== "apiCallCount" && type !== "importStartTime")
                .map(([type, data]) => {
                  if (typeof data === "object" && "completed" in data) {
                    const existingCount =
                      jobStatus.existingCounts?.[type as keyof typeof jobStatus.existingCounts] ||
                      0;
                    const sessionImported = (data as any).imported || 0;
                    const totalRecords = existingCount + sessionImported;

                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{getDisplayName(type)}:</span>
                          <span>
                            {data.completed ? (
                              <CheckCircle className="inline h-3 w-3 text-green-600" />
                            ) : type === "visits" ? (
                              `Checking student ${data.current} / ${data.total || "?"}`
                            ) : (
                              `${data.current} / ${data.total || "?"}`
                            )}
                          </span>
                        </div>
                        {(existingCount > 0 || sessionImported > 0) && (
                          <div className="flex justify-between text-muted-foreground pl-4 text-[11px]">
                            <span>Total records:</span>
                            <span className="font-medium">
                              {totalRecords.toLocaleString()}
                              {existingCount > 0 && sessionImported > 0 && (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  ({existingCount.toLocaleString()} +{" "}
                                  {sessionImported.toLocaleString()} new)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
            </div>

            {/* API Call Tracking */}
            {(() => {
              const metrics = calculateApiMetrics(jobStatus.progress);
              const isApproachingLimit = metrics.apiCallCount >= 4500;
              const hasExceededLimit = metrics.limitExceeded;

              return (
                <div
                  className={`p-3 rounded-md space-y-2 ${
                    hasExceededLimit
                      ? "bg-destructive/10 border border-destructive/20"
                      : isApproachingLimit
                        ? "bg-amber-500/10 border border-amber-500/20"
                        : "bg-muted"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">API Calls (Monthly)</span>
                    <span
                      className={`font-semibold ${
                        hasExceededLimit
                          ? "text-destructive"
                          : isApproachingLimit
                            ? "text-amber-600 dark:text-amber-500"
                            : ""
                      }`}
                    >
                      {metrics.apiCallCount} / 5,000
                    </span>
                  </div>

                  {metrics.rate > 0 && (
                    <div className="text-xs space-y-1 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Rate:</span>
                        <span>{metrics.rate.toFixed(1)} calls/min</span>
                      </div>

                      {!hasExceededLimit && metrics.limitReachedAt && (
                        <div className="flex justify-between">
                          <span>Free tier limit at:</span>
                          <span
                            className={
                              isApproachingLimit
                                ? "font-medium text-amber-600 dark:text-amber-500"
                                : ""
                            }
                          >
                            {format(metrics.limitReachedAt, "MMM d, h:mm a")}
                          </span>
                        </div>
                      )}

                      {hasExceededLimit && (
                        <div className="text-destructive font-medium">
                          ⚠️ Free tier limit exceeded - $0.002/call after 5,000
                        </div>
                      )}

                      {isApproachingLimit && !hasExceededLimit && (
                        <div className="text-amber-600 dark:text-amber-500 font-medium">
                          ⚠️ Approaching free tier limit - consider pausing
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Running in background. Safe to close this page.</span>
            </div>

            <Button
              variant="outline"
              onClick={handlePauseImport}
              className="w-full"
              disabled={pauseImportMutation.isPending}
              data-testid="button-pause-import"
            >
              {pauseImportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Pause Import"
              )}
            </Button>
          </div>
        )}

        {isJobCompleted && jobStatus && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Import completed successfully!
              </p>
              <div className="text-xs text-green-700 dark:text-green-300 mt-2 space-y-1">
                {jobStatus.progress.clients && (
                  <p>
                    Students: {jobStatus.progress.clients.imported} new,{" "}
                    {jobStatus.progress.clients.updated} updated
                  </p>
                )}
                {jobStatus.progress.classes && (
                  <p>Classes: {jobStatus.progress.classes.imported} imported</p>
                )}
                {jobStatus.progress.visits && (
                  <p>Visits: {jobStatus.progress.visits.imported} imported</p>
                )}
                {jobStatus.progress.sales && (
                  <p>Sales: {jobStatus.progress.sales.imported} imported</p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
              data-testid="button-import-again"
            >
              Import Again
            </Button>
          </div>
        )}

        {isJobCancelled && jobStatus && (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-sm font-medium">Import cancelled</p>
              {jobStatus.error && (
                <p className="text-xs text-muted-foreground mt-1">{jobStatus.error}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full"
              data-testid="button-start-new-import"
            >
              Start New Import
            </Button>
          </div>
        )}

        {isJobResumable && jobStatus && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  Import {jobStatus.status === "failed" ? "Failed" : "Paused"}
                </p>
                {jobStatus.pausedAt && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {format(new Date(jobStatus.pausedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                )}
              </div>

              {/* Why it stopped */}
              {jobStatus.error && (
                <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                    Reason:
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    {jobStatus.error}
                  </p>
                </div>
              )}

              {/* Where it stopped */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100 mb-2">
                  Progress Checkpoint:
                </p>
                <div className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  {jobStatus.currentDataType && (
                    <p className="font-medium">
                      Currently processing: {getDisplayName(jobStatus.currentDataType)}
                    </p>
                  )}
                  {jobStatus.progress.clients && jobStatus.progress.clients.total > 0 && (
                    <p>
                      • Students: {jobStatus.progress.clients.imported} new, {jobStatus.progress.clients.updated} updated ({jobStatus.progress.clients.current.toLocaleString()} / {jobStatus.progress.clients.total.toLocaleString()} processed)
                      {!jobStatus.progress.clients.completed && " - Will resume from here"}
                    </p>
                  )}
                  {jobStatus.progress.classes && jobStatus.progress.classes.total > 0 && (
                    <p>
                      • Classes: {jobStatus.progress.classes.imported.toLocaleString()} imported ({jobStatus.progress.classes.current.toLocaleString()} / {jobStatus.progress.classes.total.toLocaleString()} processed)
                      {!jobStatus.progress.classes.completed && " - Will resume from here"}
                    </p>
                  )}
                  {jobStatus.progress.visits && jobStatus.progress.visits.total > 0 && (
                    <p>
                      • Visits: {jobStatus.progress.visits.imported.toLocaleString()} imported ({jobStatus.progress.visits.current.toLocaleString()} / {jobStatus.progress.visits.total.toLocaleString()} processed)
                      {!jobStatus.progress.visits.completed && " - Will resume from here"}
                    </p>
                  )}
                  {jobStatus.progress.sales && jobStatus.progress.sales.total > 0 && (
                    <p>
                      • Sales: {jobStatus.progress.sales.imported.toLocaleString()} imported ({jobStatus.progress.sales.current.toLocaleString()} / {jobStatus.progress.sales.total.toLocaleString()} processed)
                      {!jobStatus.progress.sales.completed && " - Will resume from here"}
                    </p>
                  )}
                  {jobStatus.progress.apiCallCount !== undefined &&
                    jobStatus.progress.apiCallCount > 0 && (
                      <p className="pt-1">
                        • API Calls Used: {jobStatus.progress.apiCallCount.toLocaleString()} / 5,000 (free tier limit)
                      </p>
                    )}
                </div>
              </div>

              {/* What happens on resume */}
              <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  On Resume:
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Import will continue from the last checkpoint. No data will be re-imported.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleResumeImport}
                className="flex-1 gap-2"
                disabled={resumeImportMutation.isPending}
                data-testid="button-resume-import"
              >
                {resumeImportMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Resume from Checkpoint
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
                data-testid="button-cancel-import"
              >
                Start Over
              </Button>
            </div>
          </div>
        )}

        {/* Force Stop Import - Always visible for emergency situations */}
        {!isJobCompleted && !isJobCancelled && (
          <div className="pt-4 border-t">
            <Button
              variant="destructive"
              onClick={handleForceStopImport}
              disabled={forceStopImportMutation.isPending}
              className="w-full"
              size="sm"
              data-testid="button-force-stop-import"
            >
              {forceStopImportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Force Stop Import"
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Use this if an import is stuck or blocking new imports
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
