import assert from "node:assert/strict";

function recordValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function reportWindow(facts) {
  return recordValue(facts.reportWindow) ?? facts;
}

function paragraphs(value) {
  return value.split(/\n\s*\n/u);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}

function replaceById(collection, replacement) {
  const items = Array.isArray(collection) ? collection : [];
  const index = items.findIndex((item) => recordValue(item)?.id === replacement.id);
  if (index < 0) return [...items, structuredClone(replacement)];
  return items.map((item, itemIndex) => itemIndex === index ? structuredClone(replacement) : item);
}

export function factAuditFor(manifest, fixture) {
  if (fixture.factAudit) return fixture.factAudit;
  if (fixture.factAuditFromFixtureId) {
    const source = [...manifest.pairs, ...manifest.findingLevelFixtures]
      .find((candidate) => candidate.id === fixture.factAuditFromFixtureId);
    assert.ok(source?.factAudit, `${fixture.id} references missing fact audit ${fixture.factAuditFromFixtureId}.`);
    return source.factAudit;
  }
  assert.fail(`${fixture.id} has no fact audit.`);
}

export function paragraphLocationToken(manifest, index) {
  return manifest.completeUnitParagraphIndexing.marker.replace("{index}", String(index));
}

export function numberedCompleteUnit(manifest, unit) {
  return paragraphs(unit)
    .map((paragraph, index) => `${paragraphLocationToken(manifest, index)}\n${paragraph}`)
    .join("\n\n");
}

export function completeUnitFacts({ manifest, fixture, scopedFacts, fullFacts }) {
  const audit = factAuditFor(manifest, fixture);
  const result = structuredClone(scopedFacts);
  const resultRoot = reportWindow(result);
  const fullRoot = reportWindow(fullFacts);
  for (const expected of audit.requiredFacts) {
    if (expected.factType === "transit_arc") {
      const arc = (fullRoot.slowTransitArcs ?? []).find((candidate) => candidate.id === expected.factId);
      assert.ok(arc, `${fixture.id} full facts are missing transit arc ${expected.factId}.`);
      resultRoot.slowTransitArcs = replaceById(resultRoot.slowTransitArcs, arc);
    } else if (expected.factType === "lunar_event") {
      const event = (fullRoot.lunarEvents ?? []).find((candidate) => candidate.id === expected.factId);
      assert.ok(event, `${fixture.id} full facts are missing lunar event ${expected.factId}.`);
      resultRoot.lunarEvents = replaceById(resultRoot.lunarEvents, event);
    } else {
      assert.fail(`${fixture.id} has unsupported fact type ${expected.factType}.`);
    }
  }
  resultRoot.fixtureFactAudit = {
    provenance: fullRoot.fixtureProvenance ?? null,
    claimSupport: structuredClone(audit.claimSupport),
  };
  resultRoot.unitContext = {
    reportDomain: fixture.reportDomain,
    unitId: fixture.unitId,
    startsOn: fixture.unitWindow.startsOn,
    endsOn: fixture.unitWindow.endsOn,
  };
  return result;
}

function resolveFact(root, factId) {
  const arc = (root.slowTransitArcs ?? []).find((candidate) => candidate.id === factId);
  if (arc) return arc;
  const event = (root.lunarEvents ?? []).find((candidate) => candidate.id === factId);
  if (event) return event;
  const natalPosition = String(factId).match(/^natal-position-(.+)$/u)?.[1];
  if (natalPosition) {
    return (root.natal?.positions ?? []).find((candidate) => slug(candidate.point) === natalPosition);
  }
  const natalAngle = String(factId).match(/^natal-angle-(.+)$/u)?.[1];
  if (natalAngle) {
    return Object.values(root.natal?.angles ?? {}).find((candidate) => slug(candidate.point) === natalAngle);
  }
  return null;
}

function strings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (recordValue(value)) return Object.values(value).flatMap(strings);
  return [];
}

function traceableDateTokens(facts) {
  const tokens = new Set();
  const long = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const short = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  for (const value of strings(facts)) {
    if (!/^\d{4}-\d{2}-\d{2}/u.test(value)) continue;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) continue;
    tokens.add(`${long[date.getUTCMonth()]} ${date.getUTCDate()}`);
    tokens.add(`${short[date.getUTCMonth()]} ${date.getUTCDate()}`);
  }
  return tokens;
}

export function assertFixtureFactCompleteness({ manifest, fixture, unit, unitFacts }) {
  const audit = factAuditFor(manifest, fixture);
  const root = reportWindow(unitFacts);
  for (const expected of audit.requiredFacts) {
    const actual = resolveFact(root, expected.factId);
    assert.ok(actual, `${fixture.id} packet is missing ${expected.factId}.`);
    if (expected.factType === "transit_arc") {
      for (const field of ["transitPlanet", "natalPoint", "natalHouse", "aspect", "passCount"]) {
        assert.equal(actual[field], expected[field], `${fixture.id}.${expected.factId}.${field} drifted.`);
      }
      if (Object.hasOwn(expected, "isReturn")) assert.equal(actual.isReturn, expected.isReturn);
      assert.equal(actual.passes.length, expected.passCount);
      assert.deepEqual(actual.passes.map((pass) => pass.exactAt.slice(0, 10)), expected.passDates);
      assert.deepEqual(actual.passes.map((pass) => pass.motion), expected.motions);
    } else {
      for (const field of ["kind", "subtype", "natalHouse"]) {
        assert.equal(actual[field], expected[field], `${fixture.id}.${expected.factId}.${field} drifted.`);
      }
      assert.equal(actual.occursAt.slice(0, 10), expected.occursOn);
      const contact = actual.natalContacts.find((candidate) => candidate.natalPoint === expected.contact.natalPoint);
      assert.ok(contact, `${fixture.id}.${expected.factId} is missing contact ${expected.contact.natalPoint}.`);
      assert.equal(contact.natalHouse, expected.contact.natalHouse);
      assert.equal(contact.aspect, expected.contact.aspect);
    }
  }
  for (const mapping of audit.claimSupport) {
    assert.ok(mapping.claim.trim().length > 0, `${fixture.id} contains an empty audited claim.`);
    assert.ok(mapping.supportingFactIds.length > 0, `${fixture.id} claim has no supporting facts.`);
    for (const factId of mapping.supportingFactIds) {
      assert.ok(resolveFact(root, factId), `${fixture.id} claim references missing fact ${factId}.`);
    }
  }
  const blocks = paragraphs(unit);
  const attribution = [...new Set([fixture.attributionParagraphIndex, fixture.keyDatesParagraphIndex])]
    .map((index) => blocks[index])
    .filter(Boolean)
    .join("\n");
  const allowedDates = traceableDateTokens(root);
  const assertedDates = attribution.match(/\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}\b/giu) ?? [];
  for (const assertedDate of assertedDates) {
    assert.ok(allowedDates.has(assertedDate.toLowerCase()), `${fixture.id} attribution date ${assertedDate} is absent from UNIT_FACTS.`);
  }
  return audit.requiredFacts.map((fact) => ({ fixture: fixture.id, claimType: fact.factType, factId: fact.factId }));
}
