const DEFAULT_PAIR_COUNT = 8;
const MIN_PAIR_COUNT = 6;
const MAX_PAIR_COUNT = 10;

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function ownerReason(entry) {
  return String(entry.owner_reason ?? entry.why ?? entry.explanation ?? "").trim();
}

function familyGroup(value) {
  const family = normalized(value);
  if (family.includes("placement") || family === "fast-mover-article" || family === "slow-mover-article") return "sky-placement";
  if (family.includes("lunation")) return "lunation";
  if (family.includes("aspect")) return "aspect";
  if (family.includes("house")) return "house-core";
  if (family.includes("card")) return "card";
  return family;
}

export function deduplicateOwnerCorrections(entries = []) {
  const byBadText = new Map();
  for (const entry of entries) {
    const key = normalized(entry?.bad);
    if (!key) continue;
    const current = byBadText.get(key);
    if (!current || (!ownerReason(current) && ownerReason(entry))) byBadText.set(key, entry);
  }
  return [...byBadText.values()];
}

function categoryHistory(entries, family) {
  const counts = new Map();
  for (const entry of entries) {
    if (familyGroup(entry.family) !== familyGroup(family)) continue;
    const category = normalized(entry.category);
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return counts;
}

export function selectOwnerCorrectionPairs(entries, {
  family,
  count = DEFAULT_PAIR_COUNT,
  failureCategories = []
} = {}) {
  if (!Number.isInteger(count) || count < MIN_PAIR_COUNT || count > MAX_PAIR_COUNT) {
    throw new Error(`Owner correction pair count must be ${MIN_PAIR_COUNT} through ${MAX_PAIR_COUNT}.`);
  }
  const unique = deduplicateOwnerCorrections(entries);
  const history = categoryHistory(unique, family);
  const requestedCategories = new Set(failureCategories.map(normalized).filter(Boolean));
  const familyName = normalized(family);
  const targetGroup = familyGroup(family);
  const ranked = unique.map((entry, index) => {
    const entryFamily = normalized(entry.family);
    const category = normalized(entry.category);
    let score = 0;
    const reasons = [];
    if (entryFamily === familyName) {
      score += 100;
      reasons.push("same_content_family");
    } else if (familyGroup(entryFamily) === targetGroup) {
      score += 70;
      reasons.push("same_surface_family");
    } else if (entryFamily.includes(familyName) || familyName.includes(entryFamily)) {
      score += 50;
      reasons.push("adjacent_content_family");
    }
    if (requestedCategories.has(category)) {
      score += 40;
      reasons.push("requested_failure_mode");
    }
    const historicalCount = history.get(category) ?? 0;
    if (historicalCount) {
      score += 10 + historicalCount;
      reasons.push("family_failure_history");
    }
    if (ownerReason(entry)) score += 2;
    return { entry, index, score, reasons };
  }).sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = ranked.slice(0, count).map(({ entry, score, reasons }) => ({
    before: entry.bad,
    after: entry.corrected,
    owner_reason: ownerReason(entry),
    category: entry.category,
    family: entry.family,
    rule: entry.rule ?? null,
    selection_score: score,
    selection_reasons: reasons
  }));
  if (selected.length < MIN_PAIR_COUNT) throw new Error(`OWNER_CORRECTION_PAIR_SHORTFALL:${selected.length}/${MIN_PAIR_COUNT}`);
  return Object.freeze({
    pairs: Object.freeze(selected),
    logic: Object.freeze({
      requested: count,
      selected: selected.length,
      deduplicatedCorpusCount: unique.length,
      family,
      priority: ["same content family", "requested failure mode", "that family's historical failure categories", "adjacent family", "stable source order"]
    })
  });
}

export { DEFAULT_PAIR_COUNT, MAX_PAIR_COUNT, MIN_PAIR_COUNT };
