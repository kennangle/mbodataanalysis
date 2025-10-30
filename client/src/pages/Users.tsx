import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { UsersTable } from "@/components/UsersTable";

export default function Users() {
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
          <AppHeader title="Users" />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-2xl mx-auto">
              <UsersTable />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
