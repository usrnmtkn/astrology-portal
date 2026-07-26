import type { IncomingMessage, ServerResponse } from "node:http";
import skyAspectGenerator from "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js";
import { currentSkyFacts, type PlanetPosition, type SkyAspect } from "../_lib/current-sky.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const { generateCard, normalizeCardArgs } = skyAspectGenerator;
const supportedAspects = new Set(["conjunction", "sextile", "square", "trine", "opposition"]);
const maxJudgeRegenerations = 2;
type JudgeGate = "auto-publish" | "human-review" | "regenerate";
type GeneratedCardResult = Awaited<ReturnType<typeof generateCard>>;
type TrimCloseStats = {
  calls: number;
  fired: number;
  unchanged: number;
  rejected: number;
  errors: number;
};

type RoutedGeneration = {
  result: GeneratedCardResult;
  gate: Exclude<JudgeGate, "regenerate">;
  judgePasses: number;
  totalAttempts: number;
  cappedRegeneration: boolean;
  trimClose: TrimCloseStats;
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

function isAuthorized(req: IncomingMessage) {
  const cronSecret = process.env.CRON_SECRET ?? process.env.CONTENT_GENERATION_SECRET;

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production";
  }

  return req.headers.authorization === `Bearer ${cronSecret}`;
}

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function supabaseUrl() {
  return (process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL")).replace(/\/$/, "");
}

function serviceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

function judgeAutoPublishEnabled() {
  return process.env.SKY_ASPECT_JUDGE_CALIBRATED === "true";
}

function pointSlug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function positionFor(point: string, positions: PlanetPosition[]) {
  return positions.find((position) => position.planet === point);
}

function contentKeyFor(facts: NonNullable<Awaited<ReturnType<typeof generateCard>>["facts"]>) {
  return [
    "sky.aspect",
    facts.a,
    facts.aspect,
    facts.b,
    facts.signA,
    facts.signB
  ].join(".");
}

async function promoteExistingCard(id: string) {
  const key = serviceRoleKey();
  const now = new Date().toISOString();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation"
    },
    body: JSON.stringify({
      status: "LIVE",
      review_state: null,
      reviewed_at: now,
      published_at: now,
      updated_at: now
    })
  });

  if (!response.ok) {
    throw new Error(`Sky-aspect calibrated promotion failed with ${response.status}.`);
  }
}

async function existingCard(contentKey: string) {
  const params = new URLSearchParams({
    content_key: `eq.${contentKey}`,
    target_date: "is.null",
    mode: "eq.feed",
    select: "id,status,review_state,source_snapshot,judge_score,judge_gate",
    limit: "1"
  });
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    throw new Error(`Sky-aspect cache lookup failed with ${response.status}.`);
  }

  const rows = await response.json() as Array<{
    id: string;
    status: string;
    review_state: string | null;
    source_snapshot?: Record<string, unknown>;
    judge_score?: number | null;
    judge_gate?: JudgeGate | null;
  }>;
  const row = rows[0];
  const lint = row?.source_snapshot?.skyAspectVoiceLint as { score?: number; fails?: number } | undefined;
  const clean = lint?.score === 3 && lint.fails === 0;

  if (!row || row.status === "ERROR") return null;

  if (row.judge_gate === "human-review") {
    return row;
  }

  if (row.judge_gate === "auto-publish" && row.judge_score === 3 && clean) {
    if (judgeAutoPublishEnabled() && row.status !== "LIVE") {
      await promoteExistingCard(row.id);
      return { ...row, status: "LIVE", review_state: null };
    }
    return row;
  }

  return null;
}

async function persistedCardId(contentKey: string) {
  const params = new URLSearchParams({
    content_key: `eq.${contentKey}`,
    target_date: "is.null",
    mode: "eq.feed",
    select: "id",
    limit: "1"
  });
  const key = serviceRoleKey();
  const response = await fetch(`${supabaseUrl()}/rest/v1/generated_interpretations?${params}`, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    throw new Error(`Sky-aspect persisted-row lookup failed with ${response.status}.`);
  }

  const rows = await response.json() as Array<{ id: string }>;
  return rows[0]?.id ?? null;
}

function firstParagraph(text: string) {
  return text.split(/\n{2,}/).map((paragraph) => paragraph.trim()).find(Boolean) ?? "";
}

