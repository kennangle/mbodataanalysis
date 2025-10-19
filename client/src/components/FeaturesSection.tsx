import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Brain,
  BarChart3,
  Zap,
  Shield,
  Database,
  TrendingUp,
  FileText,
  Bell,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Queries",
    description: "Ask questions in plain English and get instant insights powered by advanced AI.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    description:
      "Interactive dashboards with live data synchronization and beautiful visualizations.",
  },
  {
    icon: Database,
    title: "Seamless Data Import",
    description: "Connect your Mindbody account and import all your data with a single click.",
  },
  {
    icon: FileText,
    title: "Custom Reports",
    description: "Generate detailed reports in multiple formats (PDF, Excel, CSV) on demand.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized for performance with intelligent caching and query optimization.",
  },
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description: "Forecast attendance, revenue, and retention with machine learning models.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description: "Get alerted about important trends, milestones, and anomalies in your data.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Bank-level encryption, role-based access control, and compliance ready.",
  },
  {
    icon: Lock,
    title: "Data Privacy",
    description: "Your data stays yours. GDPR compliant with automatic backups and recovery.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 px-6">
      <div className="container">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Everything You Need to Grow Your Business
          </h2>
          <p className="text-lg text-muted-foreground">
            Powerful features designed for fitness and wellness professionals who want to make
            data-driven decisions.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="hover-elevate" data-testid={`card-feature-${index}`}>
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
