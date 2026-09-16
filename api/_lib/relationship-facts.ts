import {
  createReportEnvelope,
  fetchReportEnvelope,
  type ReportEnvelopeStore,
  type UserReportRow
} from "./report-envelope.ts";

const DEFAULT_TLDRASTRO_API_URL = "https://tldrastro-api-27165565299.us-central1.run.app";
const HARD_ASPECTS = new Set(["opposition", "square"]);
const HARMONIOUS_ASPECTS = new Set(["sextile", "trine"]);
const TIME_UNKNOWN = "Time unknown";

export const RELATIONSHIP_REPORT_UNAVAILABLE_CODE = "report_unavailable_consent";
export const RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE = "report_auth_required";

export type RelationshipSubject = {
  kind: "friendship" | "manual_chart";
  id: string;
};

type JsonObject = Record<string, unknown>;

type DateTimeInput = {
  date: string;
  time?: string | null;
  timeKnown: boolean;
  timeZone?: string | null;
};

type LocationInput = {
  label: string;
  latitude: number;
  longitude: number;
  timeZone?: string | null;
};

export type RelationshipChartSubject = {
  name?: string | null;
  datetime: DateTimeInput;
  location: LocationInput;
  settings: {
    houseSystem: "whole_sign";
    zodiac: "tropical";
    aspectProfile: "standard";
  };
};

type FriendshipRow = {
  id: string;
  user_low_id: string;
  user_high_id: string;
};

type ManualChartRow = {
  id: string;
  owner_user_id: string;
  claimed_by_user_id: string | null;
  display_name: string;
  birth_date: string;
  birth_time: string | null;
  birth_time_unknown: boolean;
  birth_place: string;
  birth_latitude: number;
  birth_longitude: number;
  birth_timezone: string | null;
};

type UserProfileRow = {
  user_id: string;
  data: unknown;
};

export type RelationshipFactsDataSource = {
  canReadChartForReport(viewerUserId: string, subjectRef: string): Promise<boolean>;
  loadFriendship(friendshipId: string): Promise<FriendshipRow | null>;
  loadManualChart(manualChartId: string): Promise<ManualChartRow | null>;
  loadUserProfile(userId: string): Promise<UserProfileRow | null>;
};

type ApiMetadata = JsonObject & {
  calculatedAt?: string;
  ephemeris?: unknown;
};

type ApiPosition = JsonObject & {
  point?: string;
  planet?: string;
  house?: number | null;
};

type ApiAspect = JsonObject & {
  from?: string;
  to?: string;
  type?: string;
  orb?: number;
  applying?: boolean | null;
  phase?: "applying" | "separating" | null;
  fromHouse?: number | null;
  toHouse?: number | null;
};

export type ApiNatalResponse = JsonObject & {
  metadata?: ApiMetadata;
  subjectName?: string | null;
  positions?: ApiPosition[];
  angles?: Record<string, ApiPosition>;
  houseCusps?: number[];
  aspects?: ApiAspect[];
  chartRuler?: string | null;
  sect?: unknown;
  dignitySummary?: unknown;
};

type ApiSynastryContact = JsonObject & {
  id: string;
  fromPerson: "A" | "B";
  fromPoint: string;
  fromSign: string;
  fromHouse?: number | null;
  toPerson: "A" | "B";
  toPoint: string;
  toSign: string;
  toHouse?: number | null;
  aspect: string;
  orb: number;
  strength: number;
  score: number;
  applying?: boolean | null;
  phase?: "applying" | "separating" | null;
  knowledgeIds?: string[];
};

type ApiHouseOverlay = JsonObject & {
  id: string;
  planetOwner: "A" | "B";
  houseOwner: "A" | "B";
  point: string;
  sign: string;
  house: number;
  knowledgeIds?: string[];
};

export type ApiSynastryResponse = JsonObject & {
  metadata?: ApiMetadata;
  personA?: ApiNatalResponse;
  personB?: ApiNatalResponse;
  contacts?: ApiSynastryContact[];
  houseOverlays?: ApiHouseOverlay[];
};

