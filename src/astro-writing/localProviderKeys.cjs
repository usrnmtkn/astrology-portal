"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ALLOWED_KEYS = new Set(["OPENAI_API_KEY", "GEMINI_API_KEY"]);

function readLocalProviderKeys(repoRoot) {
  // LOCAL_PROVIDER_KEYS_FILE lets sandboxed sessions point at the same
  // apps/web/.env.local when the worktree symlink's absolute host path does
  // not resolve. Same allowed-keys filter; no key material is copied.
  const envPath = process.env.LOCAL_PROVIDER_KEYS_FILE || path.join(repoRoot, "apps", "web", ".env.local");
  const keys = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator <= 0) continue;
      const name = trimmed.slice(0, separator).trim();
      if (!ALLOWED_KEYS.has(name)) continue;
      let value = trimmed.slice(separator + 1).trim();
      if (/^(["']).*\1$/u.test(value)) value = value.slice(1, -1);
      if (value) keys[name] = value;
    }
  }
  for (const name of ALLOWED_KEYS) if (!keys[name] && process.env[name]) keys[name] = process.env[name];
  return keys;
}

module.exports = { readLocalProviderKeys };
