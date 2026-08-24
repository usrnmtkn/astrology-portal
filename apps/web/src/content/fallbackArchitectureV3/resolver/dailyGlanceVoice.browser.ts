export type DailyGlancePersonSlots = {
  personName: string;
  personNamePossessive: string;
  personPreferredName: string;
  personPreferredNamePossessive: string;
  personSubject: string;
  personSubjectCapitalized: string;
  personObject: string;
  personObjectCapitalized: string;
  personPossessiveAdjective: string;
  personPossessiveAdjectiveCapitalized: string;
  personPossessivePronoun: string;
  personPossessivePronounCapitalized: string;
  personReflexive: string;
  personReflexiveCapitalized: string;
  personBePresent: string;
  personBePast: string;
  personHavePresent: string;
  personVerbSuffix: string;
};

export type DailyGlanceFriendVoiceFinding = {
  id:
    | "DG-THEY-NO-SECOND-PERSON"
    | "DG-THEY-NO-DIRECT-IMPERATIVE"
    | "DG-THEY-ALLOWED-PERSON-SLOTS-ONLY";
  match: string;
};

const SECOND_PERSON = /\b(?:you|your|yours|yourself|yourselves)\b/giu;
const DIRECT_IMPERATIVE = /(?:^|[.!?]\s+)(?:don't|do not|stop|keep|let|give|take|check|say|ask|make|go|trust|put|use|change|tell|be|try|finish|clear|get|notice|remember|decide|write|walk|sit|come|pick|start|see|rest|reschedule|lead|treat|reduce|stay|run|choose|review|pay|complete|separate|begin|send|follow|hold|bring|count|read|skip|look|call|move|leave|delay|spend|accept|speak|expect|know|direct)\b/giu;
const PERSON_SLOT = /\{\{([\w.]+)\}\}/gu;

function isDeclarativeImperativeFalsePositive(bodyThey: string, match: RegExpMatchArray) {
  const matchIndex = match.index ?? 0;
  const verbOffset = match[0].search(/[A-Za-z]/u);
  const sentence = bodyThey.slice(matchIndex + Math.max(0, verbOffset));

  return /^(?:Change would require\b|Clear numbers, access, and responsibility make\b)/iu.test(sentence);
}

export const DAILY_GLANCE_PERSON_SLOT_KEYS = new Set<keyof DailyGlancePersonSlots>([
  "personName",
  "personNamePossessive",
  "personPreferredName",
  "personPreferredNamePossessive",
  "personSubject",
  "personSubjectCapitalized",
  "personObject",
  "personObjectCapitalized",
  "personPossessiveAdjective",
  "personPossessiveAdjectiveCapitalized",
  "personPossessivePronoun",
  "personPossessivePronounCapitalized",
  "personReflexive",
  "personReflexiveCapitalized",
  "personBePresent",
  "personBePast",
  "personHavePresent",
  "personVerbSuffix"
]);

export function lintDailyGlanceFriendVoice(bodyThey: string): DailyGlanceFriendVoiceFinding[] {
  const findings: DailyGlanceFriendVoiceFinding[] = [];

  for (const match of bodyThey.matchAll(SECOND_PERSON)) {
    findings.push({ id: "DG-THEY-NO-SECOND-PERSON", match: match[0] });
  }
  for (const match of bodyThey.matchAll(DIRECT_IMPERATIVE)) {
    if (isDeclarativeImperativeFalsePositive(bodyThey, match)) continue;
    findings.push({ id: "DG-THEY-NO-DIRECT-IMPERATIVE", match: match[0].trim() });
  }
  for (const match of bodyThey.matchAll(PERSON_SLOT)) {
    if (!DAILY_GLANCE_PERSON_SLOT_KEYS.has(match[1] as keyof DailyGlancePersonSlots)) {
      findings.push({ id: "DG-THEY-ALLOWED-PERSON-SLOTS-ONLY", match: match[0] });
    }
  }

  return findings;
}

export function fillDailyGlancePersonSlots(
  bodyThey: string,
  slots: Partial<DailyGlancePersonSlots>
): string {
  const findings = lintDailyGlanceFriendVoice(bodyThey);
  if (findings.length > 0) {
    throw new Error(findings.map((finding) => `${finding.id}: ${finding.match}`).join(" | "));
  }

  return bodyThey.replace(PERSON_SLOT, (slot, key: keyof DailyGlancePersonSlots) => {
    const value = slots[key];
    if (typeof value !== "string") {
      throw new Error(`DG-THEY-MISSING-PERSON-SLOT: ${slot}`);
    }
    return value;
  });
}
