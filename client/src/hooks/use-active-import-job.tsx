import { useState, useEffect, useRef, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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

export interface JobStatus {
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
  createdAt?: string;
  updatedAt?: string;
}

interface UseActiveImportJobOptions {
  onCompleted?: () => void;
  onFailed?: (error: string) => void;
  showToasts?: boolean;
}

export function useActiveImportJob(options: UseActiveImportJobOptions = {}) {
  const { onCompleted, onFailed, showToasts = true } = options;
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track last progress snapshot to detect stalled imports
  const lastProgressRef = useRef<{ snapshot: string; timestamp: number } | null>(null);

  // Method to manually refresh the active job
  const refreshActiveJob = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Helper to create progress snapshot for staleness detection
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

  // Calculate overall progress percentage
  const calculateProgress = useCallback((job: JobStatus | null): number => {
    if (!job || !job.progress) return 0;

    // Filter to only data type progress (not apiCallCount or importStartTime)
    const dataTypes = Object.keys(job.progress).filter(
      (key) => key !== "apiCallCount" && key !== "importStartTime"
    );
    if (dataTypes.length === 0) return 0;

    let totalProgress = 0;
    let completedTypes = 0;

    dataTypes.forEach((type) => {
      const typeProgress = job.progress[type as keyof JobProgress];
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
  }, []);

  // Calculate API metrics
  const calculateApiMetrics = useCallback((progress: JobProgress) => {
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
  }, []);

  // Fetch active job on mount
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
              // Job is stale - clear it
              setJobStatus(null);
              if (showToasts) {
                toast({
                  variant: "destructive",
                  title: "Previous import was stalled",
                  description:
                    "Found an import that hasn't updated in over 2 minutes. Please refresh your browser and start a new import.",
                  duration: 10000,
                });
              }
              setIsLoading(false);
              return;
            }
          }

          setJobStatus(job);
        }
      } catch (error) {
        // No active job found or error fetching
        setJobStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveJob();
  }, [toast, showToasts, refreshTrigger]);

  // Poll for job status updates
  useEffect(() => {
    if (!jobStatus?.id) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/mindbody/import/${jobStatus.id}/status`);

        // Check for 404
        if (response.status === 404) {
          clearInterval(pollInterval);
          setJobStatus(null);
          if (showToasts) {
            toast({
              variant: "destructive",
              title: "Import job not found",
              description: "The import job no longer exists. Please refresh and start a new import.",
              duration: 10000,
            });
          }
          return;
        }

        const status = (await response.json()) as JobStatus;

        // Check for stalled import - progress hasn't changed in 2+ minutes
        if (status.status === "running") {
          const currentSnapshot = getProgressSnapshot(status.progress);
          const now = Date.now();

          if (lastProgressRef.current) {
            const { snapshot: lastSnapshot, timestamp: lastTimestamp } = lastProgressRef.current;

            if (currentSnapshot === lastSnapshot) {
              const minutesSinceChange = (now - lastTimestamp) / (1000 * 60);

              if (minutesSinceChange > 2) {
                // Import is stalled
                clearInterval(pollInterval);
                setJobStatus(null);
                lastProgressRef.current = null;
                if (showToasts) {
                  toast({
                    variant: "destructive",
                    title: "Import appears stalled",
                    description:
                      "The import hasn't made progress in over 2 minutes. Please refresh and start a new import.",
                    duration: 10000,
                  });
                }
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

        // Handle completion
        if (status.status === "completed") {
          clearInterval(pollInterval);
          lastProgressRef.current = null;
          setJobStatus(null);
          queryClient.invalidateQueries();
          if (showToasts) {
            toast({
              title: "Import completed",
              description: "All data has been imported successfully",
            });
          }
          onCompleted?.();
        } else if (status.status === "failed") {
          clearInterval(pollInterval);
          lastProgressRef.current = null;
          setJobStatus(null);
          if (showToasts) {
            toast({
              variant: "destructive",
              title: "Import failed",
              description: status.error || "Unknown error occurred",
            });
          }
          onFailed?.(status.error || "Unknown error occurred");
        }
      } catch (error) {
        // Error polling - stop and clear
        clearInterval(pollInterval);
        setJobStatus(null);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [jobStatus?.id, toast, queryClient, getProgressSnapshot, onCompleted, onFailed, showToasts]);

  const isJobActive = jobStatus?.status === "running" || jobStatus?.status === "pending";
  const progressPercentage = calculateProgress(jobStatus);
  const apiMetrics = jobStatus ? calculateApiMetrics(jobStatus.progress) : null;

  return {
    jobStatus,
    isLoading,
    isJobActive,
    progressPercentage,
    apiMetrics,
    refreshActiveJob,
    calculateProgress,
    calculateApiMetrics,
  };
}
