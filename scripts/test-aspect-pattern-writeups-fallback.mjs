import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const originalFetch = globalThis.fetch;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalViteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const originalWarn = console.warn;
const warnings = [];
const lookupSignals = [];

process.env.SUPABASE_URL = "https://aspect-pattern-outage.test";
process.env.VITE_SUPABASE_URL = "https://aspect-pattern-outage.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role";

globalThis.fetch = async (input, options) => {
  const url = new URL(String(input));

  if (url.hostname === "aspect-pattern-outage.test") {
    lookupSignals.push(options?.signal);
    return {
      ok: false,
      status: 500,
      async json() {
        return { message: "simulated statement timeout" };
      }
    };
  }

  return originalFetch(input, options);
};

console.warn = (...args) => warnings.push(args.map(String).join(" "));

const vite = await createServer({
  root: repoRoot,
  server: { middlewareMode: true, hmr: false },
  appType: "custom",
  logLevel: "error"
});

try {
  const repository = await vite.ssrLoadModule("/api/_lib/aspect-pattern-writeup-records.ts");
  const natalRecords = await repository.loadAspectPatternProductionAuthoredRecords("natal");
  const activationRecords = await repository.loadAspectPatternProductionAuthoredRecords("activation");

  assert.ok(natalRecords.length > 0, "Natal pattern copy must fall back to code-backed records.");
  assert.ok(activationRecords.length > 0, "Pattern activation copy must fall back to code-backed records.");
  assert.ok(
    lookupSignals.every((signal) => signal instanceof AbortSignal),
    "Persisted pattern lookups must carry a bounded timeout signal."
  );
  assert.ok(
    warnings.some((warning) => warning.includes("Aspect-pattern natal persistence lookup failed; using code-backed records.")),
    "Natal persistence fallback must leave an operational warning."
  );
  assert.ok(
    warnings.some((warning) => warning.includes("Aspect-pattern activation persistence lookup failed; using code-backed records.")),
    "Activation persistence fallback must leave an operational warning."
  );
} finally {
  await vite.close();
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;

  if (originalSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalSupabaseUrl;

  if (originalViteSupabaseUrl === undefined) delete process.env.VITE_SUPABASE_URL;
  else process.env.VITE_SUPABASE_URL = originalViteSupabaseUrl;

  if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
}

console.log("Aspect-pattern write-up persistence fallback tests passed.");