export type ApiCompositeResponse = JsonObject & {
  metadata?: ApiMetadata;
  positions?: ApiPosition[];
  aspects?: ApiAspect[];
  houseCusps?: number[];
  angles?: Record<string, ApiPosition>;
};

export type RelationshipAstroClient = {
  serviceVersion(): Promise<string>;
  natal(subject: RelationshipChartSubject): Promise<ApiNatalResponse>;
  synastry(personA: RelationshipChartSubject, personB: RelationshipChartSubject): Promise<ApiSynastryResponse>;
  composite(personA: RelationshipChartSubject, personB: RelationshipChartSubject): Promise<ApiCompositeResponse>;
};

export type RelationshipContact = {
  id: string;
  fromPerson: "A" | "B";
  fromPoint: string;
  fromSign: string;
  fromHouse: number | null;
  toPerson: "A" | "B";
  toPoint: string;
  toSign: string;
  toHouse: number | null;
  aspect: string;
  orb: number;
  strength: number;
  score: number;
  applying?: boolean;
  phase?: "applying" | "separating";
  knowledgeIds: string[];
  hardest: boolean;
  tightestHarmonious: boolean;
};

export type RelationshipFactsBundle = Record<string, unknown> & {
  subjectNatal: JsonObject;
  contacts: RelationshipContact[];
  overlays: JsonObject[];
  composite: JsonObject;
  meta: {
    subjectRef: string;
    factsEngine: string;
    birthTimeUnknown: boolean;
    birthTimeUnknownFor: {
      viewer: boolean;
      subject: boolean;
    };
    calculatedAt: string | null;
    ephemeris: unknown;
  };
};

export type ComposeRelationshipFactsInput = {
  viewerUserId: string;
  subject: RelationshipSubject;
  periodStart: string;
  periodEnd?: string;
  regenerate?: boolean;
};

export type ReadRelationshipReportInput = {
  viewerUserId: string;
  subject: RelationshipSubject;
  periodStart: string;
};

export type RelationshipFactsDependencies = {
  dataSource: RelationshipFactsDataSource;
  envelopeStore: ReportEnvelopeStore;
  astroClient: RelationshipAstroClient;
};

export class RelationshipReportUnavailableError extends Error {
  readonly code = RELATIONSHIP_REPORT_UNAVAILABLE_CODE;
  readonly statusCode = 403;

  constructor() {
    super("Relationship report unavailable because chart sharing consent is not active.");
    this.name = "RelationshipReportUnavailableError";
  }
}

export class RelationshipFactsInputError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(message: string, code = "relationship_facts_invalid", statusCode = 400) {
    super(message);
    this.name = "RelationshipFactsInputError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function requiredString(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new RelationshipFactsInputError(`${label} is required.`, "relationship_facts_missing_birth_data", 422);
  }

  return value.trim();
}

function requiredNumber(value: unknown, label: string) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new RelationshipFactsInputError(`${label} is required.`, "relationship_facts_missing_birth_data", 422);
  }

  return number;
}

function isoDate(value: unknown) {
  const text = requiredString(value, "Birth date");
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/u);
  const display = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/u);

  if (iso) {
    return text;
  }

  if (display) {
    return `${display[3]}-${display[1].padStart(2, "0")}-${display[2].padStart(2, "0")}`;
  }

  throw new RelationshipFactsInputError("Birth date is invalid.", "relationship_facts_missing_birth_data", 422);
}

