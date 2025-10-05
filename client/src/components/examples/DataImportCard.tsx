import { ThemeProvider } from "../ThemeProvider";
import { DataImportCard } from "../DataImportCard";

export default function DataImportCardExample() {
  return (
    <ThemeProvider>
      <div className="p-6 max-w-2xl">
        <DataImportCard />
      </div>
    </ThemeProvider>
  );
}
