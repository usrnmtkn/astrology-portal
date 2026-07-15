export const skyHistoricalLookbackSettingKey = "app-setting/sky-historical-lookbacks";
export const skyHistoricalLookbackSettingId = "skyHistoricalLookbackEnabled";
export const skyHistoricalLookbackTemplateId = "sky.collective.historical-lookback.v1";

export type HistoricalMatchSpecificity =
  | "same-planet-same-sign"
  | "same-planet-same-sign-same-direction"
  | "same-planet-same-sign-degree-range"
  | "same-exact-aspect"
  | "same-nodal-axis"
  | "same-eclipse-family";

export type SkyHistoricalLookbackRecord = {
  id: string;
  status: "draft" | "reviewed" | "rejected";
  surface: "sky.collective.detail";
  eligibility: "eligible" | "ineligible";
  eventIdentity: {
    eventType:
      | "planet-in-sign"
      | "retrograde"
      | "station"
      | "ingress"
      | "nodal-cycle"
      | "eclipse-cycle"
      | "aspect-cycle";
    bodies: string[];
    sign?: string;
    aspect?: string;
    direction?: "retrograde" | "direct";
    degreeRange?: {
      start: number;
      end: number;
    };
  };
  currentWindow: {
    start: string;
    end: string;
  };
  previousWindows: Array<{
    start: string;
    end: string;
    calculationSourceId: string;
  }>;
  previousCycleDateLabel: string;
  historicalHeading: "Last time around" | "Looking back" | "An earlier chapter" | "The previous cycle" | "Historical context";
  clauses: {
    historicalContext: string;
    recurringQuestion?: string;
    importantDifference: string;
    presentInvitation?: string;
  };
  historicalSources: Array<{
    id: string;
    title: string;
    publisher?: string;
    url?: string;
    publicationDate?: string;
    supports: string[];
  }>;
  astrologyCalculationSources: string[];
  reviewedBy?: string;
  reviewedAt?: string;
  confidence: "high" | "medium" | "low";
  causalClaimCheck: "passed" | "failed";
  repetitionClaimCheck: "passed" | "failed";
  historicalMatchSpecificity: HistoricalMatchSpecificity;
  exactDegreeMatch: boolean;
  directionMatch: boolean;
  historicalAnalogyStrength: "broad" | "specific" | "exact";
};

export type SkyHistoricalLookback = {
  heading: SkyHistoricalLookbackRecord["historicalHeading"];
  dateLabel: string;
  paragraphs: string[];
  sourceLinks: SkyHistoricalLookbackRecord["historicalSources"];
  trace: {
    templateId: typeof skyHistoricalLookbackTemplateId;
    recordId: string;
    previousWindowSource: string[];
    historicalEventSources: string[];
    historicalMatchSpecificity: HistoricalMatchSpecificity;
    exactDegreeMatch: boolean;
    directionMatch: boolean;
    historicalAnalogyStrength: "broad" | "specific" | "exact";
  };
};

export type SkyHistoricalEventIdentity = {
  eventType: SkyHistoricalLookbackRecord["eventIdentity"]["eventType"];
  bodies: string[];
  sign?: string;
  aspect?: string;
  direction?: "retrograde" | "direct";
};

const historicalRecords: SkyHistoricalLookbackRecord[] = [];

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function sameMembers(first: string[], second: string[]) {
  const left = first.map(normalize).sort();
  const right = second.map(normalize).sort();
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function historicalEventIdentityMatches(record: SkyHistoricalLookbackRecord, eventIdentity: SkyHistoricalEventIdentity) {
  return record.surface === "sky.collective.detail"
    && record.eventIdentity.eventType === eventIdentity.eventType
    && sameMembers(record.eventIdentity.bodies, eventIdentity.bodies)
    && normalize(record.eventIdentity.sign) === normalize(eventIdentity.sign)
    && normalize(record.eventIdentity.aspect) === normalize(eventIdentity.aspect)
    && normalize(record.eventIdentity.direction) === normalize(eventIdentity.direction);
}

function eligibleHistoricalRecord(record: SkyHistoricalLookbackRecord, eventIdentity: SkyHistoricalEventIdentity) {
  return record.status === "reviewed"
    && record.eligibility === "eligible"
    && record.causalClaimCheck === "passed"
    && record.repetitionClaimCheck === "passed"
    && historicalEventIdentityMatches(record, eventIdentity)
    && record.previousWindows.length > 0
    && record.astrologyCalculationSources.length > 0
    && record.clauses.historicalContext.trim().length > 0
    && record.clauses.importantDifference.trim().length > 0;
}

function joinEditorially(parts: Array<string | undefined>) {
  return parts
    .map((part) => String(part ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveSkyHistoricalLookback({
  enabled,
  eventIdentity,
  records = historicalRecords
}: {
  enabled: boolean;
  eventIdentity: SkyHistoricalEventIdentity;
  records?: SkyHistoricalLookbackRecord[];
}): SkyHistoricalLookback | null {
  if (!enabled) return null;

  const record = records.find((candidate) => eligibleHistoricalRecord(candidate, eventIdentity));
  if (!record) return null;

  const paragraph = joinEditorially([
    record.clauses.historicalContext,
    record.clauses.recurringQuestion,
    record.clauses.importantDifference,
    record.clauses.presentInvitation
  ]);
  if (!paragraph) return null;

  return {
    heading: record.historicalHeading,
    dateLabel: record.previousCycleDateLabel,
    paragraphs: [paragraph],
    sourceLinks: record.historicalSources,
    trace: {
      templateId: skyHistoricalLookbackTemplateId,
      recordId: record.id,
      previousWindowSource: record.previousWindows.map((window) => window.calculationSourceId),
      historicalEventSources: record.historicalSources.map((source) => source.id),
      historicalMatchSpecificity: record.historicalMatchSpecificity,
      exactDegreeMatch: record.exactDegreeMatch,
      directionMatch: record.directionMatch,
      historicalAnalogyStrength: record.historicalAnalogyStrength
    }
  };
}
