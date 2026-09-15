import { type Context, type PhraseDefinition, type WritingTemplate, type WritingDefinition, validateWritingTemplate } from "./phraseTemplates.js";

export const MONTHLY_TEMPLATE_KEY = "slot-template/calendar/monthly-composition/v1";
export const monthlyEditionKey = (month: string, timeZone: string) => `slot-template/calendar/monthly-composition-edition/${month}/${encodeURIComponent(timeZone)}`;
export type MonthlyEvent = { id: string; type: "lunation" | "ingress" | "station" | "aspect"; title: string; startsAt: string; dateKey: string; primary: boolean;
  planet?: string; planets?: [string, string]; aspect?: string; sign?: string; fromSign?: string; toSign?: string; phase?: string; direction?: string; eclipseType?: "solar" | "lunar" };
export type MonthlySelection = { leadEventId: string | null; supportingEventIds: string[]; themeCount: 0 | 1 | 2 };
export type MonthlyFacts = { month: string; timeZone: string; openingSeasonSign: string; closingSeasonSign: string; seasonChangeAt: string | null; events: MonthlyEvent[]; calculationSource: string };
export type EventSuggestion = { eventId: string; score: number; reason: string };
const slower = new Set(["Uranus", "Neptune", "Pluto"]);
const social = new Set(["Jupiter", "Saturn"]);

