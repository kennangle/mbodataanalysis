import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardStats } from "@/components/DashboardStats";
import { RevenueChart } from "@/components/RevenueChart";
import { AttendanceChart } from "@/components/AttendanceChart";
import { DataImportCard } from "@/components/DataImportCard";
import { AIQueryInterface } from "@/components/AIQueryInterface";
import { StudentsTable } from "@/components/StudentsTable";
import { WebhookManagement } from "@/components/WebhookManagement";
import { DatePicker } from "@/components/DatePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Calendar } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Shared date range state - default to all-time (no dates selected)
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

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

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold">Dashboard</h1>
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
              <DashboardStats startDate={startDate} endDate={endDate} />

              {/* Centralized Date Range Picker */}
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quick select:</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDateRange("week")}
                        data-testid="button-quick-week"
                      >
                        Last Week
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDateRange("month")}
                        data-testid="button-quick-month"
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDateRange("quarter")}
                        data-testid="button-quick-quarter"
                      >
                        Last Quarter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setQuickDateRange("year")}
                        data-testid="button-quick-year"
                      >
                        Last Year
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        Start:
                      </span>
                      <DatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="All time"
                        data-testid="datepicker-start"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">End:</span>
                      <DatePicker
                        value={endDate}
                        onChange={setEndDate}
                        placeholder="All time"
                        data-testid="datepicker-end"
                      />
                    </div>
                    {(startDate || endDate) && (
                      <div className="text-sm text-muted-foreground">
                        {startDate && endDate
                          ? `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                          : startDate
                            ? `From ${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                            : `Through ${endDate?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                <RevenueChart startDate={startDate} endDate={endDate} />
                <AttendanceChart startDate={startDate} endDate={endDate} />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AIQueryInterface />
                <DataImportCard />
              </div>

              <WebhookManagement />

              <StudentsTable />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
