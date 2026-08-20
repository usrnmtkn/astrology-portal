#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataRoot = path.join(root, "data");
const voiceRoot = path.join(root, "voice");
const schemaRoot = path.join(root, "schema");
const VALID_STATUSES = new Set(["TODO", "DRAFT", "REVIEWED", "SOURCE_BACKED", "LIVE"]);
const GOVERNED_EVIDENCE_ONLY_DIRS = [
  path.join(dataRoot, "points", "aspects", "sky", "four-body-unverified"),
  path.join(dataRoot, "points", "transits", "house", "owner-final")
];

const primitiveShapes = {
  planet: {
    required: ["id", "governs", "verb", "tempo", "shadow", "voiceNeutral", "status"],
    optional: ["nature", "sect", "element", "gender"],
    types: { id: "string", governs: "array:string", verb: "string", tempo: "string", shadow: "string", nature: "string", sect: "string", element: "array:string", gender: "string" }
  },
  aspect: {
    required: ["id", "dynamic", "arc", "applyingMeaning", "separatingMeaning", "voiceNeutral", "status"],
    optional: ["angle", "major", "aliases", "nature", "tradition", "traditional", "cyclic"],
    types: { id: "string", dynamic: "string", arc: "string|number", angle: "number", major: "boolean", aliases: "array:string", nature: "string", applyingMeaning: "string", separatingMeaning: "string", tradition: "string", traditional: "object", cyclic: "object" }
  },
  house: {
    required: ["id", "label", "plainTranslation", "voiceNeutral", "status"],
    types: { id: "string", label: "string", plainTranslation: "string" }
  },
  sign: {
    required: ["id", "element", "mode", "traditionalRuler", "keywords", "voiceNeutral", "status"],
    optional: ["modernRuler"],
    types: { id: "string", element: "string", mode: "string", traditionalRuler: "string", modernRuler: "string", keywords: "array:string" },
    enums: {
      element: ["fire", "earth", "air", "water"],
      mode: ["cardinal", "fixed", "mutable"]
    }
  },
  dignity: {
    required: ["id", "planet", "dignity", "signs", "voiceNeutral", "status"],
    types: { id: "string", planet: "string", dignity: "string", signs: "array:string" },
    enums: {
      dignity: ["domicile", "exaltation", "detriment", "fall"]
    }
  }
};

