import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repo = "/Users/mprez/Code/tldrastro";
const outputPath = "/private/tmp/sun-aquarius-9th-admin-draft-generation-test.json";
const envPath = path.join(repo, "apps/web/.env.local");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "");
  }

  return true;
}

const loadedEnvFiles = loadEnv(envPath) ? [envPath] : [];
process.env.CONTENT_GENERATION_PROVIDER = "openai";
process.env.ALLOW_PRIVATE_SOURCE_MODEL_GENERATION = "true";

const authoredPath = path.join(
  repo,
  "packages/astro-knowledge/generated/tldr-astro/authored-placements/authored-placements.json"
);

const authored = JSON.parse(fs.readFileSync(authoredPath, "utf8"));
const authoredRows = Array.isArray(authored) ? authored : authored.entries ?? [];
const requiredIds = ["aquarius-9th-house", "sun-9th-house", "sun-aquarius"];

const preflightSelectedSources = requiredIds.map((id) => {
  const row = authoredRows.find((entry) => entry.id === id);

  return {
    id,
    found: Boolean(row),
    matchType: row?.matchType ?? null,
    title: row?.title ?? null,
    editStatus: row?.editStatus ?? null,
    sourceType: row?.sourceType ?? null,
    sourcePath: row?.sourcePath ?? null,
    hasSourceBody: Boolean(row?.sourceBody),
    hasAstrologyBody: Boolean(row?.astrologyBody),
    hasTarotNotes: Boolean(row?.tarotNotes),
    hasBusinessNotes: Boolean(row?.businessNotes),
    astrologyExcerpt: String(row?.astrologyBody ?? "").slice(0, 700)
  };
});

const input = {
  contentKey: "admin-draft-test-sun-aquarius-9th",
  surface: "natal",
  mode: "in_depth",
  eventType: "natal-placement",
  provider: "openai",
  headline: "Sun in Aquarius in the 9th house",
  targetDate: "not specified",
  facts: {
    type: "natal-placement",
    blockType: "natal-placement",
    placementBody: "Sun",
    placementSign: "Aquarius",
    placementHouse: 9,
    traditionalRulerBody: "Saturn",
    traditionalRulerSign: "Virgo",
    traditionalRulerHouse: 4,
    modernRulerBody: "Uranus",
    modernRulerSign: "Scorpio",
    modernRulerHouse: 6,
    placement: {
      body: "Sun",
      sign: "Aquarius",
      house: 9
    },
    rulers: [
      {
        system: "traditional",
        body: "Saturn",
        sign: "Virgo",
        house: 4
      },
      {
        system: "modern",
        body: "Uranus",
        sign: "Scorpio",
        house: 6
      }
    ],
    aspects: []
  },
  sourceSnapshot: {
    source: "admin draft generation test",
    houseSystem: "whole_sign"
  },
  voiceNotes: "One-case admin draft generation test. Use authored astrologyBody source material only."
};

function extractJsonBlock(text, marker) {
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) return null;

  const start = text.lastIndexOf("{", markerIndex);
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
}

const originalFetch = globalThis.fetch;
const openAiRequests = [];

globalThis.fetch = async (url, options = {}) => {
  const urlText = typeof url === "string" ? url : String(url?.url ?? url);

  if (urlText.includes("api.openai.com")) {
    const requestBody = typeof options.body === "string" ? JSON.parse(options.body) : {};
    openAiRequests.push({
      url: urlText,
      model: requestBody.model,
      prompt: requestBody.input
    });
  }

  return originalFetch(url, options);
};

const { generateContent } = await import(
  pathToFileURL(path.join(repo, "api/_lib/content-generation.ts")).href
);

let generated = null;
let error = null;

try {
  generated = await generateContent(input);
} catch (caught) {
  error = {
    name: caught?.name ?? "Error",
    message: caught?.message ?? String(caught),
    reason: caught?.reason ?? null,
    violations: Array.isArray(caught?.violations) ? caught.violations : []
  };
}

const firstPrompt = openAiRequests[0]?.prompt ?? "";
const promptJsonRaw = extractJsonBlock(firstPrompt, "\"primaryPlacement\"");
let promptContext = null;

try {
  promptContext = promptJsonRaw ? JSON.parse(promptJsonRaw) : null;
} catch {
  promptContext = null;
}

const promptText = openAiRequests.map((request) => request.prompt).join("\n\n--- RETRY ---\n\n");
const retryPrompt = openAiRequests[1]?.prompt ?? "";
const targetedRetryStart = retryPrompt.indexOf("HARD EDITORIAL VIOLATION RETRY");
const targetedRetryInstruction = targetedRetryStart >= 0
  ? retryPrompt.slice(targetedRetryStart, targetedRetryStart + 2200)
  : "";
