"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");

// Deduplicate only within one synchronous integrity operation. Never carry
// verified bytes across an await, provider call, request, or deployment.
let hashes = null;
function withSourceVerification(run) {
  if (hashes) return run();
  hashes = new Map();
  try {
    const result = run();
    if (result && typeof result.then === "function") {
      throw new Error("Source verification scopes must be synchronous.");
    }
    return result;
  } finally {
    hashes = null;
  }
}

function sourceSha256(file) {
  if (hashes?.has(file)) return hashes.get(file);
  const digest = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  hashes?.set(file, digest);
  return digest;
}

module.exports = { withSourceVerification, sourceSha256 };
