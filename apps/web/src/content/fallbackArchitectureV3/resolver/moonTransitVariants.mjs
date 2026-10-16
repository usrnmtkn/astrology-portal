// Legacy source identities stay intact. These aliases apply only to Moon rows.
const natalAliases = { a: "ascendant", c: "chiron", j: "jupiter", m: "mercury", s: "sun" };
const aspectGroups = { square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };

export function moonTransitNatalAliases(transiting, natal) {
  return transiting === "moon" ? Object.keys(natalAliases).filter(alias => natalAliases[alias] === natal) : [];
}

/** Numeric choices address distinct saved sources, including canonical/alias siblings. */
export function moonTransitVariantKeys(keys, transiting, natal, aspect) {
  if (transiting !== "moon") return [];
  const groups = [aspect, aspectGroups[aspect], "any"];
  return [...new Set(keys)].filter(key => {
    const match = /^authored\/transit-aspect\/moon\/([^/]+)\/([^/]+)\/variant-(?:[A-E]|[1-9]\d*)$/u.exec(key);
    return match && (natalAliases[match[1]] ?? match[1]) === natal && groups.includes(match[2]);
  }).sort();
}

export function selectMoonTransitVariant(keys, transiting, natal, aspect, variant, seed) {
  const choices = moonTransitVariantKeys(keys, transiting, natal, aspect);
  if (typeof seed === "string" && seed.length) {
    let hash = 2166136261;
    for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    // Keep the unvaried source in the ordinary rotation as well.
    variant = hash % (choices.length + 1);
  }
  return Number.isInteger(variant) ? choices[variant - 1] ?? null : null;
}
