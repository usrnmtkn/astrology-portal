import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { build } from "esbuild";

// Keep the actual auth and HTTP handlers. Replace only external auth/storage.
const output = await build({
  stdin: { contents: `export { requireReportUser } from './api/_lib/report-http.ts';
    export { default as delivery } from './api/report-delivery.ts';
    export { default as share } from './api/report-share.ts';
    export { default as account } from './api/account.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: "node", format: "esm",
  plugins: [{ name: "isolated-external-services", setup(b) {
    b.onResolve({ filter: /supabase-report-admin\.js$/ }, () => ({ path: "storage", namespace: "fixture" }));
    b.onResolve({ filter: /local-env\.js$/ }, () => ({ path: "env", namespace: "fixture" }));
    b.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "env"
      ? "export const loadLocalWebEnv=()=>{};"
      : "export const createSupabaseReportAdmin=()=>globalThis.authIdentityStorage;" }));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
const before = { ...process.env }, originalFetch = globalThis.fetch;
const owner = "11111111-1111-4111-8111-111111111111", other = "22222222-2222-4222-8222-222222222222";
const reportId = "33333333-3333-4333-8333-333333333333";
let storageReads = 0, deletes = [];
const req = (method, url, token, body = {}) => Object.assign(Readable.from([JSON.stringify(body)]), {
  method, url, headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), host: "app.example.test" }
});
const res = () => ({ statusCode: 0, setHeader() {}, end(body) { this.body = JSON.parse(body); } });
try {
  process.env.SUPABASE_URL = "https://auth-fixture.example.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "synthetic-public-key";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic-service-key";
  globalThis.fetch = async (url, options) => {
    assert.ok(String(url).startsWith(process.env.SUPABASE_URL));
    if (String(url).endsWith("/auth/v1/user")) {
      const userId = options.headers.authorization === "Bearer owner-a" ? owner : options.headers.authorization === "Bearer owner-b" ? other : null;
      return Response.json(userId ? { id: userId } : { error: "invalid session" }, { status: userId ? 200 : 401 });
    }
    assert.equal(options.method, "DELETE");
    assert.equal(options.headers.authorization, "Bearer synthetic-service-key");
    deletes.push(String(url));
    return Response.json({});
  };
  globalThis.authIdentityStorage = { selectOne: async (table, params) => {
    storageReads++;
    if (table === "user_report_library_state") return null;
    if (table === "report_entitlements") return { status: "revoked" };
    assert.ok([`eq.${owner}`, `eq.${other}`].includes(params.get("user_id")), "Actual handler must apply the authenticated owner filter");
    return params.get("user_id") === `eq.${owner}` ? { id: reportId, entitlement_id: "fixture-entitlement", status: "live", fulfillment_status: "live", body: "Synthetic owned report." } : null;
  } };
  for (const token of [undefined, "invalid", "expired", "foreign-issuer"]) {
    const count = storageReads;
    await assert.rejects(api.requireReportUser(req("GET", "/", token)), /Sign in|verify/);
    let response = res(); await api.delivery(req("GET", `/api/report-delivery?reportId=${reportId}`, token), response);
    assert.notEqual(response.statusCode, 200);
    response = res(); await api.share(req("POST", "/api/report-share", token, { sourceKind: "generated_interpretation", sourceId: reportId, user_id: owner }), response);
    assert.notEqual(response.statusCode, 200);
    response = res(); await api.account(req("DELETE", "/api/account", token, { user_id: owner }), response);
    assert.equal(response.statusCode, 401);
    assert.equal(storageReads, count);
    assert.equal(deletes.length, 0);
  }
  let response = res();
  await api.delivery(req("GET", `/api/report-delivery?reportId=${reportId}&user_id=${owner}`, "owner-b"), response);
  assert.equal(response.statusCode, 404);
  response = res(); await api.share(req("POST", "/api/report-share", "owner-b", { sourceKind: "generated_interpretation", sourceId: reportId, user_id: owner }), response);
  assert.notEqual(response.statusCode, 200);
  response = res(); await api.delivery(req("GET", `/api/report-delivery?reportId=${reportId}`, "owner-a"), response);
  assert.equal(response.statusCode, 403, "Revoked entitlement denies even the owner");
  response = res(); await api.account(req("DELETE", "/api/account", "owner-a", { user_id: other }), response);
  assert.equal(response.statusCode, 200);
  assert.equal(deletes.at(-1), `${process.env.SUPABASE_URL}/auth/v1/admin/users/${owner}`);
  console.log("Actual report/account handlers reject invalid sessions, foreign owners, overridden principals and revoked entitlements.");
} finally {
  globalThis.fetch = originalFetch; delete globalThis.authIdentityStorage;
  for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
  Object.assign(process.env, before);
}
