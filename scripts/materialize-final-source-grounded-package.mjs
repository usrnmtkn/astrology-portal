#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..").replace(/^\/Users\/mprez\/Code\//, "/Users/mprez/code/");
const packageRoot = process.env.TLDR_FINAL_SOURCE_PACKAGE
  ? path.resolve(process.env.TLDR_FINAL_SOURCE_PACKAGE)
  : "/private/tmp/tldr-astro-handoff-final/tldr-astro-handoff-final";

const sourcePath = path.join(packageRoot, "tldr-astro-records.json");
const exemplarsPath = path.join(packageRoot, "source-derived-clause-exemplars.json");
const outputPath = path.join(repoRoot, "scripts/content-source/final-source-grounded-dashboard-records.json");
const appOutputPath = path.join(repoRoot, "apps/web/src/content/finalSourceGroundedDashboardRecords.json");
const reportPath = path.join(repoRoot, "scripts/generated/final-source-grounded-preview-report.json");
const markdownReportPath = path.join(repoRoot, "scripts/generated/final-source-grounded-preview-report.md");
const natalOverlayPath = path.join(repoRoot, "tldr-astro-phrasebank/phrasebank/cc-natal-source-grounded-bundle.json");

const SIGNS = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron"];
const ASPECTS = ["conjunction", "sextile", "square", "trine", "opposition"];
const BANNED_READER_PATTERNS = [
  /the planet names the topic/i,
  /the sign describes the condition/i,
  /\bconditions\b/i,
  /\btopics\b/i,
  /\bmeets\b/i,
  /\bis your natal\b/i,
  /bringing .+ to your .+/i,
  /use it while it lasts/i,
  /background noise/i,
  /before publishing/i,
  /entries are ordered/i,
  /do not apply/i,
  /\bnot\b[^.?!]{0,70}\bbut\b[^.?!]{0,160}\bnot\b[^.?!]{0,70}\bbut\b/i,
  /\b(nervous system|self-erasure|old version of you|family trauma|addiction|abuse|illness)\b/i
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function overlayRecordsByCanonicalKey(baseRecords, overlayRecords, families) {
  const familySet = new Set(families);
  const overlayByKey = new Map(
    overlayRecords
      .filter((record) => familySet.has(record.family))
      .map((record) => [record.canonicalKey, record])
  );
  const merged = baseRecords.map((record) => (
    overlayByKey.get(record.canonicalKey) ?? record
  ));
  const existingKeys = new Set(merged.map((record) => record.canonicalKey));

  for (const record of overlayByKey.values()) {
    if (!existingKeys.has(record.canonicalKey)) {
      merged.push(record);
      existingKeys.add(record.canonicalKey);
    }
  }

  return merged;
}

function dedupeRecordsByCanonicalKey(records) {
  const byKey = new Map();

  for (const record of records) {
    byKey.set(record.canonicalKey, record);
  }

  return Array.from(byKey.values());
}

function applyNatalReviewedOverlay(records) {
  if (!fs.existsSync(natalOverlayPath)) {
    return dedupeRecordsByCanonicalKey(records);
  }

  const overlay = readJson(natalOverlayPath);
  return dedupeRecordsByCanonicalKey(
    overlayRecordsByCanonicalKey(records, overlay.records ?? [], ["natal-aspect", "natal-placement"])
  );
}

function title(value) {
  return String(value)
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function ordinal(number) {
  const value = Number(number);
  const suffix = value % 10 === 1 && value % 100 !== 11
    ? "st"
    : value % 10 === 2 && value % 100 !== 12
      ? "nd"
      : value % 10 === 3 && value % 100 !== 13
        ? "rd"
        : "th";
  return `${value}${suffix}`;
}

function sourceLane(keys) {
  const hasCc = keys.some((key) => key.startsWith("cc/"));
  const hasMs = keys.some((key) => key.startsWith("ms/"));
  if (hasCc && hasMs) return "composed";
  if (hasMs) return "ms";
  return "cc";
}

function normalizeSentence(value) {
  const text = String(value ?? "")
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\bmeets\b/gi, "works with")
    .replace(/\bconditions\b/gi, "circumstances")
    .replace(/\btopics\b/gi, "matters")
    .replace(/\bbackground noise\b/gi, "something vague")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return "";
  return `${text.charAt(0).toUpperCase()}${text.slice(1).replace(/[.;:,]+$/, "")}`;
}

function truncateClause(value, max = 170) {
  const text = normalizeSentence(value);
  if (text.length <= max) return text;
  const clipped = text.slice(0, max);
  const punctuationCut = Math.max(
    clipped.lastIndexOf("."),
    clipped.lastIndexOf(";"),
    clipped.lastIndexOf(":")
  );
  const cutIndex = punctuationCut > 80 ? punctuationCut : Math.max(clipped.lastIndexOf(" "), 80);
  return clipped
    .slice(0, cutIndex)
    .replace(/\b(ask for|and|or|the|a|an|to|of|with|when|where)$/i, "")
    .replace(/[,:;.\s]+$/, "")
    .trim();
}

function parsePlanetSignKey(key) {
  const match = key.match(/^cc\/planet-in-sign\/([a-z-]+)-in-([a-z-]+)$/);
  if (!match) return null;
  if (!PLANETS.includes(match[1]) || !SIGNS.includes(match[2])) return null;
  return { planet: match[1], sign: match[2] };
}

function parseAspectPairKey(key) {
  const match = key.match(/^cc\/aspect-pair\/([a-z-]+)-(conjunction|sextile|square|trine|opposition)-([a-z-]+)$/);
  if (!match) return null;
  if (!PLANETS.includes(match[1]) || !PLANETS.includes(match[3])) return null;
  return { first: match[1], aspect: match[2], second: match[3] };
}

function assertSourcesExist(record, sourceKeys) {
  const missing = sourceKeys.filter((key) => !record.byKey.has(key));
  if (missing.length) {
    throw new Error(`Missing source keys: ${missing.join(", ")}`);
  }
}

function validateReaderCopy(value, key) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`Empty preview for ${key}`);
  if (/\{\{[^}]+\}\}/.test(text)) throw new Error(`Unresolved template slot for ${key}`);
  for (const pattern of BANNED_READER_PATTERNS) {
    if (pattern.test(text)) throw new Error(`Banned reader seam ${pattern} in ${key}: ${text}`);
  }
}

