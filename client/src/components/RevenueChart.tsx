import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { DatePicker } from "./DatePicker";

interface RevenueChartProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
}

export function RevenueChart({ startDate, endDate, onStartDateChange, onEndDateChange }: RevenueChartProps) {

  const queryParams = new URLSearchParams();
  if (startDate) {
    queryParams.append("startDate", startDate.toISOString());
  }
  if (endDate) {
    queryParams.append("endDate", endDate.toISOString());
  }

  const queryString = queryParams.toString();
  const queryKey = queryString 
    ? `/api/dashboard/revenue-trend?${queryString}`
    : "/api/dashboard/revenue-trend";

  const { data, isLoading } = useQuery<Array<{ month: string; revenue: number; students: number }>>({
    queryKey: [queryKey],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue & Growth Trend</CardTitle>
          <CardDescription>Monthly revenue and student enrollment over the past year</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasData = data && data.length > 0 && data.some(d => d.revenue > 0);

  // Generate description based on date range
  const getDescription = () => {
    if (startDate && endDate) {
      return `Monthly revenue from ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (startDate) {
      return `Monthly revenue from ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to present`;
    } else if (endDate) {
      return `Monthly revenue through ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return "Monthly revenue and student enrollment over the past year";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Revenue & Growth Trend</CardTitle>
            <CardDescription>{getDescription()}</CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Start:</span>
              <DatePicker value={startDate} onChange={onStartDateChange} placeholder="All time" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">End:</span>
              <DatePicker value={endDate} onChange={onEndDateChange} placeholder="All time" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          {!hasData ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <p>No revenue data available</p>
                <p className="text-xs mt-1">Import sales data to see trends</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" opacity={0.3} />
                <XAxis 
                  dataKey="month" 
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
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="students" 
                  stroke="hsl(var(--chart-2))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--chart-2))", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
