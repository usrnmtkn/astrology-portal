// Shared contract for inline variables in the continuous placement body.
// Section references (fallback.hook, placementArticle, etc.) are composition
// slots, not inline facts. No natal inputs or generated prose belong here.
export const SKY_PLACEMENT_VARIABLES = Object.freeze([
  { name: "planetTitle", description: "Planet name, without ‘the’ or Rx.", availability: "Selected placement" },
  { name: "signTitle", description: "Zodiac sign name.", availability: "Selected placement" },
  { name: "motion", description: "The word direct or retrograde.", availability: "Calculated motion" },
  { name: "entryDate", description: "Start of the placement’s sign residency, including year.", availability: "Calculated residency dates; not the retrograde window" },
  { name: "exitDate", description: "Final exit from the sign residency, including year.", availability: "Calculated residency dates; not the retrograde window" }
]);
const names = new Set(SKY_PLACEMENT_VARIABLES.map(variable => variable.name));
const title = value => String(value ?? "").trim().toLowerCase().split(/[ -]+/u).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
const tokenPattern = () => /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu;

export function isSkyPlacementVariableField(contentKey, path) {
  return /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(contentKey)
    && (path === "placementArticle" || /^fallback\.(?:hook|lived|turn)$/u.test(path)
      || /^fallback\.sections\.[^.]+$/u.test(path));
}

export function skyPlacementVariableIssues(value) {
  const copy = String(value ?? "");
  const issues = [];
  const remaining = copy.replace(tokenPattern(), (token, name) => {
    if (!names.has(name)) issues.push(`Unknown Sky variable ${token}. Use a variable from the Sky variable key.`);
    return "";
  });
  if (/\{\{|\}\}/u.test(remaining)) issues.push("Use a complete {{variableName}} token. Conditional blocks and section references are not inline Sky variables.");
  return [...new Set(issues)];
}

// Identity comes from the caller's calculated placement, never editable copy.
// A missing date stays missing. Studio does not invent an example occurrence.
export function skyPlacementVariableFacts(input) {
  return {
    ...(input.facts ?? {}),
    planetTitle: title(input.planet),
    signTitle: title(input.sign),
    motion: input.isRetrograde === true ? "retrograde" : "direct"
  };
}

export function skyPlacementVariableSegments(value, facts = {}) {
  const copy = String(value ?? "");
  const segments = [];
  let from = 0;
  for (const match of copy.matchAll(tokenPattern())) {
    if (match.index > from) segments.push({ text: copy.slice(from, match.index) });
    const [token, name] = match;
    const available = names.has(name) && Object.hasOwn(facts, name)
      && typeof facts[name] === "string" && facts[name].trim().length > 0;
    segments.push({ text: available ? facts[name] : token, token, name, available });
    from = match.index + token.length;
  }
  if (from < copy.length) segments.push({ text: copy.slice(from) });
  return segments;
}

export function fillSkyPlacementVariables(value, facts) {
  const issues = skyPlacementVariableIssues(value);
  if (issues.length) throw new Error(`SKY_V4_SOURCE_GAP: ${issues.join(" ")}`);
  const segments = skyPlacementVariableSegments(value, facts);
  const missing = segments.filter(segment => segment.token && !segment.available);
  if (missing.length) throw new Error(`SKY_V4_SOURCE_GAP: missing calculated facts ${missing.map(segment => segment.token).join(", ")}`);
  return segments.map(segment => segment.text).join("");
}
