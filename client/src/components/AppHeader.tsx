import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <header className="flex items-center justify-between gap-4 p-4 border-b">
      <div className="flex items-center gap-2">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground" data-testid="text-version">
          v0.03
        </span>
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
  );
}
