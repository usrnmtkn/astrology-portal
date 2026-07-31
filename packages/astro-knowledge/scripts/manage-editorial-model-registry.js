#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const {
  defaultRegistryPath,
  promoteCandidate,
  readRegistry,
  rollbackActive,
  stageCandidate,
  validateRegistry,
  writeRegistry
} = require("./editorial-model-registry.js");

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument '${token}'.`);
    const key = token.slice(2);
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${key} requires a value.`);
    options[key] = value;
    i += 1;
  }
  return { command, options };
}

function readJson(filePath, label) {
  if (!filePath) throw new Error(`${label} file is required.`);
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function statusRows(registry) {
  return Object.entries(registry.lanes).map(([laneId, lane]) => ({
    lane: laneId,
    active: lane.active.releaseId,
    candidate: lane.candidate?.releaseId || "-",
    rollback: lane.rollback?.releaseId || "-"
  }));
}

function usage() {
  return [
    "usage:",
    "  manage-editorial-model-registry.js validate [--registry FILE]",
    "  manage-editorial-model-registry.js status [--registry FILE]",
    "  manage-editorial-model-registry.js stage --lane LANE --release-file FILE [--registry FILE]",
    "  manage-editorial-model-registry.js promote --lane LANE --calibration-report FILE --approved-by NAME [--registry FILE]",
    "  manage-editorial-model-registry.js rollback --lane LANE --approved-by NAME [--registry FILE]",
    "",
    "Promotion and rollback additionally require TLDR_ALLOW_MODEL_PROMOTION=1."
  ].join("\n");
}

function main(argv = process.argv.slice(2)) {
  const { command, options } = parseArgs(argv);
  const registryPath = path.resolve(options.registry || defaultRegistryPath);
  const registry = readRegistry(registryPath);

  if (command === "validate") {
    validateRegistry(registry);
    console.log(`Valid registry ${registry.registryVersion}: ${Object.keys(registry.lanes).length} lanes.`);
    return;
  }

  if (command === "status") {
    validateRegistry(registry);
    console.log(`Registry ${registry.registryVersion} (${registry.policyVersion})`);
    console.table(statusRows(registry));
    return;
  }

  if (command === "stage") {
    const release = readJson(options["release-file"], "Candidate release");
    const next = stageCandidate(registry, options.lane, release);
    writeRegistry(next, registryPath);
    console.log(`Staged ${release.releaseId} in ${options.lane}; active release unchanged.`);
    return;
  }

  if (command === "promote") {
    const calibrationReport = readJson(options["calibration-report"], "Calibration report");
    const next = promoteCandidate(registry, options.lane, {
      approvedBy: options["approved-by"],
      calibrationReport
    });
    writeRegistry(next, registryPath);
    console.log(`Promoted ${next.lanes[options.lane].active.releaseId} in ${options.lane}.`);
    return;
  }

  if (command === "rollback") {
    const next = rollbackActive(registry, options.lane, { approvedBy: options["approved-by"] });
    writeRegistry(next, registryPath);
    console.log(`Rolled ${options.lane} back to ${next.lanes[options.lane].active.releaseId}.`);
    return;
  }

  throw new Error(usage());
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = { main, parseArgs, statusRows, usage };
