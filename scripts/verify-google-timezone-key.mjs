#!/usr/bin/env node
import assert from "node:assert/strict";

const apiKey = process.env.GOOGLE_MAPS_TIMEZONE_API_KEY
  ?? process.env.GOOGLE_TIMEZONE_API_KEY
  ?? process.env.GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error("Set GOOGLE_MAPS_TIMEZONE_API_KEY, GOOGLE_TIMEZONE_API_KEY, or GOOGLE_MAPS_API_KEY before running this script.");
}

const params = new URLSearchParams({
  location: "8.633333,-71.65",
  timestamp: String(Date.UTC(1979, 1, 8, 12, 0, 0) / 1000),
  key: apiKey
});

const response = await fetch(`https://maps.googleapis.com/maps/api/timezone/json?${params.toString()}`);
const payload = await response.json();

assert.equal(response.ok, true, `Google Time Zone API HTTP ${response.status}`);
assert.equal(payload.status, "OK", `Google Time Zone API status ${payload.status}: ${payload.errorMessage ?? ""}`);
assert.equal(payload.timeZoneId, "America/Caracas", `Expected America/Caracas for El Vigia, received ${payload.timeZoneId}`);

console.log("Google Time Zone API key verified: El Vigia resolves to America/Caracas.");
