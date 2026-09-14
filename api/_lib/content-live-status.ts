import { ZODIAC_SEASON_SOURCE_STARTERS, isZodiacSeasonSourceKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/zodiacSeasonVariables.mjs";
import { isRetiredCompositionKey } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/retiredCompositions.mjs";
import { skyPlacementSourceRecords } from "./sky-placement-sources.js";
import { createDomainRegistry } from "../../apps/web/src/content/domainRegistry.js";
import { resolveCalendarAspectPublication } from "../../apps/web/src/features/calendar/calendarAspectPublication.js";
import { contentStudioExactRow } from "../../apps/web/src/services/skyAspectContent.js";
// @ts-ignore Generated reader artifact has no declarations.
import { createPackageManifest } from "../../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { isFallbackDashboardRecordAllowed } from "../../apps/web/src/content/fallbackArchitectureV3/dashboardExtensions.js";
import { selectLatestLiveServingDashboardRows } from "../../apps/web/src/services/fallbackArchitectureV3DashboardOverlay.js";
import { contentWiringStatus } from "../../apps/admin/src/contentWiringStatus.js";
import { isGovernedReaderEligible } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.browser.js";
import { fallbackArchitectureV3DashboardPackageDestination } from "../../apps/web/src/services/fallbackArchitectureV3DashboardPackaging.js";
import { isReaderServableGeneratedContentRow, isGeneratedContentReaderBoundaryAllowed, generatedRowPackageRole } from "../../apps/web/src/content/generatedContentEligibility.js";
import { hasExactSkyArticleOwnerApproval, skyArticleEditionRecord } from "../../apps/web/src/content/skyArticleTemplateCompiler.js";
import { currentSkySummaryWording, skyDailySummaryFields, skySummaryTemplateErrors } from "../../apps/web/src/content/skyDailySummaryCatalog.js";

// These are the same defaults consumed by the Daily Sky reader, not CMS drafts.
export const builtinContentRecords = new Map(skyDailySummaryFields.map(field => [field.key, {
  id: `builtin:${field.key}`, content_key: field.key, body: field.body, headline: field.label, readerEnabled: field.readerEnabled
}]));

const require = createRequire(import.meta.url);
const readerPartitions = [
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-core-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-deferred-core-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-shared-placement-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-relationship-hook-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-empty-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-relationship-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-authored-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-house-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-book-cards-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-eclipse-sections-v3.json"),
  require("../../apps/web/src/content/fallbackArchitectureV3/bundled-lunation-eclipse-house-layers-v3.json"),
];
export const servingPackageRecords = new Map<string, Record<string, any>>();
for (const partition of readerPartitions as Record<string, any>[]) {
  for (const bucket of ["authoredCards", "hookRows", "vocabularyRows", "templates"]) {
    for (const record of partition[bucket] ?? []) servingPackageRecords.set(record.contentKey, record);
  }
}
for (const record of ZODIAC_SEASON_SOURCE_STARTERS) servingPackageRecords.set(record.contentKey, record);
for (const [key, record] of skyPlacementSourceRecords) servingPackageRecords.set(key, record);
// Calendar and Sky share this approved exact-aspect registry, outside the V3 partitions.
const { approvedExactSkyAspectCopy } = createDomainRegistry(require("../../packages/astro-knowledge/dist/sky-runtime-web.json"));
function exactAspectStatus(row: LiveStatusRow, candidates: LiveStatusRow[]): ContentLiveStatus | null {
  const match = /^sky\.aspect\.([^.]+)\.([^.]+)\.([^.]+)$/.exec(row.content_key);
  if (!match) return null;
  const [, a, aspect, b] = match;
  const current = [...candidates].sort((x, y) => (y.updated_at ?? "").localeCompare(x.updated_at ?? ""))
    .find((candidate) => candidate.content_key === row.content_key && candidate.status === "LIVE"
      && candidate.lane === "serving" && !candidate.review_state && candidate.body?.trim()
      && isReaderServableGeneratedContentRow(candidate) && isGeneratedContentReaderBoundaryAllowed(candidate));
  const resolved = current ? contentStudioExactRow(new Map([[current.content_key, {
    body: current.body!, sourceSnapshot: current.source_snapshot ?? {}
  } as any]]), { a, b, aspect }) : null;
  const baseline = approvedExactSkyAspectCopy(a, aspect, b);
  const servingBody = resolved?.body ?? baseline?.body;
  const servingSummary = resolved ? current?.summary : baseline?.summary;
  const copy = row.sections?.packageDraft ?? row.sections?.packageRecord;
  const body = copy?.Body ?? copy?.body ?? row.body;
  const summary = copy?.Summary ?? copy?.summary ?? row.summary;
  const live = Boolean(servingBody && body?.trim() === servingBody.trim()
    && (summary ?? "").trim() === (servingSummary ?? "").trim());
  return { id: row.id, live, label: live ? "Live" : "Not live",
    source: live ? resolved ? "studio" : "package" : null,
    detail: live ? resolved ? "Readers can receive this saved exact-aspect copy." : "Readers can receive this exact copy from the installed Calendar and Sky registry."
      : servingBody ? "Readers receive a different version of this exact aspect. This revision is not live." : "No approved reader copy exists for this exact aspect.",
    updatedAt: row.updated_at ?? null, servingRowId: live && resolved ? current?.id ?? null : null };
}
const skyManifest = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json");
const currentKeys = new Set(servingPackageRecords.keys());
const approved = new Set(["approved", "approved_reuse", "reviewed"]);
export type LiveStatusRow = { id: string; content_key: string; target_date?: string | null; status?: string | null; lane?: string | null; review_state?: string | null; updated_at?: string | null; provider?: string | null; headline?: string | null; summary?: string | null; body?: string | null; sections?: any; source_snapshot?: any; facts?: any; mode?: string | null; flags?: string[] | null; surface?: string | null; event_type?: string | null };
export type ContentLiveStatus = { id: string; live: boolean; label: "Live" | "Not live"; detail: string; source: "studio" | "package" | null; updatedAt: string | null; servingRowId?: string | null };
function record(row: LiveStatusRow) { return row.sections?.packageRecord ?? {}; }
function copyHash(value: Record<string, any>) {
  const fields = ["headline", "summary", "body", "body_you", "body_they", "text", "Headline", "Summary", "Body", "fact_line", "opening", "tension", "development", "close", "era_layer", "tagline", "title", "focus", "strategy", "preview_note", "core_theme", "sign_jurisdiction", "lived_experience", "rulership_twist", "history_echo", "closing_charge", "article_sections", "rising_horoscopes"];
  return createHash("sha256").update(JSON.stringify(fields.map((field) => [field, value[field] ?? null]))).digest("hex");
}
export function isSkyPartitionKey(key: string) {
  return key.startsWith("fallback-hook/sky-sign-copy/") || key.startsWith("fallback-hook/sky-placement-") || key.startsWith("house-horoscope-core/") || key.startsWith("fallback-hook/sky-planet-education/");
}
function skyOverlays(candidates: LiveStatusRow[]) {
  const rows = candidates.filter((row) => row.provider === "tldrastro-fallback-architecture-v3-sky-placement" && isSkyPartitionKey(row.content_key) && approved.has(record(row).review_status)
    && (!(row.content_key.startsWith("fallback-hook/sky-sign-copy/") || record(row).render_policy === "sky-placement-continuous-v2") || (row.source_snapshot?.distributionState ?? row.source_snapshot?.distribution_state ?? row.facts?.distributionState ?? row.facts?.distribution_state) === "serving"));
  if (!rows.length || new Set(rows.map((row) => row.content_key)).size !== rows.length) return [];
  const metadata = rows.map((row) => {
    const scopes = [row.source_snapshot ?? {}, row.facts ?? {}, record(row)];
    const get = (keys: string[]) => scopes.flatMap((scope) => keys.map((key) => scope[key])).find((value) => value !== undefined && value !== null && value !== "");
    return { packageVersion: get(["packageVersion", "package_version"]),
      contentHash: get(["packagePartitionContentHash", "package_partition_content_hash", "packageContentHash", "package_content_hash"]),
      keyManifestHash: get(["packagePartitionKeyManifestHash", "package_partition_key_manifest_hash", "packageKeyManifestHash", "package_key_manifest_hash"]),
      keyCount: Number(get(["packagePartitionKeyCount", "package_partition_key_count", "packageKeyCount", "package_key_count"])) };
  });
  if (metadata.some((item) => item.packageVersion !== skyManifest.packageVersion || !item.contentHash || JSON.stringify(item) !== JSON.stringify(metadata[0]))) return [];
  const manifest = createPackageManifest({ transitLib: { authoredCards: [] }, templatesFile: { templates: [] }, rowsFile: { hookRows: rows.filter((row) => ["fallback_hook", "house_horoscope_core"].includes(record(row).content_role)).map(record), vocabularyRows: [] } }, skyManifest.packageVersion);
  if (manifest.keyManifestHash !== skyManifest.keyManifestHash || manifest.keyCount !== skyManifest.keyCount || manifest.keyManifestHash !== metadata[0].keyManifestHash || manifest.keyCount !== metadata[0].keyCount) return [];
  return rows.filter((row) => isGovernedReaderEligible({ ...record(row), contentKey: row.content_key, review_status: generatedRowPackageRole(row).reviewStatus }));
}
function packageEligible(row: LiveStatusRow) {
  const source = record(row);
  if (skyPlacementSourceRecords.has(row.content_key) && source.studio_version_status !== "approved-serving-revision") return false;
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, role, contentType: row.source_snapshot?.contentType ?? row.source_snapshot?.content_type ?? row.facts?.contentType ?? row.facts?.content_type ?? "" });
  return row.provider === "tldrastro-fallback-architecture-v3" && !isSkyPartitionKey(row.content_key)
    && isFallbackDashboardRecordAllowed({ ...source, contentKey: row.content_key }, currentKeys)
    && destination !== "skip" && source.serving_enabled !== false
    && (role === "template" && !reviewStatus || isGovernedReaderEligible({ ...source, contentKey: row.content_key, content_role: role, review_status: reviewStatus }))
    && Boolean(source.body || source.body_you || source.body_they);
}
function rawCopy(row: LiveStatusRow) { return { headline: row.headline, summary: row.summary, body: row.body }; }
export function contentLiveStatuses(rows: LiveStatusRow[], candidates: LiveStatusRow[] = rows, allowsPublication: (row: LiveStatusRow) => boolean = () => true, isPublishedSkyRow: (row: LiveStatusRow) => boolean = () => false): ContentLiveStatus[] {
  const partitionCandidates = candidates;
  candidates = candidates.filter((row) => !isRetiredCompositionKey(row.content_key) && allowsPublication(row));
  const overlays = new Map(selectLatestLiveServingDashboardRows(candidates, new Set([...currentKeys, ...candidates.filter(packageEligible).map((row) => row.content_key)]), packageEligible, () => false).map((row) => [row.content_key, row]));
  for (const row of skyOverlays(partitionCandidates).filter(allowsPublication)) overlays.set(row.content_key, row);
  // An explicit publication is an independent reviewed source, not an old bulk mirror.
  for (const row of candidates) {
    if (isSkyPartitionKey(row.content_key) && isPublishedSkyRow(row) && currentKeys.has(row.content_key)
      && row.status === "LIVE" && row.lane === "serving" && !row.review_state
      && isReaderServableGeneratedContentRow(row) && isGeneratedContentReaderBoundaryAllowed(row)
      && isGovernedReaderEligible({ ...record(row), contentKey: row.content_key, review_status: generatedRowPackageRole(row).reviewStatus })) overlays.set(row.content_key, row);
  }
  const compatibilitySeen = new Set<string>();
  for (const row of [...candidates].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))) {
    if (!row.content_key.startsWith("authored/compat-pair/") || compatibilitySeen.has(row.content_key)) continue;
    compatibilitySeen.add(row.content_key);
    const source = record(row);
    const { reviewStatus } = generatedRowPackageRole(row);
    if (row.provider && approved.has(reviewStatus) && isReaderServableGeneratedContentRow(row) && isGovernedReaderEligible({ ...source, contentKey: row.content_key, review_status: reviewStatus })) overlays.set(row.content_key, row);
  }
  return rows.map((row) => {
    if (isRetiredCompositionKey(row.content_key)) return { id: row.id, live: false, label: "Not live", source: null, detail: "Superseded composition. Use the canonical Personal Transit source.", updatedAt: row.updated_at ?? null } as ContentLiveStatus;
    const builtin = builtinContentRecords.get(row.content_key);
    if (builtin) {
      if (builtin.readerEnabled === false) return { id: row.id, live: false, label: "Not live", source: null,
        detail: "The current Daily Sky template does not use this field.", updatedAt: row.updated_at ?? null } as ContentLiveStatus;
      const current = [...candidates].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        .find(candidate => candidate.content_key === row.content_key && candidate.status === "LIVE"
          && candidate.lane === "serving" && !candidate.review_state && candidate.body?.trim()
          && isGeneratedContentReaderBoundaryAllowed(candidate) && isReaderServableGeneratedContentRow(candidate)
          && !skySummaryTemplateErrors(candidate.content_key, candidate.body).length);
      const servingBody = currentSkySummaryWording(row.content_key, current?.body ?? builtin.body).trim();
      const live = Boolean(servingBody && currentSkySummaryWording(row.content_key, row.body ?? "").trim() === servingBody);
      return { id: row.id, live, label: live ? "Live" : "Not live",
        source: live ? current ? "studio" : "package" : null,
        detail: live ? "Readers can currently receive this exact summary wording." : "Readers cannot currently receive this summary wording.",
        updatedAt: row.updated_at ?? null, servingRowId: live ? current?.id ?? null : null } as ContentLiveStatus;
    }
    if (row.content_key.startsWith("sky-card/")) {
      const [, first, firstSign, aspect, second, secondSign] = row.content_key.split("/");
      const current = [...candidates].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
        .find(candidate => candidate.content_key === row.content_key && allowsPublication(candidate)
          && candidate.status === "LIVE" && candidate.lane === "serving" && !candidate.review_state
          && isReaderServableGeneratedContentRow(candidate) && isGeneratedContentReaderBoundaryAllowed(candidate));
      const resolved = current ? resolveCalendarAspectPublication({ first, firstSign, aspect, second, secondSign,
        generatedContent: new Map([[current.content_key, { contentKey: current.content_key, eventType: current.event_type,
          body: current.body ?? "", sourceSnapshot: current.source_snapshot ?? {} } as any]]) }) : null;
      const body = row.sections?.packageDraft?.Body ?? row.sections?.packageRecord?.Body ?? row.body;
      const live = Boolean(resolved && body === resolved.body);
      return { id: row.id, live, label: live ? "Live" : "Not live", source: live ? "studio" : null,
        detail: live ? "Readers can receive this exact Calendar passage." : "This Calendar revision has not been published.",
        updatedAt: row.updated_at ?? null, servingRowId: live ? current?.id ?? null : null } as ContentLiveStatus;
    }
    const exact = exactAspectStatus(row, candidates);
    if (exact) return exact;
    let source: ContentLiveStatus["source"] = null;
    let detail = "Readers cannot currently receive this copy.";
    const packageRecord = record(row);
    const proposal = row.sections?.packageDraft;
    const bundled = servingPackageRecords.get(row.content_key);
    const overlay = overlays.get(row.content_key);
    if (bundled || Object.keys(packageRecord).length) {
      // Shared season starters reserve editable keys but contain no published prose.
      const serving = overlay ? { ...record(overlay) } : isZodiacSeasonSourceKey(row.content_key) ? undefined : bundled;
      if (serving && overlay) {
        const { role } = generatedRowPackageRole(overlay);
        const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: overlay.content_key, role, contentType: overlay.source_snapshot?.contentType ?? overlay.source_snapshot?.content_type ?? overlay.facts?.contentType ?? "" });
        if ((destination === "authored" || overlay.content_key.startsWith("authored/compat-pair/")) && overlay.body?.trim()) serving.body = overlay.body.trim();
      }
      let requested = proposal ?? packageRecord;
      if (!proposal && overlay) {
        const { role } = generatedRowPackageRole(row);
        const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, role, contentType: row.source_snapshot?.contentType ?? row.source_snapshot?.content_type ?? row.facts?.contentType ?? "" });
        if ((destination === "authored" || row.content_key.startsWith("authored/compat-pair/")) && row.body?.trim()) requested = { ...packageRecord, body: row.body.trim() };
      }
      if (serving && copyHash(requested) === copyHash(serving)) {
        source = overlay ? "studio" : "package";
        detail = overlay ? "Readers can receive this saved copy." : "Readers can receive this exact copy from the installed content package.";
      } else if (proposal) detail = "This saved revision is not live. Readers may still receive the previous version.";
      else if (serving) detail = "The app has a different version of this content. This copy is not live.";
      else detail = isZodiacSeasonSourceKey(row.content_key)
        ? "This shared sign source needs reviewed, published prose before readers can receive it."
        : "This source is not included in the reader's active content package.";
    } else {
      const wiring = contentWiringStatus(row);
      const edition = skyArticleEditionRecord(row.sections?.skyArticleEdition);
      const eligible = allowsPublication(row) && row.status === "LIVE" && row.lane === "serving" && !row.review_state
        && wiring.state === "connected" && isGeneratedContentReaderBoundaryAllowed(row)
        && Boolean(row.body?.trim()) && isReaderServableGeneratedContentRow(row)
        && (!edition || row.content_key === edition.contentKey && hasExactSkyArticleOwnerApproval(edition, row.source_snapshot));
      const newer = candidates.some((candidate) => candidate.id !== row.id && candidate.content_key === row.content_key && candidate.status === "LIVE" && candidate.lane === "serving" && !candidate.review_state && isReaderServableGeneratedContentRow(candidate) && isGeneratedContentReaderBoundaryAllowed(candidate) && (candidate.updated_at ?? "") > (row.updated_at ?? "") && copyHash(rawCopy(candidate)) !== copyHash(rawCopy(row)));
      if (eligible && !newer) { source = "studio"; detail = "Readers can receive this saved copy."; }
      else if (wiring.reason === "unfinished") detail = wiring.detail;
      else if (row.status === "ARCHIVED") detail = "This copy is archived.";
      else if (row.review_state) detail = "This copy is awaiting review or release.";
    }
    return { id: row.id, live: Boolean(source), label: source ? "Live" : "Not live", detail, source, updatedAt: row.updated_at ?? null, servingRowId: source === "studio" ? overlay?.id ?? row.id : null };
  });
}
