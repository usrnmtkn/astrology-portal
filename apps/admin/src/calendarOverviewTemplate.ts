import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

export function calendarOverviewPeriod(key: string): SkyForecastPeriod | undefined {
  return (Object.keys(skyForecastTemplates) as SkyForecastPeriod[]).find(period => skyForecastTemplates[period].contentKey === key);
}

export function calendarOverviewFields(period: SkyForecastPeriod) {
  if (period === "daily-sky") return [];
  const prefix = period === "weekly-sky" ? "weekly" : "monthly";
  const periodName = prefix === "weekly" ? "week" : "month";
  return [
    { name: `${prefix}Overview`, label: `${prefix === "weekly" ? "Weekly" : "Monthly"} overview`, help: `Describe the main story of the ${periodName} and how its events connect.` },
    { name: "seasonOverview", label: "Season transition", help: "Explain how the zodiac season shapes this period and what changes when the Sun enters the next sign." },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the period’s main story." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the significance of the period’s ingresses, stations, and planetary aspects." },
    { name: `${prefix}Integration`, label: "Closing passage", help: `Bring the ${periodName}’s themes together without repeating the event list.` }
  ];
}

export const calendarSeasonVariables = ["zodiacSeason", "zodiacSeasonPolarAxis", "seasonSign", "seasonStart", "seasonEnd", "openingSeasonSign", "openingZodiacSeason", "openingZodiacSeasonPolarAxis", "closingSeasonSign", "closingZodiacSeason", "closingZodiacSeasonPolarAxis", "seasonChangeDate"];

/** Stable across periods, source loading and editors; uses the shared Studio palette. */
export function calendarVariableColor(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return String((hash >>> 0) % 6 + 1);
}

export function calendarOverviewWriting(sections: unknown): Record<string, string> {
  const value = (sections as { calendarOverview?: unknown } | null)?.calendarOverview;
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}

export type CalendarTemplateLiteral = string | number | boolean | null | undefined;
export type CalendarTemplateResolution = { text: string; missing: string[]; errors: string[] };

/** Registered overview fields may recurse; calculated/source values stay literal. */
export function resolveCalendarNestedTemplate(pattern: string, values: Record<string, CalendarTemplateLiteral>, templates: Record<string, string> = {}): CalendarTemplateResolution {
  const missing = new Set<string>(), checked = new Set<string>(), literals: string[] = [];
  let steps = 0;
  const namePattern = "[A-Za-z][A-Za-z0-9]*(?:\\.[A-Za-z][A-Za-z0-9]*)*";
  const valid = new RegExp(`^${namePattern}$`, "u"), forbidden = new Set(["__proto__", "prototype", "constructor"]);
  const own = (value: object, key: string) => Object.hasOwn(value, key);
  const safeName = (name: string) => valid.test(name) && !name.split(".").some(part => forbidden.has(part));
  const hide = (value: CalendarTemplateLiteral) => { const i = literals.push(value == null ? "" : String(value)) - 1; return `\u0000${i}\u0000`; };
  const reveal = (text: string) => text.replace(/\u0000(\d+)\u0000/gu, (_m, i) => literals[Number(i)] ?? "");
  const verify = (source: string) => {
    if (checked.has(source)) return;
    if (source.length > 40_000) throw new Error("Calendar template is too long.");
    const stack: string[] = [], token = /\{\{([\s\S]*?)\}\}/gu; let offset = 0;
    for (const match of source.matchAll(token)) {
      const between = source.slice(offset, match.index); if (between.includes("{{") || between.includes("}}")) throw new Error("Malformed Calendar variable delimiters.");
      offset = match.index! + match[0].length;
      const raw = match[1].trim(), marker = /^[#^/]/u.test(raw) ? raw[0] : "", name = (marker ? raw.slice(1) : raw).trim();
      if (!safeName(name)) throw new Error(`Invalid Calendar variable: ${raw}.`);
      if (marker === "/") { if (stack.pop() !== name) throw new Error(`Unmatched Calendar section close: ${name}.`); }
      else if (marker === "#" || marker === "^") stack.push(name);
      if (stack.length > 24) throw new Error("Calendar template nesting is too deep.");
    }
    const rest = source.slice(offset); if (rest.includes("{{") || rest.includes("}}")) throw new Error("Unclosed Calendar variable delimiters.");
    if (stack.length) throw new Error(`Unclosed Calendar section: ${stack.at(-1)}.`); checked.add(source);
  };
  const expand = (source: string, chain: string[]): string => {
    verify(source); if (chain.length > 24) throw new Error("Calendar template expansion is too deep.");
    const nested = (name: string) => { if (chain.includes(name)) throw new Error(`Circular Calendar template reference: ${[...chain, name].join(" → ")}.`); return expand(templates[name], [...chain, name]); };
    const sections = new RegExp(`\\{\\{([#^])\\s*(${namePattern})\\s*\\}\\}([\\s\\S]*?)\\{\\{\\/\\2\\}\\}`, "gu");
    let output = source.replace(sections, (_all, marker: string, name: string, body: string) => {
      if (++steps > 12_000) throw new Error("Calendar template expansion is too large.");
      const literal = own(values, name), truthy = literal ? Boolean(values[name]) : own(templates, name) ? Boolean(nested(name).trim()) : (missing.add(name), false);
      return (marker === "#" ? truthy : !truthy) ? expand(body, chain) : "";
    });
    output = output.replace(new RegExp(`\\{\\{\\s*(${namePattern})\\s*\\}\\}`, "gu"), (_all, name: string) => {
      if (++steps > 12_000) throw new Error("Calendar template expansion is too large.");
      if (own(values, name)) return hide(values[name]);
      if (own(templates, name)) return nested(name);
      missing.add(name); return `{{${name}}}`;
    });
    if (output.length > 150_000) throw new Error("Rendered Calendar template is too long."); return output;
  };
  try {
    for (const name of Object.keys(templates)) if (!safeName(name) || name.includes(".")) throw new Error(`Invalid nested Calendar template name: ${name}.`);
    return { text: reveal(expand(pattern, [])), missing: [...missing], errors: [] };
  } catch (error) { return { text: pattern, missing: [...missing], errors: [error instanceof Error ? error.message : "Calendar template could not be resolved."] }; }
}

export { calendarOverviewPattern } from "./skyForecastTemplates";

export function calendarSeasonSourceKey(name: string, sun: string, opening: string, closing: string) {
  const sign = name.startsWith("opening") ? opening : name.startsWith("closing") ? closing : sun;
  const normalized = name.replace(/^(opening|closing)/u, "").toLowerCase();
  const family = normalized === "zodiacseason" ? "zodiac-season" : normalized === "zodiacseasonpolaraxis" ? "zodiac-season-polar-axis" : "";
  return sign && family ? `fallback-hook/${family}/${sign.toLowerCase()}` : undefined;
}
