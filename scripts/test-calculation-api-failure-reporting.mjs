import assert from "node:assert/strict";
import fs from "node:fs";
import {
  calculationApiBaseUrl,
  calculationApiFailureDetail,
  describeCalculationApiFailure
} from "../api/_lib/calculation-api.ts";
import { currentSkyFacts } from "../api/_lib/current-sky.ts";
import { ReportCalculationApiClientError } from "../api/_lib/report-facts.ts";
import skyArticleWritingHandler from "../api/admin/sky-article-writing.ts";

const unavailableHtml = [
  "<html><head><title>503 Server Error</title></head>",
  "<body><h1>Error: Server Error</h1>",
  "<h2>The service you requested is not available yet.<p>Please try again in 30 seconds.</h2>",
  "</body></html>"
].join("");

// An unreachable or redeployed service answers with HTML or nothing, so there
// is no payload to stringify. Reporting the absent payload produced the
// owner-facing "TLDR Astro API 500: null" with no cause in it.
const htmlDetail = calculationApiFailureDetail(unavailableHtml, null);
assert.doesNotMatch(htmlDetail, /^null$/u, "An HTML failure body must never be reported as a null payload.");
assert.match(htmlDetail, /The service you requested is not available yet/u, "The service's own words must survive into the message.");
assert.doesNotMatch(htmlDetail, /[<>]/u, "HTML markup must be stripped so the reason stays readable.");

assert.equal(calculationApiFailureDetail("", null), "an empty response body");
assert.equal(calculationApiFailureDetail("", undefined), "an empty response body");
assert.equal(
  calculationApiFailureDetail("", { code: "BAD_REQUEST" }),
  '{"code":"BAD_REQUEST"}',
  "A JSON payload must still be reported in full."
);
assert.ok(
  calculationApiFailureDetail(`${"x".repeat(400)}`, null).length <= 241,
  "A long response body must be truncated rather than pasted whole."
);

const described = describeCalculationApiFailure({
  target: "https://calculation.invalid/sky/current",
  status: 503,
  statusText: "Service Unavailable",
  body: unavailableHtml,
  payload: null
});
assert.match(described, /^503 Service Unavailable from https:\/\/calculation\.invalid\/sky\/current: /u, "A failure must name the status and the service it came from.");

assert.equal(calculationApiBaseUrl("https://configured.invalid/"), "https://configured.invalid", "A trailing slash must be trimmed from the configured host.");

// Report fulfillment routes on this message, so a JSON payload must still
// render exactly as before while an absent one gains a reason.
const jsonClientError = new ReportCalculationApiClientError(400, { code: "BAD_REQUEST", message: "FIXTURE_ONLY" });
assert.equal(
  jsonClientError.message,
  'CALCULATION_API_CLIENT_ERROR: TLDR Astro API request failed with 400: {"code":"BAD_REQUEST","message":"FIXTURE_ONLY"}'
);
assert.equal(
  new ReportCalculationApiClientError(429, null, "").message,
  "CALCULATION_API_CLIENT_ERROR: TLDR Astro API request failed with 429: an empty response body"
);

const originalFetch = globalThis.fetch;
const requested = [];
globalThis.fetch = async (url) => {
  requested.push(String(url));
  return new Response(unavailableHtml, {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "content-type": "text/html" }
  });
};

try {
  await assert.rejects(
    currentSkyFacts(new Date("2026-09-18T12:00:00Z")),
    (error) => {
      assert.doesNotMatch(error.message, /:\s*null\s*$/u, "The current-sky client must not report an absent payload as null.");
      assert.match(error.message, /TLDR Astro API 503 Service Unavailable from https:\/\/\S+\/sky\/current/u);
      assert.match(error.message, /not available yet/u);
      return true;
    },
    "A failed current-sky request must say which service answered and what it said."
  );
  assert.equal(requested.length, 1, "The failing request must not be retried silently.");

  // The evergreen writer reports a calculation outage as an upstream failure
  // with the article untouched, not as an opaque 500 from the writing handler.
  const response = { statusCode: 0, headers: {}, body: "", setHeader(name, value) { this.headers[name] = value; }, end(body) { this.body = body; } };
  await skyArticleWritingHandler({
    method: "POST",
    headers: { "content-type": "application/json" },
    body: { planet: "saturn", sign: "aries", field: "placementArticle", referenceDate: "2026-09-18", instruction: "", currentText: "" }
  }, response);

  const payload = JSON.parse(response.body);
  assert.equal(response.statusCode, 502, "A calculation outage is an upstream failure, not a writing failure.");
  assert.equal(payload.ok, false);
  assert.match(payload.error, /The sky calculation service did not answer/u);
  assert.match(payload.error, /Your article was not changed\./u);
  assert.match(payload.error, /not available yet/u, "The owner-facing message must carry the reason the service gave.");
  assert.doesNotMatch(payload.error, /:\s*null/u, "The owner must never be shown a null payload as the reason.");
} finally {
  globalThis.fetch = originalFetch;
}

for (const file of [
  "api/_lib/current-sky.ts",
  "api/_lib/report-facts.ts",
  "api/_lib/relationship-facts.ts",
  "api/admin/review-records.ts"
]) {
  const source = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const calculationFailureLines = source
    .split("\n")
    .filter((line) => /TLDR Astro API|calculationApi/u.test(line) && /JSON\.stringify\(payload\)/u.test(line));
  assert.deepEqual(
    calculationFailureLines,
    [],
    `${file} must describe a calculation failure through calculation-api.ts instead of stringifying a payload that can be absent:\n${calculationFailureLines.join("\n")}`
  );
  assert.doesNotMatch(
    source,
    /tldrastro-api-\d+\.us-central1\.run\.app/u,
    `${file} must read the calculation host from calculation-api.ts instead of hardcoding it.`
  );
}

const health = fs.readFileSync(new URL("../api/health.ts", import.meta.url), "utf8");
assert.match(health, /skyCalculationApi\b/u, "Health must report the calculation service so an outage is visible before an owner action fails.");
assert.doesNotMatch(
  health,
  /const ok = [\s\S]*?skyCalculationApi\.ok/u,
  "The calculation service is reported without gating overall health, so an upstream outage does not fail unrelated deployments."
);

console.log("Calculation API failure reporting passed: readable HTML and empty-body failures, named service and status, upstream 502 from the evergreen writer, one shared host, and health visibility.");
