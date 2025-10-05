import { ThemeProvider } from "../ThemeProvider";
import { LoginForm } from "../LoginForm";

export default function LoginFormExample() {
  return (
    <ThemeProvider>
      <div className="min-h-screen flex items-center justify-center p-6 bg-muted/30">
        <LoginForm />
      </div>
    </ThemeProvider>
  );
}
