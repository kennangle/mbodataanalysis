import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "../ThemeProvider";
import { AppSidebar } from "../AppSidebar";

export default function AppSidebarExample() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex-1 p-6">
            <p className="text-muted-foreground">Main content area</p>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
