import { MONTHLY_SCHEMA, type MonthlyTemplate } from "./model";
import type { TemplateDefinition } from "./template";
const template = (value: string): TemplateDefinition => ({ kind: "template", value });
const phrase = (source: TemplateDefinition["source"], grammar: TemplateDefinition["grammar"], description: string): TemplateDefinition => ({ kind: "phrase", source, grammar, description, value: "", bySign: {} });
/** Authoring starter only. Adoption is explicit and does not replace saved copy. */
export function monthlyTemplateStarter(): MonthlyTemplate {
  return {
    schema: MONTHLY_SCHEMA, kind: "template",
    body: "# {{monthName}} {{year}}\n\n{{monthlyOverview}}\n\n{{seasonOverview}}\n\n{{planetaryHighlights}}\n\n{{lunarOverview}}\n\n{{newMoonHighlights}}\n\n{{solarEclipseHighlights}}\n\n{{fullMoonHighlights}}\n\n{{lunarEclipseHighlights}}\n\n{{monthlyIntegration}}",
    definitions: {
      monthlyOverview: template("{{#hasMonthlyTheme}}{{monthName}} brings attention to {{monthlyFocus}}{{#hasSecondaryMonthlyTheme}} and {{secondaryMonthlyThemeFocus}}{{/hasSecondaryMonthlyTheme}}.{{/hasMonthlyTheme}}\n\n{{#hasLeadEvent}}On {{leadEventDate}}, {{leadEventClause}}. You may notice {{leadEventExperience}}, making this a useful time to {{leadEventOpportunity}}.{{/hasLeadEvent}}"),
      monthlyFocus: template("{{primaryMonthlyThemeFocus}}"),
      seasonOverview: template("The Sun in {{openingSeasonSign}} turns our attention to {{openingSeasonFocus}}, helping us {{openingSeasonOpportunity}}.\n\n{{#hasSeasonChange}}When the Sun enters {{closingSeasonSign}} on {{seasonChangeDate}}, it adds an emphasis on {{closingSeasonFocus}}. The challenge is {{closingSeasonChallenge}}. You can {{closingSeasonPractice}}.{{/hasSeasonChange}}"),
      openingSeasonOpportunity: template("{{openingSeasonStrengthening}} and {{openingSeasonCorrection}}"),
      planetaryHighlights: template("{{transitOverview}}\n\n{{#supportingEvents}}{{planetaryEvent}}\n\n{{/supportingEvents}}"),
      transitOverview: template(""),
      planetaryEvent: template("### {{eventClause}}\n{{eventDate}}\n\nYou may notice {{eventExperience}}, making this a useful time to {{eventOpportunity}}."),
      lunarOverview: template(""),
      newMoonHighlights: template("{{#newMoons}}{{newMoonFeature}}\n\n{{/newMoons}}"),
      fullMoonHighlights: template("{{#fullMoons}}{{fullMoonFeature}}\n\n{{/fullMoons}}"),
      solarEclipseHighlights: template("{{#solarEclipses}}{{solarEclipseFeature}}\n\n{{/solarEclipses}}"),
      lunarEclipseHighlights: template("{{#lunarEclipses}}{{lunarEclipseFeature}}\n\n{{/lunarEclipses}}"),
      newMoonFeature: template("## New Moon in {{eventSign}}\n{{eventDate}}\n\nThe New Moon brings attention to {{eventFocus}}. You may notice {{eventExperience}}. Use this beginning to {{eventOpportunity}}."),
      fullMoonFeature: template("## Full Moon in {{eventSign}}\n{{eventDate}}\n\nThe Full Moon brings {{eventFocus}} into view. You may notice {{eventExperience}}. Give yourself time to {{eventOpportunity}}."),
      solarEclipseFeature: template("## Solar eclipse in {{eventSign}}\n{{eventDate}}\n\nThis solar eclipse brings attention to {{eventFocus}}. You may notice {{eventExperience}}. You can {{eventOpportunity}}."),
      lunarEclipseFeature: template("## Lunar eclipse in {{eventSign}}\n{{eventDate}}\n\nThis lunar eclipse brings {{eventFocus}} into view. You may notice {{eventExperience}}. You can {{eventOpportunity}}."),
      monthlyIntegration: template("{{#hasLeadEvent}}By the end of {{monthName}}, {{monthlyClosingOutcome}}. {{monthlyClosingPractice}}.{{/hasLeadEvent}}"),
      monthlyClosingOutcome: phrase("edition", "clause", "A concise outcome or recognizable change supported by the reviewed monthly events. Fits after 'By the end of [month],'."),
      monthlyClosingPractice: phrase("edition", "clause", "A final useful perspective or choice that closes the month without repeating the event list."),
      primaryMonthlyThemeFocus: phrase("edition", "noun-phrase", "An optional theme supported by the reviewed monthly events; not a permanent theme for this month name."),
      secondaryMonthlyThemeFocus: phrase("edition", "noun-phrase", "A distinct second monthly theme, only when the editor selects two themes. Do not force it to match the second Sun season."),
      openingSeasonFocus: phrase("opening-season", "noun-phrase", "Focus for the opening Sun sign. Fits after 'attention to'."),
      openingSeasonStrengthening: phrase("opening-season", "verb-phrase", "What to strengthen during the opening season; a base verb phrase after 'helping us'."),
      openingSeasonCorrection: phrase("opening-season", "verb-phrase", "A useful correction for the opening season, joined to strengthening with 'and'."),
      closingSeasonFocus: phrase("closing-season", "noun-phrase", "Focus for the incoming Sun sign, without claiming it replaces every earlier theme."),
      closingSeasonChallenge: phrase("closing-season", "noun-phrase", "A grounded complication for the incoming season. Fits after 'The challenge is'."),
      closingSeasonPractice: phrase("closing-season", "verb-phrase", "A useful response to that complication. Fits after 'You can'."),
      leadEventExperience: phrase("event", "noun-phrase", "A recognizable experience related to the selected lead event, after 'You may notice'. Do not repeat the event's factual clause."),
      leadEventOpportunity: phrase("event", "verb-phrase", "A useful response related to the lead experience, after 'a useful time to'."),
      eventFocus: phrase("event", "noun-phrase", "The distinct focus of this exact event, using its event type and sign, not the opening Sun season by default."),
      eventExperience: phrase("event", "noun-phrase", "A recognizable experience for this event, after 'You may notice'. Do not repeat the same situation in every event."),
      eventOpportunity: phrase("event", "verb-phrase", "A grounded invitation for this event. Base verb phrase; do not add the words 'you can' or 'to'.")
    }
  };
}
