#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  compileSceneContext,
  validateSpecificityCandidate
} = require("./daily-glance-scene-context.js");

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return null;
  if (!args[index + 1]) throw new Error(`${flag} requires a value.`);
  return args[index + 1];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const args = process.argv.slice(2);
  const contextPath = valueAfter(args, "--context");
  const outPath = valueAfter(args, "--out");
  const candidatePath = valueAfter(args, "--candidate");
  const mode = valueAfter(args, "--mode") || "production";
  if (!contextPath) throw new Error("Pass --context <calculated-context.json>.");
  if (!outPath) throw new Error("Pass --out <packet.json>.");
  if (args.includes("--authorize-live")) throw new Error("This deterministic compiler never makes model calls.");

  const packet = compileSceneContext(readJson(contextPath), { mode });
  const report = candidatePath
    ? { packet, specificityLint: validateSpecificityCandidate(readJson(candidatePath), packet) }
    : { packet };
  writeJson(path.resolve(outPath), report);
  process.stdout.write(`packet=${path.resolve(outPath)} mode=${mode} servingEligible=${packet.servingEligible}\n`);
  if (report.specificityLint) process.stdout.write(`specificityLint=${report.specificityLint.passed ? "PASS" : "BLOCK"}\n`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}

module.exports = { main, valueAfter };
