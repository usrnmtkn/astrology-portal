import assert from "node:assert/strict";
import { build, transform } from "esbuild";
import { readFileSync } from "node:fs";
import path from "node:path";

async function fixture(entryPoint, plugins = []) {
  const built = await build({ entryPoints: [entryPoint], bundle: true, write: false,
    platform: "node", format: "esm", plugins, logLevel: "silent" });
  return import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`);
}

const providerError = path.resolve("api/_lib/generation-provider-error.ts");
const { default: handler } = await fixture("api/generate-user-content.ts", [{ name: "isolated-generation", setup(b) {
  b.onResolve({ filter: /\/(content-generation|report-generation|report-envelope)\.js$/ }, ({ path }) => ({ path, namespace: "fixture" }));
  b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path: file }) => ({ resolveDir: process.cwd(), contents:
    file.includes("content-generation") ? `import { GenerationProviderError } from ${JSON.stringify(providerError)};
      export class ContentGenerationHardEditorialError extends Error {};
      export class ContentGenerationQualityError extends Error {};
      export function hardEditorialFailureResponse() { return {}; }
      export async function generateContent() {
        globalThis.generationCalls++;
        if (globalThis.providerFailure) {
          const { status, detail } = globalThis.providerFailure;
          throw new GenerationProviderError('claude', status, detail);
        }
        return { body: 'Synthetic complete draft.', sections: [], provider: 'claude', model: 'fixture' };
      }` : file.includes("report-envelope") ? "export function fetchSupabaseReportEnvelopeById() { throw new Error('Unexpected report lookup'); }"
      : "export function assembleReportGenerationPayload() { throw new Error('Unexpected report assembly'); }"
  }));
} }]);

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;
const envNames = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"];
const previous = Object.fromEntries(envNames.map(key => [key, process.env[key]]));
let authStatus = 200, writes = [], reads = 0;
const input = { subjectType: "natal_summary", subjectId: "synthetic-chart", contentKey: "synthetic-reading",
  surface: "natal", mode: "in_depth", eventType: "synthetic-reading", facts: {} };
async function request(body = input, token = true) {
  const req = { method: "POST", headers: token ? { authorization: "Bearer synthetic-token" } : {},
    async *[Symbol.asyncIterator]() { yield Buffer.from(typeof body === "string" ? body : JSON.stringify(body)); } };
  let payload;
  const res = { statusCode: 200, setHeader() {}, end(value) { payload = JSON.parse(value); } };
  await handler(req, res);
  return { status: res.statusCode, ...payload };
}

try {
  process.env.SUPABASE_URL = "https://synthetic.invalid";
  process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-key";
  globalThis.generationCalls = 0;
  console.warn = () => {};
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) return Response.json(authStatus === 200
      ? { id: "synthetic-user" } : { error: "Private upstream authentication detail" }, { status: authStatus });
    assert.match(String(url), /\/rest\/v1\/user_generated_interpretations\?/u);
    if (options.method === "POST") { writes.push(JSON.parse(options.body)); return Response.json([writes.at(-1)]); }
    reads++;
    return Response.json([]);
  };
  assert.equal((await request(input, false)).status, 401);
  for (const status of [401, 403, 400]) {
    authStatus = status;
    const denied = await request();
    assert.equal(denied.status, 401);
    assert.equal(denied.retryable, false);
    assert.ok(!denied.error.includes("Private upstream"));
  }
  authStatus = 503;
  assert.equal((await request()).errorType, "authentication_unavailable");
  authStatus = 200;
  for (const malformed of ["{", "null", "[]"]) assert.equal((await request(malformed)).status, 400);
  const disabled = await request({ ...input, subjectType: "you_transit" });
  assert.equal(disabled.status, 409);
  assert.equal(disabled.errorType, "automatic_generation_disabled");
  assert.equal(disabled.retryable, false);
  assert.equal(globalThis.generationCalls, 0);
  assert.equal(reads, 0);
  assert.equal(writes.length, 0);
  for (const [status, detail, expectedStatus, type, retryable] of [
    [400, { message: "Your credit balance is too low to access the Anthropic API." }, 503, "provider_billing_error", false],
    [402, { type: "billing_error" }, 503, "provider_billing_error", false],
    [429, { code: "insufficient_quota" }, 503, "provider_billing_error", false],
    [401, {}, 503, "provider_configuration_error", false],
    [403, {}, 503, "provider_configuration_error", false],
    [429, { type: "rate_limit_error" }, 429, "provider_rate_limited", true],
    [529, {}, 502, "provider_unavailable", true],
    [400, { message: "Private request detail" }, 502, "provider_request_error", false]
  ]) {
    globalThis.providerFailure = { status, detail };
    const before = globalThis.generationCalls;
    const result = await request();
    assert.equal(result.status, expectedStatus);
    assert.equal(result.errorType, type);
    assert.equal(result.retryable, retryable);
    assert.equal(globalThis.generationCalls, before + 1, "Provider failure must not retry.");
    assert.equal(writes.length, 0, "Provider failure must not write a draft.");
    assert.ok(!result.error.includes("Private request detail"));
  }
  globalThis.providerFailure = null;
  assert.equal((await request()).status, 200);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].status, "DRAFT", "Explicit generation must retain review governance.");
} finally {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
  for (const key of envNames) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  delete globalThis.generationCalls;
  delete globalThis.providerFailure;
}

const service = await fixture("apps/web/src/services/userGeneratedContent.ts", [{ name: "isolated-client", setup(b) {
  b.onResolve({ filter: /^\.\/(auth|reportLibrary|reportLinks)$/ }, ({ path }) => ({ path, namespace: "fixture" }));
  b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "./auth"
    ? "export async function getSupabaseClient() { return globalThis.testClient; }"
    : path === "./reportLibrary" ? "export function dispatchReportReady() { globalThis.notifications++; }"
      : "export function reportVanityPath() { return '/synthetic-report'; }" }));
} }]);

try {
  let sessionHook = () => {}, queries = 0, fetches = 0, querySignal;
  const query = new Proxy({}, { get(_target, property) {
    if (property === "returns") return async () => ({ data: [], error: null });
    return (...args) => { if (property === "abortSignal") querySignal = args[0]; return query; };
  } });
  globalThis.testClient = { auth: { getSession: async () => {
    sessionHook(); return { data: { session: { access_token: "synthetic-token", user: { id: "synthetic-user" } } } };
  } }, from() { queries++; return query; } };
  globalThis.notifications = 0;
  const cancelled = new AbortController(); cancelled.abort();
  await assert.rejects(service.generateUserContent(input, { signal: cancelled.signal }), { name: "AbortError" });
  await assert.rejects(service.loadUserGeneratedInterpretation({ ...input, signal: cancelled.signal }), { name: "AbortError" });
  const duringAuth = new AbortController(); sessionHook = () => duringAuth.abort();
  await assert.rejects(service.generateUserContent(input, { signal: duringAuth.signal }), { name: "AbortError" });
  const duringReadAuth = new AbortController(); sessionHook = () => duringReadAuth.abort();
  await assert.rejects(service.loadUserGeneratedInterpretation({ ...input, signal: duringReadAuth.signal }), { name: "AbortError" });
  assert.equal(queries, 0);
  sessionHook = () => {};
  const reader = new AbortController();
  await service.loadUserGeneratedInterpretation({ ...input, signal: reader.signal });
  assert.equal(querySignal, reader.signal);
  globalThis.fetch = async (_url, options) => {
    fetches++;
    return new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true }));
  };
  const active = new AbortController();
  const pending = service.generateUserContent(input, { signal: active.signal });
  while (!fetches) await new Promise(resolve => setImmediate(resolve));
  active.abort();
  await assert.rejects(pending, { name: "AbortError" });
  globalThis.fetch = async () => { fetches++; return Response.json({ error: "Unavailable", errorType: "provider_billing_error", retryable: false }, { status: 503 }); };
  await assert.rejects(service.generateUserContent(input), error => error instanceof service.GenerateUserContentError
    && error.status === 503 && error.errorType === "provider_billing_error" && !error.retryable);
  assert.equal(fetches, 2, "Client must not automatically retry paid generation.");
  assert.equal(globalThis.notifications, 0);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.testClient;
  delete globalThis.notifications;
}
console.log("User content handler and client preserve published reading, reject passive generation, cancel requests and classify failures without retries or writes.");

const app = readFileSync("apps/web/src/App.tsx", "utf8");
const start = app.indexOf("    async function loadSavedTransitContent()");
assert.ok(start > 0);
const effectFunction = app.slice(start, app.indexOf("\n\n    void loadSavedTransitContent();", start));
const javascript = (await transform(effectFunction, { loader: "ts", target: "es2022" })).code;
for (const fail of [false, true]) {
  const controller = new AbortController();
  let reads = 0, updates = 0;
  const run = new Function("controller", "transits", "personalTransitGeneratedContentKey", "skyDate", "subjectId",
    "loadUserGeneratedInterpretation", "setPersonalTransitGeneratedContent", `${javascript}; return loadSavedTransitContent();`);
  await run(controller, [{ id: "one" }, { id: "two" }], value => value.id, "2026-11-14", "synthetic-chart", async () => {
    reads++;
    controller.abort();
    if (fail) throw new Error("Synthetic interrupted lookup");
    return { status: "LIVE" };
  }, () => updates++);
  assert.equal(reads, 1, "Cancelled reader must not start another lookup, including after a failed request.");
  assert.equal(updates, 0, "Cancelled reader must not publish stale state.");
}
console.log("Actual saved-transit reader stops after cancellation on successful and failed lookups.");
