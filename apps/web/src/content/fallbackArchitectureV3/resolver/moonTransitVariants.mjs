// Legacy source identities stay intact. These aliases apply only to Moon rows.
const natalAliases = { a: "ascendant", c: "chiron", j: "jupiter", m: "mercury", s: "sun" };
const aspectGroups = { square: "hard", opposition: "hard", trine: "soft", sextile: "soft" };

export function moonTransitNatalAliases(transiting, natal) {
  return transiting === "moon" ? Object.keys(natalAliases).filter(alias => natalAliases[alias] === natal) : [];
}

/** Numeric choices address distinct saved sources, including canonical/alias siblings. */
export function moonTransitVariantKeys(keys, transiting, natal, aspect) {
  if (transiting !== "moon") return [];
  const groups = new Set([aspect, aspectGroups[aspect] ?? aspect, "any"]);
  return [...new Set(keys)].filter(key => {
    const parts = key.split("/");
    return parts.length === 6 && parts[0] === "authored" && parts[1] === "transit-aspect"
      && parts[2] === "moon" && (natalAliases[parts[3]] ?? parts[3]) === natal
      && groups.has(parts[4]) && /^variant-(?:[A-E]|[1-9]\d*)$/u.test(parts[5]);
  }).sort();
}

export function selectMoonTransitVariant(keys, transiting, natal, aspect, variant, seed) {
  const choices = moonTransitVariantKeys(keys, transiting, natal, aspect);
  if (!choices.length) return null;
  if (typeof seed === "string" && seed.length) {
    let hash = 2166136261;
    for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    // Keep the unvaried source in the ordinary rotation as well.
    const index = hash % (choices.length + 1);
    return index ? choices[index - 1] : null;
  }
  return Number.isInteger(variant) && variant > 0 ? choices[variant - 1] ?? null : null;
}
