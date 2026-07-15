export type ReaderSubjectMode = "self" | "friend";

export type ReaderSubject = {
  mode: ReaderSubjectMode;
  name?: string;
  subject: string;
  object: string;
  possessive: string;
  reflexive: string;
  verbBe: string;
  verbHave: string;
};

export type ReaderSubjectOptions = {
  mode?: ReaderSubjectMode;
  name?: string;
  pronouns?: Partial<Pick<ReaderSubject, "subject" | "object" | "possessive" | "reflexive">>;
};

export function createReaderSubject({
  mode = "self",
  name = "",
  pronouns = {}
}: ReaderSubjectOptions = {}): ReaderSubject {
  if (mode === "self") {
    return {
      mode,
      name,
      subject: "you",
      object: "you",
      possessive: "your",
      reflexive: "yourself",
      verbBe: "are",
      verbHave: "have"
    };
  }

  return {
    mode,
    name: name.trim() || undefined,
    subject: pronouns.subject ?? "they",
    object: pronouns.object ?? "them",
    possessive: pronouns.possessive ?? "their",
    reflexive: pronouns.reflexive ?? "themself",
    verbBe: (pronouns.subject ?? "they").toLowerCase() === "he" || (pronouns.subject ?? "they").toLowerCase() === "she" ? "is" : "are",
    verbHave: (pronouns.subject ?? "they").toLowerCase() === "he" || (pronouns.subject ?? "they").toLowerCase() === "she" ? "has" : "have"
  };
}

export function readerDisplayName(subject: ReaderSubject) {
  if (subject.mode === "self") return "you";
  return subject.name ?? subject.subject;
}

export function readerPossessiveName(subject: ReaderSubject) {
  if (subject.mode === "self") return "Your";
  const name = subject.name?.trim();
  if (!name) return "Their";
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export function readerHeadlineFallback(subject: ReaderSubject, noun: string) {
  if (subject.mode === "self") return `Your ${noun}`;
  return `${readerPossessiveName(subject)} ${noun}`;
}

export function capitalizeSentence(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed[0].toUpperCase() + trimmed.slice(1);
}
