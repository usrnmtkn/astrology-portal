// Transform Vite's JavaScript output, never its governed JSON input.
const sourceFiles = [
  "/apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json",
  "/apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json",
  "/apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"
];

export function internJsonStringLiterals(code, parse) {
  const ast = parse(code);
  const names = new Set();
  const strings = new Map();
  function visit(node, parent, key) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Identifier") names.add(node.name);
    if (node.type === "Literal" && typeof node.value === "string" && node.value.length >= 80
      && !(parent?.type === "Property" && key === "key")
      && !(parent?.type === "ExpressionStatement" && parent.directive)) {
      const occurrences = strings.get(node.value) ?? [];
      occurrences.push(node);
      strings.set(node.value, occurrences);
    }
    for (const [childKey, child] of Object.entries(node)) {
      if (Array.isArray(child)) for (const item of child) visit(item, node, childKey);
      else if (child && typeof child === "object") visit(child, node, childKey);
    }
  }
  visit(ast);
  const declarations = [];
  const replacements = [];
  let index = 0;
  for (const occurrences of strings.values()) {
    if (occurrences.length < 2) continue;
    let name;
    do { name = `$tldrJsonString${index++}`; } while (names.has(name));
    names.add(name);
    const first = occurrences[0];
    declarations.push(`${name}=${code.slice(first.start, first.end)}`);
    for (const node of occurrences) replacements.push({ start: node.start, end: node.end, name });
  }
  if (!replacements.length) return null;
  const parts = [`const ${declarations.join(",")};\n`];
  let cursor = 0;
  for (const replacement of replacements.sort((a, b) => a.start - b.start)) {
    parts.push(code.slice(cursor, replacement.start), replacement.name);
    cursor = replacement.end;
  }
  parts.push(code.slice(cursor));
  return { code: parts.join(""), map: null };
}

export function internPublicJsonStringsPlugin() {
  return {
    name: "tldr-intern-public-json-strings",
    apply: "build",
    enforce: "post",
    transform(code, id) {
      if (!sourceFiles.some(file => id.replaceAll("\\", "/").endsWith(file))) return;
      return internJsonStringLiterals(code, code => this.parse(code));
    }
  };
}
