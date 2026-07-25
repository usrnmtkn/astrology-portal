import packetLibrary from "./sky-aspect-exact-story-packets.json" with { type: "json" };
import approvalManifest from "./sky-aspect-story-packet-approvals.json" with { type: "json" };

const PLANET_ORDER = [
  "sun",
  "moon",
  "mercury",
  "venus",
  "mars",
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
];

const ASPECT_ALIASES = {
  conjunct: "conjunction",
  conjunction: "conjunction",
  sextile: "sextile",
  trine: "trine",
  square: "square",
  opposite: "opposition",
  opposition: "opposition",
};

const ASPECT_VERBS = {
  conjunction: "conjuncts",
  sextile: "sextiles",
  trine: "trines",
  square: "squares",
  opposition: "opposes",
};

const SENTENCE_ROLE_ORDER = [
  "humanMoment",
  "developmentDetail",
  "planetaryDynamic",
  "aspectMechanic",
  "conditionalConsequence",
];

const packetsById = new Map(
  packetLibrary.records.map((record) => [record.id, record]),
);

const approvalAppliesToLibrary =
  packetLibrary.version === approvalManifest.canonicalLibraryVersion;
const approvedSourceStatuses = new Set(
  approvalManifest.approvedSourceEditorialStatuses,
);

function effectiveEditorialStatus(record) {
  if (record.editorialStatus === "approved-user-locked") {
    return record.editorialStatus;
  }
  if (
    approvalAppliesToLibrary &&
    approvedSourceStatuses.has(record.editorialStatus)
  ) {
    return approvalManifest.effectiveEditorialStatus;
  }
  return record.editorialStatus;
}

function slug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function label(value) {
  return slug(value)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function canonicalizeFacts(input) {
  const planetA = slug(input.planetA);
  const planetB = slug(input.planetB);
  const aspect = ASPECT_ALIASES[slug(input.aspect)];
  const indexA = PLANET_ORDER.indexOf(planetA);
  const indexB = PLANET_ORDER.indexOf(planetB);

  if (indexA < 0 || indexB < 0 || planetA === planetB || !aspect) {
    throw new SkyAspectStoryPacketSourceGapError(
      `SOURCE_GAP: invalid sky aspect facts ${planetA}/${aspect ?? input.aspect}/${planetB}`,
    );
  }

  if (indexA < indexB) {
    return {
      planetA,
      planetB,
      aspect,
      signA: input.signA ? slug(input.signA) : undefined,
      signB: input.signB ? slug(input.signB) : undefined,
      reversedInput: false,
    };
  }

  return {
    planetA: planetB,
    planetB: planetA,
    aspect,
    signA: input.signB ? slug(input.signB) : undefined,
    signB: input.signA ? slug(input.signA) : undefined,
    reversedInput: true,
  };
}

function fillCollectiveLead(template, facts) {
  const slots = {
    planetALabel: label(facts.planetA),
    planetBLabel: label(facts.planetB),
    signA: label(facts.signA),
    signB: label(facts.signB),
    aspectVerb: ASPECT_VERBS[facts.aspect],
  };

  return Object.entries(slots).reduce(
    (copy, [key, value]) => copy.replaceAll(`{{${key}}}`, value),
    template,
  );
}

function calculatedFactLead(facts) {
  return `Right now, ${label(facts.planetA)} in ${label(facts.signA)} ${ASPECT_VERBS[facts.aspect]} ${label(facts.planetB)} in ${label(facts.signB)}.`;
}

function resolvePlanetaryDynamic(record, substitution, audience) {
  const text = String(substitution?.text ?? "").trim();
  const isReviewed = substitution?.reviewed === true;
  const mayPreviewDraft = audience === "admin" && substitution?.previewOnly === true;

  if (!text || (!isReviewed && !mayPreviewDraft)) {
    return {
      text: record.sentenceRoles.planetaryDynamic,
      source: "packet-base",
      sourceKey: `${record.id}#sentenceRoles.planetaryDynamic`,
    };
  }

  return {
    text,
    source: mayPreviewDraft ? "admin-preview-only" : "reviewed-sign-substitution",
    sourceKey: substitution.sourceKey ?? "admin-preview",
  };
}

function assertReaderBody(body) {
  if (
    !body ||
    /\{\{[^}]+\}\}/.test(body) ||
    /\b(?:editorialStatus|sourceKey|fallbackLevel|approved-user-locked|review-ready)\b/.test(
      body,
    )
  ) {
    throw new SkyAspectStoryPacketSourceGapError(
      "SOURCE_GAP: invalid reader-facing sky aspect packet",
    );
  }
}

