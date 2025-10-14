import {
  LayoutDashboard,
  BarChart3,
  FileText,
  Users,
  Calendar,
  Settings,
  Database,
  Bell,
  UserCog,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth";

const menuItems = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Analytics", url: "/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Data Management",
    items: [
      { title: "Students", url: "/students", icon: Users },
      { title: "Classes", url: "/classes", icon: Calendar },
      { title: "Reports", url: "/reports", icon: FileText },
      { title: "Import Data", url: "/import", icon: Database },
    ],
  },
  {
    title: "Settings",
    items: [
      { title: "Users", url: "/users", icon: UserCog, adminOnly: true },
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  return (
    <Sidebar>
      <SidebarContent>
        {menuItems.map((section) => (
          <SidebarGroup key={section.title}>
            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items
                  .filter((item) => !item.adminOnly || isAdmin)
                  .map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <a href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
