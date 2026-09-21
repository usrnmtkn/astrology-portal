import { calendarOverviewWriting as sharedCalendarOverviewWriting } from "../../web/src/features/calendar/calendarOverviewResolve";
import { skyForecastTemplates, type SkyForecastPeriod } from "./skyForecastTemplates";

export type CalendarOverviewStarter = { action: string; value: string };
export type CalendarOverviewField = {
  name: string;
  label: string;
  help: string;
  starter?: string;
  starters?: CalendarOverviewStarter[];
};

const weeklyOverviewStarter = `The Moon is in {{mondayMoonSign}}, so the emotional tone for this week is:

{{mondayWriteup}}`;

const monthlyOverviewStarter = `{{#hasMonthlyTheme}}
{{monthName}} brings attention to {{primaryMonthlyThemeFocus}}. You may notice {{primaryMonthlyThemeExperience}}.
{{/hasMonthlyTheme}}

{{#hasSecondaryMonthlyTheme}}
It also brings attention to {{secondaryMonthlyThemeFocus}}. You may notice {{secondaryMonthlyThemeExperience}}.
{{/hasSecondaryMonthlyTheme}}

{{#hasLeadEvent}}
On {{leadEventDate}}, {{leadEventClause}}. You may notice {{leadEventExperience}}, making this a useful time to {{leadEventOpportunity}}.
{{/hasLeadEvent}}`;

const monthlySeasonStarter = `When the Sun enters {{signTitle}} on {{entryDate}}, attention turns toward {{placementFocus}}. The challenge is {{placementChallenge}}. You can {{placementPractice}}.`;

const seasonOpeningInvitationStarter = `From {{entryDate}} to {{exitDate}}, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} Give yourself time to {{placementInvitation}}. {{experienceCollective}}

There is a particular gift in the way {{signTitle}} approaches life. By {{signMethod}}, it helps us {{placementOpportunity}}. What may initially seem like {{signBehavior}} can be a way of {{signPurpose}}. Over the coming weeks, notice what becomes possible when you {{practiceAction}}.`;

const seasonOpeningBehaviorStarter = `From {{entryDate}} to {{exitDate}}, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} There can be satisfaction in {{livedExperiences}}. {{signTitle}}, {{signDescriptor}}, {{signFunction}}.

But {{signBehavior}} is not the whole point. Beneath {{signTitle}}'s reputation for {{signReputation}} is an interest in {{signPurpose}}. By {{signMethod}}, it helps us {{placementOpportunity}}. The pleasure is not only in {{signBehavior}}; it is in {{placementReward}}.`;

const seasonOpeningCapacityStarter = `From {{entryDate}} to {{exitDate}}, the Sun moves through {{signTitle}}, bringing our attention to {{placementFocus}}. {{placementDignityMeaning}} Give {{invitationSubject}} some attention, and notice {{experienceFocus}} when you {{experienceCondition}}. {{signTitle}}, {{signDescriptor}}, makes a virtue of {{signMethod}}.

Its gift is not simply {{signBehavior}}. {{giftDevelopment}} The invitation is to recognize that {{closingInsight}}.`;

const planetaryHighlightStarter = `On {{eventDate}}, {{eventDescription}}. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}`;

const planetaryIngressStarter = `On {{eventDate}}, {{eventDescription}}. {{placementDignityMeaning}} {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}`;

const newMoonStarter = `The New Moon in {{signTitle}} on {{eventDate}} brings attention to {{eventFocus}}. This is a useful time to {{eventOpportunity}}. {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}`;

const fullMoonStarter = `The Full Moon in {{signTitle}} on {{eventDate}} puts {{eventFocus}} into clearer view. {{experienceCollective}} Notice what this reveals about {{reflectionFocus}}.

The challenge is {{eventChallenge}}. {{eventPractice}}`;

const solarEclipseStarter = `The solar eclipse in {{signTitle}} on {{eventDate}} can bring a turning point in {{eventFocus}}. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}`;

const lunarEclipseStarter = `The lunar eclipse in {{signTitle}} on {{eventDate}} can bring a story involving {{eventFocus}} to a head. {{eventMeaning}} {{experienceCollective}}

The challenge is {{eventChallenge}}. {{eventPractice}}`;

export function calendarOverviewPeriod(key: string): SkyForecastPeriod | undefined {
  return (Object.keys(skyForecastTemplates) as SkyForecastPeriod[]).find(period => skyForecastTemplates[period].contentKey === key);
}

