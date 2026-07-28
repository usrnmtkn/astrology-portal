#!/usr/bin/env node
import assert from "node:assert/strict";
import os from "node:os";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiSrc = path.join(repoRoot, "services/tldrastro-api/src");
const pythonCandidates = [
  process.env.PYTHON_BIN,
  "/Applications/Xcode.app/Contents/Developer/usr/bin/python3",
  "python3",
  "python"
].filter((candidate) => candidate && (!candidate.startsWith("/") || fs.existsSync(candidate)));

const cases = [
  { label: "El Vigia, Venezuela", latitude: 8.633333, longitude: -71.65, expected: "America/Caracas" },
  { label: "London, United Kingdom", latitude: 51.5074, longitude: -0.1278, expected: "Europe/London" },
  { label: "Paris, France", latitude: 48.8566, longitude: 2.3522, expected: "Europe/Paris" },
  { label: "Berlin, Germany", latitude: 52.52, longitude: 13.405, expected: "Europe/Berlin" },
  { label: "Reykjavik, Iceland", latitude: 64.1466, longitude: -21.9426, expected: "Atlantic/Reykjavik" },
  { label: "Moscow, Russia", latitude: 55.7558, longitude: 37.6173, expected: "Europe/Moscow" },
  { label: "Cairo, Egypt", latitude: 30.0444, longitude: 31.2357, expected: "Africa/Cairo" },
  { label: "Lagos, Nigeria", latitude: 6.5244, longitude: 3.3792, expected: "Africa/Lagos" },
  { label: "Nairobi, Kenya", latitude: -1.2921, longitude: 36.8219, expected: "Africa/Nairobi" },
  { label: "Cape Town, South Africa", latitude: -33.9249, longitude: 18.4241, expected: "Africa/Johannesburg" },
  { label: "Dubai, United Arab Emirates", latitude: 25.2048, longitude: 55.2708, expected: "Asia/Dubai" },
  { label: "New Delhi, India", latitude: 28.6139, longitude: 77.209, expected: "Asia/Kolkata" },
  { label: "Bangkok, Thailand", latitude: 13.7563, longitude: 100.5018, expected: "Asia/Bangkok" },
  { label: "Singapore", latitude: 1.3521, longitude: 103.8198, expected: "Asia/Singapore" },
  { label: "Shanghai, China", latitude: 31.2304, longitude: 121.4737, expected: "Asia/Shanghai" },
  { label: "Tokyo, Japan", latitude: 35.6762, longitude: 139.6503, expected: "Asia/Tokyo" },
  { label: "Sydney, Australia", latitude: -33.8688, longitude: 151.2093, expected: "Australia/Sydney" },
  { label: "Auckland, New Zealand", latitude: -36.8485, longitude: 174.7633, expected: "Pacific/Auckland" },
  { label: "Buenos Aires, Argentina", latitude: -34.6037, longitude: -58.3816, expected: "America/Argentina/Buenos_Aires" },
  { label: "Sao Paulo, Brazil", latitude: -23.5558, longitude: -46.6396, expected: "America/Sao_Paulo" },
  { label: "Santiago, Chile", latitude: -33.4489, longitude: -70.6693, expected: "America/Santiago" },
  { label: "Bogota, Colombia", latitude: 4.711, longitude: -74.0721, expected: "America/Bogota" },
  { label: "Lima, Peru", latitude: -12.0464, longitude: -77.0428, expected: "America/Lima" },
  { label: "Mexico City, Mexico", latitude: 19.4326, longitude: -99.1332, expected: "America/Mexico_City" },
  { label: "Los Angeles, CA", latitude: 34.0522, longitude: -118.2437, expected: "America/Los_Angeles" },
  { label: "Phoenix, AZ", latitude: 33.4484, longitude: -112.074, expected: "America/Phoenix" },
  { label: "Toronto, Canada", latitude: 43.6532, longitude: -79.3832, expected: "America/Toronto" },
  { label: "St. John's, Canada", latitude: 47.5615, longitude: -52.7126, expected: "America/St_Johns" },
  { label: "Honolulu, HI", latitude: 21.3099, longitude: -157.8581, expected: "Pacific/Honolulu" }
];

function runApiTimezoneChecks() {
  const code = `
import json
from tldrastro_api.models import TimezoneRequest
from tldrastro_api.services.timezone import resolve_timezone

payload = json.loads(${JSON.stringify(JSON.stringify(cases))})
responses = []
for case in payload:
    response = resolve_timezone(TimezoneRequest(
        latitude=case["latitude"],
        longitude=case["longitude"],
        date="1979-02-08",
        time="09:00",
    ))
    responses.append(response.model_dump())
print(json.dumps(responses))
`;
  const env = {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH ? `${apiSrc}:${process.env.PYTHONPATH}` : apiSrc,
    PYTHONPYCACHEPREFIX: process.env.PYTHONPYCACHEPREFIX ?? `${os.tmpdir()}/tldrastro-pycache`
  };

  for (const executable of pythonCandidates) {
    const result = spawnSync(executable, ["-c", code], {
      encoding: "utf8",
      env,
      maxBuffer: 10 * 1024 * 1024
    });

    if (result.error?.code === "ENOENT") {
      continue;
    }
    if (result.status !== 0) {
      throw new Error(`API timezone integrity check failed: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout);
  }

  throw new Error("No Python executable found for API timezone integrity check.");
}

const apiResponses = runApiTimezoneChecks();

apiResponses.forEach((response, index) => {
  const expected = cases[index].expected;

  assert.equal(response.timeZone, expected, `${cases[index].label}: API coordinate timezone`);
  assert.ok(
    response.source === "coordinates" || response.source === "google",
    `${cases[index].label}: API timezone source should be coordinates or google, received ${response.source}`
  );
});

const logger = createLogger("error");
const viteError = logger.error;
logger.error = (message, options) => {
  const text = String(message);
  if (
    text.includes("WebSocket server error")
    || text.includes("Failed to run dependency scan")
    || text.includes("The server is being restarted or closed")
  ) {
    return;
  }
  viteError(message, options);
};

const server = await createServer({
  root: path.join(repoRoot, "apps/web"),
  appType: "custom",
  customLogger: logger,
  optimizeDeps: {
    entries: [],
    noDiscovery: true
  },
  server: { middlewareMode: true, hmr: false }
});

try {
  const { zonedDateTimeToUtc } = await server.ssrLoadModule("/src/services/timezones.ts");

  const joseUtc = zonedDateTimeToUtc("1979-02-08", "9:00 AM", "America/Caracas").toISOString();
  assert.equal(joseUtc, "1979-02-08T13:00:00.000Z", "web explicit IANA conversion for Jose");
} finally {
  await server.close();
}

console.log(`Timezone integrity passed for ${cases.length} international coordinate cases.`);
