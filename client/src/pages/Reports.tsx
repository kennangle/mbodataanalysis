import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Download, TrendingUp, Users, DollarSign, Calendar, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Reports() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [downloadingReport, setDownloadingReport] = useState<string | null>(null);

  // Default to last 30 days
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 30);

  // Date ranges for each report type
  const [dateRanges, setDateRanges] = useState<Record<string, { start: Date; end: Date }>>({
    revenue: { start: defaultStartDate, end: defaultEndDate },
    attendance: { start: defaultStartDate, end: defaultEndDate },
    "class-performance": { start: defaultStartDate, end: defaultEndDate },
    "monthly-summary": { start: defaultStartDate, end: defaultEndDate },
  });

  const updateDateRange = (reportType: string, field: "start" | "end", date: Date | null) => {
    if (!date) return;
    setDateRanges((prev) => ({
      ...prev,
      [reportType]: {
        ...prev[reportType],
        [field]: date,
      },
    }));
  };

  const setQuickDateRange = (reportType: string, range: "week" | "month" | "year") => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    setDateRanges((prev) => ({
      ...prev,
      [reportType]: { start, end },
    }));
  };

  const downloadReport = async (endpoint: string, reportName: string, reportType: string) => {
    setDownloadingReport(reportName);
    try {
      const dateRange = dateRanges[reportType];
      // Format dates as YYYY-MM-DD in local timezone (not UTC)
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      const startDate = formatDate(dateRange.start);
      const endDate = formatDate(dateRange.end);
      
      const apiUrl = `${endpoint}?startDate=${startDate}&endDate=${endDate}`;
      
      const response = await fetch(apiUrl, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportName}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Report Generated",
        description: `${reportName} has been downloaded successfully.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingReport(null);
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const reportTypes = [
    {
      title: "Revenue Report",
      description: "Detailed breakdown of revenue by source, class, and time period",
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      endpoint: "/api/reports/revenue",
      filename: "revenue-report",
      type: "revenue",
    },
    {
      title: "Attendance Report",
      description: "Student attendance patterns, trends, and class popularity",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      endpoint: "/api/reports/attendance",
      filename: "attendance-report",
      type: "attendance",
    },
    {
      title: "Class Performance",
      description: "Compare class performance, retention rates, and profitability",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
      endpoint: "/api/reports/class-performance",
      filename: "class-performance",
      type: "class-performance",
    },
    {
      title: "Monthly Summary",
      description: "Comprehensive overview of all key metrics",
      icon: Calendar,
      color: "text-orange-600 dark:text-orange-400",
      endpoint: "/api/reports/monthly-summary",
      filename: "monthly-summary",
      type: "monthly-summary",
    },
  ];

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold">Reports</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await logout();
                  setLocation("/login");
                }}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Generate Reports</h2>
                <p className="text-muted-foreground">
                  Create custom reports to analyze your business performance
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {reportTypes.map((report, index) => {
                  const Icon = report.icon;
                  const dateRange = dateRanges[report.type];
                  return (
                    <Card key={index} data-testid={`card-report-${index}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-muted ${report.color}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle>{report.title}</CardTitle>
                              <CardDescription className="mt-1.5">
                                {report.description}
                              </CardDescription>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Quick select:</span>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQuickDateRange(report.type, "week")}
                                data-testid={`button-quick-week-${index}`}
                              >
                                Last Week
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQuickDateRange(report.type, "month")}
                                data-testid={`button-quick-month-${index}`}
                              >
                                Last Month
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQuickDateRange(report.type, "year")}
                                data-testid={`button-quick-year-${index}`}
                              >
                                Last Year
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`start-date-${index}`} className="text-sm">
                              Start Date
                            </Label>
                            <DatePicker
                              id={`start-date-${index}`}
                              selected={dateRange.start}
                              onChange={(date) => updateDateRange(report.type, "start", date)}
                              selectsStart
                              startDate={dateRange.start}
                              endDate={dateRange.end}
                              maxDate={dateRange.end}
                              dateFormat="MMM d, yyyy"
                              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background hover-elevate"
                              wrapperClassName="w-full"
                              data-testid={`datepicker-start-${index}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`end-date-${index}`} className="text-sm">
                              End Date
                            </Label>
                            <DatePicker
                              id={`end-date-${index}`}
                              selected={dateRange.end}
                              onChange={(date) => updateDateRange(report.type, "end", date)}
                              selectsEnd
                              startDate={dateRange.start}
                              endDate={dateRange.end}
                              minDate={dateRange.start}
                              maxDate={new Date()}
                              dateFormat="MMM d, yyyy"
                              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background hover-elevate"
                              wrapperClassName="w-full"
                              data-testid={`datepicker-end-${index}`}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          data-testid={`button-generate-${index}`}
                          onClick={() => downloadReport(report.endpoint, report.filename, report.type)}
                          disabled={downloadingReport === report.filename}
                        >
                          <Download className="h-4 w-4" />
                          {downloadingReport === report.filename
                            ? "Generating..."
                            : "Generate Report"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Recent Reports */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle>Recent Reports</CardTitle>
                  </div>
                  <CardDescription>Your recently generated reports</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-2">No reports generated yet</p>
                    <p className="text-sm text-muted-foreground">
                      Generate your first report to see it here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
