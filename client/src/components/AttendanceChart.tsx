import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";
import { DatePickerWithRange } from "./DateRangePicker";

export function AttendanceChart() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  const queryParams = new URLSearchParams();
  if (dateRange?.from) {
    queryParams.append("startDate", dateRange.from.toISOString());
  }
  if (dateRange?.to) {
    queryParams.append("endDate", dateRange.to.toISOString());
  }

  const queryString = queryParams.toString();
  const queryKey = queryString 
    ? `/api/dashboard/attendance-by-time?${queryString}`
    : "/api/dashboard/attendance-by-time";

  const { data, isLoading } = useQuery<Array<{ day: string; morning: number; afternoon: number; evening: number }>>({
    queryKey: [queryKey],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Class Attendance by Time</CardTitle>
          <CardDescription>Average attendance distribution across different time slots</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0 && data.some(d => d.morning > 0 || d.afternoon > 0 || d.evening > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Class Attendance by Time</CardTitle>
            <CardDescription>Average attendance distribution across different time slots</CardDescription>
          </div>
          <DatePickerWithRange value={dateRange} onChange={setDateRange} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <p>No attendance data available</p>
                <p className="text-xs mt-1">Import visits data to see attendance patterns</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                <XAxis 
                  dataKey="day" 
                  className="text-xs" 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis 
                  className="text-xs" 
                  tick={{ fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar dataKey="morning" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="afternoon" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="evening" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
