import assert from "node:assert/strict";
import fs from "node:fs";
import { isContentAdminAuthorized } from "../api/_lib/admin-auth.ts";
import { normalizeAdminSecret } from "../apps/admin/src/adminSecret.ts";

function request(headers = {}) {
  return { headers };
}

const previousEnvironment = process.env.NODE_ENV;
const previousSecret = process.env.CONTENT_GENERATION_SECRET;
const previousAdminUserIds = process.env.CONTENT_ADMIN_USER_IDS;
const previousSupabaseUrl = process.env.SUPABASE_URL;
const previousSupabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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
  assert.equal(await isContentAdminAuthorized(request({
    authorization: "Bearer wrong",
    "x-content-generation-secret": "production-admin-secret"
  })), true, "The dedicated header must work when an intermediary consumes Authorization.");

  process.env.CONTENT_ADMIN_USER_IDS = "owner-user-id";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "publishable-key";
  const verifiedOwnerFetch = async (url, init) => {
    assert.equal(url, "https://example.supabase.co/auth/v1/user");
    assert.equal(init.headers.authorization, "Bearer owner-session-token");
    return new Response(JSON.stringify({ id: "owner-user-id" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };
  assert.equal(await isContentAdminAuthorized(request({
    "x-content-admin-session": "owner-session-token"
  }), verifiedOwnerFetch), true, "An allowlisted signed-in owner must have admin access.");
  assert.equal(await isContentAdminAuthorized(request({
    authorization: "Bearer owner-session-token"
  }), verifiedOwnerFetch), true, "The signed-in owner session must also work through the standard Authorization header.");
  assert.equal(await isContentAdminAuthorized(request({
    "x-content-admin-session": "other-session-token"
  }), async () => new Response(JSON.stringify({ id: "other-user-id" }), {
    status: 200,
    headers: { "content-type": "application/json" }
  })), false, "A signed-in non-owner must remain denied.");

  delete process.env.CONTENT_GENERATION_SECRET;
  delete process.env.CONTENT_ADMIN_USER_IDS;
  assert.equal(await isContentAdminAuthorized(request()), false, "Production must fail closed without a configured secret or owner allowlist.");
  process.env.NODE_ENV = "development";
  assert.equal(await isContentAdminAuthorized(request()), true, "Local development retains its no-secret fallback.");

  const adminSources = [
    "apps/admin/src/GeneratedContentAdminDashboard.tsx",
    "apps/admin/src/AspectPatternWriteups.tsx",
    "apps/admin/src/ReportFulfillmentAdminPanel.tsx"
  ];
  for (const sourcePath of adminSources) {
    const source = fs.readFileSync(new URL(`../${sourcePath}`, import.meta.url), "utf8");
    assert.match(source, /"x-content-generation-secret"/u, `${sourcePath} must send the dedicated admin credential header.`);
  }
  const dashboardSource = fs.readFileSync(new URL("../apps/admin/src/GeneratedContentAdminDashboard.tsx", import.meta.url), "utf8");
  assert.match(dashboardSource, /"x-content-admin-session"/u, "The dashboard must send signed-in sessions over the dedicated session header.");
  assert.match(dashboardSource, /getSupabaseClient/u, "The dashboard must try the existing signed-in session before requiring a pasted secret.");

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
  }

  console.log("Admin authentication header tests passed.");
} finally {
  if (previousEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnvironment;
  if (previousSecret === undefined) delete process.env.CONTENT_GENERATION_SECRET;
  else process.env.CONTENT_GENERATION_SECRET = previousSecret;
  if (previousAdminUserIds === undefined) delete process.env.CONTENT_ADMIN_USER_IDS;
  else process.env.CONTENT_ADMIN_USER_IDS = previousAdminUserIds;
  if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = previousSupabaseUrl;
  if (previousSupabasePublishableKey === undefined) delete process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  else process.env.VITE_SUPABASE_PUBLISHABLE_KEY = previousSupabasePublishableKey;
}