const entryShapes = {
  pair: {
    schemaFile: "pair.schema.json",
    required: ["id", "planetA", "planetB", "blend", "harmonious", "hard", "business", "voiceNeutral", "status"],
    optional: ["traditional", "modern", "cyclicNote", "sourceNote", "provenance"],
    types: { id: "string", planetA: "string", planetB: "string", blend: "string", harmonious: "string", hard: "string", business: "string", traditional: "string", modern: "object", cyclicNote: "string", sourceNote: "string", provenance: "object" }
  },
  transit: {
    schemaFile: "transit.schema.json",
    required: ["id", "transiting", "aspect", "other", "base", "business", "shadow", "arcApplying", "arcSeparating", "voiceNeutral", "status"],
    optional: ["tldr", "traditional", "modern", "cyclic", "readerCopy", "composedFrom", "provenance"],
    types: { id: "string", transiting: "string", aspect: "string", other: "string", base: "string", business: "string", shadow: "string", arcApplying: "string", arcSeparating: "string", tldr: "string", traditional: "string", modern: "string", cyclic: "object", readerCopy: "object", composedFrom: "array:string", provenance: "object" }
  },
  transitNatal: {
    schemaFile: "transit-natal.schema.json",
    required: ["id", "kind", "transiting", "natal", "aspect", "plainTranslation", "policy", "voiceNeutral", "status"],
    optional: ["note"],
    types: { id: "string", kind: "string", transiting: "string", natal: "string", aspect: "string", plainTranslation: "string", policy: "string", note: "string" },
    enums: { kind: ["transit-to-natal"] }
  },
  transitHouse: {
    schemaFile: "transit-house.schema.json",
    required: ["id", "kind", "transiting", "house", "tldr", "body", "business", "shadow", "advice", "source", "voiceNeutral", "status"],
    optional: ["note"],
    types: { id: "string", kind: "string", transiting: "string", house: "number", tldr: "string", body: "string", business: "string", shadow: "string", advice: "string", source: "object", note: "string" },
    enums: { kind: ["house"] }
  },
  planetary: {
    schemaFile: "planetary.schema.json",
    required: ["id", "planet", "title", "overview", "cycle", "signs", "source", "voiceNeutral", "status"],
    types: { id: "string", planet: "string", title: "string", overview: "string", cycle: "string", signs: "array", source: "object", provenance: "array:string" },
    optional: ["provenance"]
  },
  point: {
    schemaFile: "point.schema.json",
    required: ["id", "kind", "type", "core", "policy", "voiceNeutral", "status"],
    optional: ["aliases", "discovered", "orbit", "keyTransit", "note"],
    types: { id: "string", kind: "string", aliases: "array:string", type: "string", discovered: "number", orbit: "string", core: "string", keyTransit: "string", note: "string", policy: "string" },
    enums: { kind: ["point"] }
  },
  pointPlacement: {
    schemaFile: "point-placement.schema.json",
    required: ["id", "kind", "point", "tldr", "body", "business", "shadow", "policy", "voiceNeutral", "status"],
    optional: ["sign", "house", "note"],
    types: { id: "string", kind: "string", point: "string", sign: "string", house: "number", tldr: "string", body: "string", business: "string", shadow: "string", policy: "string", note: "string" },
    enums: { kind: ["sign", "house"] }
  },
  pointAspect: {
    schemaFile: "point-aspect.schema.json",
    required: ["id", "kind", "point", "aspect", "planet", "tldr", "body", "business", "shadow", "policy", "voiceNeutral", "status"],
    optional: ["note"],
    types: { id: "string", kind: "string", point: "string", aspect: "string", planet: "string", tldr: "string", body: "string", business: "string", shadow: "string", policy: "string", note: "string" },
    enums: { kind: ["natal"] }
  },
  pointTransitHouse: {
    schemaFile: "point-transit-house.schema.json",
    required: ["id", "kind", "point", "house", "tldr", "body", "business", "shadow", "advice", "policy", "voiceNeutral", "status"],
    optional: ["note"],
    types: { id: "string", kind: "string", point: "string", house: "number", tldr: "string", body: "string", business: "string", shadow: "string", advice: "string", policy: "string", note: "string" },
    enums: { kind: ["house"] }
  },
  placement: {
    schemaFile: "placement.schema.json",
    required: ["id", "kind", "planet", "key", "tldr", "body", "gift", "challenge", "voiceNeutral", "status"],
    types: { id: "string", kind: "string", planet: "string", key: "string|number", tldr: "string", body: "string", gift: "string", challenge: "string", collectiveGift: "string", supportedDomains: "array:string", unsupportedDomainWarnings: "array:string", scenarioPolicy: "string", axisPair: "object", runtimeEligible: "boolean", note: "string" },
    optional: ["source", "note", "collectiveGift", "supportedDomains", "unsupportedDomainWarnings", "scenarioPolicy", "axisPair", "runtimeEligible"],
    enums: { kind: ["sign", "house"] }
  },
  angle: {
    schemaFile: "angle.schema.json",
    required: ["id", "kind", "point", "sign", "tldr", "body", "approach", "shadow", "voiceNeutral", "status"],
    types: { id: "string", kind: "string", point: "string", sign: "string", tldr: "string", body: "string", approach: "string", shadow: "string", note: "string" },
    optional: ["note"],
    enums: { kind: ["ascendant-sign"], point: ["ascendant"] }
  },
  modifier: {
    schemaFile: "modifier.schema.json",
    required: ["id", "appliesTo", "summary", "body", "voiceNeutral", "status"],
    optional: ["role", "category", "schema", "definition", "appUsage", "note", "classes", "phases", "voidOfCourse", "bonification", "maltreatment", "overcoming", "retrograde", "station", "notApplicable", "cazimi", "combust", "underTheBeams", "freeOfBeams", "orientality", "domicile", "exaltation", "detriment", "fall", "triplicityLordsDorothean", "boundsEgyptian", "boundsNote", "decansChaldean", "decansNote", "annualProfections", "zodiacalReleasing", "planets", "rulershipPolicy", "surfacePolicy", "houseSystemPolicy", "prohibitions", "weighting", "orbs", "determination", "howToRead", "rulers", "chartSect", "planetSect", "mercuryRule", "benefics", "malefics", "sectBenefic", "sectMalefic", "inSect", "outOfSect", "paradox", "testimony"],
    types: { id: "string", appliesTo: "array:string", summary: "string", body: "string", role: "string", category: "string", schema: "string", definition: "string", appUsage: "string|array:string", note: "string", classes: "object", phases: "object", voidOfCourse: "object", bonification: "object", maltreatment: "object", overcoming: "string", retrograde: "object", station: "object", notApplicable: "array:string", cazimi: "object", combust: "object", underTheBeams: "object", freeOfBeams: "object", orientality: "object", domicile: "object", exaltation: "object", detriment: "object", fall: "object", triplicityLordsDorothean: "object", boundsEgyptian: "object", boundsNote: "string", decansChaldean: "object", decansNote: "string", annualProfections: "object", zodiacalReleasing: "object", planets: "object", rulershipPolicy: "object", surfacePolicy: "object", houseSystemPolicy: "object", prohibitions: "array:string", weighting: "array:string", orbs: "object", determination: "object", howToRead: "array:string", rulers: "object", chartSect: "object", planetSect: "object", mercuryRule: "string", benefics: "object", malefics: "object", sectBenefic: "object", sectMalefic: "object", inSect: "string", outOfSect: "string", paradox: "string", testimony: "string" }
  },
  chartRuler: {
    schemaFile: "chart-ruler.schema.json",
    required: ["id", "kind", "tldr", "meaning", "business", "voiceNeutral", "status"],
    optional: ["risingSign", "ruler", "modernCoRuler", "modernLens", "house", "shadow", "advice", "readNext"],
    types: { id: "string", kind: "string", risingSign: "string", ruler: "string", modernCoRuler: "string", modernLens: "string", house: "number", tldr: "string", meaning: "string", business: "string", shadow: "string", advice: "string", readNext: "string" },
    enums: { kind: ["chart-ruler-rising", "chart-ruler-house"] }
  },
  composite: {
    schemaFile: "composite.schema.json",
    required: ["id", "kind", "placementType", "plainTranslation", "policy", "voiceNeutral", "status"],
    optional: ["planet", "sign", "house", "aspect", "note"],
    types: { id: "string", kind: "string", placementType: "string", planet: "string", sign: "string", house: "string", aspect: "string", plainTranslation: "string", policy: "string", note: "string" },
    enums: { kind: ["composite"], placementType: ["sign", "house", "aspect"] }
  },
  lunation: {
    schemaFile: "lunation.schema.json",
    required: ["id", "kind", "phase", "sign", "title", "tldr", "theme", "twoWeekArc", "sixMonthArc", "ritual", "journalPrompt", "risingSignIntention", "policy", "voiceNeutral", "status"],
    optional: ["oppositeSign", "shadow", "integration", "tarotPrompt", "sourceNote"],
    types: { id: "string", kind: "string", phase: "string", sign: "string", oppositeSign: "string", title: "string", tldr: "string", theme: "string", shadow: "string", integration: "string", twoWeekArc: "object", sixMonthArc: "object", ritual: "object", journalPrompt: "string", tarotPrompt: "string", risingSignIntention: "object", policy: "string", sourceNote: "string" },
    enums: { kind: ["new-moon", "full-moon"], phase: ["new", "full"] }
  },
  synastryAspect: {
    schemaFile: "synastry-aspect.schema.json",
    required: ["id", "kind", "planetA", "planetB", "aspect", "plainTranslation", "policy", "voiceNeutral", "status"],
    optional: ["note", "humanMoment", "summaryShort", "summaryDeep", "tension", "advice", "weight", "authoringStatus"],
    types: { id: "string", kind: "string", planetA: "string", planetB: "string", aspect: "string", plainTranslation: "string", humanMoment: "string", policy: "string", note: "string", summaryShort: "string", summaryDeep: "string", tension: "string", advice: "string", weight: "number", authoringStatus: "string" },
    enums: { kind: ["interaspect"], authoringStatus: ["draft", "approved", "locked"] }
  },
  synastryPointContact: {
    schemaFile: "synastry-point-contact.schema.json",
    required: ["id", "kind", "contact", "plainTranslation", "policy", "voiceNeutral", "status"],
    optional: ["note"],
    types: { id: "string", kind: "string", contact: "string", plainTranslation: "string", policy: "string", note: "string" },
    enums: { kind: ["point-contact"] }
  },
  synastryHouseOverlay: {
    schemaFile: "synastry-house-overlay.schema.json",
    required: ["id", "kind", "planet", "house", "plainTranslation", "policy", "voiceNeutral", "status"],
    optional: ["note", "summaryShort", "summaryDeep", "tension", "advice", "weight", "authoringStatus"],
    types: { id: "string", kind: "string", planet: "string", house: "string", plainTranslation: "string", policy: "string", note: "string", summaryShort: "string", summaryDeep: "string", tension: "string", advice: "string", weight: "number", authoringStatus: "string" },
    enums: { kind: ["house-overlay"], authoringStatus: ["draft", "approved", "locked"] }
  },
  content: {
    schemaFile: "content.schema.json",
    required: ["id", "kind", "title", "sections", "voiceNeutral", "status"],
    optional: ["role", "category"],
    types: { id: "string", kind: "string", title: "string", sections: "array", role: "string", category: "string", voiceNeutral: "boolean", status: "string" },
    enums: { kind: ["guide", "framework", "template", "correspondence", "synastry"] }
  },
  insightCard: {
    schemaFile: "insight-card.schema.json",
    required: ["id", "kind", "displayTitle", "summary", "body", "gift", "shadow", "integration", "do", "dont", "lifeAreas", "tags", "intensity", "sourceFactors", "collectionHints", "voiceNeutral", "status"],
    optional: [],
    types: { id: "string", kind: "string", displayTitle: "string", summary: "string", body: "string", gift: "string", shadow: "string", integration: "string", do: "array:string", dont: "array:string", lifeAreas: "array:string", tags: "array:string", intensity: "number", sourceFactors: "array", collectionHints: "array:string" },
    enums: { kind: ["natal-aspect"] }
  }
};

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${filePath}: invalid JSON: ${error.message}`);
  }
}

function rel(filePath) {
  return path.relative(root, filePath);
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, name.name);
    if (name.isDirectory()) files.push(...listJsonFiles(fullPath));
    if (name.isFile() && name.name.endsWith(".json")) files.push(fullPath);
  }
  return files.sort();
}

function isLegacyPackageDataFile(filePath) {
  const absolutePath = path.resolve(filePath);
  return !GOVERNED_EVIDENCE_ONLY_DIRS.some((dir) => {
    const relativePath = path.relative(dir, absolutePath);
    return relativePath !== "" && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);
  });
}

function listLegacyPackageJsonFiles(dir) {
  return listJsonFiles(dir).filter(isLegacyPackageDataFile);
}

function assertSchemaFile(schemaFile, errors) {
  const schemaPath = path.join(schemaRoot, schemaFile);
  if (!fs.existsSync(schemaPath)) {
    errors.push(`schema/${schemaFile}: schema file is missing`);
    return;
  }
  try {
    readJson(schemaPath);
  } catch (error) {
    errors.push(error.message);
  }
}

function typeMatches(value, expected) {
  if (expected === "array:string") {
    return Array.isArray(value) && value.every((item) => typeof item === "string");
  }
  if (expected === "string|number") {
    return typeof value === "string" || typeof value === "number";
  }
  if (expected === "string|array:string") {
    return typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"));
  }
  if (expected === "array") return Array.isArray(value);
  if (expected === "boolean") return typeof value === "boolean";
  if (expected === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === expected && !Array.isArray(value);
}

function validateObject(filePath, object, shape, errors, prefix = "") {
  for (const field of shape.required) {
    if (!(field in object)) errors.push(`${rel(filePath)}: missing required field ${prefix}${field}`);
  }

  const allowed = new Set([...(shape.required || []), ...(shape.optional || [])]);
  for (const field of Object.keys(object)) {
    if (!allowed.has(field)) errors.push(`${rel(filePath)}: unexpected field ${prefix}${field}`);
  }

  for (const [field, expected] of Object.entries(shape.types)) {
    if (field in object && !typeMatches(object[field], expected)) {
      errors.push(`${rel(filePath)}: field ${prefix}${field} must be ${expected}`);
    }
  }

  if (object.voiceNeutral !== true) {
    errors.push(`${rel(filePath)}: field ${prefix}voiceNeutral must be true`);
  }

  if (!VALID_STATUSES.has(object.status)) {
    errors.push(`${rel(filePath)}: field ${prefix}status must be TODO, DRAFT, REVIEWED, SOURCE_BACKED, or LIVE`);
  }

  for (const [field, values] of Object.entries(shape.enums || {})) {
    if (field in object && !values.includes(object[field])) {
      errors.push(`${rel(filePath)}: field ${prefix}${field} must be one of ${values.join(", ")}`);
    }
  }
}

function validatePrimitiveFile(filePath, errors) {
  assertSchemaFile("primitive.schema.json", errors);
  const json = readJson(filePath);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    errors.push(`${rel(filePath)}: must be an object`);
    return;
  }
  if (typeof json.kind !== "string") errors.push(`${rel(filePath)}: field kind must be string`);
  if (!Array.isArray(json.entries)) errors.push(`${rel(filePath)}: field entries must be array`);
  if (!primitiveShapes[json.kind]) {
    errors.push(`${rel(filePath)}: unsupported primitive kind ${json.kind}`);
    return;
  }
  const expectedFile = `${json.kind === "dignity" ? "dignities" : `${json.kind}s`}.json`;
  if (path.basename(filePath) !== expectedFile) {
    errors.push(`${rel(filePath)}: primitive filename must be ${expectedFile}`);
  }
  for (const field of Object.keys(json)) {
    if (!["kind", "entries", "note", "provenance"].includes(field)) errors.push(`${rel(filePath)}: unexpected field ${field}`);
  }
  if (Array.isArray(json.entries)) {
    json.entries.forEach((entry, index) => {
      validateObject(filePath, entry, primitiveShapes[json.kind], errors, `entries[${index}].`);
    });
  }
}

function validateEntryFile(filePath, kind, errors) {
  const shape = entryShapes[kind];
  assertSchemaFile(shape.schemaFile, errors);
  const json = readJson(filePath);
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    errors.push(`${rel(filePath)}: must be an object`);
    return;
  }
  validateObject(filePath, json, shape, errors);
  if (kind === "transit" && json.readerCopy) {
    const readerCopy = json.readerCopy;
    for (const field of ["summary", "body", "approvedVia"]) {
      if (typeof readerCopy[field] !== "string" || readerCopy[field].trim() === "") {
        errors.push(`${rel(filePath)}: field readerCopy.${field} must be a non-empty string`);
      }
    }
    for (const field of Object.keys(readerCopy)) {
      if (!["summary", "body", "approvedVia", "calendarLeadIn"].includes(field)) {
        errors.push(`${rel(filePath)}: unexpected field readerCopy.${field}`);
      }
    }
    if (
      readerCopy.calendarLeadIn !== undefined
      && readerCopy.calendarLeadIn !== "date-placements-collective-level"
    ) {
      errors.push(`${rel(filePath)}: field readerCopy.calendarLeadIn has an unsupported value`);
    }
    if (json.status !== "LIVE") {
      errors.push(`${rel(filePath)}: readerCopy requires status LIVE`);
    }
  }
  const expectedName = `${json.id}.json`;
  if (json.id && path.basename(filePath) !== expectedName) {
    errors.push(`${rel(filePath)}: filename must equal id (${expectedName})`);
  }
  if (kind === "content" && Array.isArray(json.sections)) {
    json.sections.forEach((section, index) => {
      for (const field of ["id", "heading", "body"]) {
        if (!(field in section)) errors.push(`${rel(filePath)}: missing required field sections[${index}].${field}`);
      }
      for (const field of Object.keys(section)) {
        if (!["id", "heading", "body", "items"].includes(field)) {
          errors.push(`${rel(filePath)}: unexpected field sections[${index}].${field}`);
        }
      }
      if (section.id !== undefined && typeof section.id !== "string") errors.push(`${rel(filePath)}: field sections[${index}].id must be string`);
      if (section.heading !== undefined && typeof section.heading !== "string") errors.push(`${rel(filePath)}: field sections[${index}].heading must be string`);
      if (section.body !== undefined && typeof section.body !== "string") errors.push(`${rel(filePath)}: field sections[${index}].body must be string`);
      if (section.items !== undefined) {
        if (!Array.isArray(section.items)) {
          errors.push(`${rel(filePath)}: field sections[${index}].items must be array`);
        } else {
          section.items.forEach((item, itemIndex) => {
            for (const field of ["label", "body"]) {
              if (!(field in item)) errors.push(`${rel(filePath)}: missing required field sections[${index}].items[${itemIndex}].${field}`);
            }
            for (const field of Object.keys(item)) {
              if (!["label", "body"].includes(field)) {
                errors.push(`${rel(filePath)}: unexpected field sections[${index}].items[${itemIndex}].${field}`);
              }
            }
            if (item.label !== undefined && typeof item.label !== "string") errors.push(`${rel(filePath)}: field sections[${index}].items[${itemIndex}].label must be string`);
            if (item.body !== undefined && typeof item.body !== "string") errors.push(`${rel(filePath)}: field sections[${index}].items[${itemIndex}].body must be string`);
          });
        }
      }
    });
  }
  if (kind === "transitHouse") {
    if (Number.isInteger(json.house) && (json.house < 1 || json.house > 12)) {
      errors.push(`${rel(filePath)}: field house must be between 1 and 12`);
    }
    if (json.id && json.transiting && json.house && json.id !== `${json.transiting}-${json.house}`) {
      errors.push(`${rel(filePath)}: id must be ${json.transiting}-${json.house}`);
    }
    if (json.source !== undefined) {
      for (const field of ["title", "pages"]) {
        if (!(field in json.source)) errors.push(`${rel(filePath)}: missing required field source.${field}`);
      }
      for (const field of Object.keys(json.source)) {
        if (!["title", "pages"].includes(field)) errors.push(`${rel(filePath)}: unexpected field source.${field}`);
      }
      if (json.source.title !== undefined && typeof json.source.title !== "string") {
        errors.push(`${rel(filePath)}: field source.title must be string`);
      }
      if (json.source.pages !== undefined && (!Array.isArray(json.source.pages) || !json.source.pages.every(Number.isInteger))) {
        errors.push(`${rel(filePath)}: field source.pages must be array:number`);
      }
    }
  }
  if (kind === "placement" && json.source !== undefined) {
    validateSource(filePath, json.source, errors);
  }
  if (kind === "planetary") {
    if (json.id && json.planet && json.id !== json.planet) {
      errors.push(`${rel(filePath)}: id must equal planet`);
    }
    if (Array.isArray(json.signs)) {
      json.signs.forEach((signEntry, index) => {
        for (const field of ["sign", "body"]) {
          if (!(field in signEntry)) errors.push(`${rel(filePath)}: missing required field signs[${index}].${field}`);
        }
        for (const field of Object.keys(signEntry)) {
          if (!["sign", "body"].includes(field)) errors.push(`${rel(filePath)}: unexpected field signs[${index}].${field}`);
        }
        if (signEntry.sign !== undefined && typeof signEntry.sign !== "string") errors.push(`${rel(filePath)}: field signs[${index}].sign must be string`);
        if (signEntry.body !== undefined && typeof signEntry.body !== "string") errors.push(`${rel(filePath)}: field signs[${index}].body must be string`);
      });
    }
    validateSource(filePath, json.source, errors);
  }
  if (kind === "pointPlacement") {
    if (json.kind === "sign" && typeof json.sign !== "string") {
      errors.push(`${rel(filePath)}: sign point placements require field sign`);
    }
    if (json.kind === "house" && !Number.isInteger(json.house)) {
      errors.push(`${rel(filePath)}: house point placements require integer field house`);
    }
  }
  if (kind === "pointTransitHouse" && Number.isInteger(json.house) && (json.house < 1 || json.house > 12)) {
    errors.push(`${rel(filePath)}: field house must be between 1 and 12`);
  }
  if (kind === "composite") {
    if (json.placementType === "sign" && typeof json.sign !== "string") {
      errors.push(`${rel(filePath)}: composite sign entries require field sign`);
    }
    if (json.placementType === "house" && typeof json.house !== "string") {
      errors.push(`${rel(filePath)}: composite house entries require field house`);
    }
    if (json.placementType === "aspect" && typeof json.aspect !== "string") {
      errors.push(`${rel(filePath)}: composite aspect entries require field aspect`);
    }
  }
  if (kind === "insightCard") {
    if (json.intensity !== undefined && (!Number.isInteger(json.intensity) || json.intensity < 1 || json.intensity > 5)) {
      errors.push(`${rel(filePath)}: field intensity must be an integer between 1 and 5`);
    }
    const validLifeAreas = new Set(["identity", "emotions", "love", "sex", "money", "work", "home", "family", "friends", "creativity", "health", "spirituality", "power", "communication", "growth"]);
    for (const [index, lifeArea] of (json.lifeAreas || []).entries()) {
      if (!validLifeAreas.has(lifeArea)) {
        errors.push(`${rel(filePath)}: field lifeAreas[${index}] is not supported`);
      }
    }
    const validCollectionHints = new Set(["core-traits", "love-patterns", "career-patterns", "emotional-needs", "shadow-work", "relationship-bonds", "personal-growth"]);
    for (const [index, hint] of (json.collectionHints || []).entries()) {
      if (!validCollectionHints.has(hint)) {
        errors.push(`${rel(filePath)}: field collectionHints[${index}] is not supported`);
      }
    }
    for (const [index, factor] of (json.sourceFactors || []).entries()) {
      if (!factor || typeof factor !== "object" || Array.isArray(factor)) {
        errors.push(`${rel(filePath)}: field sourceFactors[${index}] must be object`);
        continue;
      }
      for (const field of ["type", "planetA", "aspect", "planetB"]) {
        if (!(field in factor)) errors.push(`${rel(filePath)}: missing required field sourceFactors[${index}].${field}`);
      }
      for (const field of Object.keys(factor)) {
        if (!["type", "planetA", "aspect", "planetB"].includes(field)) errors.push(`${rel(filePath)}: unexpected field sourceFactors[${index}].${field}`);
      }
      if (factor.type !== undefined && factor.type !== "natal-aspect") errors.push(`${rel(filePath)}: field sourceFactors[${index}].type must be natal-aspect`);
      for (const field of ["planetA", "aspect", "planetB"]) {
        if (factor[field] !== undefined && typeof factor[field] !== "string") errors.push(`${rel(filePath)}: field sourceFactors[${index}].${field} must be string`);
      }
    }
  }
}

function validateSource(filePath, source, errors) {
  if (source === undefined) return;
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    errors.push(`${rel(filePath)}: field source must be object`);
    return;
  }
  for (const field of ["title", "pages"]) {
    if (!(field in source)) errors.push(`${rel(filePath)}: missing required field source.${field}`);
  }
  for (const field of Object.keys(source)) {
    if (!["title", "pages"].includes(field)) errors.push(`${rel(filePath)}: unexpected field source.${field}`);
  }
  if (source.title !== undefined && typeof source.title !== "string") {
    errors.push(`${rel(filePath)}: field source.title must be string`);
  }
  if (source.pages !== undefined && (!Array.isArray(source.pages) || !source.pages.every(Number.isInteger))) {
    errors.push(`${rel(filePath)}: field source.pages must be array:number`);
  }
}

function validateManifestationSetFile(filePath, errors) {
  assertSchemaFile("manifestation-set.schema.json", errors);
  const collection = readJson(filePath);
  const allowedFactorTypes = new Set([
    "eclipse-house-placement",
    "eclipse-on-natal-point",
    "slow-transit-to-natal",
    "return",
    "profection-year",
    "sr-overlay"
  ]);

  if (collection.kind !== "manifestation-set-collection") {
    errors.push(`${rel(filePath)}: kind must be manifestation-set-collection`);
  }
  if (!["needs_review", "approved"].includes(collection.review_status)) {
    errors.push(`${rel(filePath)}: collection review_status must be needs_review or approved`);
  }
  if (collection.review_status === "approved" && (
    collection.approval?.status !== "owner_approved"
    || typeof collection.approval?.approvedOn !== "string"
    || typeof collection.approval?.sourcePath !== "string"
  )) {
    errors.push(`${rel(filePath)}: approved collections require owner approval provenance`);
  }
  if (!Array.isArray(collection.coverageDomains) || collection.coverageDomains.length === 0) {
    errors.push(`${rel(filePath)}: coverageDomains must be a non-empty array`);
  }
  if (!collection.records || typeof collection.records !== "object" || Array.isArray(collection.records)) {
    errors.push(`${rel(filePath)}: records must be an object keyed by record id`);
    return;
  }

  for (const [id, record] of Object.entries(collection.records)) {
    const prefix = `${rel(filePath)}: records.${id}`;
    if (!allowedFactorTypes.has(record.factorType)) {
      errors.push(`${prefix}.factorType is not supported`);
    }
    if (!record.match || typeof record.match !== "object" || Array.isArray(record.match)) {
      errors.push(`${prefix}.match must be an object`);
    }
    for (const field of ["domain", "possibleLivedManifestations", "doNotAssume"]) {
      if (!Array.isArray(record[field]) || !record[field].every((item) => typeof item === "string") || record[field].length === 0) {
        errors.push(`${prefix}.${field} must be a non-empty array:string`);
      }
    }
    if (!["needs_review", "approved"].includes(record.review_status)) {
      errors.push(`${prefix}.review_status must be needs_review or approved`);
    }
    const needsReviewClaim = record.review_status === "needs_review"
      && record.copyClaim?.text === null
      && record.copyClaim?.review_status === "needs_review";
    const approvedClaim = record.review_status === "approved"
      && typeof record.copyClaim?.text === "string"
      && record.copyClaim.text.trim().length > 0
      && record.copyClaim?.review_status === "approved";
    if (!needsReviewClaim && !approvedClaim) {
      errors.push(`${prefix}.copyClaim status and text must match the record review status`);
    }
    if (typeof record.provenance !== "string") {
      errors.push(`${prefix}.provenance must be string`);
    }
  }
}

function listDirectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((name) => name.isFile() && name.name.endsWith(".json"))
    .map((name) => path.join(dir, name.name))
    .sort();
}

function flattenText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flattenText).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(flattenText).join(" ");
  return "";
}

function isNonServingSourceLedger(value) {
  return Boolean(
    value
    && typeof value === "object"
    && Array.isArray(value.sourceRecords)
    && value.sourceRecords.length > 0
    && value.sourceRecords.every((record) => record && record.serving === false)
  );
}

function isNonServingManifestationSet(value) {
  return Boolean(value && value.kind === "manifestation-set-collection");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateVoicePolicy(errors) {
  const bannedWordsPath = path.join(voiceRoot, "banned-words.json");
  if (!fs.existsSync(bannedWordsPath)) return;

  let bannedWords;
  let waivedTerms;
  try {
    const wordPolicy = readJson(bannedWordsPath);
    bannedWords = wordPolicy.bannedWords || [];
    waivedTerms = wordPolicy.waivedTerms || [];
  } catch (error) {
    errors.push(error.message);
    return;
  }

  if (!Array.isArray(bannedWords)) {
    errors.push("voice/banned-words.json: bannedWords must be an array");
    return;
  }
  if (!Array.isArray(waivedTerms)) {
    errors.push("voice/banned-words.json: waivedTerms must be an array");
    return;
  }

  const { VALID_POLICY_CLASSES, normalizePolicyEntry, isRetrievalExclusion } = require("./banned-word-policy.js");
  const checks = [];
  for (const [index, entry] of bannedWords.entries()) {
    if (typeof entry === "string") {
      checks.push({ term: entry, entry: normalizePolicyEntry(entry) });
      continue;
    }
    if (!entry || typeof entry !== "object" || typeof entry.term !== "string") {
      errors.push(`voice/banned-words.json: bannedWords[${index}] must be a string or object with term`);
      continue;
    }
    const normalized = normalizePolicyEntry(entry);
    if (!VALID_POLICY_CLASSES.has(normalized.policyClass)) {
      errors.push(`voice/banned-words.json: bannedWords[${index}] has invalid policyClass '${normalized.policyClass}'`);
      continue;
    }
    if (normalized.policyClass === "REPLACEMENT_SUGGESTION" && !Array.isArray(normalized.useInstead)) {
      errors.push(`voice/banned-words.json: bannedWords[${index}] replacement suggestion requires useInstead alternatives`);
    }
    checks.push({ entry: normalized, term: normalized.term });
  }
  for (const [index, entry] of waivedTerms.entries()) {
    if (!entry || typeof entry !== "object" || typeof entry.term !== "string" || entry.policyClass !== "WAIVED") {
      errors.push(`voice/banned-words.json: waivedTerms[${index}] must be an object with term and policyClass WAIVED`);
    }
  }

  if (checks.length === 0) return;

  for (const filePath of listLegacyPackageJsonFiles(dataRoot)) {
    const json = readJson(filePath);
    // Evidence ledgers are search inputs, not reader-facing copy. Their selected
    // output is still required to pass the ban list in the packet builder.
    if (isNonServingSourceLedger(json) || isNonServingManifestationSet(json)) continue;
    const text = flattenText(json);
    for (const check of checks) {
      if (isRetrievalExclusion(text, check.entry)) {
        errors.push(`${rel(filePath)}: contains banned voice term "${check.term}"`);
      }
    }
  }
}

function validateAll() {
  const errors = [];

  for (const filePath of listJsonFiles(path.join(dataRoot, "primitives"))) {
    validatePrimitiveFile(filePath, errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "pairs"))) {
    validateEntryFile(filePath, "pair", errors);
  }
  for (const filePath of listDirectJsonFiles(path.join(dataRoot, "transits"))) {
    validateEntryFile(filePath, "transit", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "transits", "natal"))) {
    validateEntryFile(filePath, "transitNatal", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "transits", "house"))) {
    validateEntryFile(filePath, "transitHouse", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "planetary"))) {
    validateEntryFile(filePath, "planetary", errors);
  }
  for (const filePath of listDirectJsonFiles(path.join(dataRoot, "points"))) {
    validateEntryFile(filePath, "point", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "points", "placements"))) {
    validateEntryFile(filePath, "pointPlacement", errors);
  }
  for (const filePath of listLegacyPackageJsonFiles(path.join(dataRoot, "points", "aspects"))) {
    validateEntryFile(filePath, "pointAspect", errors);
  }
  for (const filePath of listLegacyPackageJsonFiles(path.join(dataRoot, "points", "transits", "house"))) {
    validateEntryFile(filePath, "pointTransitHouse", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "placements"))) {
    validateEntryFile(filePath, "placement", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "angles"))) {
    validateEntryFile(filePath, "angle", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "modifiers"))) {
    validateEntryFile(filePath, "modifier", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "chart-rulers"))) {
    validateEntryFile(filePath, "chartRuler", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "composite"))) {
    validateEntryFile(filePath, "composite", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "lunations"))) {
    validateEntryFile(filePath, "lunation", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "synastry", "aspects"))) {
    validateEntryFile(filePath, "synastryAspect", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "synastry", "point-contacts"))) {
    validateEntryFile(filePath, "synastryPointContact", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "synastry", "house-overlays"))) {
    validateEntryFile(filePath, "synastryHouseOverlay", errors);
  }
  for (const dir of ["guides", "frameworks", "templates", "correspondences"]) {
    for (const filePath of listJsonFiles(path.join(dataRoot, dir))) {
      validateEntryFile(filePath, "content", errors);
    }
  }
  for (const filePath of listDirectJsonFiles(path.join(dataRoot, "synastry"))) {
    validateEntryFile(filePath, "content", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "insights"))) {
    validateEntryFile(filePath, "insightCard", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "manifestation-sets"))) {
    validateManifestationSetFile(filePath, errors);
  }
  validateVoicePolicy(errors);

  return errors;
}

if (require.main === module) {
  const errors = validateAll();
  if (errors.length > 0) {
    console.error(`Validation failed: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log("Validation passed: all data files match their schemas.");
}

module.exports = {
  validateAll,
  listJsonFiles,
  listLegacyPackageJsonFiles,
  isLegacyPackageDataFile,
  listDirectJsonFiles,
  readJson
};
