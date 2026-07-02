const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const sourceRoot = path.join(root, "sources", "authored", "marie-satori-book");
const outputRoot = path.join(root, "generated", "tldr-astro", "authored-placements");
const outputPath = path.join(outputRoot, "authored-placements.json");

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

function readJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => path.join(dir, file));
}

const entries = [];
const sourceFiles = [];

for (const filePath of readJsonFiles(sourceRoot)) {
  const source = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const sections = Array.isArray(source.sections) ? source.sections : [];
  sourceFiles.push(path.relative(root, filePath));

  for (const section of sections) {
    const id = entryId(section);
    const sourceBody = stringValue(section.sourceBody) || stringValue(section.body);
    const astrologyBody = stringValue(section.astrologyBody);
    const tarotNotes = stringValue(section.tarotNotes);
    const businessNotes = stringValue(section.businessNotes);
    const appBody = stringValue(section.appBody);
    const draftBody = stringValue(section.draftBody);
    const matchType = normalizedMatchType(section.matchType);

    if (!id || !sourceBody || !matchType) continue;

    entries.push({
      id,
      matchType,
      planet: stringValue(section.planet),
      sign: stringValue(section.sign),
      house: stringValue(section.house),
      title: stringValue(section.title),
      body: appBody,
      sourceBody,
      astrologyBody,
      tarotNotes,
      businessNotes,
      appBody,
      draftBody,
      editStatus: stringValue(section.editStatus) || "needs_review",
      sourceDocument: stringValue(source.sourceDocument),
      sourcePath: path.relative(root, filePath),
      sourceLineRange: stringValue(section.sourceLineRange),
      sourceType: stringValue(section.sourceType) || "project_authored_book_excerpt",
      themes: Array.isArray(section.themes) ? section.themes.map(stringValue).filter(Boolean) : [],
      directPlacementBody: section.directPlacementBody === true,
      directUseAllowed: section.directUseAllowed === true,
      usage: stringValue(section.usage) || "sourceBody is preserved for review. astrologyBody is the only authored source field used for natal placement app copy. tarotNotes and businessNotes are not reader-facing in natal placement output."
    });
  }
}

fs.mkdirSync(outputRoot, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify({
  id: "authored-placements",
  kind: "authored-placement-corpus",
  sourceFiles,
  entries
}, null, 2) + "\n");

console.log("Imported " + entries.length + " authored placement entries to " + path.relative(root, outputPath));
