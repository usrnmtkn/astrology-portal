#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  buildAspectWarmthHarvest,
  foundationPromptBlock
} = require("./aspect-corpus-warmth-harvest.js");

const packageRoot = path.join(__dirname, "..");
const DEFAULT_METHOD_PATH = "packages/astro-knowledge/docs/editorial-ai/method-corpus-warmth-harvest.md";

function parseArgs(argv = process.argv.slice(2)) {
  const options = { format: "full-card" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [key, inline] = token.split(/=(.*)/su);
    const value = inline ?? argv[++index];
    if (key === "--surface") options.surface = value;
    else if (key === "--format") options.format = value;
    else if (key === "--id") options.id = value;
    else if (key === "--human-moment") options.humanMoment = value;
    else if (key === "--entry-file") options.entryFile = value;
    else if (key === "--out") options.out = value;
    else throw new Error(`Unknown argument '${token}'.`);
  }
  if (!options.surface) throw new Error("--surface is required.");
  if (!options.entryFile && !options.id) throw new Error("--id or --entry-file is required.");
  return options;
}

function loadEntry(options) {
  if (!options.entryFile) return { id: options.id, humanMoment: options.humanMoment || "" };
  const filePath = path.resolve(options.entryFile);
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return { ...value, id: value.id || options.id || path.basename(filePath, path.extname(filePath)) };
}

function buildAspectWritingPacket({ surface, format = "full-card", entry }) {
  const warmthHarvest = buildAspectWarmthHarvest(entry, { surface, format });
  return {
    schemaVersion: 1,
    packetType: "aspect-writing-packet",
    status: warmthHarvest.status,
    generationAllowed: warmthHarvest.generationAllowed,
    target: {
      id: entry.id || null,
      surface,
      format,
      humanMoment: warmthHarvest.humanMoment
    },
    method: {
      id: "corpus-warmth-harvest",
      sourcePath: DEFAULT_METHOD_PATH,
      required: true
    },
    warmthHarvest,
    promptBlock: foundationPromptBlock(warmthHarvest),
    scaleRule: !warmthHarvest.generationAllowed
      ? {
          harvest_mode: null,
          insertWarmthBeat: false,
          rule: "Packet blocked; no scale rule applies."
        }
      : warmthHarvest.harvest_mode === "none_found"
      ? {
          harvest_mode: "none_found",
          insertWarmthBeat: false,
          rule: "No qualifying owner line was found. Keep the register plain and do not invent a permission or reassurance line."
        }
      : warmthHarvest.harvest_mode === "vocabulary_only"
      ? {
          harvest_mode: "vocabulary_only",
          insertWarmthBeat: false,
          rule: "Foundation lines inform word choice only. Do not add a warmth beat to a TLDR line or short preview."
        }
      : {
          harvest_mode: "matched",
          insertWarmthBeat: true,
          maximumWarmthSentences: 1,
          placement: "after the shadow or cost; final or penultimate sentence",
          stackedEndingRuleUnchanged: true
        },
    pronounPolicy: warmthHarvest.voice === "collective"
      ? "Supply minimally collectivized owner lines; retain each original line in provenance."
      : "Second person is allowed; supply owner lines verbatim with pronouns intact.",
    candidateRecordContract: {
      whenFoundationLineIsUsed: {
        requiredLabel: "owner-corpus-derived",
        warmthSource: {
          sourceArticleId: "required",
          originalLine: "required",
          usedForm: "required"
        }
      },
      approvalEffect: "none",
      reviewGatesUnchanged: true
    },
    judgeAddition: "The card's turn toward the reader must trace to the supplied owner foundation lines when present. An invented permission or reassurance line in place of the supplied material scores 2; a card with no turn toward the reader at all, when foundation lines were supplied, scores 2. Verbatim or near-verbatim use of a supplied owner line is never penalized as copying - it is the owner's own writing.",
    flags: warmthHarvest.flags
  };
}

function main() {
  const options = parseArgs();
  const packet = buildAspectWritingPacket({
    surface: options.surface,
    format: options.format,
    entry: loadEntry(options)
  });
  const output = `${JSON.stringify(packet, null, 2)}\n`;
  if (options.out) {
    const outPath = path.resolve(options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, output);
    console.log(`Packet: ${outPath}`);
  } else {
    process.stdout.write(output);
  }
  if (!packet.generationAllowed) process.exitCode = 2;
}

module.exports = {
  buildAspectWritingPacket,
  loadEntry,
  parseArgs
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
