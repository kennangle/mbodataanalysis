import { ThemeProvider } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <div className="p-8 flex items-center justify-center gap-4">
        <ThemeToggle />
        <p className="text-sm text-muted-foreground">Click to toggle theme</p>
      </div>
    </ThemeProvider>
  );
}
