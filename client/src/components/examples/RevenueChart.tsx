import { ThemeProvider } from "../ThemeProvider";
import { RevenueChart } from "../RevenueChart";

export default function RevenueChartExample() {
  return (
    <ThemeProvider>
      <div className="p-6">
        <RevenueChart />
      </div>
    </ThemeProvider>
  );
}
