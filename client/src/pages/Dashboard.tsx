import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DashboardStats } from "@/components/DashboardStats";
import { RevenueChart } from "@/components/RevenueChart";
import { AttendanceChart } from "@/components/AttendanceChart";
import { DataImportCard } from "@/components/DataImportCard";
import { AIQueryInterface } from "@/components/AIQueryInterface";
import { StudentsTable } from "@/components/StudentsTable";

export default function Dashboard() {
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
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-screen-2xl mx-auto space-y-6">
              <DashboardStats />
              
              <div className="grid gap-6 lg:grid-cols-2">
                <RevenueChart />
                <AttendanceChart />
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <AIQueryInterface />
                <DataImportCard />
              </div>

              <StudentsTable />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
