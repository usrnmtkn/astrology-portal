"use strict";

const path = require("path");
const policy = require(path.join(__dirname, "..", "config", "owner-corpus-warmth-harvest-policy-v1.json"));

function harvestMode(options = {}) {
  const evidence = options.ownerCorpusWarmthEvidence
    || options.deterministicResults?.ownerCorpusWarmthEvidence
    || options.deterministicResults?.ownerCorpusWarmth
    || null;
  const value = evidence?.harvest_mode || options.harvest_mode || "not_supplied";
  return Object.hasOwn(policy.modes, value) ? value : "not_supplied";
}

function judgePolicyLines(options = {}) {
  const mode = harvestMode(options);
  const rule = policy.modes[mode];
  return [
    `OWNER-CORPUS WARMTH HARVEST: harvest_mode=${mode}.`,
    rule.judgeRule,
    mode === "none_found" ? policy.modes.none_found.editorialFlag : ""
  ].filter(Boolean);
}

module.exports = { harvestMode, judgePolicyLines, policy };