function twentyFourHourTime(value: unknown) {
  const text = requiredString(value, "Birth time");
  const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/u);

  if (twentyFourHour) {
    const hour = Number(twentyFourHour[1]);
    const minute = Number(twentyFourHour[2]);

    if (hour <= 23 && minute <= 59) {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  const display = text.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/iu);

  if (display) {
    const rawHour = Number(display[1]);
    const minute = Number(display[2]);
    const meridiem = display[3].toUpperCase();

    if (rawHour >= 1 && rawHour <= 12 && minute <= 59) {
      const hour = (rawHour % 12) + (meridiem === "PM" ? 12 : 0);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }

  throw new RelationshipFactsInputError("Birth time is invalid.", "relationship_facts_missing_birth_data", 422);
}

function chartSettings() {
  return {
    houseSystem: "whole_sign" as const,
    zodiac: "tropical" as const,
    aspectProfile: "standard" as const
  };
}

function profileChartSubject(row: UserProfileRow): { subject: RelationshipChartSubject; timeUnknown: boolean } {
  if (!isObject(row.data)) {
    throw new RelationshipFactsInputError("Profile birth data is unavailable.", "relationship_facts_missing_birth_data", 422);
  }

  const charts = Array.isArray(row.data.charts) ? row.data.charts : [];
  const chart = charts.find(isObject);

  if (!chart) {
    throw new RelationshipFactsInputError("Profile birth data is unavailable.", "relationship_facts_missing_birth_data", 422);
  }

  const location = isObject(chart.birthLocation) ? chart.birthLocation : null;

  if (!location) {
    throw new RelationshipFactsInputError("Profile birth location is unavailable.", "relationship_facts_missing_birth_data", 422);
  }

  const rawBirthTime = typeof chart.birthTime === "string" ? chart.birthTime.trim() : "";
  const timeUnknown = rawBirthTime === TIME_UNKNOWN;

  return {
    subject: {
      name: typeof row.data.name === "string" ? row.data.name : typeof chart.name === "string" ? chart.name : null,
      datetime: {
        date: isoDate(chart.birthDate),
        time: timeUnknown ? null : twentyFourHourTime(rawBirthTime),
        timeKnown: !timeUnknown,
        timeZone: typeof location.timeZone === "string" ? location.timeZone : null
      },
      location: {
        label: requiredString(location.label ?? chart.birthCity, "Birth place"),
        latitude: requiredNumber(location.latitude, "Birth latitude"),
        longitude: requiredNumber(location.longitude, "Birth longitude"),
        timeZone: typeof location.timeZone === "string" ? location.timeZone : null
      },
      settings: chartSettings()
    },
    timeUnknown
  };
}

function manualChartSubject(row: ManualChartRow): { subject: RelationshipChartSubject; timeUnknown: boolean } {
  return {
    subject: {
      name: row.display_name,
      datetime: {
        date: isoDate(row.birth_date),
        time: row.birth_time_unknown ? null : twentyFourHourTime(row.birth_time),
        timeKnown: !row.birth_time_unknown,
        timeZone: row.birth_timezone
      },
      location: {
        label: requiredString(row.birth_place, "Birth place"),
        latitude: requiredNumber(row.birth_latitude, "Birth latitude"),
        longitude: requiredNumber(row.birth_longitude, "Birth longitude"),
        timeZone: row.birth_timezone
      },
      settings: chartSettings()
    },
    timeUnknown: row.birth_time_unknown
  };
}

export function relationshipSubjectRef(subject: RelationshipSubject) {
  const id = requiredString(subject.id, "Relationship report subject id");

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
    throw new RelationshipFactsInputError("Relationship report subject id must be a UUID.");
  }

  return `${subject.kind}:${id.toLowerCase()}`;
}

function subjectUuid(subjectRef: string) {
  return subjectRef.slice(subjectRef.indexOf(":") + 1);
}

async function resolveChartSubjects(
  dataSource: RelationshipFactsDataSource,
  viewerUserId: string,
  subject: RelationshipSubject,
  subjectRef: string
) {
  const viewerProfile = await dataSource.loadUserProfile(viewerUserId);

  if (!viewerProfile) {
    throw new RelationshipFactsInputError("Viewer profile birth data is unavailable.", "relationship_facts_missing_birth_data", 422);
  }

  const viewer = profileChartSubject(viewerProfile);

  if (subject.kind === "manual_chart") {
    const manualChart = await dataSource.loadManualChart(subjectUuid(subjectRef));

    if (!manualChart || manualChart.owner_user_id !== viewerUserId) {
      throw new RelationshipReportUnavailableError();
    }

    return { viewer, subject: manualChartSubject(manualChart) };
  }

  const friendship = await dataSource.loadFriendship(subjectUuid(subjectRef));

  if (!friendship || ![friendship.user_low_id, friendship.user_high_id].includes(viewerUserId)) {
    throw new RelationshipReportUnavailableError();
  }

  const subjectUserId = friendship.user_low_id === viewerUserId
    ? friendship.user_high_id
    : friendship.user_low_id;
  const subjectProfile = await dataSource.loadUserProfile(subjectUserId);

  if (!subjectProfile) {
    throw new RelationshipFactsInputError("Subject profile birth data is unavailable.", "relationship_facts_missing_birth_data", 422);
  }

  return { viewer, subject: profileChartSubject(subjectProfile) };
}

