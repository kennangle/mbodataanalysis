import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Activity } from "lucide-react";

interface DashboardStatsData {
  totalRevenue: number;
  revenueChange: string;
  activeStudents: number;
  totalStudents: number;
  studentChange: string;
  attendanceRate: string;
  attendanceChange: string;
  totalAttendanceRecords: number;
  classesThisMonth: number;
  classChange: string;
}

export function DashboardStats() {
  // Always query current month vs last month (no date params)
  const { data, isLoading } = useQuery<DashboardStatsData>({
    queryKey: ["/api/dashboard/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {[...Array(5)].map((_, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded mb-1" />
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Revenue",
      value: `$${data?.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 }) || "0"}`,
      change: `${data?.revenueChange || "0"}%`,
      trend: parseFloat(data?.revenueChange || "0") >= 0 ? "up" : "down",
      icon: DollarSign,
      note: "Excludes processing & service fees",
    },
    {
      title: "Active Students",
      value: data?.activeStudents.toLocaleString() || "0",
      change: data?.studentChange || "0%",
      trend: "up",
      icon: Users,
    },
    {
      title: "All Students",
      value: data?.totalStudents.toLocaleString() || "0",
      change: `${data?.activeStudents || 0} active`,
      trend: "neutral",
      icon: Users,
    },
    {
      title: "Class Attendance",
      value: `${data?.attendanceRate || "0"}%`,
      change: `${data?.totalAttendanceRecords?.toLocaleString() || "0"} records`,
      trend: "neutral",
      icon: Activity,
    },
    {
      title: "Classes This Month",
      value: data?.classesThisMonth.toString() || "0",
      change: data?.classChange || "0%",
      trend: "up",
      icon: Calendar,
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
        const trendColor =
          stat.trend === "up"
            ? "text-green-600 dark:text-green-400"
            : stat.trend === "down"
              ? "text-red-600 dark:text-red-400"
              : "text-muted-foreground";
        const showTrendIcon = stat.trend !== "neutral";

        return (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold truncate" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <div className={`flex items-center gap-1 text-xs ${trendColor} mt-1`}>
                {showTrendIcon && <TrendIcon className="h-3 w-3" />}
                <span>
                  {stat.change}
                  {stat.trend !== "neutral" ? " from last month" : ""}
                </span>
              </div>
              {'note' in stat && (
                <div className="text-xs text-muted-foreground mt-1.5 italic">
                  {stat.note}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
