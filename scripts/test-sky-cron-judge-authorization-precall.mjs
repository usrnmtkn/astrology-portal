import assert from "node:assert/strict";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const repoRoot = path.resolve(import.meta.dirname, "..");
const fixtures = [
  {
    name: "sky aspects",
    entrypoint: "generate-sky-aspects.ts"
  },
  {
    name: "sky placements",
    entrypoint: "generate-sky-placements.ts"
  }
];
const priorCronSecret = process.env.CRON_SECRET;
const priorJudgeAuthorization = process.env.TLDR_ALLOW_LIVE_LLM_JUDGE;
const priorNodeEnv = process.env.NODE_ENV;
const priorFetch = globalThis.fetch;
const outfiles = [];

try {
  process.env.CRON_SECRET = "sky-cron-precall-judge-contract-secret";
  process.env.NODE_ENV = "production";
  delete process.env.TLDR_ALLOW_LIVE_LLM_JUDGE;

  for (const fixture of fixtures) {
    const outfile = path.join(
      repoRoot,
      "api/cron",
      `.sky-cron-precall-judge.${fixture.entrypoint}.${process.pid}.${Date.now()}.mjs`
    );
    outfiles.push(outfile);

    await build({
      entryPoints: [path.join(repoRoot, "api/cron", fixture.entrypoint)],
      bundle: true,
      platform: "node",
      format: "esm",
      outfile,
      external: [
        "../../packages/astro-knowledge/scripts/generate-sky-aspect-cards.js",
        "../../packages/astro-knowledge/scripts/editorial-judge-runtime.js",
        "../../src/astro-writing/productionPreCallGate.cjs",
        "../../src/astro-writing/skyPlacementCachePolicy.cjs"
      ],
      banner: {
        js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);'
      },
      logLevel: "silent"
    });

    let providerCalls = 0;
    globalThis.fetch = async () => {
      providerCalls += 1;
      throw new Error("A provider or network call was attempted before judge authorization.");
    };

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

    await handler({
      method: "GET",
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` }
    }, response);

    assert.equal(result.statusCode, 409, `${fixture.name} must return a non-500 authorization hold.`);
    assert.equal(result.headers["content-type"], "application/json");
    assert.deepEqual(JSON.parse(result.body), {
      ok: false,
      code: "LIVE_LLM_JUDGE_NOT_AUTHORIZED",
      error: "Live LLM judging is disabled. Run it only as an authorized CI/admin action with TLDR_ALLOW_LIVE_LLM_JUDGE=1."
    });
    assert.equal(providerCalls, 0, `${fixture.name} must make zero provider calls when judging is unauthorized.`);
  }

  console.log("Sky cron judge authorization pre-call contract passed (2 handlers, zero provider calls).");
} finally {
  if (priorCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = priorCronSecret;

  if (priorJudgeAuthorization === undefined) delete process.env.TLDR_ALLOW_LIVE_LLM_JUDGE;
  else process.env.TLDR_ALLOW_LIVE_LLM_JUDGE = priorJudgeAuthorization;

  if (priorNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = priorNodeEnv;

  globalThis.fetch = priorFetch;
  await Promise.all(outfiles.map((outfile) => unlink(outfile).catch(() => {})));
}
