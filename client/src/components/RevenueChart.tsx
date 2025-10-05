import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

//todo: remove mock functionality
const data = [
  { month: "Jan", revenue: 4200, students: 180 },
  { month: "Feb", revenue: 3800, students: 165 },
  { month: "Mar", revenue: 5100, students: 195 },
  { month: "Apr", revenue: 4600, students: 188 },
  { month: "May", revenue: 5800, students: 210 },
  { month: "Jun", revenue: 6200, students: 225 },
  { month: "Jul", revenue: 5900, students: 218 },
  { month: "Aug", revenue: 6800, students: 235 },
  { month: "Sep", revenue: 7200, students: 248 },
  { month: "Oct", revenue: 6900, students: 242 },
  { month: "Nov", revenue: 7600, students: 258 },
  { month: "Dec", revenue: 8100, students: 270 },
];

export function RevenueChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue & Growth Trend</CardTitle>
        <CardDescription>Monthly revenue and student enrollment over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
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
        </div>
      </CardContent>
    </Card>
  );
}
