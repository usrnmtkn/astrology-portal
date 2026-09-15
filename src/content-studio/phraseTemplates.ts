/** Dependency-free, bounded composition used by the Studio preview and writer boundary.
 * Only explicitly registered templates execute. Phrase values are always literal text.
 */
export type PhraseGrammar = "noun-phrase" | "verb-phrase" | "clause";
export type PhraseSource = "edition" | "opening-season" | "closing-season" | "lead-event" | "event";
export type PhraseDefinition = {
  kind: "phrase";
  grammar: PhraseGrammar;
  source: PhraseSource;
  description: string;
};
export type TemplateDefinition = { kind: "template"; pattern: string };
export type WritingDefinition = PhraseDefinition | TemplateDefinition;
export type WritingTemplate = { version: 1; pattern: string; definitions: Record<string, WritingDefinition> };
export type PhraseValue = { text: string; locked?: boolean; origin: "owner-edit" | "ai-draft" | "approved-source"; sourceId?: string };
export type PhraseValues = Record<string, PhraseValue>;
export type Context = Record<string, unknown>;
export type PhraseUse = { name: string; key: string; definition: PhraseDefinition; context: Context };
export type CompositionResult = { text: string; missing: string[]; errors: string[]; phrases: PhraseUse[] };
type Node = { type: "text"; text: string } | { type: "value"; name: string } | { type: "section"; name: string; inverse: boolean; children: Node[] };

const identifier = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/u;
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
export const validVariableName = (name: string) => identifier.test(name) && !name.split(".").some(part => forbidden.has(part));
const own = (value: unknown, key: string) => value !== null && typeof value === "object" && Object.hasOwn(value, key);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const MAX_PATTERN = 40_000;
const MAX_DEFINITIONS = 160;
const MAX_DEPTH = 24;
const MAX_STEPS = 16_000;

