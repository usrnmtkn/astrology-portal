import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SourceGapError,
  renderAspectPattern,
  renderHouseGlossary,
  renderNatalAngle,
  renderNatalAspect,
  renderNatalEmptyHouse,
  renderNatalPlacement
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderFallback.mjs";
import {
  NATAL_QA_RUBRIC_PATH,
  NATAL_QA_RUBRIC_SHA256,
  NATAL_QA_VERSION,
  validateNatalQaContract
} from "./validate-natal-chart-content-qa.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRowsPath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const sourceRows = JSON.parse(fs.readFileSync(path.join(repoRoot, sourceRowsPath), "utf8"));
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const aspects = ["conjunction", "sextile", "square", "trine", "opposition", "quincunx"];
const angles = ["ascendant", "midheaven", "descendant", "imum-coeli"];
const patterns = ["t_square", "grand_square", "grand_trine", "kite", "yod", "mystic_rectangle"];
const voices = [
  { surface: "you", value: "you" },
  { surface: "friend", value: "Alex" }
];
const planets = [...new Set(sourceRows.vocabularyRows
  .filter((row) => row.contentKey.startsWith("fallback-vocab/planet-topic/"))
  .map((row) => row.contentKey.split("/").at(-1)))];
const aspectPoints = [...new Set(sourceRows.hookRows
  .filter((row) => row.contentKey.startsWith("fallback-hook/natal-aspect-lived/"))
  .flatMap((row) => {
    const [, , planetA, , planetB] = row.contentKey.split("/");
    return [planetA, planetB];
  })
  .filter(Boolean))].sort();

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const normalize = (value) => String(value ?? "").replace(/\r\n/gu, "\n").trim();
const sentenceSplit = (value) => normalize(value).split(/(?<=[.!?])\s+/u).map((item) => item.trim()).filter(Boolean);
const diagnosticFragments = ["vocabularyRows", "hookRows", "templateRows"].flatMap((section) =>
  (sourceRows[section] ?? []).flatMap((row) => ["body", "body_you", "body_they"].flatMap((field) => {
    const value = row[field];
    if (typeof value !== "string" || value.length < 12) return [];
    const findingCodes = [];
    if (/\b(?:you|your|yours|yourself|yourselves)\b/iu.test(value)) findingCodes.push("friend_second_person_leak");
    if (/\bwhether\b/iu.test(value)) findingCodes.push("forbidden_whether");
    return findingCodes.length ? [{ contentKey: row.contentKey, field, value, findingCodes }] : [];
  }))
);

function deterministicFindings(text, surface) {
  const findings = [];
  if (!text) findings.push("empty_render");
  if (/\{\{|\}\}|SOURCE_GAP|\b(?:undefined|null|NaN)\b/u.test(text)) findings.push("unresolved_runtime_copy");
  if (surface === "friend" && /\b(?:you|your|yours|yourself|yourselves)\b/iu.test(text)) findings.push("friend_second_person_leak");
  if (/\b(?:current sky|transit(?:ing)?|exact today|this transit|while this contact is active)\b/iu.test(text)) findings.push("possible_sky_or_transit_leak");
  if (text.includes("—")) findings.push("em_dash");
  if (/\bwhether\b/iu.test(text)) findings.push("forbidden_whether");
  if (/\b(?:trust yourself|find balance|stay grounded|use this energy wisely)\.?$/iu.test(text)) findings.push("generic_ending");
  const sentences = sentenceSplit(text).map((sentence) => sentence.toLowerCase());
  if (new Set(sentences).size !== sentences.length) findings.push("duplicate_sentence");
  return [...new Set(findings)];
}

function deterministicFindingSources(text, findings) {
  const result = {};
  for (const finding of findings) {
    result[finding] = [...new Set(diagnosticFragments
      .filter((fragment) => fragment.findingCodes.includes(finding) && text.includes(fragment.value))
      .map((fragment) => fragment.contentKey))].sort();
  }
  return result;
}

const attemptsByFamily = new Map();
const gapsByFamily = new Map();
const renders = [];
const sourceGaps = [];

