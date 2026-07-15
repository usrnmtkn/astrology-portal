export type PronounChoice = "she" | "he" | "they" | "name_only";
export type VerbAgreement = "singular" | "plural";

export type PersonReference = {
  subject: string;
  object: string;
  possessiveAdjective: string;
  possessivePronoun: string;
  possessive: string;
  reflexive: string;
  subjectCapitalized: string;
  objectCapitalized: string;
  possessiveAdjectiveCapitalized: string;
  possessivePronounCapitalized: string;
  reflexiveCapitalized: string;
  name: string;
  namePossessive: string;
  verbAgreement: VerbAgreement;
  bePresent: "is" | "are";
  bePast: "was" | "were";
  havePresent: "has" | "have";
  verbSuffix: "" | "s";
};

export type PersonReferenceInput = {
  name: string;
  pronouns?: PronounChoice | null;
  isReader?: boolean;
};

export const defaultPronounChoice: PronounChoice = "they";
export const pronounChoices: PronounChoice[] = ["they", "she", "he"];

export const pronounChoiceLabels: Record<PronounChoice, string> = {
  name_only: "They / Them",
  she: "She / Her",
  he: "He / Him",
  they: "They / Them"
};

export type PersonSlotValues = Record<string, string>;

export function normalizePronounChoice(value: string | null | undefined): PronounChoice {
  if (value === "name_only") {
    return "they";
  }

  return value === "she" || value === "he" || value === "they"
    ? value
    : defaultPronounChoice;
}

export function possessiveName(name: string) {
  return name.toLowerCase() === "you" ? "your" : `${name}'s`;
}

