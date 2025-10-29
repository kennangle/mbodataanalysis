import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { formatDateShort, formatDateTime } from "@/lib/timezone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Users,
  School,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  RefreshCw
} from "lucide-react";

interface QuickStatsResponse {
  totalStudents: number;
  totalClasses: number;
  totalAttendance: number;
  totalRevenue: number;
  revenueTransactions: number;
  latestImports: {
    attendance: string | null;
    revenue: string | null;
  };
}

export function QuickStats() {
  const { user } = useAuth();
  const timezone = user?.timezone || "UTC";
  
  const { data, isLoading, error, refetch, isRefetching } = useQuery<QuickStatsResponse>({
    queryKey: ["/api/reports/quick-stats"],
    refetchInterval: 60000, // Refresh every minute
  });

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Failed to Load Quick Stats</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Unable to fetch dashboard statistics. Please try again.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-retry-quick-stats"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-quick-stat-students">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quick-stat-students">
              {data.totalStudents.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active student roster
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-stat-classes">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quick-stat-classes">
              {data.totalClasses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Class definitions
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-stat-attendance">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quick-stat-attendance">
              {data.totalAttendance.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.latestImports.attendance 
                ? `Last: ${formatDateShort(data.latestImports.attendance, timezone)}`
                : "No imports yet"}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-quick-stat-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-quick-stat-revenue">
              ${data.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.revenueTransactions.toLocaleString()} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Imports Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Latest Imports
          </CardTitle>
          <CardDescription>Most recent data synchronization times</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Attendance</span>
              <span className="text-sm font-medium" data-testid="text-latest-attendance">
                {data.latestImports.attendance 
                  ? formatDateTime(data.latestImports.attendance, timezone)
                  : "Never imported"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="text-sm font-medium" data-testid="text-latest-revenue">
                {data.latestImports.revenue 
                  ? formatDateTime(data.latestImports.revenue, timezone)
                  : "Never imported"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
