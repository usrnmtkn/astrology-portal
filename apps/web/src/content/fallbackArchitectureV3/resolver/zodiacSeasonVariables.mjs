import { isGovernedReaderEligible } from "./readerEligibility.mjs";

export const ZODIAC_SIGNS = Object.freeze(["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"]);
export const ZODIAC_SEASON_VARIABLES = Object.freeze([
  { id: "zodiacSeason", label: "Zodiac season", family: "zodiac-season", description: "Full editable prose about the selected sign's zodiac season.", kind: "sign", rows: 6, shared: true },
  { id: "zodiacSeasonPolarAxis", label: "Zodiac season polar axis", family: "zodiac-season-polar-axis", description: "Full editable prose about the selected sign and its opposite sign. This is shared season language, separate from lunation-specific axis copy.", kind: "sign", rows: 6, shared: true }
]);
const names = new Set(ZODIAC_SEASON_VARIABLES.map(field => field.id));
const normalizeSign = value => typeof value === "string" && ZODIAC_SIGNS.includes(value.toLowerCase().trim()) ? value.toLowerCase().trim() : "";
const title = value => value[0].toUpperCase() + value.slice(1);

export function zodiacSeasonSourceKey(name, sign) {
  const field = ZODIAC_SEASON_VARIABLES.find(field => field.id === name);
  const selected = normalizeSign(sign);
  return field && selected ? `fallback-hook/${field.family}/${selected}` : "";
}

export function isZodiacSeasonSourceKey(key) {
  return ZODIAC_SEASON_VARIABLES.some(field => ZODIAC_SIGNS.some(sign => key === zodiacSeasonSourceKey(field.id, sign)));
}

/** Structural editor starters only: no generated prose or serving approval. */
export const ZODIAC_SEASON_SOURCE_STARTERS = Object.freeze(ZODIAC_SIGNS.flatMap((sign, index) => ZODIAC_SEASON_VARIABLES.map(field => ({
  contentKey: zodiacSeasonSourceKey(field.id, sign), content_role: "fallback_hook", grammar_frame: "complete_sentence",
  headline: `${title(sign)} · ${field.label}`, body: "", review_status: "needs_review",
  sign, oppositeSign: ZODIAC_SIGNS[(index + 6) % ZODIAC_SIGNS.length],
  source_package: "tldrastro-fallback-architecture-v3",
  notes: `${field.description} Saved drafts are not reader copy. Publish the exact wording to update references to this sign.`
}))));

export function zodiacSeasonVariableNames(value) {
  return [...new Set([...String(value ?? "").matchAll(/\{\{\s*[#/^]?\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu)].map(match => match[1]).filter(name => names.has(name)))];
}

/** A compatibility template uses its first/primary sign, as signATitle does. */
export function zodiacSeasonContextSign(context = {}) {
  for (const value of [context.sign, context.signTitle, context.Sign, context.SubjectSign, context.signA, context.signATitle]) {
    const sign = normalizeSign(value);
    if (sign) return sign;
  }
  const parts = String(context.contentKey ?? "").split(/[/-]/u);
  return parts.find(part => ZODIAC_SIGNS.includes(part)) ?? "";
}

export function zodiacSeasonSourceText(row, { preview = false } = {}) {
  if (!row || !isZodiacSeasonSourceKey(row.contentKey)) return "";
  if (!preview && !isGovernedReaderEligible(row)) return "";
  return typeof row.body === "string" ? row.body.trim() : "";
}

export function resolveZodiacSeasonVariables(value, context, sourceRows = [], options = {}) {
  const copy = String(value ?? "");
  const used = zodiacSeasonVariableNames(copy);
  if (!used.length) return copy;
  const sign = zodiacSeasonContextSign(context);
  if (!sign) throw new Error("ZODIAC_SEASON_SOURCE_GAP: Select a sign before resolving season variables.");
  const rows = sourceRows instanceof Map ? sourceRows : new Map(sourceRows.map(row => [row.contentKey, row]));
  const values = new Map(used.map(name => {
    const key = zodiacSeasonSourceKey(name, sign);
    const body = zodiacSeasonSourceText(rows.get(key), options);
    if (!body) throw new Error(`ZODIAC_SEASON_SOURCE_GAP: Publish ${name} prose for ${title(sign)} before using {{${name}}}.`);
    if (/\{\{|\}\}/u.test(body)) throw new Error(`ZODIAC_SEASON_SOURCE_GAP: ${key} must contain complete prose, without nested variables.`);
    return [name, body];
  }));
  return copy.replace(/\{\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\}/gu, (token, name) => values.get(name) ?? token);
}

/** Expand only these named variables. Existing template syntax is left intact. */
export function zodiacSeasonTemplateContext(copy, context, sourceRows = [], options = {}) {
  const result = { ...context };
  for (const name of zodiacSeasonVariableNames(copy)) result[name] = resolveZodiacSeasonVariables(`{{${name}}}`, context, sourceRows, options);
  return result;
}

/** Contracts with an explicit primary sign supplied by their renderer. */
export function supportsZodiacSeasonVariables(record = {}) {
  const key = String(record.contentKey ?? "");
  if (isZodiacSeasonSourceKey(key)) return false;
  return key === "fallback-hook/moon-void"
    || /^(?:fallback-hook\/(?:moon-phase|lunation-sign-compact)|authored\/calendar-weekly-moon)\//u.test(key) && Boolean(zodiacSeasonContextSign(record))
    || /^fallback-template\/(?:natal\.(?:planet-in-sign|node-in-sign|angle-in-sign|house-context)|transit\.(?:house|aspect|retrograde)|compat\.(?:same-sign|cross-sign))(?:$|\/)/u.test(key)
    || /^(?:sky-placement\/article|sky-placement\/seasonal-context|sky-lunation\/(?:new-moon|full-moon)|sky-eclipse)\//u.test(key) && Boolean(zodiacSeasonContextSign(record));
}

/** Only reader prose is traversed. Notes and structural metadata are not dependencies. */
export function zodiacSeasonRecordDependencies(record = {}) {
  const copyFields = /^(?:body(?:_you|_they)?|headline(?:_they)?|text|summary|placementArticle(?:Direct|Retrograde)?|tldrWhat|tldrTakeaway|TLDR(?:_What|_Takeaway)?|Hook|Lived|Turn|.*(?:Article|Body|Copy|Hook)|Template|template)$/u;
  const copies = Object.entries(record).filter(([key, value]) => copyFields.test(key) && typeof value === "string").map(([, value]) => value);
  for (const field of record.studio_editable_fields ?? []) {
    const path = typeof field === "string" ? field : field.path;
    const value = typeof path === "string" ? path.split(".").reduce((current, key) => current?.[key], record) : undefined;
    if (typeof value === "string") copies.push(value);
  }
  if (record.ingress?.enabled) copies.push(...record.ingress.modules.filter(module => module.enabled).map(module => module.template));
  const used = zodiacSeasonVariableNames(copies.join("\n"));
  const sign = zodiacSeasonContextSign(record);
  return used.filter(name => !record.ingress?.sources?.[name]).flatMap(name => (sign ? [sign] : ZODIAC_SIGNS).map(selected => ({ name, sign: selected, contentKey: zodiacSeasonSourceKey(name, selected) })));
}
