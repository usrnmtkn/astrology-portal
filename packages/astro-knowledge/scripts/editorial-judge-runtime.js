"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { generateJudge, judgeConfig } = require("./generate-sky-aspect-cards.js");

const auditRoot = path.join(__dirname, "..", "out", "editorial-judge-audit");
const auditPath = path.join(auditRoot, "verdicts.jsonl");

const sha256 = (value) => crypto.createHash("sha256").update(String(value ?? "")).digest("hex");

function redactText(value) {
  let text = String(value ?? "");
  let replacements = 0;
  const replace = (pattern, token) => {
    text = text.replace(pattern, () => {
      replacements += 1;
      return token;
    });
  };

  replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]");
  replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g, "[REDACTED_PHONE]");
  // Handles need their leading whitespace preserved.
  text = text.replace(/(^|\s)@[A-Za-z0-9_]{2,30}\b/g, (match, prefix) => {
    replacements += 1;
    return `${prefix}[REDACTED_HANDLE]`;
  });

  return { text, replacements };
}

function privacyPolicy() {
  const mode = String(process.env.EDITORIAL_JUDGE_PRIVACY_MODE || "redact").trim().toLowerCase();
  if (!new Set(["redact", "approved-provider"]).has(mode)) {
    throw new Error("EDITORIAL_JUDGE_PRIVACY_MODE must be 'redact' or 'approved-provider'.");
  }
  if (mode === "approved-provider" && process.env.EDITORIAL_JUDGE_PROVIDER_APPROVED !== "1") {
    throw new Error("Approved-provider mode requires EDITORIAL_JUDGE_PROVIDER_APPROVED=1.");
  }
  return mode;
}

function assertLiveJudgeAuthorized({ calibration = false } = {}) {
  if (process.env.TLDR_ALLOW_LIVE_LLM_JUDGE !== "1") {
    throw new Error("Live LLM judging is disabled. Run it only as an authorized CI/admin action with TLDR_ALLOW_LIVE_LLM_JUDGE=1.");
  }
  if (calibration && process.env.TLDR_ALLOW_LIVE_LLM_CALIBRATION !== "1") {
    throw new Error("Live calibration also requires TLDR_ALLOW_LIVE_LLM_CALIBRATION=1.");
  }
}

function appendAudit(record) {
  fs.mkdirSync(auditRoot, { recursive: true });
  fs.appendFileSync(auditPath, `${JSON.stringify(record)}\n`, "utf8");
}

function normalizeScore(value) {
  const score = Number(value);
  return Number.isFinite(score) && score >= 1 && score <= 3 ? score : 1;
}

async function runJudgeSamples({
  content,
  prompt,
  promptVersion,
  rubric,
  rubricVersion,
  samples = 1,
  temperature = 0.1,
  judgeFn,
  parseVerdict,
  context = {},
  calibration = false
}) {
  const injected = typeof judgeFn === "function";
  let outboundPrompt = prompt;
  let privacyMode = "injected-test";
  let redactionCount = 0;
  let config = { provider: "injected", model: "injected", temperature };

  if (!injected) {
    assertLiveJudgeAuthorized({ calibration });
    privacyMode = privacyPolicy();
    config = { ...judgeConfig(context.modelSurface || context.surface || "default"), temperature };
    if (privacyMode === "redact") {
      const redacted = redactText(prompt);
      outboundPrompt = redacted.text;
      redactionCount = redacted.replacements;
    }
  }

  const modelSurface = context.modelSurface || context.surface || "default";
  const fn = judgeFn || ((value) => generateJudge(value, { temperature, surface: modelSurface }));
  const count = Math.max(1, Number(samples) || 1);
  const verdicts = [];
  for (let i = 0; i < count; i += 1) {
    verdicts.push(parseVerdict(await fn(outboundPrompt, context)));
  }

  const scores = verdicts.map((verdict) => normalizeScore(verdict.score)).sort((a, b) => a - b);
  const median = scores[Math.floor(scores.length / 2)];
  const chosen = verdicts.find((verdict) => normalizeScore(verdict.score) === median) || verdicts[0];
  const disagreement = new Set(scores).size > 1 || new Set(verdicts.map((verdict) => verdict.verdict || "")).size > 1;
  const contractViolation = verdicts.some((verdict) => verdict.contractViolation);
  const contractIssues = [...new Set(verdicts.flatMap((verdict) => Array.isArray(verdict.contractIssues) ? verdict.contractIssues : []))];
  const audit = {
    schemaVersion: 1,
    recordedAt: new Date().toISOString(),
    promptVersion: promptVersion || `${rubricVersion}:prompt-v1`,
    rubricVersion,
    promptSha256: sha256(prompt),
    rubricSha256: sha256(rubric),
    contentSha256: sha256(content),
    provider: config.provider,
    model: config.model,
    releaseId: config.releaseId || null,
    registryVersion: config.registryVersion || null,
    registryLaneId: config.laneId || null,
    registryState: config.registryState || null,
    registryOverride: Boolean(config.registryOverride),
    evaluationSetVersion: config.evaluationSetVersion || null,
    policyVersion: config.policyVersion || null,
    reasoningEffort: config.reasoningEffort || null,
    temperature,
    samples: count,
    scores,
    verdicts: verdicts.map((verdict) => ({
      score: normalizeScore(verdict.score),
      verdict: verdict.verdict || "",
      failedChecks: Array.isArray(verdict.failedChecks) ? verdict.failedChecks : [],
      contractViolation: Boolean(verdict.contractViolation),
      contractIssues: Array.isArray(verdict.contractIssues) ? verdict.contractIssues : [],
      outputSha256: sha256(JSON.stringify(verdict))
    })),
    disagreement,
    contractViolation,
    contractIssues,
    privacyMode,
    redactionCount,
    context
  };

  if (!injected) appendAudit(audit);

  return {
    ...chosen,
    score: median,
    samples: count,
    disagreement,
    contractViolation,
    contractIssues,
    audit
  };
}

module.exports = {
  assertLiveJudgeAuthorized,
  auditPath,
  privacyPolicy,
  redactText,
  runJudgeSamples,
  sha256
};
