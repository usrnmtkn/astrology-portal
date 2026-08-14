const manifestationPlanetTerms = {
  sun: new Set(["author", "authorship", "contribution", "contributions", "credit", "face", "identity", "leader", "leadership", "recognition", "representative", "visibility", "visible"]),
  moon: new Set(["belonging", "care", "comfort", "emotional", "emotionally", "feeling", "feelings", "mood", "need", "needs", "nurture", "protection", "protective", "security"]),
  mercury: new Set(["account", "accounts", "argument", "communication", "decision", "decisions", "explanation", "explanations", "fact", "facts", "information", "language", "message", "messages", "question", "questions", "speaker", "speech", "term", "terms", "wording", "words"]),
  venus: new Set(["affection", "agreement", "agreements", "appreciation", "attraction", "beauty", "connection", "connections", "desire", "fairness", "preference", "preferences", "reciprocity", "relationship", "relationships", "value", "values", "worth"]),
  mars: new Set(["action", "actions", "conflict", "effort", "energy", "move", "moves", "pace", "pressure", "pursuit", "result", "results", "target", "targets", "urge"]),
  jupiter: new Set(["ambition", "belief", "beliefs", "benefit", "confidence", "expansion", "growth", "hope", "opportunities", "opportunity", "possibilities", "possibility", "promise", "promises"]),
  saturn: new Set(["accountability", "authority", "boundary", "boundaries", "consequence", "consequences", "constraint", "constraints", "duty", "duties", "limit", "limits", "obligation", "obligations", "responsibility", "responsibilities", "standard", "standards", "structure", "structures"]),
  uranus: new Set(["change", "changes", "difference", "disruption", "independence", "innovation", "revision", "revisions", "reform", "system", "systems", "unexpected"]),
  neptune: new Set(["boundary", "boundaries", "compassion", "dream", "dreams", "empathy", "hope", "ideal", "ideals", "idealized", "imagination", "longing", "projection", "uncertain", "uncertainty"]),
  pluto: new Set(["authority", "control", "leverage", "power", "pressure", "survival", "transformation"]),
  chiron: new Set(["defense", "defenses", "hurt", "pain", "sensitive", "sensitivity", "vulnerability", "wound", "wounds"]),
  lilith: new Set(["autonomy", "boundary", "boundaries", "excluded", "refusal", "refused", "reject", "rejected"]),
};

export function manifestationSkeleton(key, value) {
  const planet = key.split("/")[1];
  const planetTerms = manifestationPlanetTerms[planet];
  if (!planetTerms) throw new Error(`No manifestation noun lexicon for ${key}`);
  const tokens = String(value).toLowerCase().replace(/[^a-z0-9 ]/gu, " ").trim().split(/\s+/u).filter(Boolean);
  return tokens
    .map((token) => (planetTerms.has(token) ? "{planet}" : token))
    .join(" ")
    .replace(/(?:\{planet\}\s+){2,}/gu, "{planet} ")
    .trim();
}

export function manifestationShapeReport(rows, cap = 3) {
  const counts = new Map();
  for (const row of rows) {
    for (const manifestation of row.reader_manifestations) {
      const skeleton = manifestationSkeleton(row.key, manifestation);
      counts.set(skeleton, (counts.get(skeleton) ?? 0) + 1);
    }
  }
  const shapes = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
  const maximumUse = shapes[0]?.[1] ?? 0;
  return {
    cap,
    maximumUse,
    shapes,
    violations: shapes.filter(([, count]) => count > cap),
  };
}

export function assertManifestationShapeCap(rows, cap = 3) {
  const report = manifestationShapeReport(rows, cap);
  if (report.violations.length > 0) {
    throw new Error(`Reader manifestation shape cap exceeded: ${JSON.stringify(report.violations.slice(0, 12))}`);
  }
  return report;
}
