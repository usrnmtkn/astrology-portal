export type DailyGlanceFriendPreviewPronouns = "they" | "she" | "he";

export type DailyGlanceFriendVariableCategory =
  | "name"
  | "subject"
  | "object"
  | "possessive"
  | "reflexive"
  | "verb"
  | "unknown";

export type DailyGlanceFriendPreviewPart =
  | { kind: "text"; text: string }
  | {
      kind: "variable";
      category: DailyGlanceFriendVariableCategory;
      label: string;
      meaning: string;
      source: string;
      value: string;
      variable: string;
    };

type DailyGlanceFriendVariableDefinition = {
  category: DailyGlanceFriendVariableCategory;
  label: string;
  meaning: string;
};

const personSlotPattern = /\{\{([\w.]+)\}\}/gu;

const friendVariableDefinitions: Record<string, DailyGlanceFriendVariableDefinition> = {
  personName: { category: "name", label: "Name", meaning: "The selected person's full display name." },
  personNamePossessive: { category: "name", label: "Name · possessive", meaning: "The selected person's full display name written possessively." },
  personPreferredName: { category: "name", label: "Name", meaning: "The selected person's preferred name, falling back to their display name." },
  personPreferredNamePossessive: { category: "name", label: "Name · possessive", meaning: "The selected person's preferred name written possessively." },
  personSubject: { category: "subject", label: "Subject pronoun", meaning: "The pronoun that performs an action: they, she, or he." },
  personSubjectCapitalized: { category: "subject", label: "Subject pronoun · capitalized", meaning: "The subject pronoun at the beginning of a sentence: They, She, or He." },
  personObject: { category: "object", label: "Object pronoun", meaning: "The pronoun that receives an action: them, her, or him." },
  personObjectCapitalized: { category: "object", label: "Object pronoun · capitalized", meaning: "The object pronoun at the beginning of a sentence: Them, Her, or Him." },
  personPossessiveAdjective: { category: "possessive", label: "Possessive adjective", meaning: "The word placed before something the person has: their, her, or his." },
  personPossessiveAdjectiveCapitalized: { category: "possessive", label: "Possessive adjective · capitalized", meaning: "The possessive adjective at the beginning of a sentence: Their, Her, or His." },
  personPossessivePronoun: { category: "possessive", label: "Possessive pronoun", meaning: "The standalone ownership word: theirs, hers, or his." },
  personPossessivePronounCapitalized: { category: "possessive", label: "Possessive pronoun · capitalized", meaning: "The standalone ownership word at the beginning of a sentence: Theirs, Hers, or His." },
  personReflexive: { category: "reflexive", label: "Reflexive pronoun", meaning: "The pronoun used when the person acts on themself: themselves, herself, or himself." },
  personReflexiveCapitalized: { category: "reflexive", label: "Reflexive pronoun · capitalized", meaning: "The reflexive pronoun at the beginning of a sentence: Themselves, Herself, or Himself." },
  personBePresent: { category: "verb", label: "Verb agreement · present", meaning: "Chooses are or is to agree with the selected pronouns." },
  personBePast: { category: "verb", label: "Verb agreement · past", meaning: "Chooses were or was to agree with the selected pronouns." },
  personHavePresent: { category: "verb", label: "Verb agreement · have", meaning: "Chooses have or has to agree with the selected pronouns." },
  personVerbSuffix: { category: "verb", label: "Verb agreement · suffix", meaning: "Adds s for she or he and nothing for singular they." }
};

const pronounPreviewValues = {
  they: { subject: "they", object: "them", possessiveAdjective: "their", possessivePronoun: "theirs", reflexive: "themselves", bePresent: "are", bePast: "were", havePresent: "have", verbSuffix: "" },
  she: { subject: "she", object: "her", possessiveAdjective: "her", possessivePronoun: "hers", reflexive: "herself", bePresent: "is", bePast: "was", havePresent: "has", verbSuffix: "s" },
  he: { subject: "he", object: "him", possessiveAdjective: "his", possessivePronoun: "his", reflexive: "himself", bePresent: "is", bePast: "was", havePresent: "has", verbSuffix: "s" }
} as const;

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function dailyGlanceFriendPreviewSlots(name: string, pronouns: DailyGlanceFriendPreviewPronouns) {
  const previewName = name.trim() || "Alex";
  const values = pronounPreviewValues[pronouns];
  return {
    personName: previewName,
    personNamePossessive: `${previewName}'s`,
    personPreferredName: previewName,
    personPreferredNamePossessive: `${previewName}'s`,
    personSubject: values.subject,
    personSubjectCapitalized: capitalize(values.subject),
    personObject: values.object,
    personObjectCapitalized: capitalize(values.object),
    personPossessiveAdjective: values.possessiveAdjective,
    personPossessiveAdjectiveCapitalized: capitalize(values.possessiveAdjective),
    personPossessivePronoun: values.possessivePronoun,
    personPossessivePronounCapitalized: capitalize(values.possessivePronoun),
    personReflexive: values.reflexive,
    personReflexiveCapitalized: capitalize(values.reflexive),
    personBePresent: values.bePresent,
    personBePast: values.bePast,
    personHavePresent: values.havePresent,
    personVerbSuffix: values.verbSuffix
  } satisfies Record<string, string>;
}

export function dailyGlanceFriendVariableDefinition(variable: string) {
  return friendVariableDefinitions[variable] ?? {
    category: "unknown" as const,
    label: variable,
    meaning: "This variable is not part of the Daily At-a-Glance person contract."
  };
}

export function dailyGlanceFriendPreviewParts(template: string, slots: Record<string, string>): DailyGlanceFriendPreviewPart[] {
  const parts: DailyGlanceFriendPreviewPart[] = [];
  let cursor = 0;
  for (const match of template.matchAll(personSlotPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: "text", text: template.slice(cursor, index) });
    const source = match[0];
    const variable = match[1];
    parts.push({
      kind: "variable",
      ...dailyGlanceFriendVariableDefinition(variable),
      source,
      value: slots[variable] ?? source,
      variable
    });
    cursor = index + source.length;
  }
  if (cursor < template.length) parts.push({ kind: "text", text: template.slice(cursor) });
  return parts;
}