export function parseWritingPattern(pattern: string): Node[] {
  if (typeof pattern !== "string" || pattern.length > MAX_PATTERN) throw new Error("Template pattern exceeds the 40,000-character limit.");
  const root: Node[] = [];
  const stack: { name: string; nodes: Node[] }[] = [{ name: "", nodes: root }];
  const token = /\{\{([\s\S]*?)\}\}/gu;
  let offset = 0;
  for (const match of pattern.matchAll(token)) {
    const literal = pattern.slice(offset, match.index);
    if (literal.includes("{{") || literal.includes("}}")) throw new Error("Malformed variable delimiters.");
    if (literal) stack.at(-1)!.nodes.push({ type: "text", text: literal });
    offset = match.index! + match[0].length;
    const raw = match[1].trim();
    const marker = /^[#^/]/u.test(raw) ? raw[0] : "";
    const name = (marker ? raw.slice(1) : raw).trim();
    if (!validVariableName(name)) throw new Error(`Invalid variable: ${raw}. Use named variables without instructions or executable expressions.`);
    if (marker === "/") {
      if (stack.length === 1 || stack.at(-1)!.name !== name) throw new Error(`Unmatched closing section: ${name}.`);
      stack.pop();
    } else if (marker === "#" || marker === "^") {
      if (stack.length >= MAX_DEPTH) throw new Error("Template section nesting is too deep.");
      const children: Node[] = [];
      stack.at(-1)!.nodes.push({ type: "section", name, inverse: marker === "^", children });
      stack.push({ name, nodes: children });
    } else stack.at(-1)!.nodes.push({ type: "value", name });
  }
  const rest = pattern.slice(offset);
  if (rest.includes("{{") || rest.includes("}}")) throw new Error("Unclosed variable delimiters.");
  if (rest) stack.at(-1)!.nodes.push({ type: "text", text: rest });
  if (stack.length !== 1) throw new Error(`Unclosed section: ${stack.at(-1)!.name}.`);
  return root;
}

export function validateWritingTemplate(value: unknown): WritingTemplate {
  if (!isRecord(value) || value.version !== 1 || typeof value.pattern !== "string" || !isRecord(value.definitions)) throw new Error("A versioned writing template with named definitions is required.");
  const entries = Object.entries(value.definitions);
  if (entries.length > MAX_DEFINITIONS) throw new Error("At most 160 writing definitions are allowed.");
  const definitions: WritingTemplate["definitions"] = Object.create(null);
  for (const [name, raw] of entries) {
    if (!validVariableName(name) || name.includes(".") || !isRecord(raw)) throw new Error(`Invalid definition: ${name}.`);
    if (raw.kind === "template" && typeof raw.pattern === "string") {
      parseWritingPattern(raw.pattern);
      definitions[name] = { kind: "template", pattern: raw.pattern };
    } else if (raw.kind === "phrase" && ["noun-phrase", "verb-phrase", "clause"].includes(String(raw.grammar)) && ["edition", "opening-season", "closing-season", "lead-event", "event"].includes(String(raw.source)) && typeof raw.description === "string" && raw.description.length <= 1600) {
      definitions[name] = { kind: "phrase", grammar: raw.grammar as PhraseGrammar, source: raw.source as PhraseSource, description: raw.description };
    } else throw new Error(`Invalid template or phrase definition: ${name}.`);
  }
  parseWritingPattern(value.pattern);
  // Detect definition cycles even when they are currently inside an inactive condition.
  const visited = new Set<string>();
  function visit(name: string, ancestors: string[]) {
    if (ancestors.includes(name)) throw new Error(`Circular template reference: ${[...ancestors, name].join(" → ")}.`);
    if (visited.has(name)) return;
    const def = definitions[name];
    if (def?.kind !== "template") return;
    if (ancestors.length >= MAX_DEPTH) throw new Error("Template reference nesting is too deep.");
    const walk = (nodes: Node[]) => { for (const node of nodes) { if (node.type === "value" || node.type === "section") { visit(node.name, [...ancestors, name]); if (node.type === "section") walk(node.children); } } };
    walk(parseWritingPattern(def.pattern));
    visited.add(name);
  }
  for (const name of Object.keys(definitions)) visit(name, []);
  return { version: 1, pattern: value.pattern, definitions };
}

export function validatePhraseValues(value: unknown): PhraseValues {
  if (!isRecord(value) || Object.keys(value).length > 600) throw new Error("Phrase values must be a bounded named map.");
  const result: PhraseValues = Object.create(null);
  for (const [key, raw] of Object.entries(value)) {
    if (!key || key.length > 500 || forbidden.has(key) || !isRecord(raw) || typeof raw.text !== "string" || raw.text.length > 1600 || raw.text.includes("{{") || raw.text.includes("}}") || !["owner-edit", "ai-draft", "approved-source"].includes(String(raw.origin))) throw new Error(`Invalid literal phrase value: ${key}.`);
    result[key] = { text: raw.text, origin: raw.origin as PhraseValue["origin"], locked: raw.locked === true,
      ...(typeof raw.sourceId === "string" && raw.sourceId.length < 500 ? { sourceId: raw.sourceId } : {}) };
  }
  return result;
}

function lookup(name: string, contexts: Context[]): { found: boolean; value: unknown } {
  for (const context of contexts) {
    let item: unknown = context;
    let found = true;
    for (const part of name.split(".")) { if (!own(item, part)) { found = false; break; } item = (item as Context)[part]; }
    if (found) return { found, value: item };
  }
  return { found: false, value: undefined };
}

export function phraseBindingKey(name: string, definition: PhraseDefinition, contexts: Context[]): string {
  const source = definition.source;
  const scope = source === "edition" ? "edition"
    : source === "opening-season" ? `season/${String(lookup("openingSeasonSign", contexts).value ?? "").toLowerCase()}`
    : source === "closing-season" ? `season/${String(lookup("closingSeasonSign", contexts).value ?? "").toLowerCase()}`
    : `event/${String(lookup(source === "lead-event" ? "leadEventId" : "eventId", contexts).value ?? "")}`;
  if (scope.endsWith("/")) throw new Error(`No calculated context for ${name} (${source}).`);
  return `${scope}/${name}`;
}

export function composeWriting(template: WritingTemplate, facts: Context, phraseValues: PhraseValues, allowMissing = true): CompositionResult {
  const result: CompositionResult = { text: "", missing: [], errors: [], phrases: [] };
  let steps = 0;
  const used = new Set<string>();
  const trees = new Map<string, Node[]>();
  try {
    const checked = validateWritingTemplate(template);
    for (const name of Object.keys(checked.definitions)) if (own(facts, name)) throw new Error(`Definition ${name} would overwrite a calculated fact.`);
    function readPhrase(name: string, def: PhraseDefinition, contexts: Context[]) {
      const key = phraseBindingKey(name, def, contexts);
      if (!used.has(key)) {
        result.phrases.push({ name, key, definition: def, context: Object.assign({}, ...[...contexts].reverse()) });
        used.add(key);
      }
      const value = phraseValues[key];
      if (value?.text.trim()) return value.text;
      if (!result.missing.includes(key)) result.missing.push(key);
      return allowMissing ? `{{${name}}}` : "";
    }
    function render(nodes: Node[], contexts: Context[], chain: string[]): string {
      if (chain.length > MAX_DEPTH) throw new Error("Template expansion is too deep.");
      let text = "";
      for (const node of nodes) {
        if (++steps > MAX_STEPS) throw new Error("Template expansion exceeds its processing budget.");
        if (node.type === "text") { text += node.text; continue; }
        const resolved = lookup(node.name, contexts);
        const def = checked.definitions[node.name];
        if (node.type === "section") {
          if (!resolved.found) throw new Error(`Unknown condition or event collection: ${node.name}. Conditions must come from calculated or reviewed context.`);
          const item = resolved.value;
          const truthy = Array.isArray(item) ? item.length > 0 : Boolean(item);
          if (node.inverse) { if (!truthy) text += render(node.children, contexts, chain); }
          else if (Array.isArray(item)) {
            if (item.length > 100) throw new Error("Too many events in a template section.");
            for (const entry of item) {
              if (!isRecord(entry)) throw new Error(`Invalid event context in ${node.name}.`);
              text += render(node.children, [entry, ...contexts], chain);
            }
          } else if (truthy) text += render(node.children, isRecord(item) ? [item, ...contexts] : contexts, chain);
          continue;
        }
        if (resolved.found) {
          if (typeof resolved.value !== "string" && typeof resolved.value !== "number") throw new Error(`Use ${node.name} as a section, not as text.`);
          text += String(resolved.value); // Literal. Never execute facts or approved prose as templates.
        } else if (def?.kind === "phrase") text += readPhrase(node.name, def, contexts);
        else if (def?.kind === "template") {
          if (chain.includes(node.name)) throw new Error(`Circular template reference: ${[...chain, node.name].join(" → ")}.`);
          if (!trees.has(node.name)) trees.set(node.name, parseWritingPattern(def.pattern));
          text += render(trees.get(node.name)!, contexts, [...chain, node.name]);
        } else throw new Error(`Unknown variable: ${node.name}. Add a phrase or template definition.`);
        if (text.length > 150_000) throw new Error("Rendered writing exceeds its size budget.");
      }
      return text;
    }
    result.text = render(parseWritingPattern(checked.pattern), [facts], []).replace(/\n[\t ]*\n(?:[\t ]*\n)+/gu, "\n\n").trim();
  } catch (error) { result.errors.push(error instanceof Error ? error.message : "Template could not be resolved."); }
  return result;
}

export function validateGeneratedPhrases(values: unknown, requested: PhraseUse[]): Record<string, string> {
  if (!isRecord(values)) throw new Error("The writer did not return a phrase map.");
  const names = requested.map((_, i) => `phrase${i + 1}`);
  if (Object.keys(values).length !== names.length || Object.keys(values).some(key => !names.includes(key))) throw new Error("The writer returned unrequested or missing phrases.");
  const result: Record<string, string> = Object.create(null);
  requested.forEach((use, i) => {
    const value = values[names[i]];
    if (typeof value !== "string" || !value.trim() || value.length > 1000 || /[\r\n]|\{\{|\}\}|<\/?[a-z]/iu.test(value)) throw new Error(`Invalid phrase returned for ${use.name}.`);
    // The sentence pattern owns punctuation and lead-ins; no silently flattened paragraphs.
    if (/[.!?]\s|[.!?]$/u.test(value.trim()) || /^(?:You may notice|This is a useful time to)\b/iu.test(value)) throw new Error(`${use.name} must be a phrase that fits the surrounding template, not a complete passage.`);
    const month = "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)";
    const dated = new RegExp(`\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+${month}|${month}\\.?\\s+\\d{1,2}|(?:19|20|21)\\d{2}|\\d{1,2}[/:]\\d{1,2})\\b`, "iu");
    if (dated.test(value) || /\d+(?:\.\d+)?\s*°/u.test(value)) throw new Error(`${use.name} contains a date, time or degree. Keep facts in calculated variables.`);
    if (value.trim().split(/\s+/u).length > 65) throw new Error(`${use.name} is too long for a phrase. Revise its definition instead of flattening an article.`);
    result[use.key] = value.trim();
  });
  return result;
}
