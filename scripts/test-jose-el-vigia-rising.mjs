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

function runPythonApiCheck() {
  const code = `
import json
from tldrastro_api.models import SkyCurrentRequest
from tldrastro_api.services.sky import calculate_current_sky

payload = {
  "datetime": {
    "date": "1979-02-08",
    "time": "09:00",
    "timeKnown": True
  },
  "location": {
    "label": "El Vigia, Venezuela",
    "latitude": 8.633333,
    "longitude": -71.65
  },
  "settings": {
    "houseSystem": "whole_sign",
    "zodiac": "tropical",
    "aspectProfile": "standard"
  }
}
response = calculate_current_sky(SkyCurrentRequest(**payload))
print(response.model_dump_json())
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
      throw new Error(`API Jose timezone fallback check failed: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout);
  }

  throw new Error("No Python executable found for API Jose timezone fallback check.");
}

const apiJose = runPythonApiCheck();
const apiWarnings = apiJose.metadata?.inputWarnings ?? apiJose.metadata?.warnings ?? [];

assert.equal(apiJose.ascendant, "Pisces", "API should resolve Jose timezone from coordinates when omitted");
assert.ok(
  apiWarnings.some((warning) => /resolved America\/Caracas from coordinates/i.test(warning)),
  `Expected API coordinate timezone warning, received ${apiWarnings.join("; ")}`
);

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
  const { getAstrodienstSky } = await server.ssrLoadModule("/src/services/ephemeris.ts");
  const { zonedDateTimeToUtc } = await server.ssrLoadModule("/src/services/timezones.ts");

  const location = {
    label: "El Vigia, Venezuela",
    latitude: 8.633333,
    longitude: -71.65,
    timeZone: "America/Caracas"
  };
  const birthDateTime = zonedDateTimeToUtc("1979-02-08", "9:00 AM", location.timeZone);
  const sky = await getAstrodienstSky(location, birthDateTime);

  assert.equal(birthDateTime.toISOString(), "1979-02-08T13:00:00.000Z", "9:00 AM Venezuela should convert to 13:00 UTC");
  assert.equal(sky.ascendant, "Pisces", "Jose 1979-02-08 9:00 AM El Vigia rising sign");
  assert.ok(
    Math.abs((sky.ascendantLongitude ?? 0) - 349.974) < 0.02,
    `Expected Ascendant near 19 Pisces 58, received ${sky.ascendantLongitude}`
  );

  console.log("Jose El Vigia 9:00 AM rising check passed: Pisces rising at 19 Pisces 58.");
} finally {
  await server.close();
}