function capitalizeReference(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildPersonReference({
  name,
  object,
  possessiveAdjective,
  possessivePronoun,
  reflexive,
  subject,
  verbAgreement
}: {
  name: string;
  object: string;
  possessiveAdjective: string;
  possessivePronoun: string;
  reflexive: string;
  subject: string;
  verbAgreement: VerbAgreement;
}): PersonReference {
  const isPlural = verbAgreement === "plural";

  return {
    subject,
    object,
    possessiveAdjective,
    possessivePronoun,
    possessive: possessiveAdjective,
    reflexive,
    subjectCapitalized: capitalizeReference(subject),
    objectCapitalized: capitalizeReference(object),
    possessiveAdjectiveCapitalized: capitalizeReference(possessiveAdjective),
    possessivePronounCapitalized: capitalizeReference(possessivePronoun),
    reflexiveCapitalized: capitalizeReference(reflexive),
    name,
    namePossessive: possessiveName(name),
    verbAgreement,
    bePresent: isPlural ? "are" : "is",
    bePast: isPlural ? "were" : "was",
    havePresent: isPlural ? "have" : "has",
    verbSuffix: isPlural ? "" : "s"
  };
}

export function resolvePersonReference(person: PersonReferenceInput): PersonReference {
  const name = person.name.trim();

  if (person.isReader) {
    return buildPersonReference({
      subject: "you",
      object: "you",
      possessiveAdjective: "your",
      possessivePronoun: "yours",
      reflexive: "yourself",
      name: "you",
      verbAgreement: "plural"
    });
  }

  switch (normalizePronounChoice(person.pronouns)) {
    case "she":
      return buildPersonReference({
        subject: "she",
        object: "her",
        possessiveAdjective: "her",
        possessivePronoun: "hers",
        reflexive: "herself",
        name,
        verbAgreement: "singular"
      });
    case "he":
      return buildPersonReference({
        subject: "he",
        object: "him",
        possessiveAdjective: "his",
        possessivePronoun: "his",
        reflexive: "himself",
        name,
        verbAgreement: "singular"
      });
    case "they":
      return buildPersonReference({
        subject: "they",
        object: "them",
        possessiveAdjective: "their",
        possessivePronoun: "theirs",
        reflexive: "themselves",
        name,
        verbAgreement: "plural"
      });
    default:
      return buildPersonReference({
        subject: "they",
        object: "them",
        possessiveAdjective: "their",
        possessivePronoun: "theirs",
        reflexive: "themselves",
        name,
        verbAgreement: "plural"
      });
  }
}

export function resolveThirdPersonReference(person: PersonReferenceInput): PersonReference {
  return resolvePersonReference(person);
}

export function personReferenceSlots(prefix: string, reference: PersonReference): PersonSlotValues {
  return {
    [`${prefix}Subject`]: reference.subject,
    [`${prefix}SubjectCapitalized`]: reference.subjectCapitalized,
    [`${prefix}Object`]: reference.object,
    [`${prefix}ObjectCapitalized`]: reference.objectCapitalized,
    [`${prefix}PossessiveAdjective`]: reference.possessiveAdjective,
    [`${prefix}PossessiveAdjectiveCapitalized`]: reference.possessiveAdjectiveCapitalized,
    [`${prefix}PossessivePronoun`]: reference.possessivePronoun,
    [`${prefix}PossessivePronounCapitalized`]: reference.possessivePronounCapitalized,
    [`${prefix}Reflexive`]: reference.reflexive,
    [`${prefix}ReflexiveCapitalized`]: reference.reflexiveCapitalized,
    [`${prefix}BePresent`]: reference.bePresent,
    [`${prefix}BePast`]: reference.bePast,
    [`${prefix}HavePresent`]: reference.havePresent,
    [`${prefix}VerbSuffix`]: reference.verbSuffix,
    [`${prefix}Name`]: reference.name,
    [`${prefix}NamePossessive`]: reference.namePossessive
  };
}

export function genericPersonReferenceSlots(reference: PersonReference): PersonSlotValues {
  return personReferenceSlots("person", reference);
}

export type PronounGrammarIssue = {
  index: number;
  pattern: string;
  sentence: string;
};

function sentenceForIndex(text: string, index: number) {
  const sentenceStart = Math.max(
    text.lastIndexOf(".", index - 1),
    text.lastIndexOf("!", index - 1),
    text.lastIndexOf("?", index - 1)
  ) + 1;
  const remaining = text.slice(index);
  const nextStops = [remaining.indexOf("."), remaining.indexOf("!"), remaining.indexOf("?")]
    .filter((position) => position >= 0);
  const sentenceEnd = nextStops.length > 0
    ? index + Math.min(...nextStops) + 1
    : text.length;

  return text.slice(sentenceStart, sentenceEnd).trim();
}

export function findPronounGrammarIssues(text: string): PronounGrammarIssue[] {
  const patterns: Array<{ label: string; pattern: RegExp }> = [
    {
      label: "object position uses subject they",
      pattern: /\b(?:in|to|for|with|without|around|before|after|from|of|at|near|inside|outside|through|toward|towards|beside|behind|within)\s+they\b/gi
    },
    {
      label: "object verb uses subject they",
      pattern: /\b(?:reward|rewards|rewarded|help|helps|helped|give|gives|gave|giving|pull|pulls|pulled|support|supports|supported|shape|shapes|shaped|affect|affects|affected|remind|reminds|reminded)\s+they\b/gi
    },
    {
      label: "they with singular verb",
      pattern: /\bthey\s+(?:is|was|has|does|shines|imagines|reaches|carries|speaks|reinvents|survives|provokes|notices|learns|builds|wants|moves|lives|acts|pursues|defends|follows|reads|keeps|processes|understands|chooses)\b/gi
    },
    {
      label: "third-person singular subject with plural be",
      pattern: /\b(?:she|he)\s+are\b/gi
    },
    {
      label: "object pronoun used as subject",
      pattern: /\b(?:her|him|them)\s+(?:is|are|was|were|has|have|can|may|will|would|could|should|needs?|wants?|moves?|lives?|acts?|builds?|learns?|notices?)\b/gi
    }
  ];

  return patterns.flatMap(({ label, pattern }) => (
    [...text.matchAll(pattern)].map((match) => ({
      index: match.index ?? 0,
      pattern: label,
      sentence: sentenceForIndex(text, match.index ?? 0)
    }))
  ));
}

/*
 * Slot authoring reference:
 * - Object/possessive slots are always safe: {personObject}, {personPossessiveAdjective}.
 * - Subject slots must use modal/invariant phrasing, such as "{personSubject} may feel".
 * - Prefer {personName} for subject positions when the sentence needs ordinary verbs.
 * - When a template needs ordinary verbs, pair subject slots with {personVerbSuffix}, {personBePresent}, or {personHavePresent}.
 */
