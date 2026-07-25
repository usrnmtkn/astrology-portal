import fs from "node:fs";
import crypto from "node:crypto";

const sourcePath = "SKY-ASPECT-EXACT-STORY-PACKETS.md";
const outputPath = "sky-aspect-exact-story-packets.json";
const auditPath = "sky-aspect-exact-story-packets-audit.json";

const source = fs.readFileSync(sourcePath, "utf8");
const packetMatches = [
  ...source.matchAll(/^### (.+)\n\n([^#]+?)(?=\n##? |$)/gm),
];

const aspectMap = {
  sextile: "sextile",
  trine: "trine",
  square: "square",
  opposite: "opposition",
  conjunct: "conjunction",
};

const splitSentences = (body) =>
  (body.match(/[^.!?]+[.!?]+/g) ?? []).map((sentence) => sentence.trim());

const lowerFirst = (text) => `${text.charAt(0).toLowerCase()}${text.slice(1)}`;

const collectiveLeadPlanets = new Set(["Moon", "Mercury", "Venus", "Mars"]);

const alreadyCollectiveOpeningPattern =
  /\b(public|collective|institution|institutional|organization|community|communities|campaign|market|markets|movement|leadership|management|manager|committee|official|officials|staff|residents|news cycle|crowd|group|team|teams|platform|system|systems|gatekeeper|gatekeepers|workers|donors|investors|audience|social story|social fact|policy|program|reform|infrastructure|authority|headline|announcement|press release|memo|email|report|grant|software|workflow)\b/i;

const records = packetMatches.map((match, index) => {
  const [planetA, aspectLabel, planetB] = match[1].split(" ");
  const aspect = aspectMap[aspectLabel];
  const body = match[2].trim().replace(/\n+/g, " ");
  const sentences = splitSentences(body);
  const collectiveLeadEligible =
    collectiveLeadPlanets.has(planetA) &&
    !alreadyCollectiveOpeningPattern.test(sentences[0]);
  const optionalCollectiveFactLead = collectiveLeadEligible
    ? `Right now, {{planetALabel}} in {{signA}} {{aspectVerb}} {{planetBLabel}} in {{signB}}, and on a collective level, ${lowerFirst(sentences[0])}`
    : null;

  return {
    id: `sky.${planetA.toLowerCase()}.${aspect}.${planetB.toLowerCase()}`,
    order: index + 1,
    planetA: planetA.toLowerCase(),
    planetB: planetB.toLowerCase(),
    aspect,
    title: match[1],
    editorialStatus:
      planetA === "Sun" && planetB === "Moon"
        ? "approved-user-locked"
        : "editorially-refined-review-ready",
    authoringMode: "complete-story-packet",
    collectiveLeadEligible,
    optionalCollectiveFactLead,
    sentenceRoles: {
      humanMoment: sentences[0],
      developmentDetail: sentences[1],
      planetaryDynamic: sentences[2],
      aspectMechanic: sentences[3],
      conditionalConsequence: sentences[4],
    },
    body,
  };
});

const sentenceCounts = records.map((record) => ({
  id: record.id,
  count: splitSentences(record.body).length,
}));

const duplicateBodies = Object.entries(
  records.reduce((map, record) => {
    map[record.body] ??= [];
    map[record.body].push(record.id);
    return map;
  }, {}),
)
  .filter(([, ids]) => ids.length > 1)
  .map(([body, ids]) => ({ body, ids }));

const allSentences = records.flatMap((record) =>
  Object.entries(record.sentenceRoles).map(([role, sentence]) => ({
    id: record.id,
    role,
    sentence,
  })),
);

const duplicateSentences = Object.entries(
  allSentences.reduce((map, item) => {
    map[item.sentence] ??= [];
    map[item.sentence].push({ id: item.id, role: item.role });
    return map;
  }, {}),
)
  .filter(([, uses]) => uses.length > 1)
  .map(([sentence, uses]) => ({ sentence, uses }));

const bannedPatterns = [
  { label: "em dash", pattern: /—/g },
  { label: "vague thing/things", pattern: /\bthings?\b/gi },
  { label: "alignment", pattern: /\balignment\b/gi },
  { label: "activation", pattern: /\bactivation\b/gi },
  { label: "steady/steadier", pattern: /\bstead(?:y|ier)\b/gi },
];

const bannedFindings = bannedPatterns.flatMap(({ label, pattern }) =>
  records.flatMap((record) =>
    [...record.body.matchAll(pattern)].map((match) => ({
      id: record.id,
      label,
      match: match[0],
    })),
  ),
);

const aspectCounts = records.reduce((counts, record) => {
  counts[record.aspect] = (counts[record.aspect] ?? 0) + 1;
  return counts;
}, {});

const planetPairCounts = records.reduce((counts, record) => {
  const pair = `${record.planetA}|${record.planetB}`;
  counts[pair] = (counts[pair] ?? 0) + 1;
  return counts;
}, {});

const structuralFindings = [
  ...(records.length === 225
    ? []
    : [{ label: "record count", expected: 225, actual: records.length }]),
  ...Object.entries(aspectCounts)
    .filter(([, count]) => count !== 45)
    .map(([aspect, count]) => ({
      label: "aspect count",
      aspect,
      expected: 45,
      actual: count,
    })),
  ...Object.entries(planetPairCounts)
    .filter(([, count]) => count !== 5)
    .map(([pair, count]) => ({
      label: "pair count",
      pair,
      expected: 5,
      actual: count,
    })),
  ...sentenceCounts
    .filter(({ count }) => count !== 5)
    .map(({ id, count }) => ({
      label: "sentence count",
      id,
      expected: 5,
      actual: count,
    })),
  ...records
    .filter((record) => !record.aspect)
    .map((record) => ({
      label: "unknown aspect",
      id: record.id,
      title: record.title,
    })),
  ...records
    .filter(
      (record) =>
        record.collectiveLeadEligible !==
        Boolean(record.optionalCollectiveFactLead),
    )
    .map((record) => ({
      label: "collective lead eligibility mismatch",
      id: record.id,
    })),
  ...records
    .filter(
      (record) =>
        record.optionalCollectiveFactLead &&
        (!record.optionalCollectiveFactLead.startsWith("Right now, ") ||
          !record.optionalCollectiveFactLead.includes(
            ", and on a collective level, ",
          )),
    )
    .map((record) => ({
      label: "invalid collective fact lead",
      id: record.id,
    })),
];

const payload = {
  id: "tldr-astro.sky-aspect.exact-story-packets",
  version: "10.1.0-review",
  surface: "sky",
  scope: "collective-current-sky-exact-aspect",
  sourceOfTruth: sourcePath,
  totalRecords: records.length,
  authoringRule:
    "Each five-sentence body is one authored unit. Do not mix sentences across records.",
  signSubstitutionRule:
    "Sign-specific language may replace only planetaryDynamic and may not change the packet's event, conflict, or consequence.",
  runtimeRule:
    "Calculated planet, sign, exact aspect, orb, phase, and timing remain immutable facts supplied by the runtime.",
  collectiveLeadRule:
    "Use optionalCollectiveFactLead only on an unpersonalized current-sky card when collectiveLeadEligible is true. It replaces both the standalone calculated fact lead and humanMoment. Never use it in natal, transit-to-natal, synastry, or other personalized copy.",
  records,
};

const canonical = `${JSON.stringify(payload, null, 2)}\n`;
fs.writeFileSync(outputPath, canonical);

const audit = {
  id: "tldr-astro.sky-aspect.exact-story-packets.audit",
  sourcePath,
  outputPath,
  totalRecords: records.length,
  totalPlanetPairs: Object.keys(planetPairCounts).length,
  aspectCounts,
  lockedSunMoonRecords: records.filter(
    (record) => record.editorialStatus === "approved-user-locked",
  ).length,
  refinedReviewReadyRecords: records.filter(
    (record) =>
      record.editorialStatus === "editorially-refined-review-ready",
  ).length,
  collectiveLeadEligibleRecords: records.filter(
    (record) => record.collectiveLeadEligible,
  ).length,
  collectiveLeadSuppressedRecords: records.filter(
    (record) => !record.collectiveLeadEligible,
  ).length,
  structuralFindings,
  bannedFindings,
  duplicateBodies,
  duplicateSentences,
  sha256: crypto.createHash("sha256").update(canonical).digest("hex"),
  passed:
    structuralFindings.length === 0 &&
    bannedFindings.length === 0 &&
    duplicateBodies.length === 0 &&
    duplicateSentences.length === 0,
};

fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`);

if (!audit.passed) {
  console.error(JSON.stringify(audit, null, 2));
  process.exitCode = 1;
} else {
  console.log(
    JSON.stringify(
      {
        totalRecords: audit.totalRecords,
        totalPlanetPairs: audit.totalPlanetPairs,
        aspectCounts: audit.aspectCounts,
        lockedSunMoonRecords: audit.lockedSunMoonRecords,
        refinedReviewReadyRecords: audit.refinedReviewReadyRecords,
        collectiveLeadEligibleRecords: audit.collectiveLeadEligibleRecords,
        collectiveLeadSuppressedRecords: audit.collectiveLeadSuppressedRecords,
        sha256: audit.sha256,
      },
      null,
      2,
    ),
  );
}
