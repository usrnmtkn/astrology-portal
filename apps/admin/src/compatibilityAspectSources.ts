import type { AdminDraft } from "./GeneratedContentAdminDashboard";

export const compatibilityAspectPoints = [
  "sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto",
  "chiron", "lilith", "north-node", "south-node", "ascendant", "descendant", "midheaven", "imum-coeli"
] as const;
export const compatibilityAspectTypes = ["conjunction", "sextile", "square", "trine", "opposition"] as const;
export type CompatibilityAspectSelection = { first: string; aspect: string; second: string };
const prefix = "fallback-hook/synastry-pair/";

export function compatibilityAspectKey(selection: CompatibilityAspectSelection) {
  if (!compatibilityAspectPoints.some(point => point === selection.first)
    || !compatibilityAspectPoints.some(point => point === selection.second)
    || !compatibilityAspectTypes.some(aspect => aspect === selection.aspect)) return null;
  return `${prefix}${selection.first}/${selection.second}/${selection.aspect}`;
}

export function compatibilityAspectFromSearch(query: string): CompatibilityAspectSelection {
  const words = query.toLowerCase().replace(/\bmc\b/g, "midheaven").replace(/\bic\b/g, "imum coeli")
    .replace(/\basc\b/g, "ascendant").replace(/\bdsc\b/g, "descendant").replace(/[-_/+.]+/g, " ");
  const points = [...words.matchAll(/\b(sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node|ascendant|descendant|midheaven|imum coeli)\b/g)]
    .map(match => match[0].replace(/ /g, "-"));
  const aspect = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite)\b/.exec(words)?.[0] ?? "";
  return { first: points[0] ?? "", second: points[1] ?? "", aspect: aspect === "conjunct" ? "conjunction" : aspect === "opposite" ? "opposition" : aspect };
}

export function compatibilityAspectSearchText(contentKey: string) {
  if (!contentKey.startsWith(prefix)) return "";
  const [first, second, aspect] = contentKey.slice(prefix.length).split("/");
  const aspects = aspect === "hard" ? ["square", "opposition", "opposite"]
    : aspect === "soft" ? ["trine", "sextile"] : aspect === "conjunction" ? ["conjunction", "conjunct"] : [aspect];
  return aspects.flatMap(value => [`${first} ${value} ${second}`, `${second} ${value} ${first}`]).join(" ").replace(/-/g, " ");
}

export function compatibilityAspectSourceDraft(selection: CompatibilityAspectSelection): AdminDraft {
  const contentKey = compatibilityAspectKey(selection);
  if (!contentKey) throw new Error("Choose both planets or points and an aspect.");
  const title = (word: string) => word.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join(" ");
  return {
    id: null, contentKey, surface: "synastry", mode: "in_depth", status: "DRAFT",
    headline: `${title(selection.first)} ${selection.aspect} ${title(selection.second)}`,
    summary: "", body: "", lane: "reference", reviewState: "needs-review", blockType: "fallback_hook",
    promptVersion: "manual-admin", reviewerNotes: "",
    sections: { packageRecord: {
      contentKey, content_role: "full_copy", grammar_frame: "complete_sentence",
      body_you: "", body_they: "", review_status: "needs_review"
    } },
    facts: { fallbackArchitectureV3: true, ...selection },
    sourceSnapshot: {
      contentType: "synastry-aspect-exact", contentSystem: "fallback", content_role: "full_copy",
      review_status: "needs_review", sourcePackage: "tldrastro-fallback-architecture-v3",
      authoringSource: "admin-dashboard"
    }
  };
}
