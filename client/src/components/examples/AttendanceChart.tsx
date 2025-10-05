import { ThemeProvider } from "../ThemeProvider";
import { AttendanceChart } from "../AttendanceChart";

export default function AttendanceChartExample() {
  return (
    <ThemeProvider>
      <div className="p-6">
        <AttendanceChart />
      </div>
    </ThemeProvider>
  );
}
