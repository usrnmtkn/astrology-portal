import assert from "node:assert/strict";
import fs from "node:fs";
import { isContentAdminAuthorized } from "../api/_lib/admin-auth.ts";
import { adminCredentialHeaders, normalizeAdminSecret } from "../apps/admin/src/adminSecret.ts";

function request(headers = {}) {
  return { headers };
}

const previousEnvironment = process.env.NODE_ENV;
const previousSecret = process.env.CONTENT_GENERATION_SECRET;
const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const previousViteSupabaseUrl = process.env.VITE_SUPABASE_URL;
const previousViteSupabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

try {
  assert.equal(normalizeAdminSecret(" production-admin-secret "), "production-admin-secret");
  assert.equal(normalizeAdminSecret("CONTENT_GENERATION_SECRET=production-admin-secret"), "production-admin-secret");
  assert.equal(normalizeAdminSecret("export CONTENT_GENERATION_SECRET='production-admin-secret'"), "production-admin-secret");
  assert.equal(normalizeAdminSecret('CONTENT_GENERATION_SECRET="production-admin-secret"'), "production-admin-secret");
  assert.equal(normalizeAdminSecret("# Production\nCONTENT_GENERATION_SECRET=production-admin-secret\nCRON_SECRET=other"), "production-admin-secret");
  assert.equal(normalizeAdminSecret("CONTENT_GENERATION_SECRET"), "", "The variable name alone is not a credential.");

  process.env.NODE_ENV = "production";
  process.env.CONTENT_GENERATION_SECRET = "production-admin-secret";

  assert.equal(await isContentAdminAuthorized(request()), false);
  assert.equal(await isContentAdminAuthorized(request({ "x-content-generation-secret": "wrong" })), false);
  assert.equal(await isContentAdminAuthorized(request({ "x-content-generation-secret": "production-admin-secret" })), true);
  assert.equal(await isContentAdminAuthorized(request({ authorization: "Bearer production-admin-secret" })), true);
  assert.equal(await isContentAdminAuthorized(request({ "x-content-generation-secret": " production-admin-secret " })), true);
  assert.equal(await isContentAdminAuthorized(request({
    authorization: "Bearer wrong",
    "x-content-generation-secret": "production-admin-secret"
  })), true, "The dedicated header must work when an intermediary consumes Authorization.");

  process.env.CONTENT_GENERATION_SECRET = " production-admin-secret\n";
  assert.equal(
    await isContentAdminAuthorized(request({ "x-content-generation-secret": "production-admin-secret" })),
    true,
    "Deployment environment whitespace must not invalidate the configured secret."
  );
  process.env.CONTENT_GENERATION_SECRET = "production-admin-secret";

  delete process.env.CONTENT_GENERATION_SECRET;
  assert.equal(await isContentAdminAuthorized(request()), false, "Production must fail closed without a configured secret.");
  process.env.NODE_ENV = "development";
  assert.equal(await isContentAdminAuthorized(request()), true, "Local development retains its no-secret fallback.");

  process.env.NODE_ENV = "production";
  process.env.CONTENT_GENERATION_SECRET = "production-admin-secret";
  process.env.SUPABASE_URL = "https://auth.example.test";
  process.env.SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  const verifiedAdmin = async (url, options) => {
    assert.equal(url, "https://auth.example.test/auth/v1/user");
    assert.equal(options.headers.apikey, "publishable-test-key");
    assert.equal(options.headers.authorization, "Bearer owner-session-token");
    return { ok: true, json: async () => ({ id: "owner", app_metadata: { role: "admin" } }) };
  };
  const verifiedMember = async () => ({ ok: true, json: async () => ({ id: "member", app_metadata: { role: "member" } }) });
  const rejectedSession = async () => ({ ok: false, json: async () => ({ message: "invalid" }) });
  assert.equal(await isContentAdminAuthorized(request({ "x-content-admin-session": "owner-session-token" }), verifiedAdmin), true, "A server-verified admin role must authorize Content Studio.");
  assert.equal(await isContentAdminAuthorized(request({ "x-content-admin-session": "member-session-token" }), verifiedMember), false, "An ordinary signed-in member must remain denied.");
  assert.equal(await isContentAdminAuthorized(request({ "x-content-admin-session": "expired-session-token" }), rejectedSession), false, "An invalid session must remain denied.");
  assert.equal(await isContentAdminAuthorized(request({ "x-content-admin-session": "owner-session-token" }), async () => { throw new Error("network"); }), false, "Session verification failures must fail closed.");

  process.env.VITE_SUPABASE_URL = "https://browser-auth.example.test";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "browser-publishable-test-key";
  const verifiedBrowserProjectAdmin = async (url, options) => {
    assert.equal(url, "https://browser-auth.example.test/auth/v1/user");
    assert.equal(options.headers.apikey, "browser-publishable-test-key");
    return { ok: true, json: async () => ({ id: "owner", app_metadata: { role: "admin" } }) };
  };
  assert.equal(
    await isContentAdminAuthorized(request({ "x-content-admin-session": "browser-owner-session-token" }), verifiedBrowserProjectAdmin),
    true,
    "Content Studio must verify the browser session against the Vite Supabase project when server jobs use a different project."
  );
  delete process.env.VITE_SUPABASE_URL;
  delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  assert.deepEqual(adminCredentialHeaders("header.payload.signature"), {
    authorization: "Bearer header.payload.signature",
    "x-content-admin-session": "header.payload.signature"
  });
  assert.deepEqual(adminCredentialHeaders("production-admin-secret"), {
    authorization: "Bearer production-admin-secret",
    "x-content-generation-secret": "production-admin-secret"
  });

  const adminSources = [
    "apps/admin/src/GeneratedContentAdminDashboard.tsx",
    "apps/admin/src/AspectPatternWriteups.tsx",
    "apps/admin/src/ReportFulfillmentAdminPanel.tsx"
  ];
  for (const sourcePath of adminSources) {
    const source = fs.readFileSync(new URL(`../${sourcePath}`, import.meta.url), "utf8");
    assert.match(source, /adminCredentialHeaders/u, `${sourcePath} must use the shared owner-session/emergency-secret header helper.`);
  }

  const endpointSources = fs.readdirSync(new URL("../api/admin", import.meta.url))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => `api/admin/${name}`);
  for (const sourcePath of endpointSources) {
    const source = fs.readFileSync(new URL(`../${sourcePath}`, import.meta.url), "utf8");
    if (!source.includes("Unauthorized.")) continue;
    assert.match(
      source,
      /isContentAdminAuthorized|requireReportAdmin/u,
      `${sourcePath} must use the shared admin authorization path.`
    );
    assert.match(
      source,
      /await\s+(?:isContentAdminAuthorized|requireReportAdmin)\(/u,
      `${sourcePath} must await the server-verified owner-session authorization result.`
    );
  }

  const dashboardSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
  const ownerSessionSource = fs.readFileSync(new URL("../apps/admin/src/ownerSession.ts", import.meta.url), "utf8");
  assert.match(dashboardSource, /loadOwnerSessionAccessToken/u, "Content Studio must try the same-origin owner session before emergency access.");
  assert.match(dashboardSource, /watchOwnerSessionAccessToken/u, "Content Studio must keep a long-running owner session current.");
  assert.match(ownerSessionSource, /auth\/v1\/token\?grant_type=refresh_token/u, "The lightweight owner-session handoff must refresh expiring sessions.");
  assert.doesNotMatch(dashboardSource, /localStorage\.setItem\([^\n]*accessToken/u, "Content Studio must not persist the owner access token as an admin secret.");

  console.log("Admin authentication header tests passed.");
} finally {
  if (previousEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnvironment;
  if (previousSecret === undefined) delete process.env.CONTENT_GENERATION_SECRET;
  else process.env.CONTENT_GENERATION_SECRET = previousSecret;
  if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = previousSupabaseUrl;
  if (previousSupabaseKey === undefined) delete process.env.SUPABASE_PUBLISHABLE_KEY;
  else process.env.SUPABASE_PUBLISHABLE_KEY = previousSupabaseKey;
  if (previousViteSupabaseUrl === undefined) delete process.env.VITE_SUPABASE_URL;
  else process.env.VITE_SUPABASE_URL = previousViteSupabaseUrl;
  if (previousViteSupabaseKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = previousViteSupabaseKey;
}