const promptSourceIds = (promptContext?.authoredSources ?? []).map((source) => source.id).filter(Boolean);
const promptSourcePacket = (promptContext?.authoredSources ?? []).map((source) => ({
  role: source.role,
  id: source.id,
  title: source.title,
  sourcePath: source.sourcePath,
  excerpts: source.excerpts
}));

const hardBannedPhrases = [
  "adds a layer",
  "magnetic value system",
  "visible abundance",
  "this tension invites",
  "deep emotional world",
  "supportive aspect",
  "expansive approach",
  "flow naturally",
  "uplift your work and reputation",
  "strong future orientation",
  "wider collective",
  "progressive ideas",
  "gain authority",
  "emotional context",
  "mental development",
  "public life and reputation",
  "private currents",
  "larger framework",
  "natural expansion",
  "laced",
  "links",
  "realm",
  "arena",
  "orbit"
];

const generatedCopy = [generated?.headline, generated?.tldr, generated?.summary, generated?.body]
  .filter(Boolean)
  .join("\n")
  .toLowerCase();
const hardViolations = hardBannedPhrases.filter((phrase) => generatedCopy.includes(phrase));

const publicEnvValue = process.env.ALLOW_PRIVATE_SOURCE_MODEL_GENERATION;
delete process.env.ALLOW_PRIVATE_SOURCE_MODEL_GENERATION;

let publicSafePath = null;
const openAiRequestCountBeforePublicCheck = openAiRequests.length;

try {
  const publicResult = await generateContent(input);
  publicSafePath = {
    refusedUnapprovedOutput: false,
    openAiCalled: openAiRequests.length > openAiRequestCountBeforePublicCheck,
    resultModel: publicResult.model,
    resultBodyExcerpt: String(publicResult.body ?? "").slice(0, 260)
  };
} catch (caught) {
  publicSafePath = {
    refusedUnapprovedOutput: /No approved appBody|Refusing to display sourceBody|deterministic natal placement filler/i.test(caught?.message ?? ""),
    openAiCalled: openAiRequests.length > openAiRequestCountBeforePublicCheck,
    errorName: caught?.name ?? "Error",
    errorMessage: caught?.message ?? String(caught)
  };
}

process.env.ALLOW_PRIVATE_SOURCE_MODEL_GENERATION = publicEnvValue;

const result = {
  loadedEnvFiles,
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "present" : "not set",
    CONTENT_GENERATION_PROVIDER: process.env.CONTENT_GENERATION_PROVIDER ?? "not set",
    ALLOW_PRIVATE_SOURCE_MODEL_GENERATION: process.env.ALLOW_PRIVATE_SOURCE_MODEL_GENERATION ?? "not set"
  },
  preflightSelectedSources,
  requiredSourcesPresent: requiredIds.every((id) => (
    preflightSelectedSources.some((source) => source.id === id && source.found)
  )),
  openAiCalled: openAiRequests.length > 0,
  provider: input.provider,
  model: openAiRequests[0]?.model ?? generated?.model ?? null,
  requestCount: openAiRequests.length,
  retryCount: Math.max(0, openAiRequests.length - 1),
  targetedRetryInstruction,
  promptSourceIds,
  promptSourcePacket,
  promptChecks: {
    includesRequiredSourceIds: requiredIds.every((id) => promptSourceIds.includes(id)),
    includesSourceBodyKey: promptText.includes("sourceBody"),
    includesAstrologyBodyKey: promptText.includes("astrologyBody"),
    includesTarotNotesKey: promptText.includes("tarotNotes"),
    includesBusinessNotesKey: promptText.includes("businessNotes"),
    includesAstrologySourceMaterial: promptText.includes("ASTROLOGY SOURCE MATERIAL"),
    includesTarotOrSymbolicNotesLabel: promptText.includes("TAROT / SYMBOLIC NOTES"),
    includesBusinessNotesLabel: promptText.includes("BUSINESS NOTES")
  },
  generated: generated ? {
    headline: generated.headline,
    tldr: generated.tldr,
    summary: generated.summary,
    draftBody: generated.body,
    editStatus: hardViolations.length ? "generation_failed" : "needs_review",
    model: generated.model,
    qualityWarning: generated.qualityWarning ?? null
  } : null,
  error,
  hardViolations,
  publicSafePath
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
