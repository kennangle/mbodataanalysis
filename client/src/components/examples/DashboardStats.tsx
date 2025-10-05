import { ThemeProvider } from "../ThemeProvider";
import { DashboardStats } from "../DashboardStats";

export default function DashboardStatsExample() {
  return (
    <ThemeProvider>
      <div className="p-6">
        <DashboardStats />
      </div>
    </ThemeProvider>
  );
}
