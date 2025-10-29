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

// Helper function to normalize day of week from cron expression
// Converts textual day names (SUN, MON, etc.) to numeric (0-6)
// Preserves complex expressions like ranges (MON-FRI) as-is to prevent data loss
function normalizeDayOfWeek(dayToken: string): string {
  // If it's "*", return as-is
  if (dayToken === "*") {
    return dayToken;
  }
  
  // If it's already all numeric (possibly with commas), return as-is
  if (/^\d+(,\d+)*$/.test(dayToken)) {
    return dayToken;
  }
  
  // For ranges or step values, preserve as-is to prevent data loss
  // Examples: "MON-FRI", "*/2", "1-5/2"
  if (dayToken.includes("-") || dayToken.includes("/")) {
    return dayToken;
  }
  
  // Map textual day names to numbers (case-insensitive)
  const dayMap: Record<string, string> = {
    "SUN": "0", "SUNDAY": "0",
    "MON": "1", "MONDAY": "1",
    "TUE": "2", "TUESDAY": "2",
    "WED": "3", "WEDNESDAY": "3",
    "THU": "4", "THURSDAY": "4",
    "FRI": "5", "FRIDAY": "5",
    "SAT": "6", "SATURDAY": "6",
  };
  
  // Handle comma-separated values (e.g., "MON,WED,FRI" or "1,3,5")
  const tokens = dayToken.split(",").map(t => t.trim().toUpperCase());
  const normalized = tokens.map(token => {
    // If it's already a number, keep it
    if (/^\d+$/.test(token)) {
      return token;
    }
    // Try to map textual name to number
    return dayMap[token] || null;
  }).filter(Boolean); // Remove nulls (unrecognized tokens)
  
  // If we successfully converted all tokens, return the normalized list
  if (normalized.length === tokens.length && normalized.length > 0) {
    return normalized.join(",");
  }
  
  // If some tokens couldn't be converted, preserve the original to avoid data loss
  if (normalized.length > 0 && normalized.length < tokens.length) {
    console.warn(`Partially unrecognized day tokens in "${dayToken}", preserving original`);
    return dayToken;
  }
  
  // Couldn't parse at all - default to daily
  console.warn(`Unrecognized day token: ${dayToken}, defaulting to *`);
  return "*";
}

// Helper function to parse cron expression into day of week and hour
function parseCronSchedule(cronExpression: string): { dayOfWeek: string; hour: string; minute: string } {
  const parts = cronExpression.trim().split(/\s+/);
  
  // Validate we have 5 fields (minute hour day month dayOfWeek)
  if (parts.length !== 5) {
    console.warn(`Invalid cron expression: ${cronExpression}, using defaults`);
    return { dayOfWeek: "*", hour: "2", minute: "0" };
  }
  
  const [minute, hour, , , dayOfWeek] = parts;
  
  // Validate hour is numeric
  const hourNum = parseInt(hour);
  if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
    console.warn(`Invalid hour in cron: ${hour}, using default 2`);
    return { dayOfWeek: normalizeDayOfWeek(dayOfWeek), hour: "2", minute: minute || "0" };
  }
  
  return {
    dayOfWeek: normalizeDayOfWeek(dayOfWeek),
    hour: hour,
    minute: minute || "0"
  };
}

// Helper function to generate cron expression from day of week, hour, and minute
function generateCronSchedule(dayOfWeek: string, hour: string, minute: string = "0"): string {
  return `${minute} ${hour} * * ${dayOfWeek}`;
}

// Helper to check if day expression is simple (numeric only or *)
function isSimpleDayExpression(dayOfWeek: string): boolean {
  return dayOfWeek === "*" || /^\d+(,\d+)*$/.test(dayOfWeek);
}

// Helper function to get human-readable schedule description
function getScheduleDescription(dayOfWeek: string, hour: string, minute: string = "0"): string {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hourNum = parseInt(hour);
  const minuteNum = parseInt(minute);
  
  // Validate hour and minute
  if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
    return "Invalid schedule configuration";
  }
  if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
    return "Invalid schedule configuration";
  }
  
  const period = hourNum >= 12 ? "PM" : "AM";
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  const displayMinute = minuteNum.toString().padStart(2, "0");
  
  // If it's a complex expression, show the raw cron
  if (!isSimpleDayExpression(dayOfWeek)) {
    return `Advanced schedule (cron day: ${dayOfWeek}) at ${displayHour}:${displayMinute} ${period}`;
  }
  
  if (dayOfWeek === "*") {
    return `Every day at ${displayHour}:${displayMinute} ${period}`;
  }
  
  // Parse numeric day tokens
  const dayTokens = dayOfWeek.split(",").map(d => {
    const dayNum = parseInt(d.trim());
    if (isNaN(dayNum) || dayNum < 0 || dayNum > 6) {
      return null;
    }
    return dayNames[dayNum];
  }).filter(Boolean);
  
  if (dayTokens.length === 0) {
    return `Every day at ${displayHour}:${displayMinute} ${period}`;
  }
  
  return `Every ${dayTokens.join(", ")} at ${displayHour}:${displayMinute} ${period}`;
}

