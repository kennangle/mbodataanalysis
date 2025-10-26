import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  School,
  Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DataCoverageResponse {
  summary: {
    students: {
      total: number;
      dateRange: { earliest: string | null; latest: string | null };
    };
    classes: {
      total: number;
      dateRange: { earliest: string | null; latest: string | null };
    };
    schedules: {
      total: number;
      dateRange: { earliest: string | null; latest: string | null };
    };
    attendance: {
      total: number;
      attended: number;
      noShow: number;
      orphaned: number;
      dateRange: { earliest: string | null; latest: string | null };
    };
    revenue: {
      total: number;
      totalAmount: number;
      dateRange: { earliest: string | null; latest: string | null };
    };
  };
  monthlyBreakdown: {
    attendance: Array<{ month: string; count: number }>;
    revenue: Array<{ month: string; count: number }>;
  };
  dataQuality: {
    orphanedAttendanceRecords: number;
    studentsWithoutAttendance: number;
    classesWithoutSchedules: number;
  };
}

export default function DataCoverage() {
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery<DataCoverageResponse>({
    queryKey: ["/api/reports/data-coverage"],
  });

  const fixOrphanedAttendance = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/reports/fix-orphaned-attendance");
      const result = await response.json() as {
        success: boolean;
        message: string;
        deleted: {
          totalRecords: number;
          orphanedRecords: number;
          orphanedPercentage: string;
        };
        nextStep: string;
      };
      return result;
    },
    onSuccess: (result) => {
      toast({
        title: "Success",
        description: `Deleted ${result.deleted.totalRecords} attendance records (${result.deleted.orphanedPercentage} were orphaned). ${result.nextStep}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports/data-coverage"] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to fix orphaned attendance",
      });
    },
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return format(new Date(dateStr), "MMM d, yyyy");
  };

  const hasDataQualityIssues = data && (
    data.dataQuality.orphanedAttendanceRecords > 0 ||
    data.dataQuality.studentsWithoutAttendance > 0 ||
    data.dataQuality.classesWithoutSchedules > 0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Coverage Report</h1>
        <p className="text-muted-foreground">
          Comprehensive view of your data import status and quality
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load data coverage report. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading coverage data...</div>
      ) : data ? (
        <>
          {/* Data Quality Alerts */}
          {hasDataQualityIssues && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Data Quality Issues Detected</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-3">
                  {data.dataQuality.orphanedAttendanceRecords > 0 && (
                    <div className="space-y-2">
                      <div>• {data.dataQuality.orphanedAttendanceRecords} attendance records reference missing students</div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => fixOrphanedAttendance.mutate()}
                        disabled={fixOrphanedAttendance.isPending}
                        data-testid="button-fix-orphaned-attendance"
                        className="bg-destructive/10 border-destructive/20 hover:bg-destructive/20"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {fixOrphanedAttendance.isPending ? "Deleting..." : "Delete All Attendance & Re-import"}
                      </Button>
                    </div>
                  )}
                  {data.dataQuality.studentsWithoutAttendance > 0 && (
                    <div>• {data.dataQuality.studentsWithoutAttendance} students have no attendance records</div>
                  )}
                  {data.dataQuality.classesWithoutSchedules > 0 && (
                    <div>• {data.dataQuality.classesWithoutSchedules} classes have no schedules</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Students</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-student-count">{data.summary.students.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(data.summary.students.dateRange.earliest)} → {formatDate(data.summary.students.dateRange.latest)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Classes</CardTitle>
                <School className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-class-count">{data.summary.classes.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.schedules.total.toLocaleString()} schedules
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-attendance-count">{data.summary.attendance.total.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.attendance.attended.toLocaleString()} attended, {data.summary.attendance.noShow.toLocaleString()} no-show
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-revenue-amount">
                  ${data.summary.revenue.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.summary.revenue.total.toLocaleString()} transactions
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Date Ranges */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Data Coverage Periods
              </CardTitle>
              <CardDescription>Import date ranges for each data type</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Type</TableHead>
                    <TableHead>Earliest Record</TableHead>
                    <TableHead>Latest Record</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow data-testid="row-attendance-range">
                    <TableCell className="font-medium">Attendance</TableCell>
                    <TableCell>{formatDate(data.summary.attendance.dateRange.earliest)}</TableCell>
                    <TableCell>{formatDate(data.summary.attendance.dateRange.latest)}</TableCell>
                    <TableCell>
                      {data.dataQuality.orphanedAttendanceRecords > 0 ? (
                        <Badge variant="destructive">Issues Found</Badge>
                      ) : (
                        <Badge variant="secondary">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Healthy
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-revenue-range">
                    <TableCell className="font-medium">Revenue</TableCell>
                    <TableCell>{formatDate(data.summary.revenue.dateRange.earliest)}</TableCell>
                    <TableCell>{formatDate(data.summary.revenue.dateRange.latest)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Healthy
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Monthly Breakdown */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Attendance Breakdown</CardTitle>
                <CardDescription>Record count by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.monthlyBreakdown.attendance.map((item) => (
                    <div key={item.month} className="flex items-center justify-between" data-testid={`row-attendance-month-${item.month}`}>
                      <span className="text-sm font-medium">{item.month}</span>
                      <Badge variant="outline">{item.count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue Breakdown</CardTitle>
                <CardDescription>Transaction count by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.monthlyBreakdown.revenue.map((item) => (
                    <div key={item.month} className="flex items-center justify-between" data-testid={`row-revenue-month-${item.month}`}>
                      <span className="text-sm font-medium">{item.month}</span>
                      <Badge variant="outline">{item.count.toLocaleString()}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Quality Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Quality Metrics
              </CardTitle>
              <CardDescription>Potential issues that may require attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Orphaned Attendance Records</div>
                    <div className="text-sm text-muted-foreground">
                      Attendance records referencing students that don't exist
                    </div>
                  </div>
                  <Badge variant={data.dataQuality.orphanedAttendanceRecords > 0 ? "destructive" : "secondary"} data-testid="badge-orphaned-count">
                    {data.dataQuality.orphanedAttendanceRecords}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Students Without Attendance</div>
                    <div className="text-sm text-muted-foreground">
                      Students who have no recorded attendance
                    </div>
                  </div>
                  <Badge variant="secondary" data-testid="badge-no-attendance-count">
                    {data.dataQuality.studentsWithoutAttendance}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Classes Without Schedules</div>
                    <div className="text-sm text-muted-foreground">
                      Class definitions with no scheduled sessions
                    </div>
                  </div>
                  <Badge variant="secondary" data-testid="badge-no-schedule-count">
                    {data.dataQuality.classesWithoutSchedules}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