function makeClause({ key, family, surface, text, friendText, sourceKeys, notes = "" }) {
  return {
    key,
    family,
    surface,
    text_you: text,
    text_they: friendText ?? text.replace(/\byour\b/g, "their").replace(/\byou\b/g, "they"),
    source_keys: sourceKeys,
    source_lane: sourceLane(sourceKeys),
    review_status: "draft",
    notes_editor_only: notes
  };
}

function makeRecord({ canonicalKey, family, surface, focalDirection = null, classification = null, durationClass = null, templates, clauses, sourceKeys, eligibility = {}, priority = {}, validation = {}, factsRequired = [], preview }) {
  return {
    canonicalKey,
    family,
    surface,
    focalDirection,
    classification,
    durationClass,
    templates,
    clauses,
    sourceKeys,
    eligibility,
    priority,
    validation: {
      state: "READY",
      sourceKeysValid: true,
      templateDoesNotSupplyFacts: true,
      ...validation
    },
    revision: {
      package: "tldr-astro-handoff-final-source-grounded-templates",
      generatedBy: "scripts/materialize-final-source-grounded-package.mjs"
    },
    factsRequired,
    preview
  };
}

function aspectClassification(aspect, other) {
  if (aspect === "trine" || aspect === "sextile") {
    return { classification: "supportive", support_score: 82, friction_score: 18, reason: "Flowing aspect default." };
  }
  if (aspect === "opposition" || aspect === "square") {
    if (other === "venus" || other === "jupiter") {
      return { classification: "mixed", support_score: 56, friction_score: 44, reason: "Benefic hard-aspect override keeps opportunity visible." };
    }
    return { classification: "challenging", support_score: 24, friction_score: 76, reason: "Hard aspect default." };
  }
  if (["venus", "jupiter", "sun", "moon"].includes(other)) {
    return { classification: "supportive", support_score: 72, friction_score: 28, reason: "Conjunction inherits a supportive body nature." };
  }
  if (["mars", "saturn"].includes(other)) {
    return { classification: "challenging", support_score: 34, friction_score: 66, reason: "Conjunction inherits a more demanding body nature." };
  }
  return { classification: "mixed", support_score: 50, friction_score: 50, reason: "Conjunction requires editorial review." };
}

const source = readJson(sourcePath).records;
const exemplars = readJson(exemplarsPath).records ?? [];
const byKey = new Map(source.map((record) => [record.key, record]));
const context = { byKey };
const dashboardRecords = [];
const sourceGaps = [];

