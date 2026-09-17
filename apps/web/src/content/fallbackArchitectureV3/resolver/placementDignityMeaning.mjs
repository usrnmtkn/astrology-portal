import { planetSignDignity } from "../../../services/planetSignDignity.mjs";

export const PLACEMENT_DIGNITY_MEANING = "placementDignityMeaning";
export const LEGACY_DIGNITY_MEANING = "dignitySentence";
export const PLACEMENT_DIGNITY_FIELDS = Object.freeze([
  { id: PLACEMENT_DIGNITY_MEANING, kind: "placement", label: "Dignity paragraph", rows: 5, description: "A complete authored paragraph for this exact placement. Existing writing is preserved. When empty, the calculated dignity selects the template and the two fields below supply its explanation. No paragraph is invented when those fields are missing." },
  { id: "placementDignityMechanism", kind: "placement", label: "Dignity mechanism", rows: 3, description: "An independent clause explaining why this sign supports or complicates this planet's work. Identify what the planet needs, what the sign prioritizes, and how those interact. Follows ‘Here,’ and does not include a final period. Comfort language is not enough information for this field." },
  { id: "placementDignityExpression", kind: "placement", label: "Dignity expression", rows: 3, description: "A verb phrase naming the specific capacity affected, such as ‘express affection directly’. Do not add a leading ‘to’ or final punctuation. Natal and ingress wording is authored separately." }
]);

// Structural templates from the planet-in-sign template proposal. Installing
// these never enables a composition, creates approved writing, or publishes it.
// The exact placement's authored explanation is required before any can render.
const opening = Object.freeze({
  domicile: "{{planetTitle}} rules {{signTitle}}, so it is in domicile here. The sign supports the planet’s usual way of working.",
  exaltation: "{{signTitle}} is the sign of {{planetTitle}}’s exaltation, where its work receives particular support. The planet does not rule this sign, but the combination can bring out a distinctive strength.",
  detriment: "{{planetTitle}} is in detriment in {{signTitle}}, a sign opposite one it rules. Its usual work has to happen through a different set of priorities.",
  fall: "{{signTitle}} is the sign of {{planetTitle}}’s fall, which means {{planetTitle}} has a harder time doing its usual work here.",
  domicile_exaltation: "{{planetTitle}} rules {{signTitle}} and is also exalted there, so it has both domicile and exaltation in this sign. Its work receives the support of rulership as well as the particular strength associated with exaltation.",
  detriment_fall: "{{planetTitle}} is in both detriment and fall in {{signTitle}}, opposite the sign where it has domicile and exaltation. Its usual methods encounter a different set of demands here."
});
const endings = Object.freeze({
  natal: Object.freeze({
    domicile: "This can make it easier to {{placementDignityExpression}}.",
    exaltation: "This can strengthen your capacity to {{placementDignityExpression}}.",
    detriment: "This can make it harder to {{placementDignityExpression}}.",
    fall: "You may need more support or a more deliberate approach to {{placementDignityExpression}}.",
    none: "This helps describe how you {{placementDignityExpression}}.",
    domicile_exaltation: "These conditions can support your ability to {{placementDignityExpression}}.",
    detriment_fall: "This can complicate your efforts to {{placementDignityExpression}}."
  }),
  ingress: Object.freeze({
    domicile: "During this period, it may be easier to {{placementDignityExpression}}.",
    exaltation: "This period can offer particular support for efforts to {{placementDignityExpression}}.",
    detriment: "During this period, it may take a different approach to {{placementDignityExpression}}.",
    fall: "During this period, more support or preparation may be needed to {{placementDignityExpression}}.",
    none: "During this period, the emphasis is on how we {{placementDignityExpression}}.",
    domicile_exaltation: "Together, these conditions can support efforts to {{placementDignityExpression}} during this period.",
    detriment_fall: "During this period, attempts to {{placementDignityExpression}} may need more flexibility and practical support."
  })
});

export function placementDignityTemplate(variant, register) {
  if (!Object.hasOwn(endings, register)) throw new Error("Choose natal or ingress dignity wording explicitly.");
  if (variant === "none") {
    const mechanism = "Here, {{placementDignityMechanism}}.";
    // Sky reader copy omits the list of conditions that do not apply.
    if (register === "ingress") return `${mechanism} ${endings.ingress.none}`;
    return `{{planetTitle}} is not in domicile, exaltation, detriment, or fall in {{signTitle}}. The emphasis here is on the particular relationship between the planet’s work and the sign’s approach. ${mechanism} ${endings.natal.none}`;
  }
  if (!Object.hasOwn(opening, variant)) throw new Error("Unknown dignity template condition.");
  return `${opening[variant]} Here, {{placementDignityMechanism}}. ${endings[register][variant]}`;
}

