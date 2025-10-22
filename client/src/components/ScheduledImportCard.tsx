import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ScheduledImportConfig {
  enabled: boolean;
  schedule: string;
  dataTypes: string;
  daysToImport: number;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
}

export function ScheduledImportCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [daysToImport, setDaysToImport] = useState("7");
  const [dataTypes, setDataTypes] = useState<string[]>(["students", "classes", "visits", "sales"]);

  const { data: config, isLoading } = useQuery<ScheduledImportConfig>({
    queryKey: ["/api/scheduled-imports"],
  });

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setDaysToImport(config.daysToImport.toString());
      if (config.dataTypes) {
        // Handle both string and array formats
        if (typeof config.dataTypes === 'string') {
          setDataTypes(config.dataTypes.split(",").map((t) => t.trim()));
        } else if (Array.isArray(config.dataTypes)) {
          setDataTypes(config.dataTypes);
        }
      }
    }
  }, [config]);

  const updateConfigMutation = useMutation({
    mutationFn: async (data: Partial<ScheduledImportConfig>) => {
      return await apiRequest("POST", "/api/scheduled-imports", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-imports"] });
      toast({
        title: "Configuration saved",
        description: "Scheduled import settings have been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const runNowMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/scheduled-imports/run-now", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduled-imports"] });
      toast({
        title: "Import started",
        description: "The scheduled import has been triggered manually.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    await updateConfigMutation.mutateAsync({
      enabled,
      schedule: "0 2 * * *",
      dataTypes: dataTypes.join(","),
      daysToImport: parseInt(daysToImport),
    });
  };

  const handleDataTypeToggle = (type: string) => {
    if (dataTypes.includes(type)) {
      setDataTypes(dataTypes.filter((t) => t !== type));
    } else {
      setDataTypes([...dataTypes, type]);
    }
  };

  const getStatusBadge = () => {
    if (!config?.lastRunStatus) return null;

    switch (config.lastRunStatus) {
      case "success":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Success
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Scheduled Imports
            </CardTitle>
            <CardDescription className="mt-1">
              Automatically import data from Mindbody on a regular schedule
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {config?.lastRunError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{config.lastRunError}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="scheduled-enabled">Enable Scheduled Imports</Label>
            <div className="text-sm text-muted-foreground">
              Automatically sync data daily at 2:00 AM
            </div>
          </div>
          <Switch
            id="scheduled-enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
            data-testid="switch-scheduled-enabled"
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-3">
              <Label>Data Types to Import</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "students", label: "Students" },
                  { value: "classes", label: "Classes" },
                  { value: "visits", label: "Visit History" },
                  { value: "sales", label: "Sales & Revenue" },
                ].map((type) => (
                  <div
                    key={type.value}
                    className="flex items-center space-x-2"
                  >
                    <Switch
                      id={`type-${type.value}`}
                      checked={dataTypes.includes(type.value)}
                      onCheckedChange={() => handleDataTypeToggle(type.value)}
                      data-testid={`switch-type-${type.value}`}
                    />
                    <Label htmlFor={`type-${type.value}`} className="cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="days-to-import">Days of History to Import</Label>
              <Select value={daysToImport} onValueChange={setDaysToImport}>
                <SelectTrigger id="days-to-import" data-testid="select-days-to-import">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 1 day</SelectItem>
                  <SelectItem value="3">Last 3 days</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {config?.lastRunAt && (
              <div className="text-sm text-muted-foreground">
                Last run: {new Date(config.lastRunAt).toLocaleString()}
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={updateConfigMutation.isPending}
            data-testid="button-save-scheduled"
          >
            {updateConfigMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Configuration"
            )}
          </Button>

          {enabled && (
            <Button
              variant="outline"
              onClick={() => runNowMutation.mutate()}
              disabled={runNowMutation.isPending}
              data-testid="button-run-now"
            >
              {runNowMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Now
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
