export type CalendarTemplateLiteral = string | number | boolean | null | undefined;
export type CalendarTemplateLiterals = Record<string, CalendarTemplateLiteral>;
export type CalendarNestedTemplates = Record<string, string>;
export type CalendarTemplateResolution = { text: string; missing: string[]; errors: string[] };

type Node =
  | { type: "text"; text: string }
  | { type: "value"; name: string }
  | { type: "section"; name: string; inverse: boolean; children: Node[] };

const identifier = /^[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)*$/u;
const forbidden = new Set(["__proto__", "prototype", "constructor"]);
const MAX_PATTERN_LENGTH = 40_000;
const MAX_DEPTH = 24;
const MAX_STEPS = 12_000;
const MAX_OUTPUT_LENGTH = 150_000;

function validName(name: string) {
  return identifier.test(name) && !name.split(".").some(part => forbidden.has(part));
}

function own(value: object, key: string) {
  return Object.hasOwn(value, key);
}

function parse(pattern: string): Node[] {
  if (typeof pattern !== "string" || pattern.length > MAX_PATTERN_LENGTH) {
    throw new Error("Calendar template pattern exceeds the 40,000-character limit.");
  }
  const root: Node[] = [];
  const stack: Array<{ name: string; nodes: Node[] }> = [{ name: "", nodes: root }];
  const token = /\{\{([\s\S]*?)\}\}/gu;
  let offset = 0;
  for (const match of pattern.matchAll(token)) {
    const literal = pattern.slice(offset, match.index);
    if (literal.includes("{{") || literal.includes("}}")) throw new Error("Malformed Calendar variable delimiters.");
    if (literal) stack.at(-1)!.nodes.push({ type: "text", text: literal });
    offset = match.index! + match[0].length;
    const raw = match[1].trim();
    const marker = /^[#^/]/u.test(raw) ? raw[0] : "";
    const name = (marker ? raw.slice(1) : raw).trim();
    if (!validName(name)) throw new Error(`Invalid Calendar variable: ${raw}.`);
    if (marker === "/") {
      if (stack.length === 1 || stack.at(-1)!.name !== name) throw new Error(`Unmatched Calendar section close: ${name}.`);
      stack.pop();
      continue;
    }
    if (marker === "#" || marker === "^") {
      if (stack.length >= MAX_DEPTH) throw new Error("Calendar template section nesting is too deep.");
      const children: Node[] = [];
      stack.at(-1)!.nodes.push({ type: "section", name, inverse: marker === "^", children });
      stack.push({ name, nodes: children });
      continue;
    }
    stack.at(-1)!.nodes.push({ type: "value", name });
  }
  const rest = pattern.slice(offset);
  if (rest.includes("{{") || rest.includes("}}")) throw new Error("Unclosed Calendar variable delimiters.");
  if (rest) stack.at(-1)!.nodes.push({ type: "text", text: rest });
  if (stack.length !== 1) throw new Error(`Unclosed Calendar section: ${stack.at(-1)!.name}.`);
  return root;
}

function literalValue(name: string, values: CalendarTemplateLiterals): { found: boolean; value: CalendarTemplateLiteral } {
  if (!name.includes(".")) return own(values, name) ? { found: true, value: values[name] } : { found: false, value: undefined };
  const parts = name.split(".");
  let current: unknown = values;
  for (const part of parts) {
    if (!current || typeof current !== "object" || !Object.hasOwn(current, part)) return { found: false, value: undefined };
    current = (current as Record<string, unknown>)[part];
  }
  return { found: true, value: current as CalendarTemplateLiteral };
}

/**
 * Resolve explicitly registered nested Calendar templates.
 *
 * `values` are always literal: braces inside calculated facts or saved source prose
 * are never executed as another template. Only entries in `templates` may recurse.
 */
export function resolveCalendarNestedTemplate(
  pattern: string,
  values: CalendarTemplateLiterals,
  templates: CalendarNestedTemplates = {}
): CalendarTemplateResolution {
  const missing = new Set<string>();
  const errors: string[] = [];
  const parsed = new Map<string, Node[]>();
  let steps = 0;

  for (const name of Object.keys(templates)) {
    if (!validName(name) || name.includes(".")) return { text: pattern, missing: [], errors: [`Invalid nested Calendar template name: ${name}.`] };
  }

  const tree = (name: string, source: string) => {
    const key = `${name}\u0000${source}`;
    if (!parsed.has(key)) parsed.set(key, parse(source));
    return parsed.get(key)!;
  };

  const render = (nodes: Node[], chain: string[]): string => {
    if (chain.length > MAX_DEPTH) throw new Error("Calendar template expansion is too deep.");
    let output = "";
    for (const node of nodes) {
      if (++steps > MAX_STEPS) throw new Error("Calendar template expansion exceeds its processing budget.");
      if (node.type === "text") {
        output += node.text;
      } else if (node.type === "section") {
        const literal = literalValue(node.name, values);
        let truthy = literal.found ? Boolean(literal.value) : false;
        if (!literal.found && own(templates, node.name)) {
          if (chain.includes(node.name)) throw new Error(`Circular Calendar template reference: ${[...chain, node.name].join(" → ")}.`);
          truthy = Boolean(render(tree(node.name, templates[node.name]), [...chain, node.name]).trim());
        } else if (!literal.found && !own(templates, node.name)) {
          missing.add(node.name);
        }
        if (node.inverse ? !truthy : truthy) output += render(node.children, chain);
      } else {
        const literal = literalValue(node.name, values);
        if (literal.found) {
          // Literal facts and source prose never recurse, even if they contain {{tokens}}.
          output += literal.value == null ? "" : String(literal.value);
        } else if (own(templates, node.name)) {
          if (chain.includes(node.name)) throw new Error(`Circular Calendar template reference: ${[...chain, node.name].join(" → ")}.`);
          output += render(tree(node.name, templates[node.name]), [...chain, node.name]);
        } else {
          missing.add(node.name);
          output += `{{${node.name}}}`;
        }
      }
      if (output.length > MAX_OUTPUT_LENGTH) throw new Error("Rendered Calendar template exceeds its size budget.");
    }
    return output;
  };

  try {
    return { text: render(tree("$root", pattern), []), missing: [...missing], errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Calendar template could not be resolved.");
    return { text: pattern, missing: [...missing], errors };
  }
}
