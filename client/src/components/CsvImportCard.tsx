import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CsvImportResponse {
  success: boolean;
  jobId: string;
  totalRows: number;
  message: string;
}

interface ImportProgress {
  status: "idle" | "in_progress";
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  elapsedSeconds?: number;
  estimatedSecondsLeft?: number;
  rowsPerSecond?: number;
}

export function CsvImportCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const jobPollingIntervalRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Poll for import progress
  const pollProgress = async () => {
    try {
      const response = await fetch("/api/revenue/import-progress", {
        credentials: "include",
      });

      if (response.ok) {
        const data = (await response.json()) as ImportProgress;
        setProgress(data);
      } else {
        setProgress(null);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  };

  // Poll for job completion
  const pollJobStatus = async (jobId: string) => {
    try {
      const response = await fetch(`/api/mindbody/import/${jobId}/status`, {
        credentials: "include",
      });

      if (response.ok) {
        const job = await response.json();

        if (job) {
          if (job.status === "completed") {
            stopPolling();
            setActiveJobId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/revenue"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
            queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-trend"] });
            queryClient.invalidateQueries({ queryKey: ["/api/mindbody/import/history"] });

            const progress = job.progress ? JSON.parse(job.progress) : null;
            const totalRows = progress?.revenue?.total || 0;
            const processedRows = progress?.revenue?.current || 0;

            toast({
              title: job.error ? "CSV Import Completed with Errors" : "CSV Import Complete",
              description: job.error 
                ? `Processed ${processedRows} of ${totalRows} rows. ${job.error}`
                : `Successfully imported ${processedRows} revenue records with student matching.`,
              variant: job.error ? "default" : "default",
            });
          } else if (job.status === "failed") {
            stopPolling();
            setActiveJobId(null);
            toast({
              title: "CSV Import Failed",
              description: job.error || "Unknown error occurred",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to poll job status:", error);
    }
  };

  const startPolling = (jobId: string) => {
    // Clear any existing intervals
    stopPolling();

    // Poll progress every 500ms for smooth updates
    progressIntervalRef.current = window.setInterval(pollProgress, 500);
    
    // Poll job status every 2 seconds
    jobPollingIntervalRef.current = window.setInterval(() => pollJobStatus(jobId), 2000);
  };

  const stopPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    if (jobPollingIntervalRef.current) {
      clearInterval(jobPollingIntervalRef.current);
      jobPollingIntervalRef.current = null;
    }
    setProgress(null);
  };

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, []);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Use fetch directly for multipart/form-data
      const response = await fetch("/api/revenue/import-csv", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || "Import failed");
      }

      return (await response.json()) as CsvImportResponse;
    },
    onSuccess: (data) => {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Store job ID and start polling
      setActiveJobId(data.jobId);
      startPolling(data.jobId);

      toast({
        title: "CSV Import Started",
        description: `Processing ${data.totalRows} rows in background with student matching. You can monitor progress here or in Import History.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const percentage = progress && progress.total > 0 
    ? Math.round((progress.processed / progress.total) * 100) 
    : 0;

  const isImporting = importMutation.isPending || (!!activeJobId && progress?.status === "in_progress");

  return (
    <Card data-testid="card-csv-import">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              CSV Revenue Import
            </CardTitle>
            <CardDescription>
              Import historical revenue data from exported CSV files with student matching
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file exported from Mindbody Business Intelligence with revenue/sales
              data. Includes automatic student matching for AI insights.
            </p>
            <div className="bg-muted/50 p-3 rounded-md text-xs space-y-1">
              <p className="font-medium">Expected CSV columns (flexible names):</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>
                  <span className="font-medium">Date</span> (or "Sale Date", "Transaction Date") -
                  Required
                </li>
                <li>
                  <span className="font-medium">Amount</span> (or "Total", "Price") - Required
                </li>
                <li>
                  <span className="font-medium">Client ID</span> or <span className="font-medium">Email</span> - For student matching
                </li>
                <li>
                  <span className="font-medium">Type</span> (or "Category", "Payment Method") -
                  Optional
                </li>
                <li>
                  <span className="font-medium">Description</span> (or "Item", "Product") -
                  Optional
                </li>
                <li>
                  <span className="font-medium">Sale ID</span> (or "SaleId") - Optional,
                  prevents duplicates
                </li>
              </ul>
            </div>
          </div>

            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-csv-file"
              />

              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
                data-testid="button-select-file"
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? selectedFile.name : "Select CSV File"}
              </Button>

              {selectedFile && (
                <>
                  {isImporting && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-4 space-y-3">
                      {progress ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-900 dark:text-blue-100 font-medium">
                              Processing CSV with student matching...
                            </span>
                            <span className="text-blue-700 dark:text-blue-200 font-mono">
                              {percentage}%
                            </span>
                          </div>
                          <Progress
                            value={percentage}
                            className="h-2"
                            data-testid="progress-import"
                          />
                          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                            <span>
                              {progress.processed.toLocaleString()} /{" "}
                              {progress.total.toLocaleString()} rows
                            </span>
                            {progress.elapsedSeconds !== undefined && (
                              <span>{progress.elapsedSeconds}s elapsed</span>
                            )}
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            {progress.imported.toLocaleString()} imported •{" "}
                            {progress.skipped.toLocaleString()} skipped
                            {progress.rowsPerSecond !== undefined && progress.rowsPerSecond > 0 && (
                              <span> • {progress.rowsPerSecond} rows/sec</span>
                            )}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                          Starting background import...
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="flex-1"
                      data-testid="button-import-csv"
                    >
                      {isImporting && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isImporting ? "Processing..." : "Start Import"}
                    </Button>
                    {!isImporting && (
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          </>
      </CardContent>
    </Card>
  );
}
