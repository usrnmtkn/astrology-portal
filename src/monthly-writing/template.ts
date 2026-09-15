/** Text-only, bounded template interpreter. Only declared template definitions
 * execute; phrase/library values are never parsed as templates or HTML. */
export type TemplateNode = { type: "text"; value: string } | { type: "value"; name: string }
  | { type: "section"; name: string; inverse: boolean; children: TemplateNode[] };
export type TemplateDefinition = {
  kind: "template" | "phrase";
  value: string;
  description?: string;
  grammar?: "noun-phrase" | "verb-phrase" | "clause" | "text";
  source?: "edition" | "opening-season" | "closing-season" | "event";
  bySign?: Record<string, string>;
  libraryName?: string;
};
export type TemplateIssue = { code: string; name: string; scope: string; message: string };
export type TemplateTrace = { name: string; scope: string; kind: string; value: string };
export type TemplateContext = Record<string, unknown>;
const namePattern = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/u;
const unsafe = new Set(["__proto__", "prototype", "constructor"]);
export function validTemplateName(name: string) { return namePattern.test(name) && !name.split(".").some(part => unsafe.has(part)); }
export function parseTemplate(pattern: string): TemplateNode[] {
  if (typeof pattern !== "string" || pattern.length > 80_000) throw new Error("A template must contain at most 80,000 characters.");
  if (/\{\{\{|\}\}\}/u.test(pattern)) throw new Error("Malformed template braces.");
  const roots: TemplateNode[] = [], stack: Array<{ name: string; children: TemplateNode[] }> = [{ name: "", children: roots }];
  let at = 0, count = 0;
  for (const match of pattern.matchAll(/\{\{([^{}]*)\}\}/gu)) {
    if (++count > 3000) throw new Error("This template has too many tokens.");
    const previous = pattern.slice(at, match.index);
    if (/\{\{|\}\}/u.test(previous)) throw new Error("Malformed template braces.");
    if (previous) stack.at(-1)!.children.push({ type: "text", value: previous });
    at = match.index! + match[0].length;
    const token = match[1].trim(), operator = /^[#^/]/u.test(token) ? token[0] : "";
    const name = (operator ? token.slice(1) : token).trim();
    if (!validTemplateName(name)) throw new Error(`Unsupported template token: ${match[0]}. Use a named variable, section, or inverted section.`);
    if (operator === "/") {
      if (stack.length === 1 || stack.at(-1)!.name !== name) throw new Error(`Mismatched closing section: ${name}.`);
      stack.pop();
    } else if (operator) {
      if (stack.length >= 24) throw new Error("Sections are nested too deeply.");
      const children: TemplateNode[] = [];
      stack.at(-1)!.children.push({ type: "section", name, inverse: operator === "^", children });
      stack.push({ name, children });
    } else stack.at(-1)!.children.push({ type: "value", name });
  }
  if (stack.length !== 1) throw new Error(`Unclosed section: ${stack.at(-1)!.name}.`);
  const tail = pattern.slice(at);
  if (/\{\{|\}\}/u.test(tail)) throw new Error("Malformed template braces.");
  if (tail) roots.push({ type: "text", value: tail });
  return roots;
}
function ownPath(context: TemplateContext, name: string): { found: boolean; value?: unknown } {
  let value: unknown = context;
  for (const part of name.split(".")) {
    if (!value || typeof value !== "object" || !Object.hasOwn(value, part)) return { found: false };
    value = (value as TemplateContext)[part];
  }
  return { found: true, value };
}
export function renderTemplate(pattern: string, definitions: Record<string, TemplateDefinition>, context: TemplateContext, options: {
  phrase: (name: string, definition: TemplateDefinition, context: TemplateContext) => { value?: string; source?: string };
  allowMissing?: boolean;
}): { text: string; issues: TemplateIssue[]; trace: TemplateTrace[] } {
  const issues: TemplateIssue[] = [], trace: TemplateTrace[] = [], reported = new Set<string>();
  const parsed = new Map<string, TemplateNode[]>();
  let operations = 0, length = 0;
  const issue = (code: string, name: string, scope: string, message: string) => {
    const key = `${code}|${name}|${scope}`;
    if (!reported.has(key)) { reported.add(key); issues.push({ code, name, scope, message }); }
  };
  function render(nodes: TemplateNode[], frames: TemplateContext[], active: string[]): string {
    const local = Object.assign({}, ...frames), scope = String(local._scope ?? "edition");
    function resolve(name: string): unknown {
      for (const frame of [...frames].reverse()) {
        const fact = ownPath(frame, name);
        if (fact.found) return fact.value;
      }
      const definition = Object.hasOwn(definitions, name) ? definitions[name] : undefined;
      if (!definition) { issue("unknown_variable", name, scope, `Unknown variable {{${name}}}. Add a definition or correct its name.`); return undefined; }
      if (definition.kind === "phrase") {
        const selected = options.phrase(name, definition, local);
        if (selected.value && /\{\{|\}\}/u.test(selected.value)) { issue("literal_token", name, scope, `Phrase ${name} contains tokens. Use a template definition to nest variables.`); return undefined; }
        trace.push({ name, scope, kind: selected.source ?? "phrase", value: selected.value ?? "" });
        return selected.value;
      }
      const key = `${scope}:${name}`;
      if (active.includes(key) || active.length >= 24) {
        issue("circular_template", name, scope, `Circular or over-deep template reference: ${[...active, key].join(" → ")}.`); return undefined;
      }
      if (!parsed.has(name)) parsed.set(name, parseTemplate(definition.value));
      return render(parsed.get(name)!, frames, [...active, key]);
    }
    const result: string[] = [];
    for (const node of nodes) {
      if (++operations > 30_000) throw new Error("Template expansion exceeded its work limit.");
      if (node.type === "text") { result.push(node.value); length += node.value.length; }
      else {
        const value = resolve(node.name);
        if (node.type === "section") {
          const present = Array.isArray(value) ? value.length > 0 : Boolean(value);
          if (node.inverse && !present) result.push(render(node.children, frames, active));
          else if (!node.inverse && present) {
            if (Array.isArray(value)) {
              if (value.length > 100) throw new Error("A repeated section has too many items.");
              for (const item of value) {
                if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error(`Section ${node.name} requires object records.`);
                result.push(render(node.children, [...frames, item as TemplateContext], active));
              }
            } else result.push(render(node.children, typeof value === "object" ? [...frames, value as TemplateContext] : frames, active));
          }
        } else if (value === "" && definitions[node.name]?.kind === "template") {
          // An intentionally empty optional subtemplate contributes no text.
        } else if (value === undefined || value === null || value === "") {
          issue("missing_value", node.name, scope, `Needs writing or a calculated value: {{${node.name}}}.`);
          if (options.allowMissing !== false) result.push(`{{${node.name}}}`);
        } else if (typeof value === "string" || typeof value === "number") { result.push(String(value)); length += String(value).length; }
        else issue("non_text_value", node.name, scope, `Use ${node.name} as a section, not as text.`);
      }
      if (length > 160_000) throw new Error("Template output exceeds 160,000 characters.");
    }
    return result.join("");
  }
  const text = render(parseTemplate(pattern), [context], []).replace(/\n[ \t]*\n(?:[ \t]*\n)+/gu, "\n\n").trim();
  return { text, issues, trace };
}
