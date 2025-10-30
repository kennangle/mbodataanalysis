import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Notifications() {
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

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AppHeader title="Notifications" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Email Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    <CardTitle>Email Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Manage when and how you receive email notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-reports">Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive weekly analytics and performance reports
                      </p>
                    </div>
                    <Switch id="email-reports" data-testid="switch-email-reports" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-alerts">Data Import Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when data imports complete or fail
                      </p>
                    </div>
                    <Switch id="email-alerts" data-testid="switch-email-alerts" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-updates">Product Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Stay informed about new features and improvements
                      </p>
                    </div>
                    <Switch id="email-updates" data-testid="switch-email-updates" />
                  </div>
                </CardContent>
              </Card>

              {/* Push Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    <CardTitle>Push Notifications</CardTitle>
                  </div>
                  <CardDescription>
                    Control push notifications for real-time updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-attendance">Low Attendance Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Alert when class attendance drops below threshold
                      </p>
                    </div>
                    <Switch id="push-attendance" data-testid="switch-push-attendance" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-revenue">Revenue Milestones</Label>
                      <p className="text-sm text-muted-foreground">
                        Celebrate when you hit revenue targets
                      </p>
                    </div>
                    <Switch id="push-revenue" data-testid="switch-push-revenue" />
                  </div>
                </CardContent>
              </Card>

              {/* AI Query Notifications */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <CardTitle>AI Insights</CardTitle>
                  </div>
                  <CardDescription>
                    Get proactive AI-powered insights and recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai-insights">Daily Insights</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive AI-generated insights about your business
                      </p>
                    </div>
                    <Switch id="ai-insights" data-testid="switch-ai-insights" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="ai-recommendations">Smart Recommendations</Label>
                      <p className="text-sm text-muted-foreground">
                        Get AI recommendations to improve performance
                      </p>
                    </div>
                    <Switch id="ai-recommendations" data-testid="switch-ai-recommendations" />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button data-testid="button-save-notifications">Save Preferences</Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