function increment(map, family) {
  map.set(family, (map.get(family) ?? 0) + 1);
}

function attempt({ family, surface, renderKey, route, facts, render }) {
  increment(attemptsByFamily, family);
  try {
    const result = render();
    const renderedText = normalize(result.body ?? result.parts?.join("\n\n"));
    const findings = deterministicFindings(renderedText, surface);
    const sourceKeys = [...new Set([
      ...(Array.isArray(result.sourceKeys) ? result.sourceKeys : []),
      ...(Array.isArray(result.partKeys) ? result.partKeys : []),
      result.contentKey,
      result.templateKey
    ].filter(Boolean))];
    renders.push({
      family,
      surface,
      renderKey,
      route,
      facts,
      headline: normalize(result.headline),
      renderedText,
      renderedTextSha256: sha256(renderedText),
      sourceKeys,
      deterministicFindings: findings,
      deterministicFindingSources: deterministicFindingSources(renderedText, findings),
      wholePassageReviewStatus: "pending_semantic_review"
    });
  } catch (error) {
    if (error instanceof SourceGapError) {
      increment(gapsByFamily, family);
      sourceGaps.push({ family, surface, renderKey, route, facts, message: error.message });
      return;
    }
    throw error;
  }
}

for (const planet of planets) {
  for (const sign of signs) {
    for (let house = 1; house <= 12; house += 1) {
      for (const voice of voices) {
        attempt({
          family: "placement-composed",
          surface: voice.surface,
          renderKey: `placement/${planet}/${sign}/${house}/${voice.surface}`,
          route: voice.surface === "you" ? `/#you/placement/${planet}-${sign}-${house}h` : `/#friends/placement/${planet}-${sign}-${house}h`,
          facts: { planet, sign, house },
          render: () => renderNatalPlacement({ planet, sign, house, voice: voice.value })
        });
      }
    }
  }
}

for (const angle of angles) {
  for (const sign of signs) {
    for (const voice of voices) {
      attempt({
        family: "named-point",
        surface: voice.surface,
        renderKey: `angle/${angle}/${sign}/${voice.surface}`,
        route: voice.surface === "you" ? `/#you/placement/${angle}-${sign}` : `/#friends/placement/${angle}-${sign}`,
        facts: { angle, sign },
        render: () => renderNatalAngle({ angle, sign, voice: voice.value })
      });
    }
  }
}

for (let first = 0; first < aspectPoints.length; first += 1) {
  for (let second = first + 1; second < aspectPoints.length; second += 1) {
    const planetA = aspectPoints[first];
    const planetB = aspectPoints[second];
    for (const aspect of aspects) {
      for (const voice of voices) {
        attempt({
          family: "natal-aspect",
          surface: voice.surface,
          renderKey: `natal-aspect/${planetA}/${aspect}/${planetB}/${voice.surface}`,
          route: voice.surface === "you" ? `/#you/aspect/${planetA}-${aspect}-${planetB}` : `/#friends/aspect/${planetA}-${aspect}-${planetB}`,
          facts: { planetA, aspect, planetB },
          render: () => renderNatalAspect({ planetA, aspect, planetB, voice: voice.value })
        });
      }
    }
  }
}

for (const type of patterns) {
  for (const voice of voices) {
    attempt({
      family: "natal-aspect-pattern",
      surface: voice.surface,
      renderKey: `natal-pattern/${type}/${voice.surface}`,
      route: voice.surface === "you" ? `/#you/pattern/${type}` : `/#friends/pattern/${type}`,
      facts: { type },
      render: () => renderAspectPattern({ type, apexTitle: "Saturn", voice: voice.value })
    });
  }
}

for (let house = 1; house <= 12; house += 1) {
  for (const sign of signs) {
    for (let rulerHouse = 1; rulerHouse <= 12; rulerHouse += 1) {
      if (rulerHouse === house) continue;
      for (const voice of voices) {
        attempt({
          family: "empty-house",
          surface: voice.surface,
          renderKey: `empty-house/${house}/${sign}/ruler-${rulerHouse}/${voice.surface}`,
          route: voice.surface === "you" ? `/#you/empty-house/${house}-${sign}-${rulerHouse}` : `/#friends/empty-house/${house}-${sign}-${rulerHouse}`,
          facts: { house, sign, rulerHouse },
          render: () => renderNatalEmptyHouse({ house, sign, rulerHouse, voice: voice.value })
        });
      }
    }
  }
}

