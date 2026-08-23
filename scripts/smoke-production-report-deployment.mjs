const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const adminSecret = process.env.CONTENT_GENERATION_SECRET?.trim();
const attempts = Number.parseInt(process.env.PRODUCTION_SMOKE_ATTEMPTS || "6", 10);
const delayMs = Number.parseInt(process.env.PRODUCTION_SMOKE_DELAY_MS || "10000", 10);

if (!adminSecret) {
  throw new Error("CONTENT_GENERATION_SECRET is required for the authenticated production report smoke check.");
}
if (!Number.isInteger(attempts) || attempts < 1 || !Number.isInteger(delayMs) || delayMs < 0) {
  throw new Error("Production smoke retry configuration is invalid.");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function responseSummary(response) {
  const contentType = response.headers.get("content-type") || "unknown";
  const text = await response.text();
  let shape = "non-json";
  try {
    const parsed = JSON.parse(text);
    shape = parsed && typeof parsed === "object" ? Object.keys(parsed).sort().join(",") : typeof parsed;
  } catch {
    // Missing-artifact failures are frequently plain text. Never print the
    // authenticated dashboard response body or owner data into CI logs.
  }
  return { status: response.status, contentType, shape };
}

async function checkOnce() {
  const health = await fetch(`${baseUrl}/api/health`, { headers: { accept: "application/json" } });
  const healthSummary = await responseSummary(health.clone());
  if (health.status !== 200) throw new Error(`Health smoke failed: ${JSON.stringify(healthSummary)}`);
  const healthPayload = await health.json();
  if (healthPayload?.ok !== true) throw new Error(`Health smoke returned HTTP 200 without ok=true: ${JSON.stringify(healthSummary)}`);

  const admin = await fetch(`${baseUrl}/api/admin/report-fulfillment`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${adminSecret}`,
      // Admin traffic uses a dedicated credential header because deployment
      // intermediaries may consume Authorization before the function runs.
      "x-content-generation-secret": adminSecret
    }
  });
  const adminSummary = await responseSummary(admin.clone());
  if (admin.status !== 200) throw new Error(`Authenticated report smoke failed: ${JSON.stringify(adminSummary)}`);
  const dashboard = await admin.json();
  if (!Array.isArray(dashboard?.reports) || !Array.isArray(dashboard?.users) || dashboard?.billingMode !== "free_test") {
    throw new Error(`Authenticated report smoke returned an invalid dashboard contract: ${JSON.stringify(adminSummary)}`);
  }
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await checkOnce();
    console.log(`Production report smoke passed at ${baseUrl} on attempt ${attempt}/${attempts}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`Production report smoke attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt < attempts) await wait(delayMs);
  }
}

throw lastError;
