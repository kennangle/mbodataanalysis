import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import "./DatePicker.css";

interface DatePickerProps {
  className?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  "data-testid"?: string;
}

export function DatePicker({
  className,
  value,
  onChange,
  placeholder = "Pick a date",
  "data-testid": dataTestId,
}: DatePickerProps) {
  return (
    <div className={cn("date-picker-wrapper", className)}>
      <ReactDatePicker
        selected={value}
        onChange={(date) => onChange?.(date || undefined)}
        dateFormat="MM/dd/yyyy"
        placeholderText={placeholder}
        isClearable
        todayButton="Today"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        className="date-picker-input"
        calendarClassName="date-picker-calendar"
        data-testid={dataTestId}
      />
    </div>
  );
}
