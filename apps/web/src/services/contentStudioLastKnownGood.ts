import { isFallbackDashboardRecordAllowed } from "../content/fallbackArchitectureV3/dashboardExtensions";
import {
  loadFallbackArchitectureV3BundledCoreManifest,
  type AuthoredCard,
  type FallbackArchitectureV3Bundle,
  type HookRow,
  type TemplateRow,
  type VocabRow
} from "../content/fallbackArchitectureV3Runtime";
import { fallbackArchitectureV3DashboardPackageDestination } from "./fallbackArchitectureV3DashboardPackaging";

export type ContentStudioLastKnownGoodRow = {
  id: string;
  content_key: string;
  surface: string;
  mode: string;
  status?: string | null;
  lane?: string | null;
  review_state?: string | null;
  event_type: string | null;
  target_date: string | null;
  facts?: Record<string, unknown> | null;
  source_snapshot?: Record<string, unknown> | null;
  headline: string | null;
  summary: string | null;
  body: string;
  sections: unknown;
  block_type?: string | null;
  flags?: string[] | null;
  provider?: string | null;
  judge_score?: number | null;
  judge_gate?: string | null;
  model: string | null;
  updated_at: string;
};

type ContentStudioLastKnownGoodSnapshot = {
  schema: "content-studio-last-known-good-v1";
  sourceRevision: string;
  rowCount: number;
  rows: ContentStudioLastKnownGoodRow[];
};