function scrubHouses<T extends ApiPosition | ApiAspect>(value: T): T {
  const copy = clone(value);

  if ("house" in copy) {
    copy.house = null;
  }
  if ("fromHouse" in copy) {
    copy.fromHouse = null;
  }
  if ("toHouse" in copy) {
    copy.toHouse = null;
  }

  return copy;
}

function normalizedNatal(natal: ApiNatalResponse, timeUnknown: boolean): JsonObject {
  return {
    metadata: clone(natal.metadata ?? {}),
    subjectName: natal.subjectName ?? null,
    positions: (natal.positions ?? []).map((position) => timeUnknown ? scrubHouses(position) : clone(position)),
    angles: timeUnknown ? {} : clone(natal.angles ?? {}),
    houseCusps: timeUnknown ? [] : clone(natal.houseCusps ?? []),
    aspects: (natal.aspects ?? []).map((aspect) => timeUnknown ? scrubHouses(aspect) : clone(aspect)),
    chartRuler: timeUnknown ? null : natal.chartRuler ?? null,
    sect: timeUnknown ? null : natal.sect ?? null,
    dignitySummary: clone(natal.dignitySummary ?? {})
  };
}

function normalizedComposite(composite: ApiCompositeResponse, timeUnknown: boolean): JsonObject {
  return {
    metadata: clone(composite.metadata ?? {}),
    positions: (composite.positions ?? []).map((position) => timeUnknown ? scrubHouses(position) : clone(position)),
    aspects: (composite.aspects ?? []).map((aspect) => timeUnknown ? scrubHouses(aspect) : clone(aspect)),
    houseCusps: timeUnknown ? [] : clone(composite.houseCusps ?? []),
    angles: timeUnknown ? {} : clone(composite.angles ?? {})
  };
}

function normalizedContacts(contacts: ApiSynastryContact[], timeUnknown: boolean): RelationshipContact[] {
  const ranked = contacts
    .filter((contact) => !timeUnknown || ![contact.fromPoint, contact.toPoint].some((point) => ["Ascendant", "Midheaven"].includes(point)))
    .sort((left, right) => right.score - left.score || left.orb - right.orb || left.id.localeCompare(right.id))
    .slice(0, 5);
  const hardest = ranked
    .filter((contact) => HARD_ASPECTS.has(contact.aspect))
    .sort((left, right) => right.score - left.score || left.orb - right.orb || left.id.localeCompare(right.id))[0];
  const harmonious = ranked
    .filter((contact) => HARMONIOUS_ASPECTS.has(contact.aspect))
    .sort((left, right) => left.orb - right.orb || right.score - left.score || left.id.localeCompare(right.id))[0];

  return ranked.map((contact) => {
    const normalized: RelationshipContact = {
      id: contact.id,
      fromPerson: contact.fromPerson,
      fromPoint: contact.fromPoint,
      fromSign: contact.fromSign,
      fromHouse: timeUnknown ? null : contact.fromHouse ?? null,
      toPerson: contact.toPerson,
      toPoint: contact.toPoint,
      toSign: contact.toSign,
      toHouse: timeUnknown ? null : contact.toHouse ?? null,
      aspect: contact.aspect,
      orb: contact.orb,
      strength: contact.strength,
      score: contact.score,
      knowledgeIds: [...(contact.knowledgeIds ?? [])],
      hardest: contact.id === hardest?.id,
      tightestHarmonious: contact.id === harmonious?.id
    };

    if (typeof contact.applying === "boolean") {
      normalized.applying = contact.applying;
    }
    if (contact.phase === "applying" || contact.phase === "separating") {
      normalized.phase = contact.phase;
    }

    return normalized;
  });
}