/** The canonical source identity and calculated occurrence must agree. */
export function placementDignityForSource(owner, context = owner) {
  const match = /^sky-placement\/article\/([^/]+)\/([^/]+)$/u.exec(String(owner?.contentKey ?? ""));
  const own = planetSignDignity(match?.[1] ?? owner?.planet, match?.[2] ?? owner?.sign);
  const input = planetSignDignity(Object.hasOwn(context ?? {}, "planet") ? context.planet : own.planet, Object.hasOwn(context ?? {}, "sign") ? context.sign : own.sign);
  if (own.status === "invalid" || input.status === "invalid") return { ...input, status: "invalid", reason: own.reason || input.reason };
  if (own.planet !== input.planet || own.sign !== input.sign) return { ...input, status: "invalid", reason: "Dignity writing does not match the selected planet and sign." };
  return input;
}

const hasWriting = source => Boolean(source?.reference || typeof source?.text === "string" && source.text.trim());

/** Read approved/eligible sources supplied by the existing content resolver.
 * This helper does not fetch data, call AI, or change approval/publication state.
 * resolveSource is the existing one-hop, hash-pinned raw source resolver.
 */
export function resolvePlacementDignityMeaning(owner, context, resolveSource, register = "ingress") {
  const dignity = placementDignityForSource(owner, context);
  const base = { kind: "placement", reference: `${owner?.contentKey}#ingress.sources.${PLACEMENT_DIGNITY_MEANING}`, dignity, variant: dignity.variant };
  if (dignity.status === "invalid") return { ...base, reason: dignity.reason };
  if (dignity.status === "not_applicable") return { ...base, text: "", omitted: true, omissionReason: dignity.reason };
  const sources = owner?.ingress?.sources ?? {};
  // A complete authored paragraph always stays whole. The legacy name is a
  // compatibility source, not a second interpretation or a shortened fallback.
  for (const id of [PLACEMENT_DIGNITY_MEANING, LEGACY_DIGNITY_MEANING]) {
    if (!hasWriting(sources[id])) continue;
    const resolved = resolveSource(id);
    if (resolved.reason) return { ...base, ...resolved };
    if (resolved.kind !== "placement") return { ...base, reason: `${id} must be scoped to this exact planet and sign.` };
    return { ...base, ...resolved, legacyAlias: id === LEGACY_DIGNITY_MEANING, dignity, variant: dignity.variant };
  }
  const values = {};
  const dependencies = [];
  for (const id of ["placementDignityMechanism", "placementDignityExpression"]) {
    const source = resolveSource(id);
    dependencies.push({ name: id, ...source });
    if (source.reason || !source.text?.trim()) return { ...base, dependencies, reason: `${id}: ${source.reason || "No writing saved for this placement"}` };
    if (source.kind !== "placement") return { ...base, dependencies, reason: `${id} must be scoped to this exact planet and sign.` };
    if (/[.!?]\s*$/u.test(source.text) || id === "placementDignityExpression" && /^\s*to\s/iu.test(source.text)) return { ...base, dependencies, reason: `${id} must use its documented clause/verb-phrase form, without final punctuation${id === "placementDignityExpression" ? " or an initial ‘to’" : ""}.` };
    values[id] = source.text.trim();
  }
  const template = placementDignityTemplate(dignity.variant, register);
  const text = template.replace(/\{\{(placementDignityMechanism|placementDignityExpression)\}\}/gu, (_, id) => values[id]);
  return { ...base, text, template, dependencies, register };
}

/** Draft-only, explicit migration. Preserve originals and pinned references.
 * No bulk data write and no overwriting a newer canonical paragraph.
 */
export function migrateLegacyDignityComposition(composition, owner) {
  if (!composition) return composition;
  const legacy = composition.sources?.[LEGACY_DIGNITY_MEANING];
  if (!hasWriting(legacy)) return structuredClone(composition);
  const dignity = placementDignityForSource(owner);
  if (dignity.status !== "known") throw new Error("There is no applicable dignity paragraph for this source. Keep the existing authored paragraph under its legacy name; it was not changed.");
  const current = composition.sources?.[PLACEMENT_DIGNITY_MEANING];
  if (hasWriting(current) && JSON.stringify(current) !== JSON.stringify(legacy)) throw new Error("Both dignity fields contain different writing. Review them before migration; neither was overwritten.");
  const next = structuredClone(composition);
  next.sources[PLACEMENT_DIGNITY_MEANING] = structuredClone(legacy);
  next.modules = next.modules.map(module => ({ ...module, template: module.template.replace(/\{\{\s*dignitySentence\s*\}\}/gu, "{{placementDignityMeaning}}") }));
  return next;
}

/** An optional paragraph may disappear only as a complete paragraph, never as
 * a fragment inside an authored sentence. Accept LF, CRLF, and blank spaces.
 */
export function isStandaloneDignityParagraph(value, tokenIndex) {
  const text = String(value ?? "");
  let start = 0;
  for (const separator of text.matchAll(/\r?\n[ \t]*\r?\n/gu)) {
    if (separator.index > tokenIndex) break;
    start = separator.index + separator[0].length;
  }
  const following = /\r?\n[ \t]*\r?\n/u.exec(text.slice(tokenIndex));
  const end = following ? tokenIndex + following.index : text.length;
  return /^\s*\{\{\s*placementDignityMeaning\s*\}\}\s*$/u.test(text.slice(start, end));
}
