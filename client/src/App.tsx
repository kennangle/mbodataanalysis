import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/lib/auth";
import { CommandPalette } from "@/components/CommandPalette";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import KPI from "@/pages/KPI";
import Import from "@/pages/Import";
import Students from "@/pages/Students";
import Settings from "@/pages/Settings";
import Notifications from "@/pages/Notifications";
import Reports from "@/pages/Reports";
import Classes from "@/pages/Classes";
import Users from "@/pages/Users";
import SkippedRecords from "@/pages/SkippedRecords";
import DataCoverage from "@/pages/DataCoverage";
import AIQuery from "@/pages/AIQuery";
import PricingOptions from "@/pages/PricingOptions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/kpi" component={KPI} />
      <Route path="/ai-query" component={AIQuery} />
      <Route path="/students" component={Students} />
      <Route path="/classes" component={Classes} />
      <Route path="/pricing-options" component={PricingOptions} />
      <Route path="/users" component={Users} />
      <Route path="/reports" component={Reports} />
      <Route path="/data-coverage" component={DataCoverage} />
      <Route path="/skipped-records" component={SkippedRecords} />
      <Route path="/import" component={Import} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <CommandPalette />
          <AuthProvider>
            <Router />
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
