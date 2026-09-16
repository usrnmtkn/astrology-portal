import { monthlyPhraseVariables } from "./monthlyPhraseVariables";
import { STUDIO_VARIABLE_PREFIX, STUDIO_VARIABLE_SCHEMA, VARIABLE_SIGNS, studioVariableValue, validateStudioVariable } from "../../apps/web/src/content/studioCustomVariables.mjs";

export type CalendarSeasonSourceRow = { id?: string; content_key: string; mode?: string; status?: string; inventory_only?: boolean; updated_at?: string | null; sections?: unknown };
export type CalendarSeasonPhraseBinding = { variableName: string };
export type CalendarSeasonPhraseResult = {
  name: string; sign: string;
  status: "ready" | "unbound" | "no-season" | "invalid-binding" | "missing-variable" | "invalid-source" | "needs-writing";
  sourceKey?: string; sourceId?: string; sourceUpdatedAt?: string | null;
  variableName?: string; text?: string; sourceLabel?: string;
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const calendarSeasonPhraseVariables = monthlyPhraseVariables.filter(variable => variable.source === "opening-season" || variable.source === "closing-season");

/** Accept a copied token or its name. Never turn an arbitrary string into an API key. */
export function calendarSeasonSourceName(value: string): string | undefined {
  const name = value.trim().match(/^(?:\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}|([A-Za-z][A-Za-z0-9_]*))$/u);
  const result = name?.[1] ?? name?.[2];
  return result && result.length <= 64 && !["constructor", "prototype"].includes(result.toLowerCase()) ? result : undefined;
}

export function calendarSeasonPhraseBindings(sections: unknown): Record<string, CalendarSeasonPhraseBinding> {
  const saved = record(record(sections).calendarSeasonPhraseBindings);
  const result: Record<string, CalendarSeasonPhraseBinding> = {};
  for (const { name } of calendarSeasonPhraseVariables) {
    const value = record(saved[name]).variableName;
    if (typeof value === "string" && value.trim()) result[name] = { variableName: value };
  }
  return result;
}

/** Keep incomplete editor input visible. It must validate before any source request. */
export function setCalendarSeasonPhraseBinding(sections: unknown, name: string, variableName: string): Record<string, unknown> {
  if (!calendarSeasonPhraseVariables.some(variable => variable.name === name)) throw new Error("Choose a registered seasonal phrase.");
  const current = record(sections);
  const bindings = { ...record(current.calendarSeasonPhraseBindings) };
  if (variableName.trim()) bindings[name] = { variableName };
  else delete bindings[name];
  return { ...current, calendarSeasonPhraseBindings: bindings };
}

export function calendarSeasonPhraseSourceKeys(sections: unknown): string[] {
  return [...new Set(Object.values(calendarSeasonPhraseBindings(sections)).flatMap(binding => {
    const name = calendarSeasonSourceName(binding.variableName);
    return name ? [`${STUDIO_VARIABLE_PREFIX}${name.toLowerCase()}`] : [];
  }))].sort();
}

/** Owner preview only. The library's existing sign/planet/placement priority is unchanged. */
export function resolveCalendarSeasonPhrases(sections: unknown, rows: readonly CalendarSeasonSourceRow[], context: { openingSign?: string; closingSign?: string }): CalendarSeasonPhraseResult[] {
  const bindings = calendarSeasonPhraseBindings(sections);
  return calendarSeasonPhraseVariables.map(({ name, source }): CalendarSeasonPhraseResult => {
    const sign = (source === "opening-season" ? context.openingSign : context.closingSign)?.trim().toLowerCase() ?? "";
    const result = { name, sign };
    // A missing closing season is not permission to infer the next sign.
    if (!VARIABLE_SIGNS.includes(sign)) return { ...result, status: "no-season" };
    const binding = bindings[name];
    if (!binding) return { ...result, status: "unbound" };
    const variableName = calendarSeasonSourceName(binding.variableName);
    if (!variableName) return { ...result, status: "invalid-binding" };
    const sourceKey = `${STUDIO_VARIABLE_PREFIX}${variableName.toLowerCase()}`;
    const bound = { ...result, variableName, sourceKey };
    const matches = rows.filter(row => row.content_key === sourceKey);
    if (!matches.length) return { ...bound, status: "missing-variable" };
    if (matches.length !== 1) return { ...bound, status: "invalid-source" };
    const row = matches[0];
    const saved = record(record(row.sections).variable);
    if (!row.id || row.inventory_only || row.mode !== "article" || row.status !== "DRAFT" || saved.schema !== STUDIO_VARIABLE_SCHEMA || saved.name !== variableName) return { ...bound, status: "invalid-source" };
    let definition;
    try { definition = validateStudioVariable(saved); }
    catch { return { ...bound, status: "invalid-source" }; }
    const selected = studioVariableValue(definition, { planet: "sun", sign });
    const resolved = { ...bound, sourceId: row.id, sourceUpdatedAt: row.updated_at,
      sourceLabel: `My variables · {{${variableName}}} · ${sign} · ${selected.scope} value` };
    // A blank exact override remains blank. Do not replace it with another sign or shared prose.
    if (!selected.value.trim()) return { ...resolved, status: "needs-writing" };
    return { ...resolved, status: "ready", text: selected.value };
  });
}
