import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const outfile = path.join(
  repoRoot,
  "api/cron",
  `.sky-aspect-cron-entrypoint.${process.pid}.${Date.now()}.mjs`
);
const priorCronSecret = process.env.CRON_SECRET;
const priorNodeEnv = process.env.NODE_ENV;

try {
  await build({
    entryPoints: [path.join(repoRoot, "api/cron/generate-sky-aspects.ts")],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    external: [
      "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js",
      "../../packages/astro-knowledge/scripts/editorial-judge-runtime.js",
      "../../src/astro-writing/productionPreCallGate.cjs"
    ],
    banner: {
      js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
    },
    logLevel: "silent"
  });

  process.env.CRON_SECRET = "sky-aspect-entrypoint-contract-secret";
  process.env.NODE_ENV = "production";

  const { default: handler } = await import(`${pathToFileURL(outfile).href}?test=${Date.now()}`);
  const result = {
    statusCode: 0,
    headers: {},
    body: ""
  };
  const response = {
    setHeader(name, value) {
      result.headers[String(name).toLowerCase()] = String(value);
    },
    end(body) {
      result.body = body === undefined ? "" : String(body);
    },
    get statusCode() {
      return result.statusCode;
    },
    set statusCode(value) {
      result.statusCode = value;
    }
  };

  await handler({ method: "GET", headers: {} }, response);

  assert.equal(result.statusCode, 401, "The protected cron must reject an unsigned request before generation starts.");
  assert.equal(result.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(result.body), { error: "Unauthorized." });

  console.log("Sky-aspect cron entrypoint contract passed (unsigned GET -> 401 JSON).");
} finally {
  if (priorCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = priorCronSecret;

  if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = priorNodeEnv;

  await unlink(outfile).catch(() => {});
}
