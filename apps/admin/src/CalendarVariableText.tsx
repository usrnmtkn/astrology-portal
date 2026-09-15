import { calendarVariableColor } from "./calendarOverviewTemplate";

/** Display the exact pattern, including conditional markers, without resolving it. */
export default function CalendarVariableText({ text }: { text: string }) {
  return <>{text.split(/(\{\{\s*[#/^]?\s*[\w.]+\s*\}\})/gu).map((part, index) => {
    const name = /^\{\{\s*[#/^]?\s*([\w.]+)\s*\}\}$/u.exec(part)?.[1];
    return name ? <span key={index} className="admin-composition-variable" data-variable-name={name} data-variable-color={calendarVariableColor(name)}>{part}</span> : part;
  })}</>;
}
