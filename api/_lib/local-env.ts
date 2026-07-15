import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let loadedLocalEnv = false;
const localOverrideKeys = new Set([
  "CONTENT_GENERATION_SECRET"
]);

function unquoteEnvValue(value: string) {
  const trimmed = value.trim();
  const quote = trimmed[0];

  if ((quote === "\"" || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadLocalWebEnv() {
  if (loadedLocalEnv || process.env.NODE_ENV === "production") {
    return;
  }

  loadedLocalEnv = true;

  const envPath = resolve(process.cwd(), "apps/web/.env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = unquoteEnvValue(trimmed.slice(separatorIndex + 1));

    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) && (process.env[key] === undefined || localOverrideKeys.has(key))) {
      process.env[key] = value;
    }
  }
}
