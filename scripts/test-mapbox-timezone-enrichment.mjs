#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

process.env.VITE_MAPBOX_ACCESS_TOKEN = "test-mapbox-token";
process.env.VITE_TLDRASTRO_API_URL = "https://api.test";

const calls = [];

globalThis.fetch = async (input, init) => {
  const url = String(input);
  calls.push({ url, init });

  if (url.startsWith("https://api.mapbox.com/search/geocode/v6/forward")) {
    return new Response(JSON.stringify({
      features: [{
        id: "place.el-vigia",
        name: "El Vigia",
        place_formatted: "Merida, Venezuela",
        properties: {
          mapbox_id: "place.el-vigia",
          name: "El Vigia",
          place_formatted: "Merida, Venezuela",
          context: {
            region: {
              name: "Merida"
            }
          },
          coordinates: {
            latitude: 8.633333,
            longitude: -71.65
          }
        },
        geometry: {
          coordinates: [-71.65, 8.633333]
        }
      }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url.startsWith("https://api.mapbox.com/search/geocode/v6/reverse")) {
    return new Response(JSON.stringify({
      features: [{
        id: "place.el-vigia.reverse",
        name: "El Vigia",
        place_formatted: "Merida, Venezuela",
        properties: {
          name: "El Vigia",
          place_formatted: "Merida, Venezuela",
          context: {
            region: {
              name: "Merida"
            }
          }
        }
      }]
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  if (url === "https://api.test/utils/timezone") {
    const body = JSON.parse(String(init?.body ?? "{}"));

    assert.equal(body.latitude, 8.633333, "timezone lookup latitude");
    assert.equal(body.longitude, -71.65, "timezone lookup longitude");

    return new Response(JSON.stringify({
      timeZone: "America/Caracas",
      utcOffsetMinutes: -240,
      isDst: false,
      localDateTime: "1979-02-08T09:00:00-04:00",
      utcDateTime: "1979-02-08T13:00:00+00:00",
      source: "coordinates",
      warnings: []
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  return new Response(`Unexpected URL: ${url}`, { status: 500 });
};

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
  const { hasMapboxToken, reverseGeocodeCity, searchCities } = await server.ssrLoadModule("/src/services/mapbox.ts");

  assert.equal(hasMapboxToken(), true, "Mapbox token should be configured in the test environment");

  const suggestions = await searchCities("El Vigia");
  assert.equal(suggestions.length, 1, "searchCities should return one mocked suggestion");
  assert.equal(suggestions[0].label, "El Vigia, Merida");
  assert.equal(suggestions[0].timeZone, "America/Caracas", "searchCities should enrich Mapbox coordinates with API timezone");

  const reverse = await reverseGeocodeCity(8.633333, -71.65);
  assert.equal(reverse?.label, "El Vigia, Merida");
  assert.equal(reverse?.timeZone, "America/Caracas", "reverse geocode should enrich coordinates with API timezone");

  assert.equal(calls.filter((call) => call.url === "https://api.test/utils/timezone").length, 2, "API timezone endpoint call count");
} finally {
  await server.close();
}

console.log("Mapbox timezone enrichment passed for mocked search and reverse geocode.");
