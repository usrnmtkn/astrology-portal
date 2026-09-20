import type { GeneratedContentRow } from "./generatedContent.js";
import type { AuthoredCard, HookRow, VocabRow, TemplateRow, FallbackArchitectureV3Bundle, FallbackArchitectureV3PackageManifest } from "../content/fallbackArchitectureV3Runtime.js";
import { publicationAllowsContent } from "../content/contentPublicationState.js";
import { generatedRowPackageRole } from "../content/generatedContentEligibility.js";
import { isCanonicalSkyReaderRecord, isFallbackDashboardRecordAllowed } from "../content/fallbackArchitectureV3/dashboardExtensions.js";
import { selectLatestLiveServingDashboardRows } from "./fallbackArchitectureV3DashboardOverlay.js";
import { fallbackArchitectureV3DashboardPackageDestination } from "./fallbackArchitectureV3DashboardPackaging.js";
const fallbackArchitectureV3Provider = "tldrastro-fallback-architecture-v3";
const fallbackArchitectureV3ApprovedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function rowSourceSnapshot(row: Pick<GeneratedContentRow, "source_snapshot">) {
  return isRecord(row.source_snapshot) ? row.source_snapshot : {};
}

function rowFacts(row: Pick<GeneratedContentRow, "facts">) {
  return isRecord(row.facts) ? row.facts : {};
}

function rowSections(row: Pick<GeneratedContentRow, "sections">) {
  return isRecord(row.sections) ? row.sections : {};
}

