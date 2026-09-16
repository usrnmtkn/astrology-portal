export const calendarTemplateDefinitionGrammars = ["noun-phrase", "verb-phrase", "clause", "text"] as const;
export type CalendarTemplateDefinitionGrammar = typeof calendarTemplateDefinitionGrammars[number];
export type CalendarTemplateDefinition = {
  kind: "phrase" | "template";
  value: string;
  description: string;
  grammar: CalendarTemplateDefinitionGrammar;
};

const unsafeNames = new Set(["__proto__", "prototype", "constructor"]);
const grammar = new Set<string>(calendarTemplateDefinitionGrammars);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

export function validCalendarTemplateDefinitionName(name: string) {
  return /^[A-Za-z][A-Za-z0-9_]{0,63}$/u.test(name) && !unsafeNames.has(name);
}

/**
 * Validate the editable definition registry without choosing any monthly phrase schema.
 * Phrase values are literal leaves. Only template definitions may contain {{tokens}}.
 */
export function validateCalendarTemplateDefinitions(value: unknown, reservedNames: Iterable<string> = []): Record<string, CalendarTemplateDefinition> {
  if (!isRecord(value)) throw new Error("Template definitions must be an object.");
  const entries = Object.entries(value);
  if (entries.length > 160) throw new Error("Use at most 160 template definitions.");
  const reserved = new Set(reservedNames);
  const result: Record<string, CalendarTemplateDefinition> = {};
  let total = 0;
  for (const [name, candidate] of entries) {
    if (!validCalendarTemplateDefinitionName(name) || reserved.has(name)) throw new Error(`Invalid or reserved template definition: ${name}.`);
    if (!isRecord(candidate) || !["phrase", "template"].includes(String(candidate.kind)) || typeof candidate.value !== "string") throw new Error(`Invalid template definition: ${name}.`);
    const kind = candidate.kind as CalendarTemplateDefinition["kind"];
    const limit = kind === "phrase" ? 2_000 : 12_000;
    if (candidate.value.length > limit) throw new Error(`${name} exceeds its ${limit.toLocaleString("en-US")}-character limit.`);
    if (kind === "phrase" && /\{\{|\}\}/u.test(candidate.value)) throw new Error(`Phrase ${name} must stay literal. Use a template definition to nest variables.`);
    const description = candidate.description === undefined ? "" : candidate.description;
    if (typeof description !== "string" || description.length > 1_200) throw new Error(`Description is too long for ${name}.`);
    const selectedGrammar = candidate.grammar === undefined ? (kind === "phrase" ? "clause" : "text") : candidate.grammar;
    if (typeof selectedGrammar !== "string" || !grammar.has(selectedGrammar)) throw new Error(`Invalid grammar for ${name}.`);
    const definition = { kind, value: candidate.value, description, grammar: selectedGrammar as CalendarTemplateDefinitionGrammar };
    total += name.length + definition.value.length + definition.description.length;
    if (total > 200_000) throw new Error("Template definitions exceed the supported total size.");
    result[name] = definition;
  }
  return result;
}

export function calendarTemplateDefinitions(sections: unknown): Record<string, CalendarTemplateDefinition> {
  const stored = (sections as { calendarTemplateDefinitions?: unknown } | null)?.calendarTemplateDefinitions;
  if (stored === undefined) return {};
  return validateCalendarTemplateDefinitions(stored);
}

export function calendarTemplateDefinitionInputs(definitions: Record<string, CalendarTemplateDefinition>, reservedNames: Iterable<string> = []) {
  const phrases: Record<string, string> = {};
  const templates: Record<string, string> = {};
  const reserved = new Set(reservedNames);
  for (const [name, definition] of Object.entries(definitions)) {
    if (reserved.has(name)) continue;
    (definition.kind === "phrase" ? phrases : templates)[name] = definition.value;
  }
  return { phrases, templates };
}
