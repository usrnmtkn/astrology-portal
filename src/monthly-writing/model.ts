import { parseTemplate, renderTemplate, validTemplateName, type TemplateDefinition, type TemplateContext } from "./template";
export const MONTHLY_SCHEMA = "monthly-authoring/v1";
export const MONTHLY_PREFIX = "studio-monthly/";
export const signs = "aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" ");
export type MonthlyEvent = { id: string; type: "ingress" | "station" | "aspect" | "new-moon" | "full-moon" | "solar-eclipse" | "lunar-eclipse";
  startsAt: string; date: string; clause: string; sign: string; planet: string; planets: string[]; aspect: string; direction: string; sourceIds: string[]; reason: string; score: number };
export type MonthlyFacts = { month: string; timeZone: string; monthName: string; year: string; openingSeasonSign: string; closingSeasonSign: string;
  seasonChangeDate: string; seasonChangeAt: string; events: MonthlyEvent[]; fingerprint: string; calculatedAt: string;
  provenance: { source: string; eclipseClassification: string } };
export type MonthlyTemplate = { schema: typeof MONTHLY_SCHEMA; kind: "template"; body: string; definitions: Record<string, TemplateDefinition> };
export type MonthlyEdition = { schema: typeof MONTHLY_SCHEMA; kind: "edition"; month: string; timeZone: string;
  template: MonthlyTemplate; templateVersion: string; factsFingerprint: string; leadEventId: string | null; supportingEventIds: string[];
  librarySnapshot?: MonthlyLibraryVariable[]; themeCount: 0 | 1 | 2; values: Record<string, string>; eventValues: Record<string, Record<string, string>>; locked: string[] };
