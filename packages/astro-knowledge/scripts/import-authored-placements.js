const fs = require("fs");
const path = require("path");
const {
  buildHouseDoctrine,
  contentClass,
  separateAstrologyBody
} = require("./authored-placement-schema-separation.cjs");

const root = path.resolve(__dirname, "..");
const outputRoot = path.join(root, "generated", "tldr-astro", "authored-placements");
const outputPath = path.join(outputRoot, "authored-placements.json");
const args = process.argv.slice(2);
const argValue = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? "" : args[index + 1] ?? "";
};
const bookArg = argValue("--book");
const keepLegacyNotes = args.includes("--keep-legacy-notes");
const check = args.includes("--check");

if (!bookArg) {
  console.error("Missing required --book <owner-held-source.json>. No in-repo source default is permitted.");
  process.exit(2);
}

const bookPath = path.resolve(process.cwd(), bookArg);
if (!fs.existsSync(bookPath)) {
  console.error(`Owner-held source not found: ${bookPath}`);
  process.exit(2);
}

function stringValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function key(value) {
  return stringValue(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ordinal(value) {
  const number = Number.parseInt(stringValue(value), 10);
  if (!Number.isFinite(number)) return "";
  const suffix = number % 100 >= 11 && number % 100 <= 13
    ? "th"
    : number % 10 === 1
      ? "st"
      : number % 10 === 2
        ? "nd"
        : number % 10 === 3
          ? "rd"
          : "th";
  return String(number) + suffix;
}

function entryId(section) {
  const matchType = key(section.matchType);
  const planet = key(section.planet);
  const sign = key(section.sign);
  const house = ordinal(section.house);
  const houseId = house ? house + "-house" : "";

  if (matchType === "planet-sign-house" || matchType === "planet_sign_house") return [planet, sign, houseId].filter(Boolean).join("-");
  if (matchType === "planet-sign" || matchType === "planet_sign") return [planet, sign].filter(Boolean).join("-");
  if (matchType === "planet-house" || matchType === "planet_house") return [planet, houseId].filter(Boolean).join("-");
  if (matchType === "sign-house" || matchType === "sign_house") return [sign, houseId].filter(Boolean).join("-");
  if (matchType === "planet-concept" || matchType === "planet_concept") return [planet, "concept"].filter(Boolean).join("-");
  if (matchType === "planet") return planet;
  if (matchType === "sign") return sign;
  if (matchType === "house") return houseId;

  return key(section.id || section.title);
}

function normalizedMatchType(value) {
  return key(value).replace(/-/g, "_");
}

const entries = [];
const source = JSON.parse(fs.readFileSync(bookPath, "utf8"));
const sections = Array.isArray(source.sections) ? source.sections : [];

for (const section of sections) {
    const id = entryId(section);
    const sourceBody = stringValue(section.sourceBody) || stringValue(section.body);
    const separated = separateAstrologyBody(stringValue(section.astrologyBody));
    const tarotNotes = stringValue(section.tarotNotes);
    const businessNotes = stringValue(section.businessNotes);
    const appBody = stringValue(section.appBody);
    const draftBody = stringValue(section.draftBody);
    const matchType = normalizedMatchType(section.matchType);

    if (!id || !sourceBody || !matchType) continue;

    const entry = {
      id,
      matchType,
      planet: stringValue(section.planet),
      sign: stringValue(section.sign),
      house: stringValue(section.house),
      title: stringValue(section.title),
      body: appBody,
      astrologyBody: separated.astrologyBody,
      astrologySupport: "",
      readerCopy: "",
      placementMechanism: "",
      sourceExcerpt: "",
      tarotCorrespondence: separated.tarotCorrespondence,
      naturalZodiacAnalogy: separated.naturalZodiacAnalogy,
      appBody,
      draftBody,
      editStatus: stringValue(section.editStatus) || "needs_review",
      sourceLineRange: stringValue(section.sourceLineRange),
      sourceType: stringValue(section.sourceType) || "project_authored_book_excerpt",
      themes: Array.isArray(section.themes) ? section.themes.map(stringValue).filter(Boolean) : [],
      directPlacementBody: section.directPlacementBody === true,
      directUseAllowed: section.directUseAllowed === true,
      sourceProvenance: {
        sourceFamily: "MS-CA",
        sourceKey: stringValue(section.id),
        sourceLineRange: stringValue(section.sourceLineRange),
        governance: "owner-authored-source-review-needed",
        fullExtractSha256: "4d5a55cbe4266b91144f3652014998a29f8141362a6cfbad7ab40cea1e17b47b"
      },
      editorialStatus: {
        contentClass: contentClass(section),
        reviewState: "review_needed",
        readerCopyClassification: "not_assessed",
        astrologySupportExtraction: "not_extracted",
        placementMechanismExtraction: "not_extracted",
        exactMatchIsProvenanceOnly: true
      },
      ownerApproved: false,
      servingEligible: false,
      usage: "astrologyBody remains the only production-consumed authored field. Separated fields are review-only and fail-closed."
    };
    if (keepLegacyNotes) {
      entry.sourceBody = sourceBody;
      entry.tarotNotes = tarotNotes;
      entry.businessNotes = businessNotes;
    }
    entries.push(entry);
}

const corpus = {
  id: "authored-placements",
  kind: "authored-placement-corpus",
  status: "review_needed",
  sourceIds: ["MS-CA"],
  sourceManifest: "packages/astro-knowledge/review/friends-transit-house-licenses-v3/source-manifest.json",
  houseDoctrine: buildHouseDoctrine(sections),
  governance: {
    ownerApproved: false,
    servingEligible: false,
    productionConsumerField: "astrologyBody",
    tarotEnabledForOrdinaryAstrology: false
  },
  schemaSeparation: {
    sentenceGranularity: true,
    houseDoctrineNormalizedOncePerHouse: true,
    placementMechanismStatus: "not_extracted_review_needed",
    readerCopyNeverInferred: true,
    shortEntryCountNotReclassifiedAsCopy: 93
  },
  entries
};
const output = JSON.stringify(corpus, null, 2) + "\n";

if (check) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== output) {
    console.error("STALE: authored placements do not match the owner-held source and importer.");
    process.exit(1);
  }
  console.log("Authored placements are current.");
  process.exit(0);
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(outputPath, output);

console.log(JSON.stringify({
  importedEntries: entries.length,
  houseDoctrineRecords: corpus.houseDoctrine.length,
  tarotSeparatedEntries: entries.filter((entry) => entry.tarotCorrespondence).length,
  naturalZodiacSeparatedEntries: entries.filter((entry) => entry.naturalZodiacAnalogy).length,
  legacyNotesRetained: keepLegacyNotes,
  output: path.relative(root, outputPath)
}, null, 2));