export function normalizeRelationshipFacts({
  subjectRef,
  viewerTimeUnknown,
  subjectTimeUnknown,
  factsEngine,
  subjectNatal,
  synastry,
  composite
}: {
  subjectRef: string;
  viewerTimeUnknown: boolean;
  subjectTimeUnknown: boolean;
  factsEngine: string;
  subjectNatal: ApiNatalResponse;
  synastry: ApiSynastryResponse;
  composite: ApiCompositeResponse;
}): RelationshipFactsBundle {
  const timeUnknown = viewerTimeUnknown || subjectTimeUnknown;

  return {
    subjectNatal: normalizedNatal(subjectNatal, subjectTimeUnknown),
    contacts: normalizedContacts(synastry.contacts ?? [], timeUnknown),
    overlays: timeUnknown ? [] : clone(synastry.houseOverlays ?? []),
    composite: normalizedComposite(composite, timeUnknown),
    meta: {
      subjectRef,
      factsEngine,
      birthTimeUnknown: timeUnknown,
      birthTimeUnknownFor: {
        viewer: viewerTimeUnknown,
        subject: subjectTimeUnknown
      },
      calculatedAt: synastry.metadata?.calculatedAt ?? composite.metadata?.calculatedAt ?? null,
      ephemeris: clone(synastry.metadata?.ephemeris ?? composite.metadata?.ephemeris ?? null)
    }
  };
}

async function requireConsent(dataSource: RelationshipFactsDataSource, viewerUserId: string, subjectRef: string) {
  if (!viewerUserId || !await dataSource.canReadChartForReport(viewerUserId, subjectRef)) {
    throw new RelationshipReportUnavailableError();
  }
}

export async function composeRelationshipFacts(
  input: ComposeRelationshipFactsInput,
  dependencies: RelationshipFactsDependencies
): Promise<UserReportRow> {
  const subjectRef = relationshipSubjectRef(input.subject);
  const identity = {
    userId: input.viewerUserId,
    reportType: "relationship" as const,
    subjectId: subjectRef,
    periodStart: input.periodStart
  };

  await requireConsent(dependencies.dataSource, input.viewerUserId, subjectRef);

  const existing = await fetchReportEnvelope(dependencies.envelopeStore, identity);

  if (existing && !input.regenerate) {
    return existing;
  }

  const subjects = await resolveChartSubjects(
    dependencies.dataSource,
    input.viewerUserId,
    input.subject,
    subjectRef
  );
  const [version, subjectNatal, synastry, composite] = await Promise.all([
    dependencies.astroClient.serviceVersion(),
    dependencies.astroClient.natal(subjects.subject.subject),
    dependencies.astroClient.synastry(subjects.viewer.subject, subjects.subject.subject),
    dependencies.astroClient.composite(subjects.viewer.subject, subjects.subject.subject)
  ]);
  const factsEngine = `tldrastro-api@${version}`;
  const facts = normalizeRelationshipFacts({
    subjectRef,
    viewerTimeUnknown: subjects.viewer.timeUnknown,
    subjectTimeUnknown: subjects.subject.timeUnknown,
    factsEngine,
    subjectNatal,
    synastry,
    composite
  });

  return createReportEnvelope(dependencies.envelopeStore, {
    ...identity,
    periodEnd: input.periodEnd ?? input.periodStart,
    facts,
    factsEngine,
    status: "draft"
  }, { regenerate: input.regenerate });
}

export async function readRelationshipReport(
  input: ReadRelationshipReportInput,
  dependencies: Pick<RelationshipFactsDependencies, "dataSource" | "envelopeStore">
) {
  const subjectRef = relationshipSubjectRef(input.subject);

  await requireConsent(dependencies.dataSource, input.viewerUserId, subjectRef);

  return fetchReportEnvelope(dependencies.envelopeStore, {
    userId: input.viewerUserId,
    reportType: "relationship",
    subjectId: subjectRef,
    periodStart: input.periodStart
  });
}

