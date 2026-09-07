const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const attempts = Number.parseInt(process.env.PRODUCTION_SMOKE_ATTEMPTS || "6", 10);
const delayMs = Number.parseInt(process.env.PRODUCTION_SMOKE_DELAY_MS || "10000", 10);

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
    // Health failures can be plain text. Never print response bodies from
    // production endpoints into CI logs.
  }
  return { status: response.status, contentType, shape };
}

async function checkOnce() {
  const health = await fetch(`${baseUrl}/api/health`, { headers: { accept: "application/json" } });
  const healthSummary = await responseSummary(health.clone());
  if (health.status !== 200) throw new Error(`Health smoke failed: ${JSON.stringify(healthSummary)}`);
  const healthPayload = await health.json();
  if (healthPayload?.ok !== true) throw new Error(`Health smoke returned HTTP 200 without ok=true: ${JSON.stringify(healthSummary)}`);

  const reportFulfillment = healthPayload?.dependencies?.reportFulfillment;
  if (
    reportFulfillment?.ok !== true
    || reportFulfillment?.detail?.controlRowAvailable !== true
    || reportFulfillment?.detail?.billingMode !== "free_test"
  ) {
    throw new Error(`Report fulfillment health contract failed: ${JSON.stringify({
      status: health.status,
      reportFulfillmentOk: reportFulfillment?.ok === true,
      controlRowAvailable: reportFulfillment?.detail?.controlRowAvailable === true,
      billingMode: reportFulfillment?.detail?.billingMode ?? "missing"
    })}`);
  }

  const exactAspects = healthPayload?.dependencies?.contentStudioExactAspects;
  if (
    exactAspects?.ok !== true
    || exactAspects?.detail?.exactRows !== 439
    || exactAspects?.detail?.northNodeRows !== 60
    || exactAspects?.detail?.southNodeRows !== 60
  ) {
    throw new Error(`Content Studio exact-aspect health contract failed: ${JSON.stringify({
      status: health.status,
      exactAspectsOk: exactAspects?.ok === true,
      exactRows: exactAspects?.detail?.exactRows ?? "missing",
      northNodeRows: exactAspects?.detail?.northNodeRows ?? "missing",
      southNodeRows: exactAspects?.detail?.southNodeRows ?? "missing"
    })}`);
  }
}

let lastError;
for (let attempt = 1; attempt <= attempts; attempt += 1) {
  try {
    await checkOnce();
    console.log(`Production report and Content Studio smoke passed at ${baseUrl} on attempt ${attempt}/${attempts}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    console.error(`Production smoke attempt ${attempt}/${attempts} failed: ${error instanceof Error ? error.message : String(error)}`);
    if (attempt < attempts) await wait(delayMs);
  }
}

throw lastError;
