import { useState, useEffect } from "react";
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
  clients?: { current: number; total: number; imported: number; updated: number; completed: boolean };
  classes?: { current: number; total: number; imported: number; completed: boolean };
  visits?: { current: number; total: number; imported: number; completed: boolean };
  sales?: { current: number; total: number; imported: number; completed: boolean };
}

interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  dataTypes: string[];
  progress: JobProgress;
  currentDataType: string | null;
  error: string | null;
}

export function DataImportCard() {
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoadingActiveJob, setIsLoadingActiveJob] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch active job on mount to restore progress after page reload
  useEffect(() => {
    const fetchActiveJob = async () => {
      try {
        const response = await apiRequest("GET", "/api/mindbody/import/active");
        if (response.ok) {
          const job = await response.json() as JobStatus;
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
  }, []);

  const getDefaultStartDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 1);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [importConfig, setImportConfig] = useState<ImportConfig>({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate(),
    dataTypes: {
      clients: true,
      classes: true,
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
        const status = await response.json() as JobStatus;
        setJobStatus(status);

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          queryClient.invalidateQueries();
          toast({
            title: "Import completed",
            description: "All data has been imported successfully",
          });
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          toast({
            variant: "destructive",
            title: "Import failed",
            description: status.error || "Unknown error occurred",
          });
        } else if (status.status === 'paused') {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Failed to fetch job status:", error);
        // If job not found (404) or other error, clear state and stop polling
        if (error instanceof Error && error.message.includes('404')) {
          clearInterval(pollInterval);
          setCurrentJobId(null);
          setJobStatus(null);
          toast({
            variant: "destructive",
            title: "Import job not found",
            description: "The import job no longer exists. Please start a new import.",
          });
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [currentJobId, queryClient, toast]);

  const startImportMutation = useMutation({
    mutationFn: async (config: ImportConfig) => {
      const response = await apiRequest("POST", "/api/mindbody/import/start", { config });
      const result = await response.json() as { success: boolean; jobId: string; message: string };
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
          `Rate limit: Please wait ${hoursRemaining} more hour${hoursRemaining !== 1 ? 's' : ''} before resuming. Last download was at ${lastDownload.toLocaleString()}. Next available at ${nextAvailable.toLocaleString()}.`
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

  const cancelImportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await apiRequest("POST", `/api/mindbody/import/${jobId}/cancel`);
      const result = await response.json() as { success: boolean; message: string };
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Import cancelled",
        description: "Your import has been stopped",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to cancel import",
        description: error.message,
      });
    },
  });

  const handleStartImport = () => {
    startImportMutation.mutate(importConfig);
  };

  const handleResumeImport = () => {
    if (currentJobId) {
      resumeImportMutation.mutate(currentJobId);
    }
  };

  const handleCancelImport = () => {
    if (currentJobId) {
      cancelImportMutation.mutate(currentJobId);
    }
  };

  const handleReset = () => {
    setCurrentJobId(null);
    setJobStatus(null);
    startImportMutation.reset();
  };

  // Calculate overall progress
  const calculateProgress = (): number => {
    if (!jobStatus || !jobStatus.progress) return 0;
    
    const dataTypes = Object.keys(jobStatus.progress);
    if (dataTypes.length === 0) return 0;

    let totalProgress = 0;
    let completedTypes = 0;

    dataTypes.forEach((type) => {
      const typeProgress = jobStatus.progress[type as keyof JobProgress];
      if (typeProgress) {
        if (typeProgress.completed) {
          completedTypes++;
        } else if (typeProgress.total > 0) {
          totalProgress += (typeProgress.current / typeProgress.total) * 100;
        }
      }
    });

    const avgProgress = dataTypes.length > 0 
      ? (completedTypes * 100 + totalProgress) / dataTypes.length 
      : 0;

    return Math.min(Math.round(avgProgress), 100);
  };

  const isJobActive = jobStatus?.status === 'running' || jobStatus?.status === 'pending';
  const isJobResumable = jobStatus?.status === 'failed' || jobStatus?.status === 'paused';
  const isJobCompleted = jobStatus?.status === 'completed';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mindbody Data Import</CardTitle>
            <CardDescription>Import your Mindbody account data</CardDescription>
          </div>
          {isJobCompleted && (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
          {jobStatus?.status === 'failed' && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!currentJobId && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Import your students, classes, schedules, attendance records, and revenue data from Mindbody.
            </p>

            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start-date" className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={importConfig.startDate}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, startDate: e.target.value }))}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-date" className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={importConfig.endDate}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, endDate: e.target.value }))}
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
                        setImportConfig(prev => ({ 
                          ...prev, 
                          dataTypes: { ...prev.dataTypes, clients: checked as boolean } 
                        }))
                      }
                      data-testid="checkbox-clients"
                    />
                    <label htmlFor="clients" className="text-sm font-normal cursor-pointer">
                      Clients (Students/Members)
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="classes"
                      checked={importConfig.dataTypes.classes}
                      onCheckedChange={(checked) => 
                        setImportConfig(prev => ({ 
                          ...prev, 
                          dataTypes: { ...prev.dataTypes, classes: checked as boolean } 
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
                        setImportConfig(prev => ({ 
                          ...prev, 
                          dataTypes: { ...prev.dataTypes, visits: checked as boolean } 
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
                        setImportConfig(prev => ({ 
                          ...prev, 
                          dataTypes: { ...prev.dataTypes, sales: checked as boolean } 
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
                  Importing {jobStatus.currentDataType || 'data'}...
                </span>
                <span className="font-medium">{calculateProgress()}%</span>
              </div>
              <Progress value={calculateProgress()} />
            </div>

            {/* Show detailed progress for each data type */}
            <div className="space-y-2 text-xs">
              {Object.entries(jobStatus.progress).map(([type, data]) => (
                <div key={type} className="flex justify-between text-muted-foreground">
                  <span className="capitalize">{type}:</span>
                  <span>
                    {data.completed ? (
                      <CheckCircle className="inline h-3 w-3 text-green-600" />
                    ) : (
                      `${data.current} / ${data.total || '?'}`
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Running in background. Safe to close this page.</span>
            </div>

            <Button 
              variant="outline" 
              onClick={handleCancelImport}
              className="w-full"
              disabled={cancelImportMutation.isPending}
              data-testid="button-cancel-import"
            >
              {cancelImportMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Cancel Import"
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
                  <p>Clients: {jobStatus.progress.clients.imported} new, {jobStatus.progress.clients.updated} updated</p>
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

        {isJobResumable && jobStatus && (
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="text-sm font-medium text-destructive">
                Import {jobStatus.status === 'failed' ? 'failed' : 'paused'}
              </p>
              {jobStatus.error && (
                <p className="text-xs text-destructive/80 mt-1">
                  {jobStatus.error}
                </p>
              )}
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
                Resume Import
              </Button>
              <Button 
                variant="outline" 
                onClick={handleReset}
                className="flex-1"
                data-testid="button-cancel-import"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
