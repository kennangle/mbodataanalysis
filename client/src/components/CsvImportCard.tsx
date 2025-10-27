import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CsvImportResult {
  success: boolean;
  processed: number; // Total rows processed successfully (includes inserts and updates)
  skipped: number; // Rows that failed validation
  total: number; // Total rows in CSV
  totalErrors: number; // Total number of errors
  errors?: string[]; // First 20 error messages
}

interface ImportProgress {
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  percentage: number;
  elapsed: number;
}

export function CsvImportCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
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
      } else if (response.status === 404) {
        // Import completed or not started
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
        setProgress(null);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  };

  const startProgressPolling = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Poll every 500ms for smooth progress updates
    progressIntervalRef.current = window.setInterval(pollProgress, 500);
  };

  const stopProgressPolling = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setProgress(null);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Start polling for progress
      startProgressPolling();

      // Create abort controller with 5 minute timeout for large files
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000); // 5 minutes

      try {
        // Use fetch directly for multipart/form-data instead of apiRequest
        const response = await fetch("/api/revenue/import-csv", {
          method: "POST",
          body: formData,
          credentials: "include", // Include session cookie
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.details || error.error || "Import failed");
        }

        return (await response.json()) as CsvImportResult;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
          throw new Error(
            "Import timed out - file may be too large. Try splitting into smaller files."
          );
        }
        throw error;
      } finally {
        // Stop polling when import completes or fails
        stopProgressPolling();
      }
    },
    onSuccess: (data) => {
      setImportResult(data);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Invalidate revenue queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/revenue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/revenue-trend"] });

      // Build detailed description with error information
      let description = `Processed ${data.processed} of ${data.total} rows successfully.`;
      if (data.skipped > 0) {
        description += ` ${data.skipped} rows had validation errors.`;
      }
      if (data.errors && data.errors.length > 0) {
        description += `\n\nFirst error: ${data.errors[0]}`;
        if (data.totalErrors > 1) {
          description += `\n(+${data.totalErrors - 1} more errors - check Import History for details)`;
        }
      }

      toast({
        title: data.skipped > 0 ? "CSV Import Completed with Errors" : "CSV Import Complete",
        description,
        variant: data.skipped > 0 ? "default" : "default",
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
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
              Import historical revenue data from exported CSV files
            </CardDescription>
          </div>
          {importResult && (
            <CheckCircle className="h-6 w-6 text-green-600" data-testid="icon-success" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!importResult ? (
          <>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Upload a CSV file exported from Mindbody Business Intelligence with revenue/sales
                data.
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
                    <span className="font-medium">Type</span> (or "Category", "Payment Method") -
                    Optional
                  </li>
                  <li>
                    <span className="font-medium">Description</span> (or "Item", "Product",
                    "Service") - Optional
                  </li>
                  <li>
                    <span className="font-medium">Client Email</span> (or "Email") - Optional, for
                    student matching
                  </li>
                  <li>
                    <span className="font-medium">Client Name</span> (or "Client") - Optional, for
                    student matching
                  </li>
                  <li>
                    <span className="font-medium">Sale ID</span> (or "SaleId", "ID") - Optional,
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
                  {importMutation.isPending && (
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-md p-4 space-y-3">
                      {progress ? (
                        <>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-900 dark:text-blue-100 font-medium">
                              Processing CSV...
                            </span>
                            <span className="text-blue-700 dark:text-blue-200 font-mono">
                              {progress.percentage}%
                            </span>
                          </div>
                          <Progress
                            value={progress.percentage}
                            className="h-2"
                            data-testid="progress-import"
                          />
                          <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300">
                            <span>
                              {progress.processed.toLocaleString()} /{" "}
                              {progress.total.toLocaleString()} rows
                            </span>
                            <span>{Math.floor(progress.elapsed)}s elapsed</span>
                          </div>
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            {progress.imported.toLocaleString()} imported •{" "}
                            {progress.skipped.toLocaleString()} skipped
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-blue-900 dark:text-blue-100">
                          <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                          Initializing import... This may take several minutes for large files.
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleImport}
                      disabled={importMutation.isPending}
                      className="flex-1"
                      data-testid="button-import-csv"
                    >
                      {importMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {importMutation.isPending ? "Importing..." : "Import CSV"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      disabled={importMutation.isPending}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md p-4">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Import Completed Successfully
              </h3>
              <div className="text-sm space-y-1 text-green-800 dark:text-green-200">
                <p data-testid="text-imported">
                  <span className="font-medium">Imported:</span> {importResult.imported} records
                </p>
                <p data-testid="text-skipped">
                  <span className="font-medium">Skipped:</span> {importResult.skipped} records
                </p>
                <p data-testid="text-total">
                  <span className="font-medium">Total:</span> {importResult.total} records
                </p>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md p-4">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Import Warnings ({importResult.errors.length}{" "}
                  {importResult.errors.length > 1 ? "errors" : "error"})
                </h4>
                <ul className="text-xs space-y-1 text-yellow-800 dark:text-yellow-200 max-h-32 overflow-y-auto">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="font-mono">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button onClick={handleReset} className="w-full" data-testid="button-import-another">
              Import Another File
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
