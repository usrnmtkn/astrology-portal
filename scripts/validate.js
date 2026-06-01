#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataRoot = path.join(root, "data");
const schemaRoot = path.join(root, "schema");
const VALID_STATUSES = new Set(["TODO", "DRAFT", "REVIEWED", "LIVE"]);

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
    optional: ["tldr", "traditional", "modern", "cyclic", "composedFrom", "provenance"],
    types: { id: "string", transiting: "string", aspect: "string", other: "string", base: "string", business: "string", shadow: "string", arcApplying: "string", arcSeparating: "string", tldr: "string", traditional: "string", modern: "string", cyclic: "object", composedFrom: "array:string", provenance: "object" }
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
    types: { id: "string", planet: "string", title: "string", overview: "string", cycle: "string", signs: "array", source: "object" },
    optional: []
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
    types: { id: "string", kind: "string", planet: "string", key: "string|number", tldr: "string", body: "string", gift: "string", challenge: "string", note: "string" },
    optional: ["source", "note"],
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
    optional: ["schema", "definition", "appUsage", "note", "classes", "phases", "voidOfCourse", "bonification", "maltreatment", "overcoming", "retrograde", "station", "notApplicable", "cazimi", "combust", "underTheBeams", "freeOfBeams", "orientality", "domicile", "exaltation", "detriment", "fall", "triplicityLordsDorothean", "boundsEgyptian", "boundsNote", "decansChaldean", "decansNote", "annualProfections", "zodiacalReleasing", "planets", "rulershipPolicy", "surfacePolicy", "houseSystemPolicy", "prohibitions", "weighting", "orbs", "determination", "howToRead", "rulers", "chartSect", "planetSect", "mercuryRule", "benefics", "malefics", "sectBenefic", "sectMalefic", "inSect", "outOfSect", "paradox", "testimony"],
    types: { id: "string", appliesTo: "array:string", summary: "string", body: "string", schema: "string", definition: "string", appUsage: "string|array:string", note: "string", classes: "object", phases: "object", voidOfCourse: "object", bonification: "object", maltreatment: "object", overcoming: "string", retrograde: "object", station: "object", notApplicable: "array:string", cazimi: "object", combust: "object", underTheBeams: "object", freeOfBeams: "object", orientality: "object", domicile: "object", exaltation: "object", detriment: "object", fall: "object", triplicityLordsDorothean: "object", boundsEgyptian: "object", boundsNote: "string", decansChaldean: "object", decansNote: "string", annualProfections: "object", zodiacalReleasing: "object", planets: "object", rulershipPolicy: "object", surfacePolicy: "object", houseSystemPolicy: "object", prohibitions: "array:string", weighting: "array:string", orbs: "object", determination: "object", howToRead: "array:string", rulers: "object", chartSect: "object", planetSect: "object", mercuryRule: "string", benefics: "object", malefics: "object", sectBenefic: "object", sectMalefic: "object", inSect: "string", outOfSect: "string", paradox: "string", testimony: "string" }
  },
  chartRuler: {
    schemaFile: "chart-ruler.schema.json",
    required: ["id", "kind", "tldr", "meaning", "business", "voiceNeutral", "status"],
    optional: ["risingSign", "ruler", "modernCoRuler", "modernLens", "house", "shadow", "advice", "readNext"],
    types: { id: "string", kind: "string", risingSign: "string", ruler: "string", modernCoRuler: "string", modernLens: "string", house: "number", tldr: "string", meaning: "string", business: "string", shadow: "string", advice: "string", readNext: "string" },
    enums: { kind: ["chart-ruler-rising", "chart-ruler-house"] }
  },
  content: {
    schemaFile: "content.schema.json",
    required: ["id", "kind", "title", "sections", "voiceNeutral", "status"],
    types: { id: "string", kind: "string", title: "string", sections: "array", voiceNeutral: "boolean", status: "string" },
    enums: { kind: ["guide", "framework", "template", "correspondence", "synastry"] }
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
    errors.push(`${rel(filePath)}: field ${prefix}status must be TODO, DRAFT, REVIEWED, or LIVE`);
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

function listDirectJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((name) => name.isFile() && name.name.endsWith(".json"))
    .map((name) => path.join(dir, name.name))
    .sort();
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
  for (const filePath of listJsonFiles(path.join(dataRoot, "points", "aspects"))) {
    validateEntryFile(filePath, "pointAspect", errors);
  }
  for (const filePath of listJsonFiles(path.join(dataRoot, "points", "transits", "house"))) {
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
  for (const dir of ["guides", "frameworks", "templates", "correspondences", "synastry"]) {
    for (const filePath of listJsonFiles(path.join(dataRoot, dir))) {
      validateEntryFile(filePath, "content", errors);
    }
  }

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

module.exports = { validateAll, listJsonFiles, listDirectJsonFiles, readJson };
