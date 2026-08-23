import assert from "node:assert/strict";
import fs from "node:fs";
import { isContentAdminAuthorized } from "../api/_lib/admin-auth.ts";
import { normalizeAdminSecret } from "../apps/admin/src/adminSecret.ts";

function request(headers = {}) {
  return { headers };
}

const previousEnvironment = process.env.NODE_ENV;
const previousSecret = process.env.CONTENT_GENERATION_SECRET;

try {
  assert.equal(normalizeAdminSecret(" production-admin-secret "), "production-admin-secret");
  assert.equal(normalizeAdminSecret("CONTENT_GENERATION_SECRET=production-admin-secret"), "production-admin-secret");
  assert.equal(normalizeAdminSecret("export CONTENT_GENERATION_SECRET='production-admin-secret'"), "production-admin-secret");
  assert.equal(normalizeAdminSecret('CONTENT_GENERATION_SECRET="production-admin-secret"'), "production-admin-secret");
  assert.equal(normalizeAdminSecret("# Production\nCONTENT_GENERATION_SECRET=production-admin-secret\nCRON_SECRET=other"), "production-admin-secret");
  assert.equal(normalizeAdminSecret("CONTENT_GENERATION_SECRET"), "", "The variable name alone is not a credential.");

  process.env.NODE_ENV = "production";
  process.env.CONTENT_GENERATION_SECRET = "production-admin-secret";

  assert.equal(isContentAdminAuthorized(request()), false);
  assert.equal(isContentAdminAuthorized(request({ "x-content-generation-secret": "wrong" })), false);
  assert.equal(isContentAdminAuthorized(request({ "x-content-generation-secret": "production-admin-secret" })), true);
  assert.equal(isContentAdminAuthorized(request({ authorization: "Bearer production-admin-secret" })), true);
  assert.equal(isContentAdminAuthorized(request({ "x-content-generation-secret": " production-admin-secret " })), true);
  assert.equal(isContentAdminAuthorized(request({
    authorization: "Bearer wrong",
    "x-content-generation-secret": "production-admin-secret"
  })), true, "The dedicated header must work when an intermediary consumes Authorization.");

  process.env.CONTENT_GENERATION_SECRET = " production-admin-secret\n";
  assert.equal(
    isContentAdminAuthorized(request({ "x-content-generation-secret": "production-admin-secret" })),
    true,
    "Deployment environment whitespace must not invalidate the configured secret."
  );
  process.env.CONTENT_GENERATION_SECRET = "production-admin-secret";

  delete process.env.CONTENT_GENERATION_SECRET;
  assert.equal(isContentAdminAuthorized(request()), false, "Production must fail closed without a configured secret.");
  process.env.NODE_ENV = "development";
  assert.equal(isContentAdminAuthorized(request()), true, "Local development retains its no-secret fallback.");

  const adminSources = [
    "apps/admin/src/GeneratedContentAdminDashboard.tsx",
    "apps/admin/src/AspectPatternWriteups.tsx",
    "apps/admin/src/ReportFulfillmentAdminPanel.tsx"
  ];
  for (const sourcePath of adminSources) {
    const source = fs.readFileSync(new URL(`../${sourcePath}`, import.meta.url), "utf8");
    assert.match(source, /"x-content-generation-secret"/u, `${sourcePath} must send the dedicated admin credential header.`);
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
  }

  console.log("Admin authentication header tests passed.");
} finally {
  if (previousEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnvironment;
  if (previousSecret === undefined) delete process.env.CONTENT_GENERATION_SECRET;
  else process.env.CONTENT_GENERATION_SECRET = previousSecret;
}