export function ScheduledImportCard() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("*"); // * = daily, 0 = Sunday, 1 = Monday, etc.
  const [hour, setHour] = useState("2"); // Hour of day (0-23)
  const [minute, setMinute] = useState("0"); // Minute of hour (preserve from config)
  const [daysToImport, setDaysToImport] = useState("7");
  const [dataTypes, setDataTypes] = useState<string[]>(["students", "classes", "visits", "sales"]);

  const { data: config, isLoading } = useQuery<ScheduledImportConfig>({
    queryKey: ["/api/scheduled-imports"],
  });

  useEffect(() => {
    if (config) {
      setEnabled(config.enabled);
      setDaysToImport(config.daysToImport.toString());
      
      // Parse the cron schedule to extract day of week, hour, and minute
      if (config.schedule) {
        const parsed = parseCronSchedule(config.schedule);
        setDayOfWeek(parsed.dayOfWeek);
        setHour(parsed.hour);
        setMinute(parsed.minute);
      }
      
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
      schedule: generateCronSchedule(dayOfWeek, hour, minute),
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
              {enabled ? getScheduleDescription(dayOfWeek, hour, minute) : "Automatically sync data on a schedule"}
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
            {!isSimpleDayExpression(dayOfWeek) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This schedule uses advanced cron syntax. Clicking any day button below will reset to a simple schedule.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <Label>Days to Run</Label>
              <p className="text-sm text-muted-foreground">
                Select which day(s) of the week to run the import
              </p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "0", label: "Sun" },
                  { value: "1", label: "Mon" },
                  { value: "2", label: "Tue" },
                  { value: "3", label: "Wed" },
                  { value: "4", label: "Thu" },
                  { value: "5", label: "Fri" },
                  { value: "6", label: "Sat" },
                  { value: "*", label: "Every Day" },
                ].map((day) => {
                  const isComplexSchedule = !isSimpleDayExpression(dayOfWeek);
                  const isEveryDay = dayOfWeek === "*";
                  const isDaySelected = isComplexSchedule 
                    ? false // Don't show selection for complex schedules
                    : day.value === "*" 
                      ? isEveryDay
                      : !isEveryDay && dayOfWeek.split(",").includes(day.value);
                  
                  return (
                    <Button
                      key={day.value}
                      type="button"
                      variant={isDaySelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        // If current schedule is complex, reset it to a simple schedule
                        if (isComplexSchedule) {
                          setDayOfWeek(day.value);
                          return;
                        }
                        
                        if (day.value === "*") {
                          setDayOfWeek("*");
                        } else {
                          // Toggle individual day
                          const currentDays = dayOfWeek === "*" ? [] : dayOfWeek.split(",").filter(Boolean);
                          if (currentDays.includes(day.value)) {
                            const newDays = currentDays.filter(d => d !== day.value);
                            setDayOfWeek(newDays.length > 0 ? newDays.join(",") : "*");
                          } else {
                            const newDays = [...currentDays, day.value].sort();
                            setDayOfWeek(newDays.join(","));
                          }
                        }
                      }}
                      data-testid={`button-day-${day.value}`}
                      className="w-full"
                    >
                      {day.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="hour">Time of Day</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger id="hour" data-testid="select-hour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">12:00 AM</SelectItem>
                  <SelectItem value="1">1:00 AM</SelectItem>
                  <SelectItem value="2">2:00 AM</SelectItem>
                  <SelectItem value="3">3:00 AM</SelectItem>
                  <SelectItem value="4">4:00 AM</SelectItem>
                  <SelectItem value="5">5:00 AM</SelectItem>
                  <SelectItem value="6">6:00 AM</SelectItem>
                  <SelectItem value="7">7:00 AM</SelectItem>
                  <SelectItem value="8">8:00 AM</SelectItem>
                  <SelectItem value="9">9:00 AM</SelectItem>
                  <SelectItem value="10">10:00 AM</SelectItem>
                  <SelectItem value="11">11:00 AM</SelectItem>
                  <SelectItem value="12">12:00 PM</SelectItem>
                  <SelectItem value="13">1:00 PM</SelectItem>
                  <SelectItem value="14">2:00 PM</SelectItem>
                  <SelectItem value="15">3:00 PM</SelectItem>
                  <SelectItem value="16">4:00 PM</SelectItem>
                  <SelectItem value="17">5:00 PM</SelectItem>
                  <SelectItem value="18">6:00 PM</SelectItem>
                  <SelectItem value="19">7:00 PM</SelectItem>
                  <SelectItem value="20">8:00 PM</SelectItem>
                  <SelectItem value="21">9:00 PM</SelectItem>
                  <SelectItem value="22">10:00 PM</SelectItem>
                  <SelectItem value="23">11:00 PM</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <p className="text-sm text-muted-foreground">
                How many days of data to fetch when this scheduled import runs
              </p>
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

            {config?.schedule && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Cron expression: </span>
                <code className="font-mono">{generateCronSchedule(dayOfWeek, hour, minute)}</code>
              </div>
            )}

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
