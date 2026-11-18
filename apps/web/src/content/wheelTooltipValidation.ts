export const WHEEL_TOOLTIP_PREFIX = "cms/wheel-tooltip/";
export const wheelTooltipHouseVariable = (key: string) => key === WHEEL_TOOLTIP_PREFIX + "variables/house-ordinal" || key === WHEEL_TOOLTIP_PREFIX + "variables/ruler-house-ordinal";
export const wheelTooltipHouseSlots = ["house", "houseOrdinal"];

export function wheelTooltipDraftErrors(key: string, body: string, allowedSlots: readonly string[]): string[] {
  if (!key.startsWith(WHEEL_TOOLTIP_PREFIX)) return [];
  const errors: string[] = [];
  const slots = [...body.matchAll(/\{\{(\w+)\}\}/gu)].map(match => match[1]);
  if (/[{}]/u.test(body.replace(/\{\{\w+\}\}/gu, ""))) errors.push("Use the listed double-brace variables, such as {{sign}}.");
  if (slots.some(slot => !allowedSlots.includes(slot))) errors.push("This tooltip contains an unsupported variable.");
  if (wheelTooltipHouseVariable(key)) {
    if (!slots.some(slot => wheelTooltipHouseSlots.includes(slot))) errors.push("Keep a calculated house variable: {{house}} or {{houseOrdinal}}.");
  } else for (const slot of allowedSlots) if (!slots.includes(slot)) errors.push(`Keep the calculated {{${slot}}} variable.`);
  if (!body.trim()) errors.push("Keep wording in this tooltip.");
  if (body.length > 10_000) errors.push("Keep this tooltip under 10,000 characters.");
  if (/[<>]/u.test(body)) errors.push("Use plain writing without HTML.");
  return errors;
}
