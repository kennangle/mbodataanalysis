import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ImportStats {
  students: number;
  classes: number;
  attendance: number;
  revenue: number;
}

export function DataImportCard() {
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiRequest("POST", "/api/mindbody/import");
      const result = await response.json() as { success: boolean; message: string; stats: ImportStats };

      clearInterval(interval);
      setProgress(100);
      return result;
    },
    onSuccess: (data) => {
      setImportStats(data.stats);
      queryClient.invalidateQueries();
      toast({
        title: "Import successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      setProgress(0);
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message,
      });
    },
  });

  const handleImport = () => {
    setImportStats(null);
    mutation.mutate();
  };

  const handleReset = () => {
    setImportStats(null);
    setProgress(0);
    mutation.reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mindbody Data Import</CardTitle>
            <CardDescription>Connect and sync your Mindbody account data</CardDescription>
          </div>
          {importStats && (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
          {mutation.isError && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!mutation.isPending && !importStats && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import your students, classes, schedules, attendance records, and revenue data.
            </p>
            <Button 
              onClick={handleImport} 
              className="w-full gap-2"
              data-testid="button-import-data"
            >
              <Upload className="h-4 w-4" />
              Connect Mindbody Account
            </Button>
          </div>
        )}

        {mutation.isPending && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importing data...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Please don't close this window. This may take a few minutes.</span>
            </div>
          </div>
        )}

        {importStats && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Import completed successfully!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Imported {importStats.students} students, {importStats.classes} classes, 
                {importStats.attendance} attendance records, and {importStats.revenue} revenue transactions.
              </p>
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
      </CardContent>
    </Card>
  );
}
