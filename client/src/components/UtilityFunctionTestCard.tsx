import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function UtilityFunctionTestCard() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testUtilityFunction = async () => {
    setTesting(true);
    setResult(null);

    try {
      const response = await fetch("/api/mindbody/test-utility-function", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2024-02-01",
          endDate: "2024-02-29",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: "Test Complete!",
        description: `Found ${data.totalVisits} visits in ${data.duration}`,
      });
    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test utility function",
        variant: "destructive",
      });
      setResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card data-testid="card-utility-test">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Test New Utility Function
            </CardTitle>
            <CardDescription>
              Test Mindbody's UtilityFunction_VisitsV4 for ultra-fast imports
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Experimental
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 rounded-md p-4 space-y-2">
          <p className="text-sm font-medium">What this tests:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Fetches ALL February 2024 visits in 1 API call (vs thousands)</li>
            <li>• Shows response time and data format</li>
            <li>• Could reduce 2-3 hour imports to minutes!</li>
          </ul>
        </div>

        <Button
          onClick={testUtilityFunction}
          disabled={testing}
          className="w-full"
          data-testid="button-test-utility"
        >
          {testing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Test February 2024
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            {result.error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">Error</span>
                </div>
                <p className="text-sm text-muted-foreground">{result.error}</p>
              </div>
            ) : (
              <div className="bg-primary/10 border border-primary/20 rounded-md p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">Success!</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Visits</div>
                    <div className="text-2xl font-bold text-primary">
                      {result.totalVisits?.toLocaleString() || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Response Time</div>
                    <div className="text-2xl font-bold text-primary">{result.duration}</div>
                  </div>
                </div>

                {result.columns && result.columns.length > 0 && (
                  <div>
                    <div className="text-sm font-medium mb-2">Data Columns:</div>
                    <div className="flex flex-wrap gap-1">
                      {result.columns.map((col: string) => (
                        <Badge key={col} variant="secondary" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {result.sample && result.sample.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-sm font-medium mb-2">
                      Sample Data (first 10 visits)
                    </summary>
                    <pre className="bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(result.sample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
