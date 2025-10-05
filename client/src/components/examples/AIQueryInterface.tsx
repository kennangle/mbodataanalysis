import { ThemeProvider } from "../ThemeProvider";
import { AIQueryInterface } from "../AIQueryInterface";

export default function AIQueryInterfaceExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-2xl">
        <AIQueryInterface />
      </div>
    </ThemeProvider>
  );
}
