import { calendarVariableColor } from "./calendarOverviewTemplate";
import { StudioButton } from "./StudioControls";

/** Display the exact pattern, including conditional markers, without resolving it. */
export default function CalendarVariableText({ text, onSelect }: { text: string; onSelect?: (name: string) => void }) {
  return <>{text.split(/(\{\{\s*[#/^]?\s*[\w.]+\s*\}\})/gu).map((part, index) => {
    const name = /^\{\{\s*[#/^]?\s*([\w.]+)\s*\}\}$/u.exec(part)?.[1];
    if (!name) return part;
    const props = { className: "admin-composition-variable", "data-variable-name": name, "data-variable-color": calendarVariableColor(name) };
    return onSelect
      ? <StudioButton key={index} {...props} aria-label={`Open ${name}`} title={`Open ${name}`} onClick={() => onSelect(name)}>{part}</StudioButton>
      : <span key={index} {...props}>{part}</span>;
  })}</>;
}