for (const key of ["cc/planet/sun", "cc/planet/moon", "cc/house/1", "cc/aspect/trine"]) {
  if (!byKey.has(key)) throw new Error(`Package source is missing required seed key ${key}`);
}

const exactPlanetSign = source
  .map((record) => ({ source: record, parsed: parsePlanetSignKey(record.key) }))
  .filter((item) => item.parsed);

for (const { source: planetSignRecord, parsed } of exactPlanetSign) {
  const planetKey = `cc/planet/${parsed.planet}`;
  const signBehaviorKey = `cc/sign/${parsed.sign}/lived-behaviors`;
  const sourceKeys = [planetSignRecord.key, planetKey, signBehaviorKey].filter((key) => byKey.has(key));
  assertSourcesExist(context, sourceKeys);

  for (let house = 1; house <= 12; house += 1) {
    const houseKey = `cc/house/${house}`;
    const allSourceKeys = [...sourceKeys, houseKey].filter((key) => byKey.has(key));
    const planet = title(parsed.planet);
    const sign = title(parsed.sign);
    const houseText = truncateClause(byKey.get(houseKey)?.text, 120).toLowerCase();
    const sourceTexture = truncateClause(planetSignRecord.text, 150).toLowerCase();
    const canonicalKey = `dashboard.natal-placement.${parsed.planet}.${parsed.sign}.house_${house}`;
    const coreBehavior = `${planet} in ${sign} describes a way of moving through life where ${sourceTexture}`;
    const houseSynthesis = `In the ${ordinal(house)} house, that pattern becomes visible through ${houseText}`;
    const development = `The useful move is to keep the ${sign} style present while making one concrete choice in this house area.`;
    const preview = {
      you: `${coreBehavior}. ${houseSynthesis}. ${development}`,
      they: `${planet} in ${sign} describes a way they move through life where ${sourceTexture}. In the ${ordinal(house)} house, that pattern becomes visible through ${houseText}. The useful move is to keep the ${sign} style present while they make one concrete choice in this house area.`
    };

    validateReaderCopy(preview.you, canonicalKey);
    dashboardRecords.push(makeRecord({
      canonicalKey,
      family: "natal-placement",
      surface: "you|friend",
      templates: {
        compact: "{{core_behavior}}",
        expanded: "{{core_behavior}} {{house_synthesis}} {{developmental_task}}"
      },
      clauses: {
        core_behavior: makeClause({
          key: `${canonicalKey}.core_behavior`,
          family: `placement/core-behavior/${parsed.planet}/${parsed.sign}`,
          surface: "natal-placement",
          text: coreBehavior,
          friendText: preview.they.split(". ")[0],
          sourceKeys
        }),
        house_synthesis: makeClause({
          key: `${canonicalKey}.house_synthesis`,
          family: `placement/sign-in-house/${parsed.planet}/${parsed.sign}/${house}`,
          surface: "natal-placement",
          text: houseSynthesis,
          sourceKeys: allSourceKeys
        }),
        developmental_task: makeClause({
          key: `${canonicalKey}.developmental_task`,
          family: `placement/house-development/${parsed.planet}/${parsed.sign}/${house}`,
          surface: "natal-placement",
          text: development,
          sourceKeys: allSourceKeys
        })
      },
      sourceKeys: allSourceKeys,
      eligibility: { reliableBirthTimeRequiredForHouse: true },
      factsRequired: ["body", "sign", "house", "birthTimeReliability"],
      preview
    }));
  }
}

for (const planet of PLANETS) {
  for (const sign of SIGNS) {
    const hasExact = exactPlanetSign.some((item) => item.parsed.planet === planet && item.parsed.sign === sign);
    if (!hasExact) {
      sourceGaps.push({
        canonicalKey: `dashboard.natal-placement.${planet}.${sign}`,
        family: "natal-placement",
        surface: "you|friend",
        state: "SOURCE_GAP",
        missing: [`cc/planet-in-sign/${planet}-in-${sign}`],
        availableFallbackSourceKeys: [`cc/planet/${planet}`, `cc/sign/${sign}/lived-behaviors`].filter((key) => byKey.has(key)),
        requiredFacts: ["body", "sign", "house"]
      });
    }
  }
}

const aspectPairs = source
  .map((record) => ({ source: record, parsed: parseAspectPairKey(record.key) }))
  .filter((item) => item.parsed);

