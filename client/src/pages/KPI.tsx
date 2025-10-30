import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/DatePicker";
import { 
  TrendingUp, 
  Users, 
  UserCheck, 
  AlertCircle,
  Calendar,
  BarChart3,
  TrendingDown
} from "lucide-react";

interface KPIOverview {
  totalRevenue: number;
  activeMembers: number;
  totalStudents: number;
  churnRate: string;
  retentionRate: string;
}

interface HeatmapData {
  heatmapData: Array<{
    dayOfWeek: number;
    hour: number;
    avgUtilization: number;
  }>;
}

interface IntroConversion {
  introLineItems: number;
  uniqueIntroBuyers: number;
  introRevenue: number;
  converted: number;
  conversionRate: string;
}

interface ClassPerformanceData {
  classPerformance: Array<{
    classId: string;
    className: string;
    instructor: string;
    capacity: number;
    totalScheduled: number;
    avgAttendance: string;
    avgUtilization: string;
    isUnderperforming: boolean;
  }>;
  targetUtilization: number;
}

interface MembershipTrends {
  newMemberTrend: Array<{
    month: string;
    count: number;
  }>;
  currentActive: number;
  currentInactive: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function KPI() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Build query params for API calls
  const buildKPIUrl = (endpoint: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate.toISOString().split('T')[0]);
    if (endDate) params.append("endDate", endDate.toISOString().split('T')[0]);
    return params.toString() ? `${endpoint}?${params.toString()}` : endpoint;
  };

  // Call all hooks before any conditional returns
  const { data: overview, isLoading: overviewLoading } = useQuery<KPIOverview>({
    queryKey: ["/api/kpi/overview", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(buildKPIUrl("/api/kpi/overview"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: heatmap, isLoading: heatmapLoading } = useQuery<HeatmapData>({
    queryKey: ["/api/kpi/utilization-heatmap", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(buildKPIUrl("/api/kpi/utilization-heatmap"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: introConversion, isLoading: introLoading } = useQuery<IntroConversion>({
    queryKey: ["/api/kpi/intro-conversion", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(buildKPIUrl("/api/kpi/intro-conversion"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: classPerf, isLoading: classPerfLoading } = useQuery<ClassPerformanceData>({
    queryKey: ["/api/kpi/class-performance", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(buildKPIUrl("/api/kpi/class-performance"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!user,
  });

  const { data: membershipTrends, isLoading: membershipLoading } = useQuery<MembershipTrends>({
    queryKey: ["/api/kpi/membership-trends", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const res = await fetch(buildKPIUrl("/api/kpi/membership-trends"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // Conditional returns AFTER all hooks
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

  const setQuickDateRange = (range: "week" | "month" | "quarter" | "year") => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case "week":
        start.setDate(start.getDate() - 7);
        break;
      case "month":
        start.setMonth(start.getMonth() - 1);
        break;
      case "quarter":
        start.setMonth(start.getMonth() - 3);
        break;
      case "year":
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    
    setStartDate(start);
    setEndDate(end);
  };

  // Build heatmap grid
  const heatmapGrid = new Map<string, number>();
  heatmap?.heatmapData.forEach(item => {
    heatmapGrid.set(`${item.dayOfWeek}-${item.hour}`, item.avgUtilization);
  });

  const getUtilizationColor = (utilization: number | undefined) => {
    if (!utilization || utilization === 0) return "bg-muted";
    if (utilization < 40) return "bg-red-500/20 dark:bg-red-500/30";
    if (utilization < 60) return "bg-orange-500/20 dark:bg-orange-500/30";
    if (utilization < 80) return "bg-yellow-500/20 dark:bg-yellow-500/30";
    return "bg-green-500/20 dark:bg-green-500/30";
  };

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader title="KPIs" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-kpi-title">Key Performance Indicators</h1>
                  <p className="text-sm text-muted-foreground">
                    Track your studio's performance metrics and trends
                  </p>
                </div>
              </div>

              {/* Date Range Filter */}
              <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Date Range Filter</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate(undefined);
                setEndDate(undefined);
              }}
              disabled={!startDate && !endDate}
              data-testid="button-clear-dates"
            >
              Clear
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="Start date"
              data-testid="datepicker-start"
            />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="End date"
              data-testid="datepicker-end"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange("week")}
              data-testid="button-range-week"
            >
              Last Week
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange("month")}
              data-testid="button-range-month"
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange("quarter")}
              data-testid="button-range-quarter"
            >
              Last Quarter
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange("year")}
              data-testid="button-range-year"
            >
              Last Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-revenue-value">
                  ${overview?.totalRevenue.toLocaleString() || "0"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {startDate || endDate ? "Selected period" : "All time"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-active-members">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-active-members-value">
                  {overview?.activeMembers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {overview?.totalStudents || 0} total students
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-retention-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-retention-value">
                  {overview?.retentionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Member retention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-churn-rate">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <div className="text-2xl font-bold">Loading...</div>
            ) : (
              <>
                <div className="text-2xl font-bold" data-testid="text-churn-value">
                  {overview?.churnRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Member churn
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Intro Conversion Funnel */}
      <Card data-testid="card-intro-conversion">
        <CardHeader>
          <CardTitle>Intro Offer Conversion</CardTitle>
          <CardDescription>
            Track how intro offer purchases convert to memberships
          </CardDescription>
        </CardHeader>
        <CardContent>
          {introLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Purchases</div>
                  <div className="text-2xl font-bold" data-testid="text-intro-line-items">
                    {introConversion?.introLineItems || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    line items
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Unique Buyers</div>
                  <div className="text-2xl font-bold" data-testid="text-unique-buyers">
                    {introConversion?.uniqueIntroBuyers || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ${Number(introConversion?.introRevenue || 0).toLocaleString()} revenue
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Converted</div>
                  <div className="text-2xl font-bold" data-testid="text-converted-members">
                    {introConversion?.converted || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    became members
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Conversion Rate</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-conversion-rate">
                    {introConversion?.conversionRate || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    of unique buyers
                  </div>
                </div>
              </div>
              
              {/* Visual funnel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-blue-500 h-12 rounded-md flex items-center justify-center text-white font-semibold">
                    {introConversion?.uniqueIntroBuyers || 0} Unique Intro Buyers
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-green-500 h-10 rounded-md flex items-center justify-center text-white font-semibold">
                    {introConversion?.converted || 0} Converted ({introConversion?.conversionRate || 0}%)
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Utilization Heatmap */}
      <Card data-testid="card-utilization-heatmap">
        <CardHeader>
          <CardTitle>Class Utilization Heatmap</CardTitle>
          <CardDescription>
            Average class utilization by day and time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {heatmapLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-2 text-xs font-medium">Hour</th>
                    {DAYS.map(day => (
                      <th key={day} className="border p-2 text-xs font-medium">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOURS.map(hour => (
                    <tr key={hour}>
                      <td className="border p-2 text-xs font-medium text-center">
                        {hour.toString().padStart(2, '0')}:00
                      </td>
                      {DAYS.map((_, dayIdx) => {
                        const utilization = heatmapGrid.get(`${dayIdx}-${hour}`);
                        const utilizationNum = utilization ? Number(utilization) : undefined;
                        return (
                          <td 
                            key={dayIdx} 
                            className={`border p-2 text-xs text-center ${getUtilizationColor(utilizationNum)}`}
                            title={utilizationNum ? `${utilizationNum.toFixed(1)}%` : 'No data'}
                          >
                            {utilizationNum ? `${utilizationNum.toFixed(0)}%` : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Legend:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500/20 dark:bg-red-500/30 border" />
                  <span>&lt;40%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-500/20 dark:bg-orange-500/30 border" />
                  <span>40-60%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-500/20 dark:bg-yellow-500/30 border" />
                  <span>60-80%</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-500/20 dark:bg-green-500/30 border" />
                  <span>≥80%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class Performance */}
      <Card data-testid="card-class-performance">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Performance</CardTitle>
              <CardDescription>
                Classes ranked by utilization (Target: {classPerf?.targetUtilization || 80}%)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {classPerfLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2">
              {classPerf?.classPerformance.slice(0, 10).map((cls, idx) => (
                <div 
                  key={cls.classId} 
                  className="flex items-center gap-2 p-3 rounded-md hover-elevate"
                  data-testid={`class-performance-${idx}`}
                >
                  <div className="flex-1">
                    <div className="font-medium">{cls.className}</div>
                    <div className="text-xs text-muted-foreground">
                      {cls.instructor} • Cap: {cls.capacity} • {cls.totalScheduled} sessions
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${cls.isUnderperforming ? 'text-red-600' : 'text-green-600'}`}>
                      {cls.avgUtilization}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Avg: {cls.avgAttendance} students
                    </div>
                  </div>
                  {cls.isUnderperforming && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))}
              {!classPerf?.classPerformance.length && (
                <div className="text-center text-muted-foreground py-8">
                  No class data available for selected period
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Membership Trends */}
      <Card data-testid="card-membership-trends">
        <CardHeader>
          <CardTitle>Membership Trends</CardTitle>
          <CardDescription>
            New member acquisitions over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {membershipLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-muted-foreground">Currently Active</div>
                  <div className="text-2xl font-bold text-green-600" data-testid="text-current-active">
                    {membershipTrends?.currentActive || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Currently Inactive</div>
                  <div className="text-2xl font-bold text-red-600" data-testid="text-current-inactive">
                    {membershipTrends?.currentInactive || 0}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-medium">New Members by Month</div>
                {membershipTrends?.newMemberTrend.slice(-12).map((item) => (
                  <div key={item.month} className="flex items-center gap-2">
                    <div className="w-20 text-xs text-muted-foreground">{item.month}</div>
                    <div className="flex-1 bg-muted rounded-md h-8 relative overflow-hidden">
                      <div 
                        className="bg-primary h-full flex items-center justify-end px-2 text-xs font-medium text-primary-foreground"
                        style={{ width: `${Math.min((item.count / 10) * 100, 100)}%` }}
                      >
                        {item.count > 0 && item.count}
                      </div>
                    </div>
                  </div>
                ))}
                {!membershipTrends?.newMemberTrend.length && (
                  <div className="text-center text-muted-foreground py-4">
                    No membership trend data available
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