for (let house = 1; house <= 12; house += 1) {
  for (const voice of voices) {
    attempt({
      family: "glossary",
      surface: voice.surface,
      renderKey: `house-glossary/${house}/${voice.surface}`,
      route: voice.surface === "you" ? `/#you/house/${house}` : `/#friends/house/${house}`,
      facts: { house },
      render: () => renderHouseGlossary({ house, voice: voice.value })
    });
  }
}

const unique = new Map();
for (const render of renders) {
  const dedupeKey = `${render.surface}:${render.renderedTextSha256}`;
  const existing = unique.get(dedupeKey);
  if (existing) {
    existing.occurrences.push({ family: render.family, renderKey: render.renderKey, route: render.route, facts: render.facts, sourceKeys: render.sourceKeys });
  } else {
    unique.set(dedupeKey, {
      reviewId: `natal-qa-${render.surface}-${render.renderedTextSha256.slice(0, 16)}`,
      surface: render.surface,
      headline: render.headline,
      renderedText: render.renderedText,
      renderedTextSha256: render.renderedTextSha256,
      deterministicFindings: render.deterministicFindings,
      deterministicFindingSources: render.deterministicFindingSources,
      wholePassageReviewStatus: render.wholePassageReviewStatus,
      occurrences: [{ family: render.family, renderKey: render.renderKey, route: render.route, facts: render.facts, sourceKeys: render.sourceKeys }]
    });
  }
}

const uniqueReviewQueue = [...unique.values()].sort((a, b) => a.reviewId.localeCompare(b.reviewId));
const findingCounts = {};
for (const item of uniqueReviewQueue) {
  for (const finding of item.deterministicFindings) findingCounts[finding] = (findingCounts[finding] ?? 0) + 1;
}
const familyCounts = Object.fromEntries([...attemptsByFamily.keys()].sort().map((family) => [family, {
  attempted: attemptsByFamily.get(family) ?? 0,
  rendered: renders.filter((item) => item.family === family).length,
  sourceGaps: gapsByFamily.get(family) ?? 0
}]));
const report = {
  schemaVersion: `${NATAL_QA_VERSION}-inventory-v1`,
  generatedAt: new Date().toISOString(),
  rubric: { path: NATAL_QA_RUBRIC_PATH, sha256: NATAL_QA_RUBRIC_SHA256 },
  sourceRowsPath,
  scope: { surfaces: ["you", "friend"], families: Object.keys(familyCounts) },
  governance: {
    advisoryOnly: true,
    servingChanges: false,
    autoPublish: false,
    writerPromotion: false,
    billedModelCalls: 0
  },
  summary: {
    attemptedRenders: [...attemptsByFamily.values()].reduce((total, value) => total + value, 0),
    successfulRenders: renders.length,
    sourceGaps: [...gapsByFamily.values()].reduce((total, value) => total + value, 0),
    uniqueRenderedPassages: uniqueReviewQueue.length,
    uniquePassagesWithDeterministicFindings: uniqueReviewQueue.filter((item) => item.deterministicFindings.length > 0).length,
    semanticReviewsCompleted: 0,
    semanticReviewsPending: uniqueReviewQueue.length
  },
  familyCounts,
  deterministicFindingCounts: findingCounts,
  sourceGapQueue: sourceGaps.sort((a, b) => a.renderKey.localeCompare(b.renderKey)),
  reviewQueue: uniqueReviewQueue
};

validateNatalQaContract();
const outFlag = process.argv.indexOf("--out");
const outputPath = path.resolve(repoRoot, outFlag >= 0 ? process.argv[outFlag + 1] : "artifacts/natal-chart-content-qa-inventory-2026-08-12.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({ outputPath, ...report.summary, familyCounts, deterministicFindingCounts: findingCounts }, null, 2));
