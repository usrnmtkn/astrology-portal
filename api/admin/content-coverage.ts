import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

type CoverageAuthority = {
  id: string;
  ownerAuthority: string;
  studioOverlay: string;
  servingSource: string;
  resolver: string;
  readerDestinations: string[];
  failurePolicy: string;
};

function readJson(relativePath: string) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8")) as Record<string, any>;
}

function nonblank(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
}

function coverageRow(
  id: string,
  label: string,
  ready: number,
  total: number,
  detail: string,
  source: string,
  authority: CoverageAuthority
) {
  return {
    id,
    label,
    ready,
    total,
    missing: Math.max(0, total - ready),
    percent: total > 0 ? Math.round((ready / total) * 1000) / 10 : 0,
    state: ready >= total ? "complete" : "incomplete",
    detail,
    source,
    authority
  };
}

function buildCoverage() {
  const authorityRegistry = readJson("config/content-authority-map-v1.json");
  const authorityFamilies = Array.isArray(authorityRegistry.families) ? authorityRegistry.families : [];
  const authorityById = new Map<string, Record<string, any>>(
    authorityFamilies.map((family: Record<string, any>) => [String(family.id ?? ""), family])
  );
  const authorityFor = (id: string): CoverageAuthority => {
    const family = authorityById.get(id);
    if (!family) throw new Error(`Content authority family is missing: ${id}`);
    return {
      id,
      ownerAuthority: String(family.ownerAuthority ?? ""),
      studioOverlay: String(family.studioOverlay ?? ""),
      servingSource: String(family.servingSource ?? ""),
      resolver: String(family.resolver ?? ""),
      readerDestinations: Array.isArray(family.readerDestinations)
        ? family.readerDestinations.map((value: unknown) => String(value))
        : [],
      failurePolicy: String(family.failurePolicy ?? "")
    };
  };

  const transitSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json");
  const transitRows = (Array.isArray(transitSource.authoredCards) ? transitSource.authoredCards : [])
    .filter((row: Record<string, unknown>) => String(row.contentKey ?? "").startsWith("authored/transit-aspect/"));
  const personalReady = transitRows.filter((row: Record<string, unknown>) => nonblank(row.body_you)).length;
  const friendsReady = transitRows.filter((row: Record<string, unknown>) => nonblank(row.body_they)).length;
  const sunFriendsReady = transitRows.filter((row: Record<string, unknown>) => (
    String(row.contentKey ?? "").startsWith("authored/transit-aspect/sun/") && nonblank(row.body_they)
  )).length;

  const friendsOwnerLive = readJson("packages/astro-knowledge/review/transit-aspect-friends-nonsun-350-owner-live-2026-09-03.json");
  const exactSky = readJson("packages/astro-knowledge/review/sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json");
  const continuous = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-continuous-corpus-correction-v1.json");
  const lunar = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-placement-lunar-context-v1.json");
  const housePassages = readJson("apps/web/src/content/fallbackArchitectureV3/authored-inputs/owner-authored-sky-placement-house-passages-v1.json");
  const jupiterLeoRows = (Array.isArray(housePassages.rows) ? housePassages.rows : [])
    .filter((row: Record<string, unknown>) => String(row.contentKey ?? "").startsWith("house-horoscope-core/jupiter/leo/house-"));
  const approvedJupiterLeo = new Set(jupiterLeoRows
    .filter((row: Record<string, unknown>) => row.review_status === "approved" && nonblank(row.body_you))
    .map((row: Record<string, unknown>) => Number(String(row.contentKey).match(/house-(\d+)$/u)?.[1] ?? 0))
    .filter(Boolean));
  const missingJupiterLeo = Array.from({ length: 12 }, (_, index) => index + 1).filter((house) => !approvedJupiterLeo.has(house));
  const unresolved = readJson("packages/astro-knowledge/generated/content-unresolved-queue-v1.json");

  const coverage = [
    coverageRow(
      "personal-transits",
      "Personal Transits · You",
      personalReady,
      transitRows.length,
      `${personalReady}/${transitRows.length} canonical transit rows contain You copy.`,
      "transit-synastry-rows-v1.json",
      authorityFor("personal-transit-you")
    ),
    coverageRow(
      "friends-transits",
      "Friends Transits",
      friendsReady,
      transitRows.length,
      `${friendsOwnerLive.count ?? 0} non-Sun Friends rows are covered by the Sep 3 owner-live batch; ${sunFriendsReady} Sun rows currently contain Friends copy.`,
      "transit-synastry-rows-v1.json + transit-aspect-friends-nonsun-350-owner-live-2026-09-03.json",
      authorityFor("personal-transit-friends")
    ),
    coverageRow(
      "sky-exact-aspects",
      "Sky Calendar · Exact aspects",
      Number(exactSky.rowCount ?? 0),
      248,
      `${exactSky.rowCount ?? 0} current owner-approved exact aspect payloads.`,
      "sky-calendar-exact-approved-2026-09-04-held-trines-33/current-owner-payloads.json",
      authorityFor("sky-exact-aspects")
    ),
    coverageRow(
      "sky-continuous-placements",
      "Sky Placement · Continuous corrections",
      continuous.owner_approved === true ? Number(continuous.expected_records ?? 0) : 0,
      120,
      `Owner approved: ${continuous.owner_approved === true ? "yes" : "no"}; serving release declared: ${continuous.serving_enabled === true ? "yes" : "no"}.`,
      "sky-v4-continuous-corpus-correction-v1.json",
      authorityFor("sky-placement-continuous")
    ),
    coverageRow(
      "sky-lunar-context",
      "Sky Placement · Lunar context",
      lunar.owner_approved === true ? Number(lunar.expected_records ?? 0) : 0,
      40,
      `Exact-day lunar modules across 10 planets × 4 event types. Serving release declared: ${lunar.serving_enabled === true ? "yes" : "no"}.`,
      "sky-v4-placement-lunar-context-v1.json",
      authorityFor("sky-placement-lunar-context")
    ),
    coverageRow(
      "jupiter-leo-house-horoscopes",
      "Jupiter in Leo · House horoscopes",
      approvedJupiterLeo.size,
      12,
      missingJupiterLeo.length ? `Missing full owner-authored houses: ${missingJupiterLeo.join(", ")}.` : "All 12 full house passages are present.",
      "owner-authored-sky-placement-house-passages-v1.json",
      authorityFor("sky-placement-house-horoscopes")
    )
  ];

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    authority: "governed repository sources on the deployed commit",
    readerEligibility: authorityRegistry.readerEligibility?.databaseOverlay?.required ?? null,
    summary: {
      complete: coverage.filter((row) => row.state === "complete").length,
      incomplete: coverage.filter((row) => row.state === "incomplete").length,
      unresolvedQueue: Number(unresolved.count ?? 0),
  unresolvedIssues: Number(unresolved.issueCount ?? unresolved.count ?? 0),
  unresolvedOptionalQueue: Number(unresolved.optionalCount ?? 0),
  unresolvedOptionalIssues: Number(unresolved.optionalIssueCount ?? 0),
  unresolvedShadowed: Number(unresolved.shadowedCount ?? 0),
  unresolvedRetired: Number(unresolved.retiredCount ?? 0)
    },
    coverage,
    notes: {
      friendsIntentionalGap: friendsReady < transitRows.length
        ? `${transitRows.length - friendsReady} canonical Friends transit row currently has no body_they.`
        : null,
      unresolvedReasonCounts: unresolved.reasonCounts ?? {},
  unresolvedWorkload: unresolved.workload ?? {},
  unresolvedOptionalWorkload: unresolved.optionalWorkload ?? {},
  unresolvedShadowedReasonCounts: unresolved.shadowedReasonCounts ?? {},
  unresolvedRetiredReasonCounts: unresolved.retiredReasonCounts ?? {}
    }
  };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Use GET." });
    return;
  }
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { ok: false, error: "Unauthorized." });
    return;
  }
  try {
    sendJson(res, 200, buildCoverage());
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Content coverage could not be calculated."
    });
  }
}