type FetchLike = typeof fetch;

function serviceHeaders(serviceRoleKey: string) {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json"
  };
}

async function jsonPayload(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>;
}

function fetchFailure(label: string, response: Response, payload: unknown) {
  return new Error(`${label} failed with ${response.status}: ${JSON.stringify(payload)}`);
}

export function createSupabaseRelationshipFactsDataSource({
  supabaseUrl,
  serviceRoleKey,
  fetchImpl = fetch
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: FetchLike;
}): RelationshipFactsDataSource {
  const baseUrl = supabaseUrl.replace(/\/$/u, "");
  const headers = serviceHeaders(serviceRoleKey);

  async function singleRow<T>(table: string, params: URLSearchParams): Promise<T | null> {
    const response = await fetchImpl(`${baseUrl}/rest/v1/${table}?${params.toString()}`, { headers });
    const payload = await jsonPayload(response) as T[] | null;

    if (!response.ok) {
      throw fetchFailure(`Supabase ${table} lookup`, response, payload);
    }

    return payload?.[0] ?? null;
  }

  return {
    async canReadChartForReport(viewerUserId, subjectRef) {
      const response = await fetchImpl(`${baseUrl}/rest/v1/rpc/can_read_chart_for_report`, {
        method: "POST",
        headers,
        body: JSON.stringify({ viewer: viewerUserId, subject_ref: subjectRef })
      });
      const payload = await jsonPayload(response);

      if (!response.ok) {
        throw fetchFailure("Supabase relationship report consent check", response, payload);
      }

      return payload === true;
    },

    loadFriendship(friendshipId) {
      return singleRow<FriendshipRow>("social_friendships", new URLSearchParams({
        id: `eq.${friendshipId}`,
        select: "id,user_low_id,user_high_id",
        limit: "1"
      }));
    },

    loadManualChart(manualChartId) {
      return singleRow<ManualChartRow>("manual_charts", new URLSearchParams({
        id: `eq.${manualChartId}`,
        select: "id,owner_user_id,claimed_by_user_id,display_name,birth_date,birth_time,birth_time_unknown,birth_place,birth_latitude,birth_longitude,birth_timezone",
        limit: "1"
      }));
    },

    loadUserProfile(userId) {
      return singleRow<UserProfileRow>("user_profiles", new URLSearchParams({
        user_id: `eq.${userId}`,
        select: "user_id,data",
        limit: "1"
      }));
    }
  };
}

export function createTldrAstroRelationshipClient({
  baseUrl = process.env.TLDRASTRO_API_URL || process.env.VITE_TLDRASTRO_API_URL || DEFAULT_TLDRASTRO_API_URL,
  fetchImpl = fetch
}: {
  baseUrl?: string;
  fetchImpl?: FetchLike;
} = {}): RelationshipAstroClient {
  const normalizedBaseUrl = baseUrl.replace(/\/$/u, "");

  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(`${normalizedBaseUrl}${path}`, body === undefined ? undefined : {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await jsonPayload(response);

    if (!response.ok) {
      throw fetchFailure("TLDR Astro API request", response, payload);
    }

    return payload as T;
  }

  const relationshipBody = (personA: RelationshipChartSubject, personB: RelationshipChartSubject) => ({
    personA,
    personB,
    settings: chartSettings(),
    includeContentFacts: false
  });

  return {
    async serviceVersion() {
      const status = await request<{ version?: unknown }>("/meta/status");

      if (typeof status.version !== "string" || !status.version.trim()) {
        throw new Error("TLDR Astro API status did not include a service version.");
      }

      return status.version;
    },

    natal(subject) {
      return request<ApiNatalResponse>("/chart/natal", { subject, includeContentFacts: false });
    },

    synastry(personA, personB) {
      return request<ApiSynastryResponse>("/relationship/synastry", relationshipBody(personA, personB));
    },

    composite(personA, personB) {
      return request<ApiCompositeResponse>("/relationship/composite", relationshipBody(personA, personB));
    }
  };
}
