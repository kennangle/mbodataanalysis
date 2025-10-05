import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";

export default function Reports() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
    },
    {
      title: "Attendance Report",
      description: "Student attendance patterns, trends, and class popularity",
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Class Performance",
      description: "Compare class performance, retention rates, and profitability",
      icon: TrendingUp,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Monthly Summary",
      description: "Comprehensive monthly overview of all key metrics",
      icon: Calendar,
      color: "text-orange-600 dark:text-orange-400",
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
            <ThemeToggle />
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
                      <CardContent>
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          data-testid={`button-generate-${index}`}
                        >
                          <Download className="h-4 w-4" />
                          Generate Report
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
                  <CardDescription>
                    Your recently generated reports
                  </CardDescription>
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