for (const { source: aspectRecord, parsed } of aspectPairs) {
  for (const [focal, other] of [[parsed.first, parsed.second], [parsed.second, parsed.first]]) {
    const classInfo = aspectClassification(parsed.aspect, other);
    const sourceKeys = [aspectRecord.key, `cc/planet/${focal}`, `cc/planet/${other}`, `cc/aspect/${parsed.aspect}`].filter((key) => byKey.has(key));
    assertSourcesExist(context, sourceKeys);
    const canonicalKey = `dashboard.natal-aspect.${focal}.${parsed.aspect}.${other}`;
    const texture = truncateClause(aspectRecord.text, 220).toLowerCase();
    const templates = classInfo.classification === "challenging"
      ? {
          compact: "{{concrete_difficulty}}",
          expanded: "{{concrete_difficulty}} {{protective_behavior}} {{specific_adjustment}}"
        }
      : classInfo.classification === "mixed"
        ? {
            compact: "{{available_capacity}}",
            expanded: "{{available_capacity}} {{overreach_behavior}} {{grounded_use}}"
          }
        : {
            compact: "{{integrated_capacity}}",
            expanded: "{{integrated_capacity}} {{specific_lived_situation}} {{grounding_condition}}"
          };
    const preview = classInfo.classification === "challenging"
      ? {
          you: `You may have a harder time using ${title(focal)} cleanly when ${texture}. It helps to name the pressure and choose one specific adjustment before reacting.`,
          they: `They may have a harder time using ${title(focal)} cleanly when ${texture}. It helps them name the pressure and choose one specific adjustment before reacting.`
        }
      : classInfo.classification === "mixed"
        ? {
            you: `${title(other)} can give your ${title(focal)} more range, especially when ${texture}. Watch where the same momentum starts to overreach, then bring it back to one grounded choice.`,
            they: `${title(other)} can give their ${title(focal)} more range, especially when ${texture}. Watch where the same momentum starts to overreach, then bring it back to one grounded choice.`
          }
        : {
            you: `You have an easier time using ${title(focal)} when ${texture}. This is most useful when you turn the opening into one observable choice.`,
            they: `They have an easier time using ${title(focal)} when ${texture}. This is most useful when they turn the opening into one observable choice.`
          };

    validateReaderCopy(preview.you, canonicalKey);
    dashboardRecords.push(makeRecord({
      canonicalKey,
      family: "natal-aspect",
      surface: "you|friend",
      focalDirection: `${focal}->${other}`,
      classification: classInfo.classification,
      templates,
      clauses: {
        source_texture: makeClause({
          key: `${canonicalKey}.source_texture`,
          family: `natal-aspect/situation/${focal}/${parsed.aspect}/${other}`,
          surface: "natal-aspect",
          text: texture,
          sourceKeys
        }),
        specific_adjustment: makeClause({
          key: `${canonicalKey}.specific_adjustment`,
          family: `natal-aspect/adjustment/${focal}/${parsed.aspect}/${other}`,
          surface: "natal-aspect",
          text: "choose one specific adjustment before reacting",
          sourceKeys
        })
      },
      sourceKeys,
      validation: {
        support_score: classInfo.support_score,
        friction_score: classInfo.friction_score,
        classification_reason: classInfo.reason
      },
      factsRequired: ["focalBody", "otherBody", "aspect", "orb", "focalSign", "focalHouse", "otherSign", "otherHouse"],
      preview
    }));
  }
}

