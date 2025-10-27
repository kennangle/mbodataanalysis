import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { BarChart3, Loader2, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      // If the server returns a resetLink (dev mode when email fails), capture it
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }

      setIsSuccess(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reset email",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between px-6">
          <a
            href="/"
            className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md px-2 py-1 -ml-2 cursor-pointer"
            data-testid="link-home-logo"
          >
            <BarChart3 className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Mindbody Analytics</span>
          </a>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSuccess ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-lg">
                    {resetLink ? "Reset Link Ready" : "Check your email"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {resetLink ? (
                      "Email service is unavailable. Use the link below to reset your password:"
                    ) : (
                      <>If an account exists for {email}, you will receive a password reset link shortly.</>
                    )}
                  </p>
                </div>
                {resetLink && (
                  <Button
                    onClick={() => {
                      // Extract token from resetLink
                      try {
                        const url = new URL(resetLink);
                        const token = url.searchParams.get('token');
                        if (token) {
                          setLocation(`/reset-password?token=${token}`);
                        } else {
                          window.location.href = resetLink;
                        }
                      } catch {
                        window.location.href = resetLink;
                      }
                    }}
                    data-testid="button-use-reset-link"
                    className="w-full"
                  >
                    Reset Password Now
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => (window.location.href = "/login")}
                  data-testid="button-back-to-login"
                  className="w-full"
                >
                  Back to login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  data-testid="button-send-reset-link"
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send reset link
                </Button>
              </form>
            )}
          </CardContent>
          {!isSuccess && (
            <CardFooter className="flex-col gap-2">
              <div className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <a href="/login" className="text-primary hover:underline" data-testid="link-login">
                  Sign in
                </a>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
