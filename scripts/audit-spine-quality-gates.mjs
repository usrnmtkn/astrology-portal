#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { evaluateSpineQuality, spineQualityElementsForFamily, SPINE_QUALITY_REQUIREMENTS } from "../src/astro-writing/spineQuality.mjs";
import { validateCopy } from "../src/astro-writing/validateCopy.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3/sky-placement-article-spine-v1");
const venusApprovalRoot = path.join(repoRoot, "packages/astro-knowledge/review/writing-pipeline-v3/venus-libra-owner-approved-v1");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));

const venusArticle = fs.readFileSync(path.join(venusApprovalRoot, "article.txt"), "utf8");
const venusParagraphs = venusArticle.trimEnd().split(/\n\s*\n/u);
if (venusParagraphs.length !== 7) throw new Error(`VENUS_OWNER_ARTICLE_PARAGRAPH_DRIFT:${venusParagraphs.length}`);
const venus = {
  opening: venusParagraphs.slice(0, 2).join("\n\n"),
  tension: venusParagraphs[2],
  development: venusParagraphs.slice(3, 6).join("\n\n"),
  close: venusParagraphs[6]
};
const venusEvaluation = evaluateSpineQuality({
  family: "fast-mover-article",
  plan: { object: "venus", sign: "libra" },
  copy: venus,
  spineElements: {
    planet: venusParagraphs[0],
    condition: venusParagraphs.slice(0, 2).join("\n\n"),
    handoff: venusParagraphs[0],
    thesis: venusParagraphs.slice(2, 4).join("\n\n"),
    lived_evidence: {
      text: venusParagraphs.slice(3, 5).join("\n\n"),
      scenarioCount: 2,
      scenarioParagraphSpans: [1, 1]
    },
    failure_mechanism: venusParagraphs.slice(1, 4).join("\n\n"),
    strategy: venusParagraphs[5],
    close: venusParagraphs[6]
  }
});
const venusLint = validateCopy(venus, {
  family: "fast-mover-article",
  register: "second_person",
  surface: "sky-placement-page",
  plan: { object: "venus", sign: "libra", house: null },
  expectedPlaceholders: [],
  requiredFields: ["opening", "tension", "development", "close"],
  protectedOwnerLines: venusParagraphs,
  spineElements: venusEvaluation.elements
});

const registerGold = readJson("data/writing/owner-register-gold.json");
const saturn = registerGold.find((entry) => entry.id === "register-gold:sky-placement:saturn-capricorn-v3");
if (!saturn || !Array.isArray(saturn.sections) || saturn.sections.length !== 14) throw new Error("SATURN_REGISTER_GOLD_SOURCE_GAP");
const section = saturn.sections;
const saturnEvaluation = evaluateSpineQuality({
  family: "slow-mover-article",
  plan: { object: "saturn", sign: "capricorn" },
  copy: { opening: section[0], tension: section[3], development: section.slice(4, 13).join("\n\n"), close: section[13] },
  spineElements: {
    planet: section[0],
    condition: section[1],
    handoff: section[9],
    thesis: section[3],
    lived_evidence: { text: section[4], scenarioCount: 2, scenarioParagraphSpans: [1, 1] },
    failure_mechanism: `${section[5]} ${section[6]}`,
    strategy: section[7],
    era_frame: section[8],
    recurrence: section[10],
    older_analogs: {
      text: section[11],
      verifiedSourceIds: ["saturn-capricorn-recurrence-library:older-analogs"]
    },
    collective_lesson: section[12],
    close: section[13]
  },
  conditionalLayers: {
    older_analogs: true,
    olderAnalogSourceIds: ["saturn-capricorn-recurrence-library:older-analogs"]
  }
});

if (venusEvaluation.status !== "spine-quality-complete" || venusEvaluation.failedElementCount !== 0) {
  throw new Error(`VENUS_OWNER_APPROVAL_SPINE_FAILURE:${JSON.stringify(venusEvaluation.failures)}`);
}
if (saturnEvaluation.failedElementCount !== 0) {
  throw new Error(`SATURN_EXPECTED_ALL_GATES_PASS:${JSON.stringify(saturnEvaluation.failures)}`);
}