export type StoredMonthly<T> = { id: string; updatedAt: string; document: T };
export type MonthlyLibraryVariable = { id: string; name: string; value: string; updatedAt: string; overrides: Array<{ scope: string; planet: string; sign: string; value: string }> };
/** JSONB key order is not a version or copy change. */
export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).filter(key => (value as any)[key] !== undefined).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as any)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
}
export function snapshotMonthlyLibrary(library: MonthlyLibraryVariable[]): MonthlyLibraryVariable[] {
  if (!Array.isArray(library) || library.length > 10000) throw new Error("Invalid variable library snapshot.");
  return library.map(item => {
    if (!item || !validTemplateName(item.name) || typeof item.id !== "string" || typeof item.updatedAt !== "string" || typeof item.value !== "string" || item.value.length > 2000 || !Array.isArray(item.overrides)) throw new Error("Invalid variable library snapshot.");
    return { id:item.id, name:item.name, updatedAt:item.updatedAt, value:item.value, overrides:item.overrides.map(override => {
      if (!override || !["placement","planet","sign"].includes(override.scope) || typeof override.planet !== "string" || typeof override.sign !== "string" || typeof override.value !== "string" || override.value.length > 2000) throw new Error("Invalid variable library override.");
      return {scope:override.scope,planet:override.planet,sign:override.sign,value:override.value};
    })};
  });
}
export const rootFactNames = ["monthName", "year", "timeZone", "openingSeasonSign", "closingSeasonSign", "seasonChangeDate", "hasSeasonChange", "hasLeadEvent", "hasMonthlyTheme", "hasSecondaryMonthlyTheme", "leadEventDate", "leadEventClause", "leadEventSign", "leadEventPlanet", "supportingEvents", "newMoons", "fullMoons", "solarEclipses", "lunarEclipses", "eventId", "eventDate", "eventClause", "eventSign", "eventPlanet"];
const grammar = new Set(["noun-phrase", "verb-phrase", "clause", "text"]);
const sources = new Set(["edition", "opening-season", "closing-season", "event"]);
const isObject = (value: unknown): value is Record<string, any> => !!value && typeof value === "object" && !Array.isArray(value);
export function validateMonth(month: unknown, timeZone: unknown): { month: string; timeZone: string } {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/u.test(month) || +month.slice(0,4) < 1900 || +month.slice(0,4) > 2100) throw new Error("Choose a month between 1900 and 2100.");
  if (typeof timeZone !== "string" || timeZone.length > 80) throw new Error("Choose an IANA timezone.");
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(); } catch { throw new Error("Choose a valid IANA timezone."); }
  return { month, timeZone };
}
export function validateMonthlyTemplate(value: unknown): MonthlyTemplate {
  if (!isObject(value) || value.schema !== MONTHLY_SCHEMA || value.kind !== "template" || typeof value.body !== "string" || !isObject(value.definitions)) throw new Error("A monthly template definition is required.");
  parseTemplate(value.body);
  if (Object.keys(value.definitions).length > 160) throw new Error("Use at most 160 named definitions.");
  const definitions: Record<string, TemplateDefinition> = {};
  let size = value.body.length;
  for (const [name, entry] of Object.entries(value.definitions)) {
    if (!validTemplateName(name) || name.includes(".") || rootFactNames.includes(name) || !isObject(entry) || !["phrase","template"].includes(entry.kind) || typeof entry.value !== "string") throw new Error(`Invalid or reserved definition: ${name}.`);
    if (entry.kind === "template") parseTemplate(entry.value);
    else if (entry.value.length > 2000 || /\{\{|\}\}/u.test(entry.value)) throw new Error(`Phrase ${name} must contain literal wording of at most 2,000 characters. Nest variables using a template definition.`);
    if (entry.grammar && !grammar.has(entry.grammar) || entry.source && !sources.has(entry.source)) throw new Error(`Invalid grammar or source rule for ${name}.`);
    if (entry.description !== undefined && (typeof entry.description !== "string" || entry.description.length > 1200)) throw new Error(`Description is too long for ${name}.`);
    if (entry.libraryName && (!validTemplateName(entry.libraryName) || entry.libraryName.length > 64)) throw new Error(`Invalid library variable for ${name}.`);
    const bySign: Record<string, string> = {};
    if (entry.bySign !== undefined) {
      if (!isObject(entry.bySign)) throw new Error(`Invalid sign values for ${name}.`);
      for (const [sign, text] of Object.entries(entry.bySign)) {
        if (!signs.includes(sign) || typeof text !== "string" || text.length > 2000 || /\{\{|\}\}/u.test(text)) throw new Error(`Invalid sign phrase for ${name}.`);
        bySign[sign] = text;
      }
    }
    definitions[name] = { kind: entry.kind, value: entry.value, description: entry.description ?? "", grammar: entry.grammar ?? "clause", source: entry.source ?? "edition", bySign, libraryName: entry.libraryName ?? "" };
    size += JSON.stringify(definitions[name]).length;
  }
  if (size > 200_000) throw new Error("The monthly template exceeds its supported size.");
  return { schema: MONTHLY_SCHEMA, kind: "template", body: value.body, definitions };
}
function textValues(value: unknown) {
  if (!isObject(value) || Object.keys(value).length > 160) throw new Error("Invalid phrase values.");
  const result: Record<string,string> = {};
  for (const [name, text] of Object.entries(value)) {
    if (!validTemplateName(name) || typeof text !== "string" || text.length > 2000 || /\{\{|\}\}/u.test(text)) throw new Error(`Invalid literal phrase: ${name}.`);
    result[name] = text;
  }
  return result;
}
export function validateMonthlyEdition(value: unknown): MonthlyEdition {
  if (!isObject(value) || value.schema !== MONTHLY_SCHEMA || value.kind !== "edition") throw new Error("A monthly edition is required.");
  const identity = validateMonth(value.month, value.timeZone), template = validateMonthlyTemplate(value.template);
  if (![0,1,2].includes(value.themeCount) || !(value.leadEventId === null || typeof value.leadEventId === "string" && value.leadEventId.length < 220)) throw new Error("Invalid monthly selection.");
  if (!Array.isArray(value.supportingEventIds) || value.supportingEventIds.length > 2 || value.supportingEventIds.some((id: unknown) => typeof id !== "string" || id.length > 220) || new Set(value.supportingEventIds).size !== value.supportingEventIds.length || value.supportingEventIds.includes(value.leadEventId)) throw new Error("Choose up to two distinct supporting events, excluding the lead.");
  if (value.themeCount > 0 && !value.leadEventId && value.supportingEventIds.length === 0) throw new Error("Choose at least one reviewed event before adding a month-wide theme.");
  if (!isObject(value.eventValues) || Object.keys(value.eventValues).length > 80) throw new Error("Invalid event phrase values.");
  const eventValues: Record<string,Record<string,string>> = {};
  for (const [id, values] of Object.entries(value.eventValues)) {
    if (id.length > 220 || /[\x00-\x1f]/u.test(id) || ["__proto__","constructor","prototype"].includes(id)) throw new Error("Invalid event identity.");
    eventValues[id] = textValues(values);
  }
  if (!Array.isArray(value.locked) || value.locked.length > 500 || value.locked.some((key: unknown) => typeof key !== "string" || key.length > 300)) throw new Error("Invalid protected phrase list.");
  const values = textValues(value.values);
  for (const name of [...Object.keys(values), ...Object.values(eventValues).flatMap(Object.keys)]) if (template.definitions[name]?.kind !== "phrase") throw new Error(`Only phrase definitions may have edition overrides: ${name}.`);
  return { schema: MONTHLY_SCHEMA, kind: "edition", ...identity, template, ...(value.librarySnapshot === undefined ? {} : {librarySnapshot:snapshotMonthlyLibrary(value.librarySnapshot)}), templateVersion: String(value.templateVersion ?? "").slice(0,100), factsFingerprint: String(value.factsFingerprint ?? "").slice(0,100), themeCount: value.themeCount, leadEventId: value.leadEventId, supportingEventIds: value.supportingEventIds, values, eventValues, locked: [...new Set<string>(value.locked)] };
}
export const isPlanetaryEvent = (event: MonthlyEvent) => ["aspect","station","ingress"].includes(event.type) && !(event.type === "ingress" && event.planet.toLowerCase() === "sun");
export function createMonthlyEdition(facts: MonthlyFacts, template: MonthlyTemplate, templateVersion = ""): MonthlyEdition {
  const ranked = facts.events.filter(isPlanetaryEvent).sort((a,b) => b.score - a.score || a.startsAt.localeCompare(b.startsAt) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const distinct = ranked.filter(event => { const key = [event.type,[...event.planets].sort().join("/"),event.aspect,event.direction].join("|"); if(seen.has(key)) return false; seen.add(key); return true; });
  return { schema: MONTHLY_SCHEMA, kind: "edition", month: facts.month, timeZone: facts.timeZone, template: structuredClone(template), templateVersion, factsFingerprint: facts.fingerprint, leadEventId: distinct[0]?.id ?? null, supportingEventIds: distinct.slice(1,3).map(event=>event.id), themeCount: 0, values: {}, eventValues: {}, locked: [] };
}
export function monthlyContext(facts: MonthlyFacts, edition: MonthlyEdition): TemplateContext {
  if (facts.month !== edition.month || facts.timeZone !== edition.timeZone || facts.fingerprint !== edition.factsFingerprint) throw new Error("The calculated month changed. Refresh and review the event selection before continuing.");
  const eventContext = (event: MonthlyEvent) => ({ _scope: event.id, eventId: event.id, eventDate: event.date, eventClause: event.clause, eventSign: event.sign, eventPlanet: event.planet });
  const ids = [edition.leadEventId, ...edition.supportingEventIds].filter(Boolean);
  if (ids.some(id => !facts.events.some(event => event.id === id && isPlanetaryEvent(event)))) throw new Error("A selected planetary event is not in this calculated month.");
  const lead = facts.events.find(event => event.id === edition.leadEventId);
  const byType = (type: MonthlyEvent["type"]) => facts.events.filter(event => event.type === type).map(eventContext);
  return { _scope: "edition", monthName: facts.monthName, year: facts.year, timeZone: facts.timeZone,
    openingSeasonSign: facts.openingSeasonSign, closingSeasonSign: facts.closingSeasonSign, seasonChangeDate: facts.seasonChangeDate,
    hasSeasonChange: !!facts.closingSeasonSign, hasLeadEvent: !!lead, hasMonthlyTheme: edition.themeCount > 0, hasSecondaryMonthlyTheme: edition.themeCount === 2,
    leadEventDate: lead?.date ?? "", leadEventClause: lead?.clause ?? "", leadEventSign: lead?.sign ?? "", leadEventPlanet: lead?.planet ?? "",
    supportingEvents: edition.supportingEventIds.map(id => eventContext(facts.events.find(event=>event.id===id)!)),
    newMoons: byType("new-moon"), fullMoons: byType("full-moon"), solarEclipses: byType("solar-eclipse"), lunarEclipses: byType("lunar-eclipse") };
}
export function phraseTarget(name: string, definition: TemplateDefinition, context: TemplateContext, edition: MonthlyEdition) {
  const eventId = definition.source === "event" ? String(context._scope === "edition" ? edition.leadEventId ?? "" : context._scope) : "";
  return { id: `${eventId || "edition"}::${name}`, eventId, name };
}
export function renderMonthly(facts: MonthlyFacts, edition: MonthlyEdition, library: MonthlyLibraryVariable[] = []) {
  const context = monthlyContext(facts, edition);
  return renderTemplate(edition.template.body, edition.template.definitions, context, { phrase(name, definition, local) {
    const { eventId } = phraseTarget(name, definition, local, edition);
    const values = eventId ? edition.eventValues[eventId] ?? {} : edition.values;
    if (Object.hasOwn(values,name)) return { value: values[name], source: "edition override" };
    const sign = String(definition.source === "opening-season" ? local.openingSeasonSign : definition.source === "closing-season" ? local.closingSeasonSign : definition.source === "event" ? local._scope === "edition" ? local.leadEventSign : local.eventSign : "").toLowerCase();
    if (Object.hasOwn(definition.bySign ?? {},sign)) return { value: definition.bySign![sign], source: `sign:${sign}` };
    if (definition.libraryName) {
      const variable = (edition.librarySnapshot ?? library).find(item=> item.name === definition.libraryName);
      if (!variable) return { source: "missing library variable" };
      const planet = String(definition.source?.endsWith("season") ? "sun" : local._scope === "edition" ? local.leadEventPlanet : local.eventPlanet).toLowerCase();
      const override = variable.overrides.find(item=>item.scope === "placement" && item.planet === planet && item.sign === sign)
        ?? variable.overrides.find(item=>item.scope === "planet" && item.planet === planet) ?? variable.overrides.find(item=>item.scope === "sign" && item.sign === sign);
      return { value: override ? override.value : variable.value, source: `library:${variable.name}` };
    }
    return { value: definition.value, source: "shared phrase" };
  }});
}
export function monthlyTargets(facts: MonthlyFacts, edition: MonthlyEdition, library: MonthlyLibraryVariable[] = []) {
  const rendered = renderMonthly(facts,edition,library), result = new Map<string, { id: string; name: string; eventId: string; value: string; locked: boolean; source: string; definition: TemplateDefinition }>();
  for (const trace of rendered.trace) {
    const definition = edition.template.definitions[trace.name];
    const target = phraseTarget(trace.name,definition,{ _scope: trace.scope },edition);
    result.set(target.id,{...target, value: trace.value, locked: edition.locked.includes(target.id), source: trace.kind, definition });
  }
  return { rendered, targets: [...result.values()] };
}
export function applyMonthlyPhrases(edition: MonthlyEdition, changes: Array<{ id: string; name: string; eventId: string; value: string }>): MonthlyEdition {
  const next = structuredClone(edition);
  for (const change of changes) {
    if (change.id !== `${change.eventId || "edition"}::${change.name}` || next.locked.includes(change.id) || next.template.definitions[change.name]?.kind !== "phrase") throw new Error(`Cannot replace protected or non-phrase target: ${change.id}.`);
    if (change.eventId) { next.eventValues[change.eventId] ??= {}; next.eventValues[change.eventId][change.name] = change.value; }
    else next.values[change.name] = change.value;
  }
  return validateMonthlyEdition(next);
}
