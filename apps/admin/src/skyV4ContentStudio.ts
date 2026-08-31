export type SkyV4EditableField = {
  path: string;
  label: string;
};

export type SkyV4DraftVersion = {
  versionId: string;
  status: "draft" | "editorial-reviewed" | "owner-approved" | "serving" | "superseded";
  createdAt: string;
  editor: string;
  readerFields: Record<string, unknown>;
  sourceBaselineSha256: string;
  changedFields: string[];
  validation: SkyV4ValidationResult;
};

export type SkyV4ValidationResult = {
  hardFailures: string[];
  warnings: string[];
  passed: boolean;
};

export type SkyV4VersionedRecord = {
  contentKey: string;
  contentType: string;
  editableFields: SkyV4EditableField[];
  readOnlyFields: string[];
  sourceBaseline: Record<string, unknown>;
  sourceBaselineSha256: string;
  servingVersionId: string | null;
  versions: SkyV4DraftVersion[];
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function valueAt(source: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((current, part) => record(current)[part], source);
}

function setValueAt(source: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const next = structuredClone(source);
  const parts = path.split(".");
  let cursor = next;
  parts.slice(0, -1).forEach((part) => {
    cursor[part] = { ...record(cursor[part]) };
    cursor = cursor[part] as Record<string, unknown>;
  });
  cursor[parts.at(-1) ?? path] = value;
  return next;
}

export function validateSkyV4TransitPov(
  contentType: string,
  readerFields: Record<string, unknown>
): SkyV4ValidationResult {
  const copy = Object.values(readerFields).filter((value) => typeof value === "string").join("\n\n");
  const hardFailures: string[] = [];
  if (/\byou have (?:a|an) (?:gift|talent|natural ability|instinct)\b/iu.test(copy)) {
    hardFailures.push("STP-02: natal-trait framing is not allowed on a sky surface.");
  }
  if (/\b(?:sun|moon|mercury|venus|mars|jupiter|saturn|uranus|neptune|pluto|chiron|lilith|north node|south node) in [a-z-]+ (?:people|person|native|individuals)\b/iu.test(copy)) {
    hardFailures.push("STP-01: planet-in-sign identity language must be rewritten as a current transit.");
  }
  if (/\bright now,? you are\b/iu.test(copy)) {
    hardFailures.push("STP-10: a time adverb cannot convert a trait sentence into current-sky prose.");
  }
  if (contentType === "continuous-placement" && !/(?:\benters?\b|\breaches?\b|\bmoves? (?:through|into)\b|\btransit(?:s|ing)? through\b|\bduring this transit\b|\bseason\b|\bcurrent cycle\b|\b(?:while|during|when|with)\b[^.!?]{0,80}\b(?:in|through|reaches?)\b)/iu.test(copy)) {
    hardFailures.push("STP-03: continuous placement copy needs an explicit current-sky or time anchor.");
  }
  return { hardFailures, warnings: [], passed: hardFailures.length === 0 };
}

export function skyV4StudioDefinition(packageRecord: unknown) {
  const source = record(packageRecord);
  const fields = Array.isArray(source.studio_editable_fields)
    ? source.studio_editable_fields
      .map((field) => record(field))
      .filter((field) => typeof field.path === "string" && typeof field.label === "string")
      .map((field) => ({ path: String(field.path), label: String(field.label) }))
    : [];
  const readOnlyFields = Array.isArray(source.studio_read_only_fields)
    ? source.studio_read_only_fields.map(String)
    : [];
  return {
    contentType: String(source.studio_content_type ?? ""),
    editableFields: fields,
    readOnlyFields,
    sourceBaseline: record(source.studio_source_baseline),
    sourceBaselineSha256: String(source.source_baseline_sha256 ?? ""),
    sourceUrls: Array.isArray(source.studio_source_urls) ? source.studio_source_urls.map(String) : [],
    ownerPhraseAnchors: Array.isArray(source.studio_owner_phrase_anchors)
      ? source.studio_owner_phrase_anchors.map(String)
      : []
  };
}

export function skyV4EditableReaderFields(packageRecord: unknown) {
  const source = record(packageRecord);
  const definition = skyV4StudioDefinition(source);
  return Object.fromEntries(definition.editableFields.map((field) => [field.path, valueAt(source, field.path)]));
}

export function applySkyV4ReaderFieldDraft(packageRecord: unknown, draftFields: Record<string, unknown>) {
  const source = record(packageRecord);
  const definition = skyV4StudioDefinition(source);
  const allowed = new Set(definition.editableFields.map((field) => field.path));
  const unexpected = Object.keys(draftFields).filter((path) => !allowed.has(path));
  if (unexpected.length) {
    throw new Error(`SKY_V4_STRUCTURE_LOCK: ${unexpected.join(", ")}`);
  }

  return Object.entries(draftFields).reduce(
    (current, [path, value]) => setValueAt(current, path, value),
    structuredClone(source)
  );
}

export function createSkyV4DraftVersion(
  versioned: SkyV4VersionedRecord,
  draftFields: Record<string, unknown>,
  { versionId, createdAt, editor }: { versionId: string; createdAt: string; editor: string }
): SkyV4VersionedRecord {
  const allowed = new Set(versioned.editableFields.map((field) => field.path));
  const unexpected = Object.keys(draftFields).filter((path) => !allowed.has(path));
  if (unexpected.length) throw new Error(`SKY_V4_STRUCTURE_LOCK: ${unexpected.join(", ")}`);

  const baselineFields = Object.fromEntries(versioned.editableFields.map((field) => [
    field.path,
    valueAt(versioned.sourceBaseline, field.path)
  ]));
  const changedFields = Object.keys(draftFields).filter((path) => (
    JSON.stringify(draftFields[path]) !== JSON.stringify(baselineFields[path])
  ));
  const draft: SkyV4DraftVersion = {
    versionId,
    status: "draft",
    createdAt,
    editor,
    readerFields: structuredClone(draftFields),
    sourceBaselineSha256: versioned.sourceBaselineSha256,
    changedFields,
    validation: validateSkyV4TransitPov(versioned.contentType, draftFields)
  };
  return { ...versioned, versions: [...versioned.versions, draft] };
}

export function transitionSkyV4Version(
  versioned: SkyV4VersionedRecord,
  versionId: string,
  status: SkyV4DraftVersion["status"]
): SkyV4VersionedRecord {
  const index = versioned.versions.findIndex((version) => version.versionId === versionId);
  if (index < 0) throw new Error(`SKY_V4_VERSION_GAP: ${versionId}`);
  const current = versioned.versions[index];
  if (current.status === "draft" && status === "editorial-reviewed" && !current.validation.passed) {
    throw new Error(`SKY_V4_POV_GATE: ${current.validation.hardFailures.join(" ")}`);
  }
  const allowed: Record<SkyV4DraftVersion["status"], SkyV4DraftVersion["status"][]> = {
    draft: ["editorial-reviewed"],
    "editorial-reviewed": ["owner-approved"],
    "owner-approved": ["serving"],
    serving: ["superseded"],
    superseded: []
  };
  if (!allowed[current.status].includes(status)) {
    throw new Error(`SKY_V4_STATUS_TRANSITION: ${current.status} -> ${status}`);
  }
  const versions = versioned.versions.map((version, versionIndex) => (
    versionIndex === index ? { ...version, status } : version
  ));
  return {
    ...versioned,
    versions,
    servingVersionId: status === "serving" ? versionId : versioned.servingVersionId
  };
}

export function rollbackSkyV4ServingVersion(versioned: SkyV4VersionedRecord, versionId: string) {
  const target = versioned.versions.find((version) => version.versionId === versionId);
  if (!target || !["owner-approved", "serving", "superseded"].includes(target.status)) {
    throw new Error("SKY_V4_ROLLBACK: target must be a previously owner-approved version.");
  }
  return { ...versioned, servingVersionId: versionId };
}