const summary = {
  version: "spine-quality-gates-retro-audit-v1-2026-08-14",
  billedCalls: 0,
  automaticRewrites: 0,
  qualityRequirements: SPINE_QUALITY_REQUIREMENTS,
  pages: {
    venus_libra_owner_approved: venusEvaluation,
    saturn_capricorn_owner_gold: saturnEvaluation
  }
};

function markdownEvaluation(label, evaluation) {
  const rows = spineQualityElementsForFamily(evaluation.family).map((element) => {
    const reasons = evaluation.failures.filter((finding) => finding.element === element).map((finding) => finding.reason);
    return `| ${element} | ${reasons.length ? "REVIEW" : "PASS"} | ${reasons.join("; ") || "Meets the recorded gate."} |`;
  });
  return `## ${label}\n\nStatus: **${evaluation.status}**  \nFailed elements: **${evaluation.failedElementCount}**\n\n| Element | Result | Measurement |\n|---|---|---|\n${rows.join("\n")}`;
}

fs.mkdirSync(reviewRoot, { recursive: true });
fs.writeFileSync(path.join(reviewRoot, "retro-evaluation.json"), `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(path.join(reviewRoot, "retro-evaluation.md"), `# Sky Placement article spine: retro-evaluation\n\nAudit only. No copy was rewritten, staged, or served. Billed calls: **0**. Findings are advisory, but every element is required; any failed element prevents the pipeline from presenting a draft as complete.\n\n${markdownEvaluation("Venus in Libra owner-approved article", venusEvaluation)}\n\n${markdownEvaluation("Saturn in Capricorn owner reference", saturnEvaluation)}\n`);

const venusArticleSha256 = crypto.createHash("sha256").update(venusArticle).digest("hex");
const venusValidation = {
  version: "venus-libra-owner-approved-v1",
  contentKey: "fallback-hook/sky-sign-copy/venus/libra",
  status: "owner-approved",
  reviewStatus: "owner-approved",
  ownerApproved: true,
  ownerLocked: true,
  promotionAuthorized: false,
  servingAuthorized: false,
  canonicalArticleFile: "article.txt",
  articleSha256: venusArticleSha256,
  paragraphCount: venusParagraphs.length,
  spineValidation: venusEvaluation,
  deterministicValidation: {
    passed: venusLint.passed,
    violations: venusLint.violations,
    advisories: venusLint.advisories,
    counts: venusLint.counts
  },
  billedCalls: 0,
  automaticEdits: 0
};
fs.writeFileSync(path.join(venusApprovalRoot, "validation.json"), `${JSON.stringify(venusValidation, null, 2)}\n`);
fs.writeFileSync(path.join(venusApprovalRoot, "validation.md"), `# Venus in Libra owner-approved article validation\n\n- Article SHA-256: \`${venusArticleSha256}\`\n- Paragraphs: ${venusParagraphs.length}\n- Spine status: **${venusEvaluation.status}**\n- Failed spine elements: **${venusEvaluation.failedElementCount}**\n- Deterministic violations: **${venusLint.violations.length}**\n- Negation pivots: **${venusLint.counts.negationPivots}** of 1 allowed\n- Billed calls: **0**\n- Automatic edits: **0**\n- Serving authorization: **false**\n\n${markdownEvaluation("Eight-element spine", venusEvaluation)}\n`);

console.log(JSON.stringify({
  venusStatus: venusEvaluation.status,
  venusFailedElements: venusEvaluation.failedElements,
  venusDeterministicPassed: venusLint.passed,
  venusDeterministicViolations: venusLint.violations,
  venusArticleSha256,
  saturnStatus: saturnEvaluation.status,
  saturnFailedElements: saturnEvaluation.failedElements,
  output: path.relative(repoRoot, reviewRoot)
}, null, 2));