async function generateWithJudgeRouting(args: {
  a: string;
  b: string;
  aspect: string;
  signA: string;
  signB: string;
}): Promise<RoutedGeneration | { result: GeneratedCardResult; gate: null; judgePasses: number; totalAttempts: number; cappedRegeneration: false; trimClose: TrimCloseStats }> {
  let result: GeneratedCardResult | null = null;
  let feedback = "";
  let totalAttempts = 0;
  const trimClose: TrimCloseStats = {
    calls: 0,
    fired: 0,
    unchanged: 0,
    rejected: 0,
    errors: 0
  };

  for (let pass = 0; pass <= maxJudgeRegenerations; pass += 1) {
    result = await generateCard(args, {
      withJudge: true,
      ...(feedback ? { judgeFeedback: feedback } : {})
    });
    totalAttempts += result.attempts ?? 0;
    trimClose.calls += result.trimClose?.calls ?? 0;
    trimClose.fired += result.trimClose?.fired ?? 0;
    trimClose.unchanged += result.trimClose?.unchanged ?? 0;
    trimClose.rejected += result.trimClose?.rejected ?? 0;
    trimClose.errors += result.trimClose?.errors ?? 0;

    if (result.status !== "clean") {
      return { result, gate: null, judgePasses: pass, totalAttempts, cappedRegeneration: false, trimClose };
    }

    if (result.gate === "auto-publish" || result.gate === "human-review") {
      return {
        result,
        gate: result.gate,
        judgePasses: pass + 1,
        totalAttempts,
        cappedRegeneration: false,
        trimClose
      };
    }

    feedback = [
      result.judge?.why,
      result.judge?.weakest ? `Weakest beat: ${result.judge.weakest}.` : ""
    ].filter(Boolean).join(" ");
  }

  if (!result) {
    throw new Error("Sky-aspect judge routing completed without a generation result.");
  }

  return {
    result,
    gate: "human-review",
    judgePasses: maxJudgeRegenerations + 1,
    totalAttempts,
    cappedRegeneration: true,
    trimClose
  };
}

