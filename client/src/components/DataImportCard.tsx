import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, Database } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface ImportStats {
  students: number;
  classes: number;
  attendance: number;
  revenue: number;
}

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

export function DataImportCard() {
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Default to last 12 months
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

  const mutation = useMutation({
    mutationFn: async (payload: { useSampleData?: boolean; config?: ImportConfig }) => {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiRequest("POST", "/api/mindbody/import", payload);
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

  const handleImport = (useSampleData: boolean = false) => {
    setImportStats(null);
    if (useSampleData) {
      mutation.mutate({ useSampleData: true });
    } else {
      mutation.mutate({ config: importConfig });
    }
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
            <CardDescription>Import your Mindbody account data</CardDescription>
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

            <div className="flex gap-2">
              <Button 
                onClick={() => handleImport(true)} 
                className="flex-1 gap-2"
                variant="outline"
                data-testid="button-import-sample"
              >
                <Upload className="h-4 w-4" />
                Use Sample Data
              </Button>
              <Button 
                onClick={() => handleImport(false)} 
                className="flex-1 gap-2"
                data-testid="button-import-mindbody"
              >
                <Database className="h-4 w-4" />
                Import from Mindbody
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Configure date range and data types, then import from Mindbody (Site ID: 133) or use sample data.
            </p>
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
