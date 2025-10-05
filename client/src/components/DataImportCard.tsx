import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";

export function DataImportCard() {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "importing" | "success" | "error">("idle");

  const handleImport = () => {
    setIsImporting(true);
    setStatus("importing");
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsImporting(false);
          setStatus("success");
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mindbody Data Import</CardTitle>
            <CardDescription>Connect and sync your Mindbody account data</CardDescription>
          </div>
          {status === "success" && (
            <CheckCircle className="h-5 w-5 text-green-600" />
          )}
          {status === "error" && (
            <AlertCircle className="h-5 w-5 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "idle" && (
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

        {status === "importing" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Importing data...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
            <p className="text-xs text-muted-foreground">
              Please don't close this window. This may take a few minutes.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Import completed successfully!
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                Imported 2,350 students, 156 classes, and 12 months of data.
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setStatus("idle")}
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
