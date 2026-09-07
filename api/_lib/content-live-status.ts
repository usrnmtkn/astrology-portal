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
const skyManifest = require("../../apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-manifest-v3.json");
const currentKeys = new Set(servingPackageRecords.keys());
const approved = new Set(["approved", "approved_reuse", "reviewed"]);
export type LiveStatusRow = { id: string; content_key: string; status?: string | null; lane?: string | null; review_state?: string | null; updated_at?: string | null; provider?: string | null; headline?: string | null; summary?: string | null; body?: string | null; sections?: any; source_snapshot?: any; facts?: any; mode?: string | null; flags?: string[] | null; surface?: string | null; event_type?: string | null };
export type ContentLiveStatus = { id: string; live: boolean; label: "Live" | "Not live"; detail: string; source: "studio" | "package" | null; updatedAt: string | null };
function record(row: LiveStatusRow) { return row.sections?.packageRecord ?? {}; }
function copyHash(value: Record<string, any>) {
  const fields = ["headline", "summary", "body", "body_you", "body_they", "text", "Headline", "Summary", "Body", "fact_line", "opening", "tension", "development", "close", "era_layer", "tagline", "title", "focus", "strategy", "preview_note", "core_theme", "sign_jurisdiction", "lived_experience", "rulership_twist", "history_echo", "closing_charge", "article_sections", "rising_horoscopes"];
  return createHash("sha256").update(JSON.stringify(fields.map((field) => [field, value[field] ?? null]))).digest("hex");
}
export function isSkyPartitionKey(key: string) {
  return key.startsWith("fallback-hook/sky-sign-copy/") || key.startsWith("fallback-hook/sky-placement-") && !key.startsWith("fallback-hook/sky-placement-sign/");
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
  const manifest = createPackageManifest({ transitLib: { authoredCards: [] }, templatesFile: { templates: [] }, rowsFile: { hookRows: rows.filter((row) => record(row).content_role === "fallback_hook").map(record), vocabularyRows: [] } }, skyManifest.packageVersion);
  if (manifest.keyManifestHash !== skyManifest.keyManifestHash || manifest.keyCount !== skyManifest.keyCount || manifest.keyManifestHash !== metadata[0].keyManifestHash || manifest.keyCount !== metadata[0].keyCount) return [];
  return rows.filter((row) => isGovernedReaderEligible({ ...record(row), contentKey: row.content_key, review_status: generatedRowPackageRole(row).reviewStatus }));
}
function packageEligible(row: LiveStatusRow) {
  const source = record(row);
  const { role, reviewStatus } = generatedRowPackageRole(row);
  const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: row.content_key, role, contentType: row.source_snapshot?.contentType ?? row.source_snapshot?.content_type ?? row.facts?.contentType ?? row.facts?.content_type ?? "" });
  return row.provider === "tldrastro-fallback-architecture-v3" && !isSkyPartitionKey(row.content_key)
    && isFallbackDashboardRecordAllowed({ ...source, contentKey: row.content_key }, currentKeys)
    && destination !== "skip" && source.serving_enabled !== false
    && (role === "template" && !reviewStatus || isGovernedReaderEligible({ ...source, contentKey: row.content_key, content_role: role, review_status: reviewStatus }))
    && Boolean(source.body || source.body_you || source.body_they);
}
function rawCopy(row: LiveStatusRow) { return { headline: row.headline, summary: row.summary, body: row.body }; }
export function contentLiveStatuses(rows: LiveStatusRow[], candidates: LiveStatusRow[] = rows): ContentLiveStatus[] {
  const overlays = new Map(selectLatestLiveServingDashboardRows(candidates, new Set([...currentKeys, ...candidates.filter(packageEligible).map((row) => row.content_key)]), packageEligible, () => false).map((row) => [row.content_key, row]));
  for (const row of skyOverlays(candidates)) overlays.set(row.content_key, row);
  const compatibilitySeen = new Set<string>();
  for (const row of [...candidates].sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))) {
    if (!row.content_key.startsWith("authored/compat-pair/") || compatibilitySeen.has(row.content_key)) continue;
    compatibilitySeen.add(row.content_key);
    const source = record(row);
    const { reviewStatus } = generatedRowPackageRole(row);
    if (row.provider && approved.has(reviewStatus) && isReaderServableGeneratedContentRow(row) && isGovernedReaderEligible({ ...source, contentKey: row.content_key, review_status: reviewStatus })) overlays.set(row.content_key, row);
  }
  return rows.map((row) => {
    let source: ContentLiveStatus["source"] = null;
    let detail = "Readers cannot currently receive this copy.";
    const packageRecord = record(row);
    const proposal = row.sections?.packageDraft;
    const bundled = servingPackageRecords.get(row.content_key);
    const overlay = overlays.get(row.content_key);
    if (bundled || Object.keys(packageRecord).length) {
      const serving = overlay ? { ...record(overlay) } : bundled;
      if (serving && overlay) {
        const { role } = generatedRowPackageRole(overlay);
        const destination = fallbackArchitectureV3DashboardPackageDestination({ contentKey: overlay.content_key, role, contentType: overlay.source_snapshot?.contentType ?? overlay.source_snapshot?.content_type ?? overlay.facts?.contentType ?? "" });
        if ((destination === "authored" || overlay.content_key.startsWith("authored/compat-pair/")) && overlay.body?.trim()) serving.body = overlay.body.trim();
      }
      if (serving && copyHash(proposal ?? packageRecord) === copyHash(serving)) {
        source = overlay ? "studio" : "package";
        detail = overlay ? "Readers can receive this saved copy." : "Readers can receive this exact copy from the installed content package.";
      } else if (proposal) detail = "This saved revision is not live. Readers may still receive the previous version.";
      else if (serving) detail = "The app has a different version of this content. This copy is not live.";
      else detail = "This source is not included in the reader's active content package.";
    } else {
      const wiring = contentWiringStatus(row);
      const edition = skyArticleEditionRecord(row.sections?.skyArticleEdition);
      const eligible = row.status === "LIVE" && row.lane === "serving" && !row.review_state
        && wiring.state === "connected" && isGeneratedContentReaderBoundaryAllowed(row)
        && Boolean(row.body?.trim()) && isReaderServableGeneratedContentRow(row)
        && (!edition || row.content_key === edition.contentKey && hasExactSkyArticleOwnerApproval(edition, row.source_snapshot));
      const newer = candidates.some((candidate) => candidate.id !== row.id && candidate.content_key === row.content_key && candidate.status === "LIVE" && candidate.lane === "serving" && !candidate.review_state && isReaderServableGeneratedContentRow(candidate) && isGeneratedContentReaderBoundaryAllowed(candidate) && (candidate.updated_at ?? "") > (row.updated_at ?? "") && copyHash(rawCopy(candidate)) !== copyHash(rawCopy(row)));
      if (eligible && !newer) { source = "studio"; detail = "Readers can receive this saved copy."; }
      else if (wiring.reason === "unfinished") detail = wiring.detail;
      else if (row.status === "ARCHIVED") detail = "This copy is archived.";
      else if (row.review_state) detail = "This copy is awaiting review or release.";
    }
    return { id: row.id, live: Boolean(source), label: source ? "Live" : "Not live", detail, source, updatedAt: row.updated_at ?? null };
  });
}
