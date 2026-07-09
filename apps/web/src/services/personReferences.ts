export type PronounChoice = "she" | "he" | "they" | "name_only";
export type VerbAgreement = "singular" | "plural";

export type PersonReference = {
  subject: string;
  object: string;
  possessivePronoun: string;
  possessive: string;
  reflexive: string;
  name: string;
  namePossessive: string;
  verbAgreement: VerbAgreement;
};

export type PersonReferenceInput = {
  name: string;
  pronouns?: PronounChoice | null;
  isReader?: boolean;
};

export const defaultPronounChoice: PronounChoice = "name_only";
export const pronounChoices: PronounChoice[] = ["name_only", "she", "he", "they"];

export const pronounChoiceLabels: Record<PronounChoice, string> = {
  name_only: "Name only",
  she: "She / Her",
  he: "He / Him",
  they: "They / Them"
};

export type PersonSlotValues = Record<string, string>;

export function normalizePronounChoice(value: string | null | undefined): PronounChoice {
  return value === "she" || value === "he" || value === "they" || value === "name_only"
    ? value
    : defaultPronounChoice;
}

export function possessiveName(name: string) {
  return name.toLowerCase() === "you" ? "your" : `${name}'s`;
}

export function resolvePersonReference(person: PersonReferenceInput): PersonReference {
  const name = person.name.trim();

  if (person.isReader) {
    return {
      subject: "you",
      object: "you",
      possessivePronoun: "your",
      possessive: "your",
      reflexive: "yourself",
      name: "you",
      namePossessive: "your",
      verbAgreement: "plural"
    };
  }

  switch (normalizePronounChoice(person.pronouns)) {
    case "she":
      return {
        subject: "she",
        object: "her",
        possessivePronoun: "her",
        possessive: "her",
        reflexive: "herself",
        name,
        namePossessive: possessiveName(name),
        verbAgreement: "singular"
      };
    case "he":
      return {
        subject: "he",
        object: "him",
        possessivePronoun: "his",
        possessive: "his",
        reflexive: "himself",
        name,
        namePossessive: possessiveName(name),
        verbAgreement: "singular"
      };
    case "they":
      return {
        subject: "they",
        object: "them",
        possessivePronoun: "their",
        possessive: "their",
        reflexive: "themselves",
        name,
        namePossessive: possessiveName(name),
        verbAgreement: "plural"
      };
    case "name_only":
    default:
      return {
        subject: name,
        object: name,
        possessivePronoun: possessiveName(name),
        possessive: possessiveName(name),
        reflexive: name,
        name,
        namePossessive: possessiveName(name),
        verbAgreement: "singular"
      };
  }
}

export function personReferenceSlots(prefix: string, reference: PersonReference): PersonSlotValues {
  return {
    [`${prefix}Subject`]: reference.subject,
    [`${prefix}Object`]: reference.object,
    [`${prefix}PossessivePronoun`]: reference.possessivePronoun,
    [`${prefix}Name`]: reference.name,
    [`${prefix}NamePossessive`]: reference.namePossessive
  };
}

export function genericPersonReferenceSlots(reference: PersonReference): PersonSlotValues {
  return personReferenceSlots("person", reference);
}

/*
 * Slot authoring reference:
 * - Object/possessive slots are always safe: {personObject}, {personPossessivePronoun}.
 * - Subject slots must use modal/invariant phrasing, such as "{personSubject} may feel".
 * - Prefer {personName} for subject positions when the sentence needs ordinary verbs.
 * - The renderer does not conjugate verbs.
 */
