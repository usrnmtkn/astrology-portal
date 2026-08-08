#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeRelationshipFacts } from "../api/_lib/relationship-facts.ts";
import { calculatedSynastryContacts } from "../apps/web/src/services/chartMath.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(repoRoot, "scripts/fixtures/relationship-facts-pairs.json");
const serviceSource = path.join(repoRoot, "services/tldrastro-api/src");
const fixtures = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const warnTolerance = 0.1;
const failTolerance = 0.5;
const python = process.env.RELATIONSHIP_FACTS_PYTHON || "python3";

const pythonSource = String.raw`
import json
import sys

from tldrastro_api.models import CompositeRequest, NatalChartRequest, SynastryRequest
from tldrastro_api.services.composite import calculate_composite
from tldrastro_api.services.natal import calculate_natal_chart
from tldrastro_api.services.synastry import calculate_synastry

def dump(model):
    if hasattr(model, "model_dump"):
        return model.model_dump(by_alias=True)
    return model.dict(by_alias=True)

payload = json.load(sys.stdin)
results = []
for pair in payload["pairs"]:
    settings = pair["personA"].get("settings", {})
    synastry_request = SynastryRequest(
        personA=pair["personA"],
        personB=pair["personB"],
        settings=settings,
        includeContentFacts=False,
    )
    composite_request = CompositeRequest(
        personA=pair["personA"],
        personB=pair["personB"],
        settings=settings,
        includeContentFacts=False,
    )
    subject_natal = calculate_natal_chart(
        NatalChartRequest(subject=pair["personB"], includeContentFacts=False)
    )
    results.append({
        "id": pair["id"],
        "subjectNatal": dump(subject_natal),
        "synastry": dump(calculate_synastry(synastry_request)),
        "composite": dump(calculate_composite(composite_request)),
    })

json.dump({"results": results}, sys.stdout)
`;

const pythonResult = spawnSync(python, ["-c", pythonSource], {
  cwd: repoRoot,
  env: {
    ...process.env,
    PYTHONPATH: [serviceSource, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter)
  },
  input: JSON.stringify(fixtures),
  encoding: "utf8",
  maxBuffer: 20 * 1024 * 1024
});

if (pythonResult.status !== 0) {
  throw new Error(`Canonical relationship calculation failed: ${pythonResult.stderr || pythonResult.stdout}`);
}

const canonical = JSON.parse(pythonResult.stdout);

function skyFromNatal(natal) {
  return {
    positions: natal.positions.map((position) => ({
      planet: position.planet || position.point,
      glyph: position.glyph,
      longitude: position.longitude,
      sign: position.sign,
      signGlyph: position.signGlyph,
      degree: position.degreeDecimal,
      house: position.house ?? 0,
      motion: position.motion,
      theme: position.theme || "FIXTURE_ONLY_THEME"
    })),
    ascendantLongitude: natal.angles?.Ascendant?.longitude,
    midheavenLongitude: natal.angles?.Midheaven?.longitude
  };
}

function browserIdentity(contact) {
  return `${contact.friendPoint.name}|${contact.aspect}|${contact.yourPoint.name}`;
}

function canonicalIdentity(contact) {
  const friendPoint = contact.fromPerson === "B" ? contact.fromPoint : contact.toPoint;
  const yourPoint = contact.fromPerson === "A" ? contact.fromPoint : contact.toPoint;

  return `${friendPoint}|${contact.aspect}|${yourPoint}`;
}

let warned = 0;
let failed = 0;
let compared = 0;

for (const result of canonical.results) {
  const facts = normalizeRelationshipFacts({
    subjectRef: `friendship:00000000-0000-4000-8000-${result.id.endsWith("one") ? "000000000001" : "000000000002"}`,
    viewerTimeUnknown: false,
    subjectTimeUnknown: false,
    factsEngine: "tldrastro-api@0.1.0",
    subjectNatal: result.subjectNatal,
    synastry: result.synastry,
    composite: result.composite
  });
  const browserContacts = calculatedSynastryContacts(
    skyFromNatal(result.synastry.personA),
    { id: result.id, natalChart: skyFromNatal(result.synastry.personB) }
  );
  const browserByIdentity = new Map(browserContacts.map((contact) => [browserIdentity(contact), contact]));

  assert.equal(facts.contacts.length, 5, `${result.id}: composer must keep five ranked contacts.`);

  for (const contact of facts.contacts) {
    const identity = canonicalIdentity(contact);
    const browserContact = browserByIdentity.get(identity);

    if (!browserContact) {
      console.warn(`${result.id} ${identity}: browser contact unavailable for drift comparison`);
      warned += 1;
      continue;
    }

    const delta = Math.abs(contact.orb - browserContact.orb);
    compared += 1;
    console.log(`${result.id} ${identity}: api=${contact.orb.toFixed(4)} browser=${browserContact.orb.toFixed(4)} delta=${delta.toFixed(4)}°`);

    if (delta > failTolerance) {
      failed += 1;
      console.error(`${result.id} ${identity}: FAIL orb delta exceeds ${failTolerance}°`);
    } else if (delta > warnTolerance) {
      warned += 1;
      console.warn(`${result.id} ${identity}: WARN orb delta exceeds ${warnTolerance}°`);
    }
  }
}

assert.ok(compared >= 5, "Drift verification must compare at least five canonical/browser contacts across two pairs.");
assert.equal(failed, 0, `Relationship facts drift exceeded ${failTolerance}°.`);
console.log(`relationship facts drift passed: ${compared} contacts compared, ${warned} warnings, ${failed} failures`);