export function calendarOverviewFields(period: SkyForecastPeriod): CalendarOverviewField[] {
  if (period === "daily-sky") return [];
  const prefix = period === "weekly-sky" ? "weekly" : "monthly";
  const periodName = prefix === "weekly" ? "week" : "month";
  if (period === "monthly-sky") return [
    { name: "monthlyOverview", label: "Monthly overview", help: "Reusable structure for monthly themes and the reviewed lead event.", starter: monthlyOverviewStarter },
    { name: "seasonOverview", label: "Season transition", help: "Incoming Sun visit. {{signTitle}}, {{entryDate}}, and {{exitDate}} are that visit.", starter: monthlySeasonStarter },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the month." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the month’s ingresses, stations, and planetary aspects." },
    { name: "monthlyIntegration", label: "Closing passage", help: "Bring the month’s themes together without repeating the event list." },
    {
      name: "seasonOpening",
      label: "Seasonal opening",
      help: "Sun visit that opens the month. {{signTitle}}, {{entryDate}}, and {{exitDate}} are that visit. Choose one opening starter; do not stack the three openings.",
      starters: [
        { action: "Use invitation opening starter", value: seasonOpeningInvitationStarter },
        { action: "Use behavior opening starter", value: seasonOpeningBehaviorStarter },
        { action: "Use capacity opening starter", value: seasonOpeningCapacityStarter }
      ]
    },
    {
      name: "planetaryHighlights",
      label: "Planetary highlights",
      help: "Selected developments only. Writing this field is the current highlight selection; it does not print the full event list.",
      starters: [
        { action: "Use aspect or station starter", value: planetaryHighlightStarter },
        { action: "Use planetary ingress starter", value: planetaryIngressStarter }
      ]
    },
    {
      name: "newMoonOverview",
      label: "New Moon overview",
      help: "Repeats once per New Moon in the month. {{signTitle}} and {{eventDate}} are that lunation. A solar eclipse in this passage sets {{#hasSolarEclipse}}; use the eclipse starter instead of stacking both.",
      starters: [
        { action: "Use New Moon starter", value: newMoonStarter },
        { action: "Use solar eclipse starter", value: solarEclipseStarter }
      ]
    },
    {
      name: "fullMoonOverview",
      label: "Full Moon overview",
      help: "Repeats once per Full Moon in the month. {{signTitle}} and {{eventDate}} are that lunation. A lunar eclipse in this passage sets {{#hasLunarEclipse}}; use the eclipse starter instead of stacking both.",
      starters: [
        { action: "Use Full Moon starter", value: fullMoonStarter },
        { action: "Use lunar eclipse starter", value: lunarEclipseStarter }
      ]
    },
    { name: "lunationConnection", label: "Lunation connection", help: "Optional complete prose relating the selected lunations. Leave empty when there is no supported relationship." }
  ];
  return [
    { name: `${prefix}Overview`, label: "Weekly overview", help: "Monday is Luna's day. Start with that Moon sign and the leftover Moon-sign passage as the week's emotional tone.", starter: weeklyOverviewStarter },
    { name: "seasonOverview", label: "Season transition", help: "Explain how the zodiac season shapes this period and what changes when the Sun enters the next sign." },
    { name: "lunarOverview", label: "Lunar cycle", help: "Connect the New Moon, Full Moon, or eclipse to the period’s main story." },
    { name: "transitOverview", label: "Planetary changes", help: "Describe the significance of the period’s ingresses, stations, and planetary aspects." },
    { name: `${prefix}Integration`, label: "Closing passage", help: `Bring the ${periodName}’s themes together without repeating the event list.` }
  ];
}

export const calendarSeasonVariables = ["zodiacSeason", "zodiacSeasonPolarAxis", "seasonSign", "seasonStart", "seasonEnd", "openingSeasonSign", "openingZodiacSeason", "openingZodiacSeasonPolarAxis", "closingSeasonSign", "closingZodiacSeason", "closingZodiacSeasonPolarAxis", "seasonChangeDate"];
export const calendarMonthlySeasonPassageVariables = ["zodiacSeason", "zodiacSeasonPolarAxis", "openingZodiacSeason", "openingZodiacSeasonPolarAxis", "closingZodiacSeason", "closingZodiacSeasonPolarAxis"];
export const calendarWeeklyMoonVariables = ["mondayMoonSign", "mondayMoonFocus", "mondayWriteup"];

/** Stable across periods, source loading and editors; uses the shared Studio palette. */
export function calendarVariableColor(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return String((hash >>> 0) % 6 + 1);
}

export const calendarOverviewWriting = sharedCalendarOverviewWriting;

export { calendarMonthlyCompatibilityPattern, calendarMonthlyEditorialPattern, calendarOverviewPattern } from "./skyForecastTemplates";

export function calendarSeasonSourceKey(name: string, sun: string, opening: string, closing: string) {
  const sign = name.startsWith("opening") ? opening : name.startsWith("closing") ? closing : sun;
  const normalized = name.replace(/^(opening|closing)/u, "").toLowerCase();
  const family = normalized === "zodiacseason" ? "zodiac-season" : normalized === "zodiacseasonpolaraxis" ? "zodiac-season-polar-axis" : "";
  return sign && family ? `fallback-hook/${family}/${sign.toLowerCase()}` : undefined;
}
