import { ThemeProvider } from "../ThemeProvider";
import { StudentsTable } from "../StudentsTable";

export default function StudentsTableExample() {
  return (
    <ThemeProvider>
      <div className="p-6">
        <StudentsTable />
      </div>
    </ThemeProvider>
  );
}
