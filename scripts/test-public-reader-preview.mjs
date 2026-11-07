import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { publicBrowserEnvironment, publicReaderPreviewPlugin } from "./preview-reader-safely.mjs";

const publicConfig = { VITE_SUPABASE_URL: "https://synthetic.supabase.test", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic" };
assert.deepEqual(publicBrowserEnvironment({ ...publicConfig, SUPABASE_SERVICE_ROLE_KEY: "synthetic-server-key", VITE_SERVER_SECRET: "synthetic-secret" }), {
  ...publicConfig, VITE_ENABLE_NATAL_ASPECT_PATTERNS: "true"
});
const roleKey = role => `synthetic.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.synthetic`;
for (const key of ["sb_secret_synthetic", roleKey("service_role"), "invalid"]) {
  assert.throws(() => publicBrowserEnvironment({ ...publicConfig, VITE_SUPABASE_PUBLISHABLE_KEY: key }));
  assert.throws(() => publicBrowserEnvironment({ ...publicConfig, VITE_SUPABASE_ANON_KEY: key }));
}
assert.equal(publicBrowserEnvironment({ ...publicConfig, VITE_SUPABASE_ANON_KEY: roleKey("anon") }).VITE_SUPABASE_ANON_KEY, roleKey("anon"));

const calls = [];
let middleware;
publicReaderPreviewPlugin(async (url, options) => {
  calls.push({ url: String(url), options });
  return new Response(JSON.stringify({ rows: [], nextCursor: null }), { status: 200 });
}).configurePreviewServer({ middlewares: { use(handler) { middleware = handler; } } });

async function request(url, method = "GET", body = "", headers = {}) {
  const req = Readable.from([Buffer.from(body)]);
  Object.assign(req, { url, method, headers: { authorization: "Bearer synthetic-user-session", cookie: "synthetic-cookie", apikey: "synthetic-key", ...headers } });
  const res = { statusCode: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; }, end(value) { this.body = String(value); } };
  let next = false;
  await middleware(req, res, () => { next = true; });
  return { ...res, next };
}

for (const path of ["/api", "/api/admin/generated-content", "/api/account", "/api/friend-report-checkout", "/api/unknown", "/api/content-reader/../admin/generated-content"]) {
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    assert.equal((await request(path, method)).statusCode, 403, `${method} ${path}`);
  }
}
assert.equal(calls.length, 0, "Blocked endpoints must not reach upstream or local handlers.");
assert.equal((await request("/api/content-reader", "GET")).statusCode, 403);
assert.equal((await request("/api/sky", "POST")).statusCode, 403);
assert.equal((await request("/api/content-reader", "POST", "x".repeat(40_001))).statusCode, 413);
assert.equal(calls.length, 0);

const body = JSON.stringify({ keys: ["synthetic-public-reader-key"] });
assert.equal((await request("/api/content-reader", "POST", body)).statusCode, 200);
assert.equal(calls[0].url, "https://tldrastro.vercel.app/api/content-reader");
assert.equal(calls[0].options.body.toString(), body);
assert.deepEqual(calls[0].options.headers, { accept: "application/json", "content-type": "application/json" });
assert.equal(calls[0].options.redirect, "error");
assert.equal((await request("/api/sky?date=2026-11-05")).statusCode, 200);
assert.equal(calls[1].url, "https://tldrastro.vercel.app/api/sky?date=2026-11-05");
assert.deepEqual(calls[1].options.headers, { accept: "application/json" });
assert.equal((await request("/assets/synthetic.js")).next, true);
const jwt = claims => `synthetic.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.synthetic`;
const session = jwt({role:"authenticated",sub:"synthetic-owner",exp:Math.floor(Date.now()/1000)+300});
const headers = {authorization:`Bearer ${session}`,"x-content-admin-session":session};
for (const invalid of [roleKey("service_role"), roleKey("anon"), "sb_secret_synthetic", jwt({role:"authenticated",sub:"synthetic",exp:1})]) {
  assert.equal((await request("/api/admin/generated-content", "PATCH", "{}", {authorization:`Bearer ${invalid}`,"x-content-admin-session":invalid})).statusCode,403);
}
assert.equal((await request("/api/admin/generated-content", "PATCH", "{}", {...headers,"x-content-generation-secret":"synthetic"})).statusCode,403);
assert.equal((await request("/api/admin/generate-content", "POST", "{}", headers)).statusCode,403);
assert.equal((await request("/api/admin/generated-content", "DELETE", "", headers)).statusCode,403);
assert.equal((await request("/api/admin/generated-content", "PATCH", "x".repeat(1_000_001), headers)).statusCode,413);
assert.equal((await request("/api/admin/generated-content?contentKey=synthetic", "GET", "", headers)).statusCode,200);
assert.equal(calls.at(-1).url,"https://tldrastro.vercel.app/api/admin/generated-content?contentKey=synthetic");
assert.deepEqual(calls.at(-1).options.headers,{accept:"application/json",...headers});
assert.equal((await request("/api/admin/generated-content", "PATCH", "{}", headers)).statusCode,200);
assert.deepEqual(calls.at(-1).options.headers,{accept:"application/json","content-type":"application/json",...headers});
assert.equal(calls.at(-1).options.body.toString(),"{}");
console.log("Safe preview passed: default-deny APIs, body limits, fixed upstream, public reads strip sessions; Studio forwards normal session only for backend authorization.");
