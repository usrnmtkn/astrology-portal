/** Existing Friction/Flow UI wording. Studio overrides are versioned publications; these defaults grant no editorial approval. */
import { FRICTION_FLOW_PREFIX, frictionFlowDraftErrors } from "./frictionFlowTemplateValidation.js";
export { FRICTION_FLOW_PREFIX };
export const frictionFlowDefaults = {
  "status/easy": "Easy",
  "status/mixed": "Mixed",
  "status/tense": "Tense",
  "status/active": "Active",
  "status/quiet": "Quiet",
  "explanation/easy": "Flow leads among the overlapping transits to your synastry connections. Each person’s main influence and the day’s exact aspects appear below.",
  "explanation/tense": "Friction leads among the overlapping transits to your synastry connections. Read whose chart is affected before treating a personal reaction as a disagreement between you.",
  "explanation/mixed": "Both flow and friction are present in the overlapping transits to your synastry connections. The separate readings show what each person is experiencing.",
  "explanation/active": "Personal influences are active. There is not a clear relationship lean from the overlapping transits, so this day is Active. A difficult personal transit alone does not make the relationship Tense.",
  "explanation/quiet": "No natal contacts come within the 1° daily orb. This describes the day’s calculated contacts, not the quality of your relationship.",
  "profection/heading": "Annual profections",
  "profection/summary": "{person}: {lordOfYear}",
  "profection/facts": "Annual profection: house {house}, {sign} · Lord of the year: {lordOfYear}",
  "profection/unavailable": "{possessive} annual profection is unavailable because the required birth date or Ascendant is not shared.",
  "profection/priority": "Transits involving each person’s lord of the year receive priority in their main theme. Exact aspects are shown separately so brief daily contacts remain visible.",
  "profection/method": "Annual profections identify each person’s lord of the year using their age, Ascendant and traditional sign ruler. Transits by or to that planet receive priority in their main theme. Each day also includes every calculated exact contact, including the Moon.",
  "method/charts": "These cards use each person’s natal transits and the connections between your birth charts. Personal readings describe the person experiencing the transit. The relationship rating uses transits that overlap at both ends of an existing synastry connection.",
  "method/rating": "The daily search covers the full local day within 1°. Easy, Tense and Mixed use overlapping direct transits to both ends of a natal synastry connection. Sextiles and trines contribute to Flow; squares and oppositions contribute to Friction. Conjunctions remain unrated. A moving planet counts once per channel. Personal influences without a clear relationship lean show Active. These labels are the app’s summary, not a complete Hellenistic judgment or a compatibility score.",
  "method/geometry": "The {aspect} is the {angle}° aspect.",
  "method/overlap": "This transit overlaps a separately calculated transit to the other end of a synastry connection.",
  "method/personal": "This is a personal influence. It does not establish friction or flow with this friend.",
  "contact/label": "{planet} {aspect} {possessive} natal {target}",
  "contact/orb": "Closest orb {orb}",
  "contact/timeLord": "Involves the lord of the year",
  "contact/exact": "Exact {times}",
  "contact/continuing": "Continuing influence",
  "contact/synastry": "Your {readerPoint} {aspect} {friendName}’s {friendPoint} · Natal synastry {orb}",
  "contact/overlap": "Overlapping direct transit: {contact}",
  "contact/personal": "Personal influence",
  "contact/indirect": "Connected through the natal point; no overlapping direct transit to the other endpoint",
  "section/main": "Main themes",
  "section/mood": "Mood and reactions",
  "section/exact": "Exact today",
  "section/other": "Other aspects ({count})",
  "section/calculations": "Calculation details",
  "section/guide": "What these aspects mean",
  "section/guideLink": "Read the aspects guide",
  "availability/missing": "No published write-up is available for this contact.",
  "availability/timingError": "The reading’s timing or source could not load.",
  "availability/loading": "Loading aspect explanations…",
  "availability/error": "Some aspect explanations could not load.",
  "feed/title": "Friction and flow",
  "feed/today": "Today",
  "feed/tomorrow": "Tomorrow",
  "feed/you": "You",
  "feed/your": "your",
  "feed/yourCapital": "Your",
  "feed/friend": "your friend",
  "feed/pairPrefix": "You and",
  "feed/options": "Options for {pair}",
  "feed/howRated": "How this is rated",
  "feed/hide": "Hide card",
  "feed/hidden": "Card hidden.",
  "feed/undo": "Undo",
  "feed/showHidden": "Show hidden cards ({count})",
  "feed/calculating": "Calculating…",
  "feed/calculatingAll": "Calculating natal transits and synastry…",
  "feed/error": "Natal forecasts could not load. Reload to try again.",
  "feed/dayError": "Couldn’t calculate this day.",
  "feed/unavailable": "Unavailable",
  "feed/calculatingLabel": "Calculating",
  "feed/retry": "Retry {date}",
  "feed/dayLabel": "{relative}, {date}, {status} for {pair}",
  "feed/close": "Close forecast",
} as const;
export type FrictionFlowCopyName = keyof typeof frictionFlowDefaults;
export type FrictionFlowField = { key: string; name: FrictionFlowCopyName; group: string; label: string; body: string; allowedSlots: string[] };
const groups: Record<string,string> = { status: "Status labels", explanation: "Status explanations", profection: "Annual profections", method: "How this is rated", contact: "Aspect details", section: "Popup headings", availability: "Loading and unavailable writing", feed: "Feed labels and controls" };
export const frictionFlowFields: FrictionFlowField[] = (Object.keys(frictionFlowDefaults) as FrictionFlowCopyName[]).map(name => ({
  key: FRICTION_FLOW_PREFIX + name, name, group: groups[name.split("/")[0]],
  label: name.split("/")[1].replace(/([A-Z])/gu, " $1").replace(/^./u, c => c.toUpperCase()),
  body: frictionFlowDefaults[name], allowedSlots: [...new Set([...frictionFlowDefaults[name].matchAll(/\{(\w+)\}/gu)].map(match => match[1]))]
}));
export const frictionFlowField = (key: string) => frictionFlowFields.find(field => field.key === key);
export function frictionFlowTemplateErrors(key: string, body: string): string[] {
  if (!key.startsWith(FRICTION_FLOW_PREFIX)) return [];
  const field = frictionFlowField(key);
  if (!field) return ["Choose a registered Friction/Flow writing source."];
  return frictionFlowDraftErrors(key, body, field.allowedSlots);
}
export function fillFrictionFlowTemplate(key: string, body: string, slots: Record<string,string|number> = {}) {
  if (frictionFlowTemplateErrors(key, body).length) return null;
  let missing = false;
  const result = body.replace(/\{(\w+)\}/gu, (_, name: string) => {
    if (!Object.hasOwn(slots, name) || String(slots[name]).length === 0) { missing = true; return ""; }
    return String(slots[name]);
  });
  return missing ? null : result;
}
