export type MonthlyPhraseGrammar = "noun-phrase" | "verb-phrase" | "clause";
export type MonthlyPhraseSource = "edition" | "opening-season" | "closing-season" | "lead-event";
export type MonthlyPhraseVariable = {
  name: string;
  grammar: MonthlyPhraseGrammar;
  source: MonthlyPhraseSource;
  description: string;
};

/**
 * Small writing units used by the future monthly sentence templates.
 * This registry defines contracts only. Phrase values are scoped and stored later;
 * they must never be written into the shared template as month-independent prose.
 */
export const monthlyPhraseVariables: readonly MonthlyPhraseVariable[] = [
  { name: "primaryMonthlyThemeFocus", grammar: "noun-phrase", source: "edition", description: "First reviewed month-specific theme." },
  { name: "primaryMonthlyThemeExperience", grammar: "clause", source: "edition", description: "Recognizable experience of the primary theme." },
  { name: "secondaryMonthlyThemeFocus", grammar: "noun-phrase", source: "edition", description: "Optional distinct concurrent monthly theme." },
  { name: "secondaryMonthlyThemeExperience", grammar: "clause", source: "edition", description: "Recognizable experience of the secondary theme." },
  { name: "openingSeasonFocus", grammar: "noun-phrase", source: "opening-season", description: "Focus of the Sun season active at month start." },
  { name: "openingSeasonOpportunity", grammar: "verb-phrase", source: "opening-season", description: "Useful possibility within the opening season." },
  { name: "closingSeasonFocus", grammar: "noun-phrase", source: "closing-season", description: "Focus added by the incoming Sun season." },
  { name: "closingSeasonChallenge", grammar: "noun-phrase", source: "closing-season", description: "Complication tied to the incoming season." },
  { name: "closingSeasonPractice", grammar: "verb-phrase", source: "closing-season", description: "Useful response within the incoming season." },
  { name: "leadEventExperience", grammar: "clause", source: "lead-event", description: "Recognizable experience of the reviewed lead event." },
  { name: "leadEventOpportunity", grammar: "verb-phrase", source: "lead-event", description: "Useful response to the reviewed lead event." }
];

export function monthlyPhraseVariable(name: string) {
  return monthlyPhraseVariables.find(variable => variable.name === name);
}