const coreProvider = "tldrastro-fallback-architecture-v3";
const approvedReviews = new Set(["approved", "approved_reuse", "reviewed"]);
let snapshotPromise: Promise<ContentStudioLastKnownGoodSnapshot | null> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function stringArrayFrom(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function packageRecord(row: ContentStudioLastKnownGoodRow) {
  const sections = isRecord(row.sections) ? row.sections : {};
  return isRecord(sections.packageRecord) ? sections.packageRecord : {};
}

function packageRole(row: ContentStudioLastKnownGoodRow) {
  const source = isRecord(row.source_snapshot) ? row.source_snapshot : {};
  const facts = isRecord(row.facts) ? row.facts : {};
  const record = packageRecord(row);
  const role = source.content_role ?? source.contentRole ?? facts.content_role ?? facts.contentRole ?? record.content_role ?? record.contentRole;
  const review = source.review_status ?? source.reviewStatus ?? facts.review_status ?? facts.reviewStatus ?? record.review_status ?? record.reviewStatus;
  return {
    role: typeof role === "string" ? role : "",
    reviewStatus: typeof review === "string" ? review : ""
  };
}

function contentType(row: ContentStudioLastKnownGoodRow) {
  const source = isRecord(row.source_snapshot) ? row.source_snapshot : {};
  const facts = isRecord(row.facts) ? row.facts : {};
  return stringFrom(source.contentType, source.content_type, facts.contentType, facts.content_type);
}

function isSkyPlacementPartitionKey(contentKey: string) {
  return contentKey.startsWith("fallback-hook/sky-sign-copy/")
    || (contentKey.startsWith("fallback-hook/sky-placement-") && !contentKey.startsWith("fallback-hook/sky-placement-sign/"));
}

function isApprovedCoreRow(row: ContentStudioLastKnownGoodRow) {
  const { role, reviewStatus } = packageRole(row);
  return row.provider === coreProvider
    && (approvedReviews.has(reviewStatus) || (role === "template" && !reviewStatus));
}

function authoredCard(row: ContentStudioLastKnownGoodRow): AuthoredCard | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = packageRole(row);
  const body = stringFrom(row.body, record.body);
  const bodyYou = stringFrom(record.body_you);
  const bodyThey = stringFrom(record.body_they);
  if (!body && !bodyYou && !bodyThey) return null;
  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "full_copy",
    ...(body ? { body } : {}),
    ...(bodyYou ? { body_you: bodyYou } : {}),
    ...(bodyThey ? { body_they: bodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function hookRow(row: ContentStudioLastKnownGoodRow): HookRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = packageRole(row);
  const body = stringFrom(record.body);
  const bodyYou = stringFrom(record.body_you);
  const bodyThey = stringFrom(record.body_they);
  if (!body && !bodyYou && !bodyThey) return null;
  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "fallback_hook",
    ...(body ? { body } : {}),
    ...(bodyYou ? { body_you: bodyYou } : {}),
    ...(bodyThey ? { body_they: bodyThey } : {}),
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function vocabRow(row: ContentStudioLastKnownGoodRow): VocabRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = packageRole(row);
  const body = stringFrom(record.body);
  if (!body) return null;
  const grammarFrame = stringFrom(record.grammar_frame);
  return {
    ...record,
    contentKey: row.content_key,
    content_role: role || stringFrom(record.content_role) || "vocabulary",
    ...(grammarFrame ? { grammar_frame: grammarFrame } : {}),
    body,
    review_status: reviewStatus || stringFrom(record.review_status) || "approved"
  };
}

function templateRow(row: ContentStudioLastKnownGoodRow): TemplateRow | null {
  const record = packageRecord(row);
  const { role, reviewStatus } = packageRole(row);
  const body = stringFrom(record.body);
  if (!body) return null;
  return {
    ...record,
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

async function loadSnapshot() {
  if (snapshotPromise) return snapshotPromise;
  snapshotPromise = (async () => {
    try {
      const response = await fetch("/content-studio-last-known-good.json", { cache: "no-cache" });
      if (!response.ok) return null;
      const snapshot = await response.json() as ContentStudioLastKnownGoodSnapshot;
      if (
        snapshot?.schema !== "content-studio-last-known-good-v1"
        || !Array.isArray(snapshot.rows)
        || snapshot.rowCount !== snapshot.rows.length
      ) return null;
      return snapshot;
    } catch {
      return null;
    }
  })();
  return snapshotPromise;
}

export async function loadContentStudioLastKnownGoodRows() {
  return (await loadSnapshot())?.rows ?? [];
}

export async function loadContentStudioLastKnownGoodCoreBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  const rows = (await loadContentStudioLastKnownGoodRows()).filter((row) => isApprovedCoreRow(row) && !isSkyPlacementPartitionKey(row.content_key));
  if (!rows.length) return null;

  const manifest = await loadFallbackArchitectureV3BundledCoreManifest();
  const allowedKeys = new Set(manifest.keys.map((key) => {
    const separatorIndex = key.indexOf(":");
    return separatorIndex >= 0 ? key.slice(separatorIndex + 1) : key;
  }));
  const eligibleRows = rows.filter((row) => {
    const extensionRecord = { ...packageRecord(row), contentKey: row.content_key };
    if (allowedKeys.has(row.content_key)) return true;
    if (!isFallbackDashboardRecordAllowed(extensionRecord, allowedKeys)) return false;
    allowedKeys.add(row.content_key);
    return true;
  });

  const authoredCards: AuthoredCard[] = [];
  const hookRows: HookRow[] = [];
  const vocabularyRows: VocabRow[] = [];
  const templates: TemplateRow[] = [];
  for (const row of eligibleRows) {
    const { role } = packageRole(row);
    const destination = fallbackArchitectureV3DashboardPackageDestination({
      contentKey: row.content_key,
      contentType: contentType(row),
      role
    });
    if (destination === "authored") {
      const value = authoredCard(row);
      if (value) authoredCards.push(value);
    } else if (destination === "hook") {
      const value = hookRow(row);
      if (value) hookRows.push(value);
    } else if (destination === "vocabulary") {
      const value = vocabRow(row);
      if (value) vocabularyRows.push(value);
    } else if (destination === "template") {
      const value = templateRow(row);
      if (value) templates.push(value);
    }
  }
  if (!authoredCards.length && !hookRows.length && !vocabularyRows.length && !templates.length) return null;
  return { transitLib: { authoredCards }, rowsFile: { hookRows, vocabularyRows }, templatesFile: { templates } };
}

export async function loadContentStudioLastKnownGoodCompatibilityBundle(): Promise<FallbackArchitectureV3Bundle | null> {
  const authoredCards: AuthoredCard[] = [];
  for (const row of await loadContentStudioLastKnownGoodRows()) {
    if (!row.content_key.startsWith("authored/compat-pair/")) continue;
    const { reviewStatus } = packageRole(row);
    if (!approvedReviews.has(reviewStatus)) continue;
    const value = authoredCard(row);
    if (value) authoredCards.push(value);
  }
  if (!authoredCards.length) return null;
  return { transitLib: { authoredCards }, rowsFile: { hookRows: [], vocabularyRows: [] }, templatesFile: { templates: [] } };
}