/** Editorial ranking, not an astronomical measurement. The owner can replace every choice. */
export function suggestMonthlyEvents(events: MonthlyEvent[]): EventSuggestion[] {
  return events.filter(event => event.type !== "lunation" && event.planet !== "Moon" && !event.planets?.includes("Moon") && event.phase !== "retrograde-passage")
    .map(event => {
      const bodies = event.planets ?? [event.planet ?? ""];
      const slow = bodies.filter(body => slower.has(body)).length;
      const score = bodies.some(body => ["Lilith", "North Node", "South Node"].includes(body)) ? 10
        : event.type === "station" ? 80 + slow * 30
        : event.type === "ingress" ? (event.planet === "Sun" ? 15 : 35 + slow * 40 + (social.has(event.planet ?? "") ? 25 : 0))
        : (slow === 2 ? 125 : 25 + slow * 30 + bodies.filter(body => social.has(body)).length * 20);
      return { eventId: event.id, score, reason: event.type === "station" ? "A calculated change in direction during the month."
        : event.type === "ingress" ? "A calculated sign change; longer-cycle changes receive more weight."
        : "An exact planetary contact; longer-cycle bodies receive more weight." };
    }).sort((a, b) => b.score - a.score || a.eventId.localeCompare(b.eventId));
}
export function initialMonthlySelection(facts: MonthlyFacts): MonthlySelection {
  const seen = new Set<string>();
  const suggestions = suggestMonthlyEvents(facts.events).filter(row => {
    if (row.score < 30) return false;
    const event = facts.events.find(event => event.id === row.eventId)!;
    const identity = `${event.type}:${event.planet ?? event.planets?.join("/")}:${event.aspect ?? ""}`;
    if (seen.has(identity)) return false;
    seen.add(identity); return true;
  });
  return { leadEventId: suggestions[0]?.eventId ?? null, supportingEventIds: suggestions.slice(1, 3).map(row => row.eventId), themeCount: 0 };
}
export function validateMonthlySelection(value: unknown, facts: MonthlyFacts): MonthlySelection {
  const raw = value as Partial<MonthlySelection> | null;
  if (!raw || ![0, 1, 2].includes(raw.themeCount as number) || !Array.isArray(raw.supportingEventIds) || raw.supportingEventIds.length > 2 || !(raw.leadEventId === null || typeof raw.leadEventId === "string")) throw new Error("Select zero to two monthly themes, one optional lead, and up to two supporting events.");
  const ids = new Set(suggestMonthlyEvents(facts.events).map(row => row.eventId));
  const chosen = [...(raw.leadEventId ? [raw.leadEventId] : []), ...raw.supportingEventIds];
  if (chosen.some(id => typeof id !== "string" || !ids.has(id)) || new Set(chosen).size !== chosen.length) throw new Error("Selections must be distinct calculated events from this month. Lunar features are separate.");
  return { leadEventId: raw.leadEventId, supportingEventIds: [...raw.supportingEventIds], themeCount: raw.themeCount as 0 | 1 | 2 };
}
export function monthlyTemplateContext(facts: MonthlyFacts, selection: MonthlySelection): Context {
  const format = (instant: string) => new Intl.DateTimeFormat("en-US", { timeZone: facts.timeZone, month: "long", day: "numeric" }).format(new Date(instant));
  const clause = (event: MonthlyEvent) => event.type === "aspect" && event.planets && event.aspect
    ? `${event.planets[0]} ${({ conjunction: "conjoins", conjunct: "conjoins", sextile: "sextiles", square: "squares", trine: "trines", opposition: "opposes" } as Record<string, string>)[event.aspect] ?? `forms a ${event.aspect} with`} ${event.planets[1]}`
    : event.title;
  const eventContext = (event: MonthlyEvent): Context => ({ eventId: event.id, eventDate: format(event.startsAt), eventTitle: event.title, eventClause: clause(event), eventSign: event.toSign ?? event.sign ?? "", eclipseType: event.eclipseType ?? "", event });
  const lead = facts.events.find(event => event.id === selection.leadEventId);
  const lunar = facts.events.filter(event => event.type === "lunation" && event.primary);
  // Event titles are calculator labels, not classifications invented by the model.
  const normal = (phase: string) => lunar.filter(event => !event.eclipseType && event.title.startsWith(phase)).map(eventContext);
  const eclipses = (type: "solar" | "lunar") => facts.events.filter(event => event.type === "lunation" && event.eclipseType === type).map(eventContext);
  return {
    monthName: new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(new Date(`${facts.month}-15T12:00:00Z`)),
    year: facts.month.slice(0, 4), openingSeasonSign: facts.openingSeasonSign, closingSeasonSign: facts.closingSeasonSign,
    hasSeasonChange: Boolean(facts.seasonChangeAt), seasonChangeDate: facts.seasonChangeAt ? format(facts.seasonChangeAt) : "",
    hasLeadEvent: !!lead, leadEventId: lead?.id ?? "", leadEventDate: lead ? format(lead.startsAt) : "", leadEventClause: lead ? clause(lead) : "",
    hasMonthlyTheme: selection.themeCount > 0, hasSecondaryMonthlyTheme: selection.themeCount > 1,
    supportingEvents: selection.supportingEventIds.map(id => eventContext(facts.events.find(event => event.id === id)!)),
    newMoons: normal("New Moon"), fullMoons: normal("Full Moon"), solarEclipses: eclipses("solar"), lunarEclipses: eclipses("lunar"),
    hasEclipses: facts.events.some(event => !!event.eclipseType)
  };
}
const phrase = (grammar: PhraseDefinition["grammar"], source: PhraseDefinition["source"], description: string): PhraseDefinition => ({ kind: "phrase", grammar, source, description });
export function monthlyCompositionStarter(): WritingTemplate {
  const definitions: Record<string, WritingDefinition> = {
    monthlyOverview: { kind: "template", pattern: "{{#hasMonthlyTheme}}\n{{monthName}} brings attention to {{primaryMonthlyThemeFocus}}{{#hasSecondaryMonthlyTheme}} and {{secondaryMonthlyThemeFocus}}{{/hasSecondaryMonthlyTheme}}.\n{{/hasMonthlyTheme}}\n\n{{#hasLeadEvent}}\nOn {{leadEventDate}}, {{leadEventClause}}. You may notice {{leadEventExperience}}, making this a useful time to {{leadEventOpportunity}}.\n{{/hasLeadEvent}}" },
    seasonOverview: { kind: "template", pattern: "{{monthName}} begins with the Sun in {{openingSeasonSign}}, bringing attention to {{openingSeasonFocus}}.\n\n{{#hasSeasonChange}}\nWhen the Sun enters {{closingSeasonSign}} on {{seasonChangeDate}}, it adds an emphasis on {{closingSeasonFocus}}. The challenge is {{closingSeasonChallenge}}. You can {{closingSeasonPractice}}.\n{{/hasSeasonChange}}" },
    planetaryHighlights: { kind: "template", pattern: "{{#supportingEvents}}\nOn {{eventDate}}, {{eventClause}}. You may notice {{eventExperience}}, making this a useful time to {{eventOpportunity}}.\n\n{{/supportingEvents}}" },
    newMoonHighlights: { kind: "template", pattern: "{{#newMoons}}\nNew Moon in {{eventSign}} · {{eventDate}}\n\nThe New Moon in {{eventSign}} brings attention to {{newMoonFocus}}. You may notice {{newMoonExperience}}. Use this beginning to {{newMoonOpportunity}}.\n\n{{/newMoons}}" },
    fullMoonHighlights: { kind: "template", pattern: "{{#fullMoons}}\nFull Moon in {{eventSign}} · {{eventDate}}\n\nThe Full Moon in {{eventSign}} brings {{fullMoonFocus}} into view. You may notice {{fullMoonExperience}}. Give yourself time to {{fullMoonPractice}}.\n\n{{/fullMoons}}" },
    solarEclipseHighlights: { kind: "template", pattern: "{{#solarEclipses}}\nSolar eclipse in {{eventSign}} · {{eventDate}}\n\nThis solar eclipse brings attention to {{solarEclipseFocus}}. You may notice {{solarEclipseExperience}}. You can {{solarEclipsePractice}}.\n\n{{/solarEclipses}}" },
    lunarEclipseHighlights: { kind: "template", pattern: "{{#lunarEclipses}}\nLunar eclipse in {{eventSign}} · {{eventDate}}\n\nThis lunar eclipse brings {{lunarEclipseFocus}} into view. You may notice {{lunarEclipseExperience}}. You can {{lunarEclipsePractice}}.\n\n{{/lunarEclipses}}" },
    primaryMonthlyThemeFocus: phrase("noun-phrase", "edition", "The first reviewed theme supported by the selected events. Do not merely repeat the Sun season."),
    secondaryMonthlyThemeFocus: phrase("noun-phrase", "edition", "A distinct concurrent theme supported by the selected events, not a forced second half of the month."),
    monthlyFocus: phrase("noun-phrase", "edition", "Optional legacy-compatible monthly theme; distinct from the two seasonal focuses."),
    openingSeasonFocus: phrase("noun-phrase", "opening-season", "A seasonal focus of the calculated opening Sun sign."),
    closingSeasonFocus: phrase("noun-phrase", "closing-season", "A seasonal focus of the calculated incoming Sun sign."),
    closingSeasonChallenge: phrase("noun-phrase", "closing-season", "A relevant complication. Fit after The challenge is."),
    closingSeasonPractice: phrase("verb-phrase", "closing-season", "A useful response in the closing season. Fit after You can."),
    leadEventExperience: phrase("clause", "lead-event", "An observable experience tied to the selected lead. Fit after You may notice."),
    leadEventOpportunity: phrase("verb-phrase", "lead-event", "A supported useful response. Fit after a useful time to."),
    eventExperience: phrase("clause", "event", "A supported experience for this supporting event, not the lead or a different event."),
    eventOpportunity: phrase("verb-phrase", "event", "A useful response to this supporting event. Fit after a useful time to.")
  };
  for (const prefix of ["newMoon", "fullMoon", "solarEclipse", "lunarEclipse"]) {
    definitions[`${prefix}Focus`] = phrase("noun-phrase", "event", `The supported focus for this ${prefix} event, not the preview moment's ordinary Moon sign.`);
    definitions[`${prefix}Experience`] = phrase("clause", "event", `A recognizable experience of this ${prefix} event. Fit after You may notice.`);
    definitions[`${prefix}${prefix === "newMoon" ? "Opportunity" : "Practice"}`] = phrase("verb-phrase", "event", `A supported response to this ${prefix} event, in base verb form.`);
  }
  return validateWritingTemplate({ version: 1, pattern: "{{monthlyOverview}}\n\n{{seasonOverview}}\n\n{{planetaryHighlights}}\n\n{{newMoonHighlights}}\n\n{{solarEclipseHighlights}}\n\n{{fullMoonHighlights}}\n\n{{lunarEclipseHighlights}}", definitions });
}