export class SkyAspectStoryPacketSourceGapError extends Error {
  constructor(message) {
    super(message);
    this.name = "SkyAspectStoryPacketSourceGapError";
  }
}

export function getSkyAspectStoryPacketLibrary() {
  return packetLibrary;
}

export function getSkyAspectStoryPacketRecords() {
  return packetLibrary.records.map((record) => ({
    ...record,
    sourceEditorialStatus: record.editorialStatus,
    editorialStatus: effectiveEditorialStatus(record),
  }));
}

export function resolveSkyAspectStoryPacket(input) {
  const audience = input.audience ?? "reader";
  const facts = canonicalizeFacts(input);
  const packetId = `sky.${facts.planetA}.${facts.aspect}.${facts.planetB}`;
  const record = packetsById.get(packetId);

  if (!record) {
    throw new SkyAspectStoryPacketSourceGapError(
      `SOURCE_GAP: exact sky aspect packet ${packetId}`,
    );
  }

  const editorialStatus = effectiveEditorialStatus(record);
  if (
    audience === "reader" &&
    editorialStatus !== "approved-user-locked" &&
    editorialStatus !== "approved-user"
  ) {
    throw new SkyAspectStoryPacketSourceGapError(
      `SOURCE_GAP: exact sky aspect packet ${packetId} is not reader-approved`,
    );
  }

  const dynamic = resolvePlanetaryDynamic(
    record,
    input.signSpecificPlanetaryDynamic,
    audience,
  );
  const roles = {
    ...record.sentenceRoles,
    planetaryDynamic: dynamic.text,
  };
  const hasSigns = Boolean(facts.signA && facts.signB);
  const includeCalculatedFact = input.includeCalculatedFact !== false;
  const mayUseCollectiveLead =
    input.surface !== "personalized" &&
    includeCalculatedFact &&
    hasSigns &&
    record.collectiveLeadEligible === true &&
    typeof record.optionalCollectiveFactLead === "string";

  let body;
  let collectiveLeadUsed = false;
  if (mayUseCollectiveLead) {
    collectiveLeadUsed = true;
    body = [
      fillCollectiveLead(record.optionalCollectiveFactLead, facts),
      roles.developmentDetail,
      roles.planetaryDynamic,
      roles.aspectMechanic,
      roles.conditionalConsequence,
    ].join(" ");
  } else {
    const packetBody = SENTENCE_ROLE_ORDER.map((role) => roles[role]).join(" ");
    body =
      includeCalculatedFact && hasSigns
        ? `${calculatedFactLead(facts)} ${packetBody}`
        : packetBody;
  }

  assertReaderBody(body);

  return {
    headline: record.title,
    body,
    packetId,
    editorialStatus,
    sourceEditorialStatus: record.editorialStatus,
    facts: {
      planetA: facts.planetA,
      planetB: facts.planetB,
      aspect: facts.aspect,
      signA: facts.signA,
      signB: facts.signB,
      reversedInput: facts.reversedInput,
    },
    sentenceRoles: roles,
    provenance: {
      resolver: "sky-aspect-exact-story-packets-v10.1",
      packetId,
      selectionKey: `${facts.planetA}|${facts.aspect}|${facts.planetB}`,
      fallbackLevel: "exact-aspect-story-packet",
      collectiveLeadUsed,
      planetaryDynamicSource: dynamic.source,
      planetaryDynamicSourceKey: dynamic.sourceKey,
    },
  };
}

export function readerSkyAspectStoryBody(input) {
  return resolveSkyAspectStoryPacket({ ...input, audience: "reader" }).body;
}