function packageRecord(row: Pick<GeneratedContentRow, "sections">) {
  const sections = rowSections(row);
  return isRecord(sections.packageRecord) ? sections.packageRecord : {};
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function stringArrayFrom(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function fallbackSystemBucket(row: GeneratedContentRow) {
  const sourceSnapshot = rowSourceSnapshot(row);
  const facts = rowFacts(row);
  const contentType = stringFrom(
    sourceSnapshot.contentType,
    sourceSnapshot.content_type,
    facts.contentType,
    facts.content_type
  );
  const { role } = generatedRowPackageRole(row);

  return { contentType, role };
}

function isApprovedFallbackArchitectureV3Row(
  row: GeneratedContentRow,
  provider = fallbackArchitectureV3Provider
) {
  const { role, reviewStatus } = generatedRowPackageRole(row);

  return Boolean(
    row.provider === provider
      && (
        fallbackArchitectureV3ApprovedReviews.has(reviewStatus)
        || (role === "template" && !reviewStatus)
      )
  );
}

function isSkyPlacementFallbackPartitionKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || contentKey.startsWith("fallback-hook/sky-placement-")
    || contentKey.startsWith("house-horoscope-core/")
    || contentKey.startsWith("fallback-hook/sky-planet-education/");
}

export function packageAuthoredCardFromRow(row: GeneratedContentRow): AuthoredCard | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const recordBody = stringFrom(row.body, record.body);
  const recordBodyYou = stringFrom(record.body_you);
  const recordBodyThey = stringFrom(record.body_they);

  const canonicalRevision = record.studio_content_type === "continuous-placement"
    && isCanonicalSkyReaderRecord({ ...record, contentKey: row.content_key })
    && record.studio_version_status === "approved-serving-revision";
  if (!recordBody && !recordBodyYou && !recordBodyThey && !canonicalRevision) {
    return null;
  }

  return {
    ...record,
    publicationRowId: row.id,
    publicationRowUpdatedAt: row.updated_at,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "full_copy",
    ...(recordBody ? { body: recordBody } : {}),
    ...(recordBodyYou ? { body_you: recordBodyYou } : {}),
    ...(recordBodyThey ? { body_they: recordBodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

export function packageHookRowFromRow(row: GeneratedContentRow): HookRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const recordBody = stringFrom(record.body);
  const recordBodyYou = stringFrom(record.body_you);
  const recordBodyThey = stringFrom(record.body_they);

  // An explicitly empty canonical revision carries the current publication
  // identity. Dropping it would make the bundled article eligible again.
  const canonicalRevision = record.studio_content_type === "continuous-placement"
    && isCanonicalSkyReaderRecord({ ...record, contentKey: row.content_key })
    && record.studio_version_status === "approved-serving-revision";
  const ingressRevision = record.studio_version_status === "approved-serving-revision"
    && isRecord(record.ingress) && record.ingress.enabled === true;
  if (!recordBody && !recordBodyYou && !recordBodyThey && !canonicalRevision && !ingressRevision) {
    return null;
  }

  return {
    ...record,
    publicationRowId: row.id,
    publicationRowUpdatedAt: row.updated_at,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "fallback_hook",
    ...(recordBody ? { body: recordBody } : {}),
    ...(recordBodyYou ? { body_you: recordBodyYou } : {}),
    ...(recordBodyThey ? { body_they: recordBodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

export function packageVocabRowFromRow(row: GeneratedContentRow): VocabRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const body = stringFrom(record.body);
  const grammarFrame = stringFrom(record.grammar_frame);

  if (!body) {
    return null;
  }

  return {
    ...record,
    publicationRowId: row.id,
    publicationRowUpdatedAt: row.updated_at,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "vocabulary",
    ...(grammarFrame ? { grammar_frame: grammarFrame } : {}),
    body,
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

export function packageTemplateRowFromRow(row: GeneratedContentRow): TemplateRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const body = stringFrom(record.body);

  if (!body) {
    return null;
  }

  return {
    ...record,
    publicationRowId: row.id,
    publicationRowUpdatedAt: row.updated_at,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "template",
    body,
    ...(stringFrom(record.body_you) ? { body_you: stringFrom(record.body_you) } : {}),
    ...(stringFrom(record.body_they) ? { body_they: stringFrom(record.body_they) } : {}),
    ...(stringArrayFrom(record.requiredSlots).length ? { requiredSlots: stringArrayFrom(record.requiredSlots) } : {}),
    ...(stringArrayFrom(record.optionalSlots).length ? { optionalSlots: stringArrayFrom(record.optionalSlots) } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved_reuse"
  };
}

export function packageFallbackArchitectureV3CoreRows(
  rows: GeneratedContentRow[],
  currentCoreManifest: FallbackArchitectureV3PackageManifest,
  allowsPublication: typeof publicationAllowsContent = publicationAllowsContent,
  options: { includeSkyPlacement?: boolean } = {}
): FallbackArchitectureV3Bundle | null {
  rows = rows.filter((row) => allowsPublication(row.content_key, row.id, row.updated_at, row.target_date));
  const currentCoreKeys = new Set(currentCoreManifest.keys.map((manifestKey) => {
    const separatorIndex = manifestKey.indexOf(":");
    return separatorIndex >= 0 ? manifestKey.slice(separatorIndex + 1) : manifestKey;
  }));
  for (const row of rows) {
    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };
    if (isFallbackDashboardRecordAllowed(extensionRecord, currentCoreKeys)) currentCoreKeys.add(row.content_key);
  }
  const overlayRows = selectLatestLiveServingDashboardRows(
    rows,
    currentCoreKeys,
    (row) => isApprovedFallbackArchitectureV3Row(row),
    (row) => !options.includeSkyPlacement && isSkyPlacementFallbackPartitionKey(row.content_key)
  );
  const authoredCards: AuthoredCard[] = [];
  const hookRows: HookRow[] = [];
  const vocabularyRows: VocabRow[] = [];
  const templates: TemplateRow[] = [];
  for (const row of overlayRows) {
    const { contentType, role } = fallbackSystemBucket(row);
    const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, contentType, role });
    if (destination === "authored") {
      const value = packageAuthoredCardFromRow(row);
      if (value) authoredCards.push(value);
    } else if (destination === "hook") {
      const value = packageHookRowFromRow(row);
      if (value) hookRows.push(value);
    } else if (destination === "vocabulary") {
      const value = packageVocabRowFromRow(row);
      if (value) vocabularyRows.push(value);
    } else if (destination === "template") {
      const value = packageTemplateRowFromRow(row);
      if (value) templates.push(value);
    }
  }
  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;
  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };
}
