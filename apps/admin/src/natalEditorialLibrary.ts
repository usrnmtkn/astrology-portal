export const natalSectPlanets = ["jupiter", "venus", "mars", "saturn"] as const;
export type NatalEditorialArea = "rulership" | "day-night";
export type NatalEditorialSelection = {
  area: NatalEditorialArea;
  audience: "you" | "they";
  passage: string;
  sect: "day" | "night";
};

export function natalEditorialIdentity(selection: NatalEditorialSelection) {
  const { area, audience, passage, sect } = selection;
  if (!["you", "they"].includes(audience)) throw new Error("Choose You or Friend.");
  const audienceLabel = audience === "you" ? "You" : "Friend";
  if (area === "rulership") {
    if (passage === "introduction") return { contentKey: `cms/natal-twelfth-ruler/${audience}/introduction`, title: `Understanding Undoing · ${audienceLabel}` };
    const house = Number(passage);
    if (!/^([1-9]|1[0-2])$/u.test(passage)) throw new Error("Choose the introduction or a ruler’s house.");
    return { contentKey: `cms/natal-twelfth-ruler/${audience}/ruler-house/${house}`, title: `Twelfth-house ruler in house ${house} · ${audienceLabel}` };
  }
  if (area !== "day-night" || !["day", "night"].includes(sect)) throw new Error("Choose a day or night chart.");
  const chartLabel = sect === "day" ? "Day" : "Night";
  if (passage === "overview") return { contentKey: `cms/natal-chart-context/${audience}/sect/${sect}`, title: `${chartLabel} chart · ${audienceLabel}` };
  if (!natalSectPlanets.includes(passage as typeof natalSectPlanets[number])) throw new Error("Choose an overview or a supported planet.");
  const planetLabel = passage.charAt(0).toUpperCase() + passage.slice(1);
  return { contentKey: `cms/natal-planet-sect/${audience}/${passage}/${sect}`, title: `${planetLabel} · ${chartLabel} chart · ${audienceLabel}` };
}

export function natalEditorialSelection(area: NatalEditorialArea, hash: string): NatalEditorialSelection {
  const params = new URLSearchParams(hash.split("?")[1] ?? "");
  const selection: NatalEditorialSelection = { area, audience: params.get("natalAudience") === "they" ? "they" : "you",
    passage: params.get("natalPassage") ?? (area === "rulership" ? "introduction" : "overview"), sect: params.get("natalSect") === "night" ? "night" : "day" };
  try { natalEditorialIdentity(selection); } catch { selection.passage = area === "rulership" ? "introduction" : "overview"; }
  return selection;
}

export function natalEditorialDraftForKey(contentKey: string) {
  let selection: NatalEditorialSelection | null = null;
  const ruler = /^cms\/natal-twelfth-ruler\/(you|they)\/(introduction|ruler-house\/([1-9]|1[0-2]))$/u.exec(contentKey);
  const overview = /^cms\/natal-chart-context\/(you|they)\/sect\/(day|night)$/u.exec(contentKey);
  const planet = /^cms\/natal-planet-sect\/(you|they)\/(jupiter|venus|mars|saturn)\/(day|night)$/u.exec(contentKey);
  if (ruler) selection = { area: "rulership", audience: ruler[1] as "you" | "they", passage: ruler[3] ?? "introduction", sect: "day" };
  if (overview) selection = { area: "day-night", audience: overview[1] as "you" | "they", passage: "overview", sect: overview[2] as "day" | "night" };
  if (planet) selection = { area: "day-night", audience: planet[1] as "you" | "they", passage: planet[2], sect: planet[3] as "day" | "night" };
  if (!selection) return null;
  return { id: null, contentKey, headline: natalEditorialIdentity(selection).title, surface: "natal" as const, mode: "in_depth" as const,
    status: "DRAFT" as const, lane: "serving" as const, reviewState: "EDITORIAL_REVIEW_REQUIRED", blockType: "essay" as const,
    eventType: selection.area === "rulership" ? "natal-twelfth-ruler-reading" : "natal-sect-reading",
    promptVersion: "natal-editorial-library-v1", summary: "", body: "", sections: null, reviewerNotes: "",
    facts: { audience: selection.audience, scope: "editorial_library", ...(selection.area === "rulership"
      ? { natalHouse: 12, rulerHouse: selection.passage === "introduction" ? null : Number(selection.passage), houseSystem: "whole-sign", rulerSystem: "hellenistic", sect: "any" }
      : { sect: selection.sect, ...(selection.passage !== "overview" ? { planet: selection.passage } : {}) }) },
    sourceSnapshot: { contentType: "mustache-template", contextType: selection.area === "rulership" ? "natal-twelfth-ruler-library" : "natal-sect-library",
      contentSystem: "editorial-library", authoringSource: "admin-dashboard", readerLocation: "You and Friend → Natal Chart",
      allowedSlots: selection.audience === "they" ? ["ownerName"] : [], review_status: "needs_review", ownerApproved: false, promotionAuthorized: false, canonical: false }
  };
}
