import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Users, DollarSign, Calendar, Activity } from "lucide-react";

//todo: remove mock functionality
const stats = [
  {
    title: "Total Revenue",
    value: "$45,231",
    change: "+20.1%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Active Students",
    value: "2,350",
    change: "+12.5%",
    trend: "up",
    icon: Users,
  },
  {
    title: "Class Attendance",
    value: "89%",
    change: "-2.3%",
    trend: "down",
    icon: Activity,
  },
  {
    title: "Classes This Month",
    value: "156",
    change: "+8.2%",
    trend: "up",
    icon: Calendar,
  },
];

export function DashboardStats() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === "up" ? TrendingUp : TrendingDown;
        const trendColor = stat.trend === "up" ? "text-green-600" : "text-red-600";

        return (
          <Card key={index} data-testid={`card-stat-${index}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`text-stat-value-${index}`}>
                {stat.value}
              </div>
              <div className={`flex items-center gap-1 text-xs ${trendColor} mt-1`}>
                <TrendIcon className="h-3 w-3" />
                <span>{stat.change} from last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
