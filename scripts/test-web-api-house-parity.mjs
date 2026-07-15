#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const apiSrc = path.join(repoRoot, "services/tldrastro-api/src");

const cases = [
  {
    id: "jose-el-vigia-1979",
    iso: "1979-02-08T13:00:00.000Z",
    date: "1979-02-08",
    location: {
      label: "El Vigia, Venezuela",
      latitude: 8.6333,
      longitude: -71.65,
      timeZone: "America/Caracas"
    }
  },
  {
    id: "maya-new-york-1994",
    iso: "1994-04-12T12:35:00.000Z",
    date: "1994-04-12",
    location: {
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    }
  },
  {
    id: "current-sky-new-york-2026",
    iso: "2026-06-16T16:00:00.000Z",
    date: "2026-06-16",
    location: {
      label: "New York, NY",
      latitude: 40.7128,
      longitude: -74.006,
      timeZone: "America/New_York"
    }
  }
];

const apiCode = `
import json
import sys

from tldrastro_api.models import SkyCurrentRequest
from tldrastro_api.services.sky import calculate_current_sky

payload = json.load(sys.stdin)
response = calculate_current_sky(SkyCurrentRequest(**payload))
print(response.model_dump_json())
`;

function runApi(caseData) {
  const payload = {
    datetime: {
      date: caseData.date,
      utc: caseData.iso,
      timeKnown: true,
      timeZone: caseData.location.timeZone
    },
    location: caseData.location,
    settings: {
      houseSystem: "whole_sign",
      zodiac: "tropical",
      aspectProfile: "standard"
    }
  };
  const env = {
    ...process.env,
    PYTHONPATH: process.env.PYTHONPATH ? `${apiSrc}:${process.env.PYTHONPATH}` : apiSrc
  };

  for (const executable of ["python3", "python"]) {
    const result = spawnSync(executable, ["-c", apiCode], {
      input: JSON.stringify(payload),
      encoding: "utf8",
      env,
      maxBuffer: 10 * 1024 * 1024
    });

    if (result.error?.code === "ENOENT") {
      continue;
    }
    if (result.status !== 0) {
      throw new Error(`API calculation failed for ${caseData.id}: ${result.stderr || result.stdout}`);
    }
    return JSON.parse(result.stdout);
  }

  throw new Error("No Python executable found for API house parity test.");
}

function byPlanet(positions) {
  return new Map(positions.map((position) => [position.planet ?? position.point, position]));
}

function circularDiff(first, second) {
  const raw = Math.abs((((Number(first) - Number(second)) % 360) + 360) % 360);
  return raw > 180 ? 360 - raw : raw;
}

function assertClose(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`
  );
}

function assertCircularClose(actual, expected, tolerance, message) {
  assert.ok(
    circularDiff(actual, expected) <= tolerance,
    `${message}: expected ${expected}, received ${actual}`
  );
}

const requiredPoints = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "North Node"];
const optionalPoints = ["Chiron", "Lilith"];

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

  for (const caseData of cases) {
    const web = await getAstrodienstSky(caseData.location, new Date(caseData.iso));
    const api = runApi(caseData);
    const webPositions = byPlanet(web.positions);
    const apiPositions = byPlanet(api.positions);

    assert.equal(api.metadata.houseSystem, "whole_sign", `${caseData.id}: API house system`);
    assert.equal(web.calculationProvenance.houseSystem, "whole_sign", `${caseData.id}: web house system`);
    assert.equal(web.calculationProvenance.planetHouseSystem, "whole_sign", `${caseData.id}: web planet house system`);

    assertCircularClose(api.ascendantLongitude, web.ascendantLongitude, 0.02, `${caseData.id}: ascendant longitude`);
    assertCircularClose(api.midheavenLongitude, web.midheavenLongitude, 0.02, `${caseData.id}: MC longitude`);

    for (const webCusp of web.houseCusps) {
      const apiLongitude = api.houseCusps[webCusp.house - 1];
      assertClose(apiLongitude, webCusp.longitude, 0.000001, `${caseData.id}: house ${webCusp.house} cusp`);
      assert.equal(webCusp.degree, 0, `${caseData.id}: house ${webCusp.house} degree`);
      assert.equal(webCusp.houseSystem, "whole_sign", `${caseData.id}: house ${webCusp.house} system`);
    }

    for (const point of requiredPoints) {
      const webPosition = webPositions.get(point);
      const apiPosition = apiPositions.get(point);
      assert.ok(webPosition, `${caseData.id}: missing web ${point}`);
      assert.ok(apiPosition, `${caseData.id}: missing API ${point}`);
      assert.equal(apiPosition.sign, webPosition.sign, `${caseData.id}: ${point} sign`);
      assert.equal(apiPosition.house, webPosition.house, `${caseData.id}: ${point} house`);
      assert.equal(webPosition.houseSystem, "whole_sign", `${caseData.id}: ${point} web house system`);
    }

    for (const point of optionalPoints) {
      const webPosition = webPositions.get(point);
      const apiPosition = apiPositions.get(point);
      if (!webPosition || !apiPosition) {
        continue;
      }
      assert.equal(apiPosition.sign, webPosition.sign, `${caseData.id}: optional ${point} sign`);
      assert.equal(apiPosition.house, webPosition.house, `${caseData.id}: optional ${point} house`);
      assert.equal(webPosition.houseSystem, "whole_sign", `${caseData.id}: optional ${point} web house system`);
    }
  }
} finally {
  await server.close();
}

console.log(`web/API Whole Sign house parity passed for ${cases.length} fixed charts`);
