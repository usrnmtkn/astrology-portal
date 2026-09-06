export const SKY_CONTINUOUS_FALLBACK_VARIANT_FAMILY_SCHEMA = "sky-continuous-fallback-variant-family/v1";
export const SKY_CONTINUOUS_FALLBACK_SELECTION_POLICY = "event-locked-v1";

const SECTION_KEYS = Object.freeze(["hooks", "developments", "shadows", "closes"]);

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function normalizedVariant(value, fallbackId) {
  if (typeof value === "string") {
    return { id: fallbackId, text: value.trim() };
  }
  const source = record(value);
  return {
    id: text(source.id) || fallbackId,
    text: text(source.text)
  };
}

function normalizedSection(value, prefix) {
  return list(value)
    .map((variant, index) => normalizedVariant(variant, `${prefix}-${index + 1}`))
    .filter((variant) => variant.text);
}

function normalizedLane(value, index) {
  const source = record(value);
  const id = text(source.id) || `lane-${index + 1}`;
  return {
    id,
    label: text(source.label) || id,
    hooks: normalizedSection(source.hooks, `${id}-hook`),
    developments: normalizedSection(source.developments, `${id}-development`),
    shadows: normalizedSection(source.shadows, `${id}-shadow`),
    closes: normalizedSection(source.closes, `${id}-close`)
  };
}

export function normalizeSkyContinuousFallbackVariantFamily(value, { contentKey = "" } = {}) {
  const source = record(value);
  const familyContentKey = text(source.contentKey) || text(contentKey);
  return {
    schema: SKY_CONTINUOUS_FALLBACK_VARIANT_FAMILY_SCHEMA,
    contentKey: familyContentKey,
    familyVersion: text(source.familyVersion) || "draft-v1",
    selectionPolicy: SKY_CONTINUOUS_FALLBACK_SELECTION_POLICY,
    ownerApproved: source.ownerApproved === true,
    servingEnabled: source.servingEnabled === true,
    lanes: list(source.lanes).map(normalizedLane)
  };
}

export function skyContinuousFallbackVariantFamilyStatus(value, options = {}) {
  const family = normalizeSkyContinuousFallbackVariantFamily(value, options);
  const completeLanes = family.lanes.filter((lane) => SECTION_KEYS.every((key) => lane[key].length > 0));
  const missingByLane = family.lanes.map((lane) => ({
    laneId: lane.id,
    missing: SECTION_KEYS.filter((key) => lane[key].length === 0)
  })).filter((entry) => entry.missing.length > 0);
  return {
    family,
    completeLaneCount: completeLanes.length,
    totalLaneCount: family.lanes.length,
    missingByLane,
    readyForPreview: completeLanes.length > 0
  };
}

function pick(items, seed) {
  if (!items.length) return null;
  return items[stableHash(seed) % items.length];
}

function assertUniqueIds(items, label) {
  const ids = items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`SKY_FALLBACK_VARIANT_STRUCTURE: duplicate ${label} IDs.`);
  }
}

export function selectSkyContinuousFallbackVariant(value, {
  contentKey = "",
  eventInstanceId = ""
} = {}) {
  const status = skyContinuousFallbackVariantFamilyStatus(value, { contentKey });
  const family = status.family;
  const eventKey = text(eventInstanceId);
  const resolvedContentKey = text(contentKey) || family.contentKey;

  if (!resolvedContentKey) throw new Error("SKY_FALLBACK_VARIANT_STRUCTURE: contentKey is required.");
  if (!eventKey) throw new Error("SKY_FALLBACK_VARIANT_EVENT_REQUIRED: eventInstanceId is required.");
  if (family.contentKey && family.contentKey !== resolvedContentKey) {
    throw new Error(`SKY_FALLBACK_VARIANT_STRUCTURE: family contentKey ${family.contentKey} does not match ${resolvedContentKey}.`);
  }

  assertUniqueIds(family.lanes, "lane");
  for (const lane of family.lanes) {
    for (const section of SECTION_KEYS) assertUniqueIds(lane[section], `${lane.id}.${section}`);
  }

  const completeLanes = family.lanes.filter((lane) => SECTION_KEYS.every((key) => lane[key].length > 0));
  if (!completeLanes.length) {
    throw new Error("SKY_FALLBACK_VARIANT_SOURCE_GAP: no complete fallback lane is available.");
  }

  const selectionLockKey = `${family.familyVersion}|${resolvedContentKey}|${eventKey}`;
  const lane = pick(completeLanes, `${selectionLockKey}|lane`);
  const hook = pick(lane.hooks, `${selectionLockKey}|${lane.id}|hook`);
  const development = pick(lane.developments, `${selectionLockKey}|${lane.id}|development`);
  const shadow = pick(lane.shadows, `${selectionLockKey}|${lane.id}|shadow`);
  const close = pick(lane.closes, `${selectionLockKey}|${lane.id}|close`);

  return {
    schema: family.schema,
    selectionPolicy: family.selectionPolicy,
    contentKey: resolvedContentKey,
    familyVersion: family.familyVersion,
    eventInstanceId: eventKey,
    selectionLockKey,
    laneId: lane.id,
    laneLabel: lane.label,
    hookId: hook.id,
    developmentId: development.id,
    shadowId: shadow.id,
    closeId: close.id,
    sections: {
      hook: hook.text,
      development: development.text,
      shadow: shadow.text,
      close: close.text
    },
    body: [hook.text, development.text, shadow.text, close.text].join("\n\n")
  };
}

export function renderSkyContinuousFallbackVariant(value, options = {}) {
  return selectSkyContinuousFallbackVariant(value, options);
}
