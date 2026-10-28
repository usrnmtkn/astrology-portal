import { useState, type Ref } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { dateFromInput, dateInputValue } from "../../services/skySelection";

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function calendarDaysFor(month: Date) {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstOfMonth);

  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export default function SkyDatePicker({
  onClose,
  embedded = false,
  pickerRef,
  value,
  onSelect
}: {
  onClose: () => void;
  embedded?: boolean;
  pickerRef?: Ref<HTMLElement>;
  value: string;
  onSelect: (value: string) => void;
}) {
  const selectedDate = dateFromInput(value);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  const days = calendarDaysFor(visibleMonth);
  const todayValue = dateInputValue();
  const selectedValue = dateInputValue(selectedDate);
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <section className={`date-picker${embedded ? " date-picker--embedded" : ""}`} id="sky-date-picker" ref={pickerRef} aria-label="Pick Date">
      <div className="date-picker-header">
        <button className="date-picker-nav" type="button" aria-label="Previous month" onClick={() => setVisibleMonth((month) => addMonths(month, -1))}>
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <strong>{monthLabel(visibleMonth)}</strong>
        <span className="date-picker-header-actions">
          <button className="date-picker-nav" type="button" aria-label="Next month" onClick={() => setVisibleMonth((month) => addMonths(month, 1))}>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
          {!embedded && <button className="date-picker-close picker-close" type="button" aria-label="Close date picker" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>}
        </span>
      </div>

      <div className="date-picker-weekdays" aria-hidden="true">
        {weekdayLabels.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="date-picker-grid" role="grid" aria-label={monthLabel(visibleMonth)}>
        {days.map((day) => {
          const dayValue = dateInputValue(day);
          const isSelected = dayValue === selectedValue;
          const isToday = dayValue === todayValue;
          const isOutsideMonth = day.getMonth() !== visibleMonth.getMonth();

          return (
            <button
              key={dayValue}
              type="button"
              className={[
                isSelected ? "selected" : "",
                isToday ? "today" : "",
                isOutsideMonth ? "outside-month" : ""
              ].filter(Boolean).join(" ")}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              aria-selected={isSelected}
              role="gridcell"
              onClick={() => onSelect(dayValue)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {!embedded && <div className="date-picker-actions">
        <button className="date-picker-cancel" type="button" onClick={onClose}>
          Cancel
        </button>
        <button className="date-picker-today" type="button" onClick={() => onSelect(todayValue)}>
          Today
        </button>
      </div>}
    </section>
  );
}

