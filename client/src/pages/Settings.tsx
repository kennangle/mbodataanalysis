import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LogOut, Download, Database, Code2, CheckCircle, AlertTriangle, Loader2, Globe, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TimezoneSelect, { type ITimezone } from "react-timezone-select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const { user, isLoading, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDownloadingDb, setIsDownloadingDb] = useState(false);
  const [isDownloadingCode, setIsDownloadingCode] = useState(false);
  const [integrityCheck, setIntegrityCheck] = useState<{
    totalRecords: number;
    sampleSize: number;
    conclusion: string;
    message: string;
    analysis?: {
      withBothIds?: number;
      withMindbodyIds?: number;
      withSaleIdOnly?: number;
      withItemIdOnly?: number;
      withoutIds?: number;
    };
    deduplicationInfo?: string;
  } | null>(null);
  const [isCheckingIntegrity, setIsCheckingIntegrity] = useState(false);
  const [selectedTimezone, setSelectedTimezone] = useState<ITimezone>(user?.timezone || "UTC");
  const [isSavingTimezone, setIsSavingTimezone] = useState(false);

  // Mindbody credentials state
  const [mindbodyCredentials, setMindbodyCredentials] = useState({
    siteId: "",
    apiKey: "",
    staffUsername: "",
    staffPassword: "",
  });

  // Fetch Mindbody credentials
  const { data: credentials } = useQuery({
    queryKey: ["/api/organization/mindbody-credentials"],
    enabled: user?.role === "admin",
  });

  // Update credentials when fetched
  useEffect(() => {
    if (credentials) {
      setMindbodyCredentials({
        siteId: credentials.siteId || "",
        apiKey: credentials.apiKey || "",
        staffUsername: credentials.staffUsername || "",
        staffPassword: credentials.staffPassword || "",
      });
    }
  }, [credentials]);

  // Save Mindbody credentials mutation
  const saveCredentialsMutation = useMutation({
    mutationFn: async (data: typeof mindbodyCredentials) => {
      return await apiRequest("/api/organization/mindbody-credentials", {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization/mindbody-credentials"] });
      toast({
        title: "Success",
        description: "Mindbody credentials updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update Mindbody credentials",
      });
    },
  });

  // Sync selectedTimezone when user data loads
  useEffect(() => {
    if (user?.timezone) {
      setSelectedTimezone(user.timezone);
    }
  }, [user]);

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

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const handleDatabaseBackup = async () => {
    setIsDownloadingDb(true);
    try {
      const response = await fetch("/api/backups/database-json", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create database backup");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `database-backup-${new Date().toISOString()}.json`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Database backup downloaded successfully",
      });
    } catch (error) {
      console.error("Database backup error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create database backup",
      });
    } finally {
      setIsDownloadingDb(false);
    }
  };

  const handleCodebaseBackup = async () => {
    setIsDownloadingCode(true);
    try {
      const response = await fetch("/api/backups/codebase", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create codebase backup");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `codebase-backup-${new Date().toISOString()}.zip`;
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Codebase backup downloaded successfully",
      });
    } catch (error) {
      console.error("Codebase backup error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create codebase backup",
      });
    } finally {
      setIsDownloadingCode(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIsCheckingIntegrity(true);
    try {
      const response = await fetch("/api/revenue/check-integrity", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to check revenue integrity");
      }

      const data = await response.json();
      setIntegrityCheck(data);

      toast({
        title: "Check Complete",
        description: "Revenue data integrity checked successfully",
      });
    } catch (error) {
      console.error("Integrity check error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check revenue data integrity",
      });
    } finally {
      setIsCheckingIntegrity(false);
    }
  };

  const handleSaveTimezone = async () => {
    setIsSavingTimezone(true);
    try {
      const timezoneValue = typeof selectedTimezone === "string" 
        ? selectedTimezone 
        : selectedTimezone.value;

      const response = await fetch("/api/users/me/timezone", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ timezone: timezoneValue }),
      });

      if (!response.ok) {
        throw new Error("Failed to update timezone");
      }

      // Refresh user context to get updated timezone
      await refreshUser();

      toast({
        title: "Success",
        description: "Timezone updated successfully",
      });
    } catch (error) {
      console.error("Timezone update error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update timezone preference",
      });
    } finally {
      setIsSavingTimezone(false);
    }
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-4 border-b">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-lg font-semibold">Settings</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Account Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Your account details and profile information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input id="name" defaultValue={user.name} disabled data-testid="input-name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={user.email}
                        disabled
                        data-testid="input-email"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue={user.role} disabled data-testid="input-role" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select your timezone for accurate date and time display
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <TimezoneSelect
                          value={selectedTimezone}
                          onChange={setSelectedTimezone}
                          data-testid="select-timezone"
                        />
                      </div>
                      <Button
                        onClick={handleSaveTimezone}
                        disabled={isSavingTimezone}
                        data-testid="button-save-timezone"
                      >
                        {isSavingTimezone ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Organization Settings */}
              <Card>
                <CardHeader>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>Manage your organization settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-id">Organization ID</Label>
                    <Input
                      id="org-id"
                      defaultValue={user.organizationId || ""}
                      disabled
                      data-testid="input-org-id"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Mindbody Integration (Admin Only) */}
              {user.role === "admin" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      Mindbody Integration
                    </CardTitle>
                    <CardDescription>
                      Configure your Mindbody API credentials to enable data imports
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="mindbody-site-id">Site ID</Label>
                        <Input
                          id="mindbody-site-id"
                          placeholder="e.g., 133"
                          value={mindbodyCredentials.siteId}
                          onChange={(e) =>
                            setMindbodyCredentials((prev) => ({
                              ...prev,
                              siteId: e.target.value,
                            }))
                          }
                          data-testid="input-mindbody-site-id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mindbody-api-key">API Key</Label>
                        <Input
                          id="mindbody-api-key"
                          type="password"
                          placeholder="Your Mindbody API Key"
                          value={mindbodyCredentials.apiKey}
                          onChange={(e) =>
                            setMindbodyCredentials((prev) => ({
                              ...prev,
                              apiKey: e.target.value,
                            }))
                          }
                          data-testid="input-mindbody-api-key"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="mindbody-username">Staff Username</Label>
                        <Input
                          id="mindbody-username"
                          placeholder="e.g., _YHC"
                          value={mindbodyCredentials.staffUsername}
                          onChange={(e) =>
                            setMindbodyCredentials((prev) => ({
                              ...prev,
                              staffUsername: e.target.value,
                            }))
                          }
                          data-testid="input-mindbody-username"
                        />
                        <p className="text-xs text-muted-foreground">
                          Source name with underscore prefix (e.g., _YHC)
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mindbody-password">Staff Password</Label>
                        <Input
                          id="mindbody-password"
                          type="password"
                          placeholder="Your staff password"
                          value={mindbodyCredentials.staffPassword}
                          onChange={(e) =>
                            setMindbodyCredentials((prev) => ({
                              ...prev,
                              staffPassword: e.target.value,
                            }))
                          }
                          data-testid="input-mindbody-password"
                        />
                      </div>
                    </div>
                    <Separator />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => saveCredentialsMutation.mutate(mindbodyCredentials)}
                        disabled={
                          saveCredentialsMutation.isPending ||
                          !mindbodyCredentials.siteId ||
                          !mindbodyCredentials.apiKey ||
                          !mindbodyCredentials.staffUsername ||
                          !mindbodyCredentials.staffPassword
                        }
                        data-testid="button-save-mindbody-credentials"
                      >
                        {saveCredentialsMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Save Credentials
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Revenue Data Check (Admin Only) */}
              {user.role === "admin" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Data Check</CardTitle>
                    <CardDescription>
                      Check if your revenue data will create duplicates when importing from Mindbody API
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Check Revenue Integrity</p>
                        <p className="text-sm text-muted-foreground">
                          Analyze your existing revenue records to detect potential duplicate issues
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleCheckIntegrity}
                        disabled={isCheckingIntegrity}
                        data-testid="button-check-integrity"
                      >
                        {isCheckingIntegrity ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Checking...
                          </>
                        ) : (
                          <>
                            <Database className="h-4 w-4 mr-2" />
                            Check Now
                          </>
                        )}
                      </Button>
                    </div>

                    {integrityCheck && (
                      <div className="space-y-3 pt-2">
                        <Separator />
                        <Alert 
                          variant={
                            integrityCheck.conclusion === "safe" 
                              ? "default" 
                              : integrityCheck.conclusion === "mixed"
                                ? "default"
                                : "destructive"
                          }
                        >
                          {integrityCheck.conclusion === "safe" ? (
                            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : integrityCheck.conclusion === "mixed" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                          <AlertTitle>
                            {integrityCheck.conclusion === "safe" 
                              ? "✓ Safe to Import" 
                              : integrityCheck.conclusion === "mixed"
                                ? "⚠ Mixed Dataset - Partial Duplicates Expected"
                                : "✗ Duplicate Risk"}
                          </AlertTitle>
                          <AlertDescription className="mt-2">{integrityCheck.message}</AlertDescription>
                        </Alert>

                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Revenue Records:</span>
                            <span className="font-medium">{integrityCheck.totalRecords.toLocaleString()}</span>
                          </div>
                          {integrityCheck.sampleSize > 0 && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sample Analyzed:</span>
                                <span className="font-medium">{integrityCheck.sampleSize} records</span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Complete IDs (Sale + Item):</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {integrityCheck.analysis?.withBothIds ?? integrityCheck.analysis?.withMindbodyIds ?? 0} / {integrityCheck.sampleSize}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sale ID Only (Safe):</span>
                                <span className="font-medium text-green-600 dark:text-green-400">
                                  {integrityCheck.analysis?.withSaleIdOnly ?? 0} / {integrityCheck.sampleSize}
                                </span>
                              </div>
                              {(integrityCheck.analysis?.withItemIdOnly ?? 0) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Item ID Only (Duplicates):</span>
                                  <span className="font-medium text-red-600 dark:text-red-400">
                                    {integrityCheck.analysis?.withItemIdOnly ?? 0} / {integrityCheck.sampleSize}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">No IDs (Duplicates):</span>
                                <span className={`font-medium ${(integrityCheck.analysis?.withoutIds ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                                  {integrityCheck.analysis?.withoutIds ?? 0} / {integrityCheck.sampleSize}
                                </span>
                              </div>
                              {integrityCheck?.deduplicationInfo && (
                                <>
                                  <Separator />
                                  <p className="text-xs text-muted-foreground italic">
                                    {integrityCheck.deduplicationInfo}
                                  </p>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Backup */}
              <Card>
                <CardHeader>
                  <CardTitle>Backup</CardTitle>
                  <CardDescription>Download backups of your database and codebase</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Database className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Database Backup</p>
                        <p className="text-sm text-muted-foreground">
                          Download all your data as JSON (students, classes, attendance, revenue)
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleDatabaseBackup}
                      disabled={isDownloadingDb}
                      data-testid="button-backup-database"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloadingDb ? "Downloading..." : "Download"}
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-primary/10">
                        <Code2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Codebase Backup</p>
                        <p className="text-sm text-muted-foreground">
                          Download complete source code as ZIP file
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={handleCodebaseBackup}
                      disabled={isDownloadingCode}
                      data-testid="button-backup-codebase"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {isDownloadingCode ? "Downloading..." : "Download"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Manage your account security settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Password</p>
                      <p className="text-sm text-muted-foreground">
                        Change your password to keep your account secure
                      </p>
                    </div>
                    <Button variant="outline" disabled data-testid="button-change-password">
                      Change Password
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Sign Out</p>
                      <p className="text-sm text-muted-foreground">
                        Sign out of your account on this device
                      </p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} data-testid="button-logout">
                      Sign Out
                    </Button>
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
