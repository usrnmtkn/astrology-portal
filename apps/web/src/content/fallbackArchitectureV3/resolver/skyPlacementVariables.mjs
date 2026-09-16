// Shared contract for inline variables in the continuous placement writing.
// All six editable placement writing fields use the same calculated fact tokens.
// Section references are composition slots, not inline facts. No natal inputs
// or generated prose belong here.
export const SKY_PLACEMENT_VARIABLES = Object.freeze([
  { name: "planetTitle", description: "Planet name, without ‘the’ or Rx.", availability: "Selected placement" },
  { name: "signTitle", description: "Zodiac sign name.", availability: "Selected placement" },
  { name: "motion", description: "The word direct or retrograde.", availability: "Calculated motion" },
  { name: "entryDate", description: "Start of the placement’s sign residency, including year.", availability: "Calculated residency dates; not the retrograde window" },
  { name: "retrogradeStartDate", description: "Start of the calculated retrograde cycle, including year.", availability: "Calculated station-retrograde date" },
  { name: "retrogradeEndDate", description: "End of the calculated retrograde cycle, including year.", availability: "Calculated station-direct date" },
  { name: "aspectsInSign", description: "Dated list of exact major aspects to this body during its actual passes through this sign.", availability: "Calculated residency; excludes gaps. Major aspects to Sun, Mercury through Pluto, and Lilith; Moon excluded." },
  { name: "aspectsWhileRetrograde", description: "Dated list of exact major aspects during this retrograde cycle, including any sign changes.", availability: "Calculated full retrograde cycle. Same aspect coverage as aspectsInSign." },
  { name: "aspectsInSignCount", description: "Number of calculated exact aspects in the sign residency.", availability: "Calculated residency aspect list" },
  { name: "aspectsWhileRetrogradeCount", description: "Number of calculated exact aspects in the retrograde cycle.", availability: "Calculated full retrograde cycle" },
  { name: "exitDate", description: "Final exit from the sign residency, including year.", availability: "Calculated residency dates; not the retrograde window" }
]);
const names = new Set(SKY_PLACEMENT_VARIABLES.map(variable => variable.name));
const title = value => String(value ?? "").trim().toLowerCase().split(/[ -]+/u).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join(" ");
const tokenPattern = () => /\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/gu;

export function isSkyPlacementVariableField(contentKey, path) {
  if (/^sky-placement\/retrograde\/[^/]+$/u.test(contentKey)) return path === "Body";
  return /^sky-placement\/article\/[^/]+\/[^/]+$/u.test(contentKey)
    && (/^(?:tldrWhat|tldrTakeaway|TLDR_What|TLDR_Takeaway)$/u.test(path)
      || /^placementArticle(?:Direct|Retrograde)?$/u.test(path)
      || /^fallback\.(?:hook|lived|turn)$/u.test(path)
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
    ...skyPlacementAspectVariables(input),
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

// Lists are calculated facts, never approved aspect interpretation rows or a
// current-sky sample. Unknown coverage stays unavailable; a known empty list
// has a count of zero and an explicit factual label.
export function skyPlacementAspectVariables(input) {
  const data = input.aspectFacts;
  if (!data || title(data.planet) !== title(input.planet) || title(data.sign) !== title(input.sign)) return {};
  const formatDate = value => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: data.timeZone }).format(new Date(value));
  const result = {};
  const add = (name, events) => {
    if (!Array.isArray(events)) return;
    const unique = [...new Map(events.filter(event => title(event.planet) === title(input.planet)).map(event => [event.id, event])).values()]
      .sort((a, b) => a.occursAt.localeCompare(b.occursAt));
    result[`${name}Count`] = String(unique.length);
    result[name] = unique.length ? unique.map(event => `- ${formatDate(event.occursAt)}: ${title(event.planet)} ${event.aspect} ${title(event.otherPlanet)}`).join("\n") : "No exact major aspects in this calculated window.";
  };
  add("aspectsInSign", data.inSign);
  if (data.retrogradeStart && data.retrogradeEnd) {
    result.retrogradeStartDate = formatDate(data.retrogradeStart);
    result.retrogradeEndDate = formatDate(data.retrogradeEnd);
    add("aspectsWhileRetrograde", data.retrograde);
  }
  return result;
}
