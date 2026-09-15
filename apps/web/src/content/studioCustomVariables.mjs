/** Authored values are data, never executable templates. Publications keep an exact snapshot. */
export const STUDIO_VARIABLE_PREFIX = "studio-variable/";
export const STUDIO_VARIABLE_SCHEMA = "studio-variable/v1";
export const VARIABLE_SIGNS = "aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces".split(" ");
export const VARIABLE_PLANETS = "sun moon mercury venus mars jupiter saturn uranus neptune pluto chiron lilith north-node south-node".split(" ");
export const studioVariableTokens = value => [...new Set([...String(value ?? "").matchAll(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu)].map(match => match[1]))];
const object = value => value && typeof value === "object" && !Array.isArray(value);

export function validateStudioVariable(value, reservedNames = []) {
  if (!object(value)) throw new Error("A variable definition is required.");
  const text = (key, max, required = false) => {
    if (typeof value[key] !== "string" || value[key].length > max || required && !value[key].trim()) throw new Error(`${key} must be ${required ? "non-empty text" : "text"} of at most ${max} characters.`);
    return value[key];
  };
  const name = text("name", 64, true);
  if (!/^[A-Za-z][A-Za-z0-9_]*$/u.test(name) || ["constructor", "prototype", "__proto__"].includes(name)) throw new Error("Use a token name starting with a letter, followed by letters, numbers, or underscores.");
  if (reservedNames.some(item => item.toLowerCase() === name.toLowerCase())) throw new Error(`{{${name}}} is reserved by a built-in variable. Choose your own token name.`);
  const label = text("label", 160, true);
  const description = text("description", 2000);
  const prose = text("value", 20000);
  if (/\{\{|\}\}/u.test(prose)) throw new Error("Variable values contain your writing, without nested variable tokens.");
  if (!Array.isArray(value.tags) || value.tags.length > 30 || value.tags.some(tag => typeof tag !== "string" || !tag.trim() || tag.length > 80)) throw new Error("Use up to 30 tags, each containing 1–80 characters.");
  const tags = [...new Map(value.tags.map(tag => [tag.trim().toLocaleLowerCase(), tag.trim()])).values()];
  if (!Array.isArray(value.overrides) || value.overrides.length > 250) throw new Error("Use at most 250 overrides.");
  const seen = new Set();
  const overrides = value.overrides.map(item => {
    if (!object(item) || !["planet", "sign", "placement"].includes(item.scope)) throw new Error("Choose planet, sign, or placement for each override.");
    const planet = item.scope !== "sign" ? item.planet : "";
    const sign = item.scope !== "planet" ? item.sign : "";
    if (item.scope !== "sign" && !VARIABLE_PLANETS.includes(planet) || item.scope !== "planet" && !VARIABLE_SIGNS.includes(sign)) throw new Error("Choose a valid planet and sign for the override.");
    if (typeof item.value !== "string" || item.value.length > 20000 || /\{\{|\}\}/u.test(item.value)) throw new Error("Override values must be prose of at most 20,000 characters, without nested variables.");
    const key = `${item.scope}/${planet}/${sign}`;
    if (seen.has(key)) throw new Error("Only one override is allowed for each planet, sign, or placement.");
    seen.add(key);
    return { scope: item.scope, planet, sign, value: item.value };
  });
  return { schema: STUDIO_VARIABLE_SCHEMA, name, label, description, value: prose, tags, overrides };
}

const normalize = (value, allowed) => typeof value === "string" && allowed.includes(value.trim().toLowerCase()) ? value.trim().toLowerCase() : "";
export function studioVariableContext(context = {}) {
  const parts = String(context.contentKey ?? context.content_key ?? "").split("/");
  const planet = [context.planet, context.planetTitle, context.Planet, context.transiting, context.transitPlanet, ...parts].map(value => normalize(value, VARIABLE_PLANETS)).find(Boolean) ?? "";
  const sign = [context.sign, context.signTitle, context.Sign, context.SubjectSign, context.signA, context.signATitle, ...parts].map(value => normalize(value, VARIABLE_SIGNS)).find(Boolean) ?? "";
  return { planet, sign };
}

export function studioVariableValue(definition, context = {}) {
  const { planet, sign } = studioVariableContext(context);
  const overrides = definition.overrides ?? [];
  const selected = overrides.find(item => item.scope === "placement" && item.planet === planet && item.sign === sign)
    ?? overrides.find(item => item.scope === "planet" && item.planet === planet)
    ?? overrides.find(item => item.scope === "sign" && item.sign === sign);
  return { value: selected ? selected.value : definition.value, scope: selected?.scope ?? "shared" };
}

