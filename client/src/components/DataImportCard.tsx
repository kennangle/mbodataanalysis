import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle, AlertCircle, Loader2, Link as LinkIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ImportStats {
  students: number;
  classes: number;
  attendance: number;
  revenue: number;
}

export function DataImportCard() {
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [siteId, setSiteId] = useState("");
  const [showSiteIdInput, setShowSiteIdInput] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [location] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'connected') {
      toast({
        title: "Connected to Mindbody",
        description: "You can now import your data",
      });
      window.history.replaceState({}, '', '/import');
    } else if (params.get('error')) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Mindbody. Please try again.",
        variant: "destructive",
      });
      window.history.replaceState({}, '', '/import');
    }
  }, [location, toast]);

  const mutation = useMutation({
    mutationFn: async (useSampleData: boolean = false) => {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const response = await apiRequest("POST", "/api/mindbody/import", { useSampleData });
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

  const handleConnectMindbody = async () => {
    if (!siteId) {
      toast({
        title: "Site ID required",
        description: "Please enter your Mindbody Site ID",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/mindbody/auth-url?siteId=${siteId}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get authorization URL");
      }
    } catch (error) {
      toast({
        title: "Connection failed",
        description: "Failed to connect to Mindbody. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImport = (useSampleData: boolean = false) => {
    setImportStats(null);
    mutation.mutate(useSampleData);
  };

  const handleReset = () => {
    setImportStats(null);
    setProgress(0);
    setShowSiteIdInput(false);
    setSiteId("");
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
        {!mutation.isPending && !importStats && !showSiteIdInput && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import your students, classes, schedules, attendance records, and revenue data.
            </p>
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
                onClick={() => setShowSiteIdInput(true)} 
                className="flex-1 gap-2"
                data-testid="button-connect-mindbody"
              >
                <LinkIcon className="h-4 w-4" />
                Connect Mindbody
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use sample data to explore the platform, or connect your Mindbody account for real data.
            </p>
          </div>
        )}

        {!mutation.isPending && !importStats && showSiteIdInput && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="siteId">Mindbody Site ID</Label>
              <Input
                id="siteId"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                placeholder="e.g., -99"
                data-testid="input-site-id"
              />
              <p className="text-xs text-muted-foreground">
                Enter your Mindbody Site ID. You can find this in your Mindbody Developer Portal.
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowSiteIdInput(false)}
                variant="outline"
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConnectMindbody}
                className="flex-1 gap-2"
                data-testid="button-authorize"
              >
                <LinkIcon className="h-4 w-4" />
                Authorize with Mindbody
              </Button>
            </div>
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