for (const { source: aspectRecord, parsed } of aspectPairs) {
  for (const [transiting, natalTarget] of [[parsed.first, parsed.second], [parsed.second, parsed.first]]) {
    const sourceKeys = [aspectRecord.key, `cc/planet/${transiting}`, `cc/planet/${natalTarget}`, `cc/aspect/${parsed.aspect}`].filter((key) => byKey.has(key));
    const canonicalKey = `dashboard.personalized-transit.${transiting}.${parsed.aspect}.${natalTarget}`;
    const durationClass = ["moon", "sun", "mercury", "venus", "mars"].includes(transiting) ? "short" : "long";
    const texture = truncateClause(aspectRecord.text, 220).toLowerCase();
    const headline = durationClass === "short" ? "Choose The Next Move" : "Make The Longer Plan";
    const preview = durationClass === "short"
      ? {
          you: `${headline}. You may notice ${texture}. Use the opening for one practical choice, and avoid turning a temporary pressure point into the whole story.`,
          they: `${headline}. They may notice ${texture}. They can use the opening for one practical choice, and avoid turning a temporary pressure point into the whole story.`
        }
      : {
          you: `${headline}. You are in a longer period where ${texture}. Track what repeats, then make the limit, agreement, or priority more explicit.`,
          they: `${headline}. They are in a longer period where ${texture}. They can track what repeats, then make the limit, agreement, or priority more explicit.`
        };
    validateReaderCopy(preview.you, canonicalKey);
    dashboardRecords.push(makeRecord({
      canonicalKey,
      family: "personalized-transit",
      surface: "you|friend",
      durationClass,
      templates: durationClass === "short"
        ? {
            compact: "{{headline}}",
            expanded: "{{immediate_observation}} {{practical_advice}}"
          }
        : {
            compact: "{{headline}}",
            expanded: "{{developmental_process}} {{constructive_response}}"
          },
      clauses: {
        headline: makeClause({
          key: `${canonicalKey}.headline`,
          family: `transit/headline/${transiting}/${parsed.aspect}/${natalTarget}`,
          surface: "personalized-transit",
          text: headline,
          sourceKeys
        }),
        immediate_observation: makeClause({
          key: `${canonicalKey}.immediate_observation`,
          family: `transit/immediate-observation/${transiting}/${parsed.aspect}/${natalTarget}`,
          surface: "personalized-transit",
          text: texture,
          sourceKeys
        })
      },
      sourceKeys,
      eligibility: { thresholdDays: durationClass === "short" ? 14 : 15, exactDateFromCalculationOnly: true },
      factsRequired: ["transitingBody", "aspect", "natalTarget", "orb", "activeWindow", "passNumber", "passTotal"],
      preview
    }));
  }
}

for (const exemplar of exemplars) {
  assertSourcesExist(context, exemplar.source_keys ?? []);
}

const finalDashboardRecords = applyNatalReviewedOverlay(dashboardRecords);

const recordsByFamily = finalDashboardRecords.reduce((acc, record) => {
  acc[record.family] = (acc[record.family] ?? 0) + 1;
  return acc;
}, {});
const sourceGapsByFamily = sourceGaps.reduce((acc, record) => {
  acc[record.family] = (acc[record.family] ?? 0) + 1;
  return acc;
}, {});

const output = {
  schema: "tldrastro-final-source-grounded-dashboard-records-v1",
  generatedAt: new Date(0).toISOString(),
  package: {
    root: packageRoot,
    controllingFile: "CODEX-IMPLEMENTATION-PROMPT.md",
    sourceStore: "tldr-astro-records.json"
  },
  records: finalDashboardRecords,
  sourceGaps,
  summary: {
    readyRecords: finalDashboardRecords.length,
    sourceGaps: sourceGaps.length,
    recordsByFamily,
    sourceGapsByFamily
  }
};

const report = {
  ok: true,
  summary: output.summary,
  representativePreviews: {
    natalPlacement: finalDashboardRecords.find((record) => record.canonicalKey === "dashboard.natal-placement.sun.aquarius.house_9"),
    saturnRetroPlacement: finalDashboardRecords.find((record) => record.canonicalKey === "dashboard.natal-placement.saturn.virgo.house_4"),
    natalAspect: finalDashboardRecords.find((record) => record.canonicalKey === "dashboard.natal-aspect.venus.square.saturn"),
    transit: finalDashboardRecords.find((record) => record.canonicalKey === "dashboard.personalized-transit.saturn.square.venus"),
    mercuryRetrogradeExemplar: exemplars.find((record) => record.id === "exemplar.sky.mercury-retrograde.cancer")
  }
};

const markdown = [
  "# Final Source-Grounded Package Preview Report",
  "",
  `Ready records: ${output.summary.readyRecords}`,
  `Source gaps: ${output.summary.sourceGaps}`,
  "",
  "## Records By Family",
  "",
  ...Object.entries(recordsByFamily).map(([family, count]) => `- ${family}: ${count}`),
  "",
  "## Source Gaps By Family",
  "",
  ...Object.entries(sourceGapsByFamily).map(([family, count]) => `- ${family}: ${count}`),
  "",
  "## Representative Previews",
  "",
  ...Object.entries(report.representativePreviews).map(([name, record]) => {
    if (!record) return `### ${name}\n\nMissing preview.\n`;
    return `### ${name}\n\n${record.preview?.you ?? JSON.stringify(record.slots ?? record, null, 2)}\n\nSource keys: ${(record.sourceKeys ?? record.source_keys ?? []).join(", ")}\n`;
  })
].join("\n");

writeJson(outputPath, output);
writeJson(appOutputPath, output);
writeJson(reportPath, report);
fs.writeFileSync(markdownReportPath, `${markdown}\n`);
console.log(JSON.stringify(output.summary, null, 2));