// Only reader-facing fields are traversed. Provenance, editorial notes, and manifests stay untouched.
const readerFields = new Set(["body", "body_you", "body_they", "headline", "summary", "template", "copy", "text", "title", "question", "placementArticle", "placementArticleDirect", "placementArticleRetrograde", "tldrLead", "tldrTakeaway", "Body", "Copy", "Template", "Article", "NewMoonArticle", "FullMoonArticle", "EventArticle", "FallbackArticle", "ModifierArticle", "NodeAxisArticle", "ExactIngressCopy", "LilithArticle", "OverlayBody", "TLDR_Lead", "TLDR_Takeaway", "CanonicalShort"]);
export function mapStudioVariableCopy(record, map) {
  const result = { ...record };
  for (const key of readerFields) if (typeof record[key] === "string") result[key] = map(record[key]);
  for (const field of record.studio_editable_fields ?? []) {
    const path = typeof field === "string" ? field : field?.path;
    if (!path || path.startsWith("_studio") || path.split(".").some(key => ["__proto__", "constructor", "prototype"].includes(key))) continue;
    const keys = path.split(".");
    let source = record, target = result;
    for (const key of keys.slice(0, -1)) {
      if (!object(source?.[key])) { source = null; break; }
      source = source[key]; target[key] = { ...(target[key] ?? source) }; target = target[key];
    }
    const last = keys.at(-1);
    if (source && typeof source[last] === "string") target[last] = map(source[last]);
  }
  if (Array.isArray(record.ingress?.modules)) result.ingress = { ...record.ingress, modules: record.ingress.modules.map(module => ({ ...module, template: typeof module.template === "string" ? map(module.template) : module.template })) };
  else if (object(record.ingress?.modules)) result.ingress = { ...record.ingress, modules: Object.fromEntries(Object.entries(record.ingress.modules).map(([key, value]) => [key, typeof value === "string" ? map(value) : value])) };
  return result;
}

export function studioRecordVariableNames(record) {
  const names = new Set();
  mapStudioVariableCopy(record, copy => { studioVariableTokens(copy).forEach(name => names.add(name)); return copy; });
  return [...names];
}

export function resolveStudioVariableCopy(copy, bindings = [], context = {}) {
  const indexed = new Map(bindings.map(item => [item.name, item]));
  return String(copy ?? "").replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/gu, (token, name) => {
    const definition = indexed.get(name);
    if (!definition) return token;
    const { value } = studioVariableValue(definition, context);
    if (typeof value !== "string" || !value.trim() || /\{\{|\}\}/u.test(value)) throw new Error(`Missing value for ${token}. Open Variables to complete it before publishing.`);
    return value;
  });
}

export function resolveStudioVariableRecord(record, context = {}) {
  const bindings = record?._studioVariables;
  if (!Array.isArray(bindings) || !bindings.length) return record;
  const result = mapStudioVariableCopy(record, copy => resolveStudioVariableCopy(copy, bindings, { ...studioVariableContext(record), ...context }));
  const names = new Set(bindings.map(item => item.name));
  for (const field of ["requiredSlots", "optionalSlots"]) if (Array.isArray(result[field])) result[field] = result[field].filter(name => !names.has(name));
  delete result._studioVariables;
  return result;
}

/** Resolve each publication's own frozen values for this render's calculated context. */
export function bindStudioVariableRenderer(renderer, create, collections) {
  if (!collections.some(rows => rows.some(row => row?._studioVariables?.length))) return renderer;
  const cache = new Map();
  return Object.fromEntries(Object.entries(renderer).map(([key, render]) => [key, typeof render !== "function" ? render : (...args) => {
    const context = object(args[0]) ? args[0] : {};
    const selection = studioVariableContext(context);
    const cacheKey = `${selection.planet}/${selection.sign}`;
    if (!cache.has(cacheKey)) {
      const resolved = collections.map(rows => rows.map(row => resolveStudioVariableRecord(row, context)));
      if (cache.size >= 24) cache.delete(cache.keys().next().value);
      cache.set(cacheKey, create(resolved));
    }
    return cache.get(cacheKey)[key](...args);
  }]));
}

/** The synchronous Node reference stores rows in module-level maps. Scope a
 * resolved view to one call and restore it even when the renderer rejects copy. */
export function bindStudioVariableReference(render, containers) {
  const entries = containers.flatMap(container => [...container.entries()].filter(([, value]) =>
    Array.isArray(value) ? value.some(row => row?._studioVariables?.length) : value?._studioVariables?.length
  ).map(([key, value]) => ({ container, key, value })));
  if (!entries.length) return render;
  return (...args) => {
    const previous = entries.map(({ container, key }) => container instanceof Map ? container.get(key) : container[key]);
    const context = object(args[0]) ? args[0] : {};
    try {
      for (const { container, key, value } of entries) {
        const resolved = Array.isArray(value) ? value.map(row => resolveStudioVariableRecord(row, context)) : resolveStudioVariableRecord(value, context);
        if (container instanceof Map) container.set(key, resolved); else container[key] = resolved;
      }
      return render(...args);
    } finally {
      entries.forEach(({ container, key }, index) => { if (container instanceof Map) container.set(key, previous[index]); else container[key] = previous[index]; });
    }
  };
}