async function saveRoutedCard({
  aspect,
  first,
  routed,
  second
}: {
  aspect: SkyAspect;
  first: PlanetPosition;
  routed: RoutedGeneration | { result: GeneratedCardResult; gate: null; judgePasses: number; totalAttempts: number; cappedRegeneration: false; trimClose: TrimCloseStats };
  second: PlanetPosition;
}) {
  const { result } = routed;
  if (!result.facts?.a || !result.facts.b || !result.facts.aspect || !result.facts.signA || !result.facts.signB) {
    throw new Error("Generated sky-aspect result did not include normalized facts.");
  }

  const contentKey = contentKeyFor(result.facts);
  const key = serviceRoleKey();
  const clean = result.status === "clean" && result.lint?.score === 3 && result.lint.fails === 0;
  const gate = clean ? (routed.gate ?? "human-review") : "human-review";
  const canAutoPublish = clean
    && gate === "auto-publish"
    && result.judge?.score === 3
    && judgeAutoPublishEnabled();
  const reviewState = canAutoPublish
    ? null
    : gate === "human-review"
      ? "sky-voice-needs-review"
      : "sky-judge-calibration-required";
  const judgeVerdict = clean ? result.judge?.verdict ?? "" : "lint-failed";
  const judgeWhy = clean
    ? [
      result.judge?.why,
      routed.cappedRegeneration ? `Regeneration cap reached after ${routed.judgePasses} judged drafts.` : ""
    ].filter(Boolean).join(" ")
    : result.note ?? "Card did not pass the deterministic voice linter.";
  const persistedJudge = result.judge
    ? {
      ...result.judge,
      gate,
      originalGate: result.gate,
      cappedRegeneration: routed.cappedRegeneration
    }
    : null;
  const pairSource = result.facts.pairSource ?? "";
  const cardFacts = {
    a: result.facts.a,
    b: result.facts.b,
    aspect: result.facts.aspect,
    signA: result.facts.signA,
    signB: result.facts.signB
  };
  const immutableFacts = {
    cardFacts,
    planetA: {
      name: first.planet,
      sign: first.sign,
      degree: first.degree,
      theme: first.theme
    },
    planetB: {
      name: second.planet,
      sign: second.sign,
      degree: second.degree,
      theme: second.theme
    },
    aspect: {
      type: aspect.type,
      orb: aspect.orb
    },
    series: aspect.series ?? null
  };
  const persistedId = await persistedCardId(contentKey);
  const response = await fetch(
    persistedId
      ? `${supabaseUrl()}/rest/v1/generated_interpretations?id=eq.${encodeURIComponent(persistedId)}`
      : `${supabaseUrl()}/rest/v1/generated_interpretations?on_conflict=content_key,target_date,mode`,
    {
      method: persistedId ? "PATCH" : "POST",
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
        prefer: persistedId ? "return=representation" : "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify({
        content_key: contentKey,
        surface: "sky",
        mode: "feed",
        status: canAutoPublish ? "LIVE" : "DRAFT",
        lane: "serving",
        review_state: reviewState,
        event_type: "collective-aspect-card",
        target_date: null,
        block_type: "sky_aspect",
        facts: immutableFacts,
        knowledge_ids: [result.facts.pairKey].filter(Boolean),
        source_snapshot: {
          contentType: "sky-aspect-card",
          pairKey: result.facts.pairKey,
          pairSource,
          cardFacts,
          skyAspectVoiceLint: result.lint,
          skyAspectJudge: persistedJudge,
          skyAspectTrimClose: routed.trimClose,
          generationAttempts: routed.totalAttempts,
          judgePasses: routed.judgePasses,
          temperature: result.temperature
        },
        judge_score: result.judge?.score ?? null,
        judge_verdict: judgeVerdict,
        judge_gate: gate,
        judge_why: judgeWhy,
        prompt_version: "sky-aspect-card-v1",
        provider: result.provider,
        model: result.model,
        headline: `${first.planet} ${aspect.type} ${second.planet}`,
        summary: firstParagraph(result.text ?? ""),
        body: result.text ?? "",
        sections: {},
        flags: canAutoPublish
          ? []
          : gate === "human-review"
            ? ["SKY_VOICE_REVIEW_REQUIRED"]
            : ["SKY_JUDGE_CALIBRATION_REQUIRED"],
        reviewed_at: canAutoPublish ? new Date().toISOString() : null,
        published_at: canAutoPublish ? new Date().toISOString() : null,
        error: clean ? null : result.note
      })
    }
  );
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Sky-aspect review save failed with ${response.status}: ${JSON.stringify(payload)}`);
  }

  return { clean, contentKey, gate, canAutoPublish, saved: payload };
}

async function generateCurrentMatrix() {
  const sky = await currentSkyFacts(new Date());
  const report = {
    generated: 0,
    cached: 0,
    clean: 0,
    needsReview: 0,
    autoPublished: 0,
    calibrationHeld: 0,
    judgeRegenerated: 0,
    retried: 0,
    trimCloseCalls: 0,
    trimCloseFired: 0,
    trimCloseUnchanged: 0,
    trimCloseRejected: 0,
    trimCloseErrors: 0,
    skipped: [] as Array<{ aspect: string; reason: string }>,
    cards: [] as Array<{ contentKey: string; status: string; attempts?: number; trimCloseFired?: number }>
  };

  for (const aspect of sky.aspects) {
    const normalizedAspect = pointSlug(aspect.type);
    const first = positionFor(aspect.from, sky.positions);
    const second = positionFor(aspect.to, sky.positions);

    if (!supportedAspects.has(normalizedAspect) || !first || !second) {
      report.skipped.push({
        aspect: `${aspect.from} ${aspect.type} ${aspect.to}`,
        reason: !supportedAspects.has(normalizedAspect) ? "unsupported-aspect" : "missing-position-facts"
      });
      continue;
    }

    const args = {
      a: pointSlug(aspect.from),
      b: pointSlug(aspect.to),
      aspect: normalizedAspect,
      signA: pointSlug(first.sign),
      signB: pointSlug(second.sign)
    };
    let normalized;

    try {
      normalized = normalizeCardArgs(args);
    } catch (error) {
      report.skipped.push({
        aspect: `${aspect.from} ${aspect.type} ${aspect.to}`,
        reason: error instanceof Error && "code" in error ? String(error.code) : "source-gap"
      });
      continue;
    }

    const contentKey = contentKeyFor(normalized);
    const existing = await existingCard(contentKey);

    if (existing) {
      report.cached += 1;
      report.cards.push({ contentKey, status: `cached-${existing.status.toLowerCase()}` });
      continue;
    }

    const routed = await generateWithJudgeRouting(args);
    const { result } = routed;

    if (result.status === "skipped") {
      report.skipped.push({
        aspect: `${aspect.from} ${aspect.type} ${aspect.to}`,
        reason: result.reason ?? "source-gap"
      });
      continue;
    }

    if (!result.facts) {
      throw new Error("Sky-aspect generator returned no normalized facts.");
    }

    const saved = await saveRoutedCard({ aspect, first, routed, second });
    report.generated += 1;
    report.clean += saved.clean ? 1 : 0;
    report.autoPublished += saved.canAutoPublish ? 1 : 0;
    report.needsReview += saved.gate === "human-review" ? 1 : 0;
    report.calibrationHeld += saved.gate === "auto-publish" && !saved.canAutoPublish ? 1 : 0;
    report.judgeRegenerated += routed.judgePasses > 1 ? 1 : 0;
    report.retried += routed.totalAttempts > routed.judgePasses ? 1 : 0;
    report.trimCloseCalls += routed.trimClose.calls;
    report.trimCloseFired += routed.trimClose.fired;
    report.trimCloseUnchanged += routed.trimClose.unchanged;
    report.trimCloseRejected += routed.trimClose.rejected;
    report.trimCloseErrors += routed.trimClose.errors;
    report.cards.push({
      contentKey,
      status: saved.canAutoPublish
        ? "live-auto-publish"
        : saved.gate === "auto-publish"
          ? "draft-calibration-held"
          : "needs-review",
      attempts: routed.totalAttempts,
      trimCloseFired: routed.trimClose.fired
    });
  }

  return report;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    sendJson(res, 405, { error: "Use GET or POST." });
    return;
  }

  if (!isAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    const report = await generateCurrentMatrix();
    sendJson(res, 200, { ok: true, report });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown sky-aspect matrix generation error."
    });
  }
}
