import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ContentSourceRepairPlan = {
  schema: "content-studio-source-repair-plan/v1";
  contentKey: string;
  title: string;
  candidatePath: string;
  candidateSha256: string;
  reviewStatus: "needs_review";
  ownerApproved: false;
  promotionAuthorized: false;
  approvalStatement: string;
  article: {
    opening: string;
    tension: string;
    development: string;
    close: string;
  };
  body: string;
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sunVirgoCandidatePath = "packages/astro-knowledge/review/sun-virgo-spine-rewrite-v1/candidate.json";

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Source-repair candidate is missing ${field}.`);
  }
  return value;
}

function sunVirgoRepairPlan(): ContentSourceRepairPlan {
  const candidate = JSON.parse(
    fs.readFileSync(path.join(repoRoot, sunVirgoCandidatePath), "utf8")
  ) as Record<string, unknown>;
  const articleValue = candidate.article;

  if (!articleValue || typeof articleValue !== "object" || Array.isArray(articleValue)) {
    throw new Error("Sun in Virgo source-repair candidate is missing its article.");
  }
  if (
    candidate.contentKey !== "fallback-hook/sky-sign-copy/sun/virgo"
    || candidate.review_status !== "needs_review"
    || candidate.ownerApproved !== false
    || candidate.promotionAuthorized !== false
  ) {
    throw new Error("Sun in Virgo source-repair candidate governance metadata changed unexpectedly.");
  }

  const articleRecord = articleValue as Record<string, unknown>;
  const article = {
    opening: requiredString(articleRecord.opening, "article.opening"),
    tension: requiredString(articleRecord.tension, "article.tension"),
    development: requiredString(articleRecord.development, "article.development"),
    close: requiredString(articleRecord.close, "article.close")
  };
  const body = requiredString(candidate.body_you, "body_you");
  const expectedBody = [article.opening, article.tension, article.development, article.close].join("\n\n");

  if (body !== expectedBody) {
    throw new Error("Sun in Virgo source-repair candidate body does not match its four article sections.");
  }

  const candidateSha256 = sha256(JSON.stringify({ article, body }));

  return {
    schema: "content-studio-source-repair-plan/v1",
    contentKey: candidate.contentKey,
    title: "Sun in Virgo replacement",
    candidatePath: sunVirgoCandidatePath,
    candidateSha256,
    reviewStatus: "needs_review",
    ownerApproved: false,
    promotionAuthorized: false,
    approvalStatement: `I approve the exact Sun in Virgo replacement identified by SHA-256 ${candidateSha256} and authorize it to replace the held source in the next fallback-package deployment.`,
    article,
    body
  };
}

export function contentSourceRepairPlan(contentKey: string): ContentSourceRepairPlan | null {
  if (contentKey === "fallback-hook/sky-sign-copy/sun/virgo") {
    return sunVirgoRepairPlan();
  }
  return null;
}
