import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

//todo: remove mock functionality
const data = [
  { day: "Mon", morning: 45, afternoon: 38, evening: 62 },
  { day: "Tue", morning: 52, afternoon: 42, evening: 58 },
  { day: "Wed", morning: 48, afternoon: 45, evening: 65 },
  { day: "Thu", morning: 50, afternoon: 40, evening: 60 },
  { day: "Fri", morning: 55, afternoon: 48, evening: 70 },
  { day: "Sat", morning: 65, afternoon: 52, evening: 45 },
  { day: "Sun", morning: 60, afternoon: 48, evening: 40 },
];

export function AttendanceChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Attendance by Time</CardTitle>
        <CardDescription>Average attendance distribution across different time slots</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
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
        </div>
      </CardContent>
    </Card>
  );
}
