import { SKY_PLACEMENT_VARIABLES, skyPlacementVariableIssues } from "./skyPlacementVariables.mjs";
import { resolveIngressSource } from "./skyIngressComposition.mjs";
import { SKY_WRITING_LIBRARY_GROUPS } from "./skyWritingLibraryRegistry.mjs";

const articlePaths = ["placementArticle", "placementArticleDirect", "placementArticleRetrograde"];
const facts = new Set(SKY_PLACEMENT_VARIABLES.map(item => item.name));
const phraseFields = new Map(SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields).map(item => [item.id, item]));
const kinds = new Set(["planet", "sign", "placement", "timing", "aspect"]);
const safeName = name => /^[A-Za-z][A-Za-z0-9]*$/u.test(name) && !["constructor", "prototype", "__proto__"].includes(name);
const tokenPattern = () => /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu;
const tokens = value => [...String(value ?? "").matchAll(tokenPattern())];
// Article paragraphs need an inline sequence; section templates retain their
// calculated multiline list. Apply this to direct tokens and phrase expansion.
const articleFactText = (name, value) => ["aspectsInSign", "aspectsWhileRetrograde"].includes(name)
  ? value.split(/\r?\n/u).map(line => line.replace(/^\s*-\s+/u, "").trim()).filter(Boolean).join(", ")
  : value;

export function isSkyPlacementArticleField(contentKey, path) {
  return /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(String(contentKey ?? "")) && articlePaths.includes(path);
}

export function skyPlacementArticlePhraseNames(value) {
  return [...new Set(tokens(value).map(match => match[1]).filter(name => !facts.has(name)))];
}

function knownPhrase(name, owner) {
  return safeName(name) && (phraseFields.has(name) || Object.hasOwn(owner?.ingress?.sources ?? {}, name)
    && kinds.has(owner.ingress.sources[name]?.kind));
}

/** Syntax only: an incomplete article remains saveable as a draft. */
export function skyPlacementArticleVariableIssues(value, owner = {}) {
  const issues = [];
  const remaining = String(value ?? "").replace(tokenPattern(), (token, name) => {
    if (!facts.has(name) && !knownPhrase(name, owner)) issues.push(`Unknown Sky variable ${token}. Use a calculated or editable phrase variable from the article variable picker.`);
    return "";
  });
  if (/\{\{|\}\}/u.test(remaining)) issues.push("Use a complete {{variableName}} token. Conditional blocks and nested phrase references are not supported.");
  return [...new Set(issues)];
}

function phraseSource(owner, name, records) {
  const source = owner?.ingress?.sources?.[name];
  if (!source && !phraseFields.get(name)?.shared) return { reason: `No writing saved for {{${name}}}. Fill this phrase in the Writing Library.` };
  const expected = phraseFields.get(name)?.kind;
  if (source && (!kinds.has(source.kind) || expected && source.kind !== expected)) return { reason: `{{${name}}} has the wrong source scope.` };
  if (!isSkyPlacementArticleField(owner?.contentKey, "placementArticle")) return { reason: "Phrase variables need the selected planet-in-sign source." };
  const resolved = resolveIngressSource(owner, name, records);
  if (resolved.reason) return resolved;
  if (typeof resolved.text !== "string" || !resolved.text.trim()) return { ...resolved, reason: `No writing saved for {{${name}}}. Fill this phrase in the Writing Library.` };
  // One phrase expansion only. Phrase text may contain the article's calculated
  // variables, never another authored source or an unrestricted object path.
  const issues = skyPlacementVariableIssues(resolved.text);
  if (issues.length) return { ...resolved, reason: `{{${name}}}: ${issues.join(" ")} Phrase text supports calculated article variables only.` };
  return resolved;
}

/** The editor uses the same source resolution as the reader, but can show gaps. */
export function skyPlacementArticleVariableSegments(value, calculated = {}, owner = {}, records = []) {
  const copy = String(value ?? "");
  const segments = [];
  let from = 0;
  for (const match of tokens(copy)) {
    if (match.index > from) segments.push({ text: copy.slice(from, match.index) });
    const [token, name] = match;
    let text = "";
    let reason = "";
    let kind = "fact";
    let reference = `calculated#${name}`;
    if (facts.has(name)) {
      text = Object.hasOwn(calculated, name) && typeof calculated[name] === "string" ? articleFactText(name, calculated[name]) : "";
      if (!text.trim()) reason = `Needs calculated ${name}`;
    } else if (knownPhrase(name, owner)) {
      const resolved = phraseSource(owner, name, records);
      kind = resolved.kind ?? phraseFields.get(name)?.kind ?? "placement";
      reference = resolved.reference ?? `${owner.contentKey}#ingress.sources.${name}`;
      reason = resolved.reason ?? "";
      if (!reason) {
        const missing = tokens(resolved.text).map(part => part[1]).filter(id => !Object.hasOwn(calculated, id) || typeof calculated[id] !== "string" || !calculated[id].trim());
        if (missing.length) reason = `Needs calculated ${[...new Set(missing)].join(", ")}`;
        else text = resolved.text.replace(tokenPattern(), (_, id) => articleFactText(id, calculated[id]));
      }
    } else reason = `Unknown Sky variable ${token}`;
    if (!reason && /\{\{|\}\}/u.test(text)) reason = `Unresolved variable inside ${token}`;
    segments.push({ text: reason ? token : text, token, name, kind, reference, reason, available: !reason });
    from = match.index + token.length;
  }
  if (from < copy.length) segments.push({ text: copy.slice(from) });
  return segments;
}

/** Never return a partial sentence or unresolved token to the reader. */
export function fillSkyPlacementArticleVariables(value, calculated = {}, owner = {}, records = []) {
  const issues = skyPlacementArticleVariableIssues(value, owner);
  if (issues.length) throw new Error(`SKY_V4_SOURCE_GAP: ${issues.join(" ")}`);
  const segments = skyPlacementArticleVariableSegments(value, calculated, owner, records);
  const missing = segments.filter(part => part.token && !part.available);
  if (missing.length) {
    const factOnly = missing.every(part => part.kind === "fact");
    throw new Error(`SKY_V4_SOURCE_GAP: ${factOnly ? "missing calculated facts" : "unavailable article variables"} ${missing.map(part => `${part.token}: ${part.reason}`).join("; ")}`);
  }
  return segments.map(part => part.text).join("");
}

/** Check every authored article, including motion variants, without inventing dates.
 * A referenced optional library field is required by the article that uses it.
 * The composition's enabled flag does not enable or disable article sources.
 */
export function skyPlacementArticlePublicationIssues(owner, records = []) {
  const issues = [];
  for (const path of articlePaths) {
    const value = owner?.[path];
    if (typeof value !== "string" || !value.trim()) continue;
    issues.push(...skyPlacementArticleVariableIssues(value, owner).map(issue => `${path}: ${issue}`));
    for (const name of skyPlacementArticlePhraseNames(value)) {
      if (!knownPhrase(name, owner)) continue;
      const resolved = phraseSource(owner, name, records);
      if (resolved.reason) issues.push(`${path} → ${name}: ${resolved.reason}`);
    }
  }
  return [...new Set(issues)];
}

/** Discover calculated dependencies hidden inside article phrase sources too. */
export function skyPlacementArticleDependencyText(owner, records = []) {
  return [...new Set(articlePaths.flatMap(path => skyPlacementArticlePhraseNames(owner?.[path])))].flatMap(name => {
    const source = knownPhrase(name, owner) ? phraseSource(owner, name, records) : null;
    return source && !source.reason ? [source.text] : [];
  }).join("\n");
}
