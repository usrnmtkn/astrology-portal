#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  isImportedGeneratedRowServable,
  mapRecords,
  runImporter
} from "./prepare-tldr-astro-store-import.mjs";
import { runAuthoredFallbackRowsTests } from "./test-authored-fallback-rows.mjs";

function record(overrides) {
  return {
    key: "ms/synastry-aspect/saturn-conjunct-saturn/short",
    type: "synastry",
    category: "synastry-interaspect",
    scope: {},
    surfaceEligibility: null,
    condition: null,
    facet: null,
    variant: null,
    review: null,
    status: "APPROVED",
    lane: "serving",
    provenance: "test",
    sourceFile: "fixture.md",
    sectionRef: "T.1",
    text: "You understand the same pressures.",
    ...overrides
  };
}

function actionFor(records, index = 0, options = {}) {
  return mapRecords(records, options)[index];
}

function testKeyMapping() {
  const mapped = actionFor([record()]);
  assert.equal(mapped.action, "MATCH_EXISTING");
  assert.equal(mapped.existing_runtime_key, "synastry.aspect.saturn.conjunction.saturn");
  assert.equal(mapped.target_database_key, "synastry.aspect.saturn.conjunction.saturn");
  assert(!String(mapped.target_database_key).startsWith("store/"), "blanket store prefix must not be used");

  const unsupported = actionFor([record({
    key: "fallback/weekly-horoscope/collective",
    type: "fallback",
    category: "fallback"
  })]);
  assert.equal(unsupported.action, "UNMAPPED");
  assert(unsupported.flags.some((item) => item.flag === "UNMAPPED_KEY"));

  const directional = actionFor([record({
    key: "ms/synastry-aspect/mars-square-venus/short"
  })]);
  assert.equal(directional.target_database_key, "synastry.aspect.mars.square.venus");

  const reversed = actionFor([record({
    key: "ms/synastry-aspect/venus-square-mars/short"
  })]);
  assert.equal(reversed.target_database_key, "synastry.aspect.venus.square.mars");
  assert.notEqual(directional.target_database_key, reversed.target_database_key);
}

function testDuplicateConflicts() {
  const mapped = mapRecords([
    record({ text: "First meaning." }),
    record({ text: "Second meaning." })
  ]);

  assert.equal(mapped[0].action, "CONFLICT");
  assert.equal(mapped[1].action, "CONFLICT");
  assert(mapped[0].flags.some((item) => item.flag === "DUPLICATE_INCOMING_KEY"));
  assert(mapped[1].flags.some((item) => item.flag === "KEY_CONFLICT"));
}

function testStatusSafety() {
  const approved = actionFor([record({ status: "APPROVED" })]);
  assert.equal(approved.mapped_status, "DRAFT");

  const draft = actionFor([record({ status: "DRAFT" })]);
  assert.equal(draft.mapped_status, "DRAFT");
  assert(draft.flags.some((item) => item.flag === "EDITORIAL_REVIEW_REQUIRED"));

  const reference = actionFor([record({
    key: "cc/sign/aries/actions",
    type: "vocab",
    category: "actions",
    lane: "reference",
    status: "REFERENCE_ONLY"
  })]);
  assert.equal(reference.action, "REFERENCE_ONLY");
  assert.equal(reference.target_table, "public.source_rows");
  assert(reference.flags.some((item) => item.flag === "REFERENCE_ONLY_NEVER_SERVE_VERBATIM"));

  for (const status of ["RAW_QUARANTINE", "MANUAL_ONLY", "DEPRECATED"]) {
    const mapped = actionFor([record({ status })]);
    assert.equal(mapped.action, "SKIP");
  }
}

function testExistingRowProtection() {
  const existingRows = [{
    content_key: "synastry.aspect.saturn.conjunction.saturn",
    target_date: null,
    mode: "in_depth",
    status: "LIVE",
    body: "Existing live copy.",
    source_snapshot: { source: "existing" }
  }];
  const mapped = actionFor([record()], 0, { existingRows });

  assert.equal(mapped.action, "CONFLICT");
  assert(mapped.flags.some((item) => item.flag === "LIVE_ROW_PROTECTED"));

  const draftSame = actionFor([record()], 0, {
    existingRows: [{
      ...existingRows[0],
      status: "DRAFT",
      body: "You understand the same pressures."
    }]
  });
  assert.equal(draftSame.action, "SKIP");
  assert(draftSame.flags.some((item) => item.flag === "SKIP_IDENTICAL"));
}

function testServingGuard() {
  assert.equal(isImportedGeneratedRowServable({
    status: "LIVE",
    facts: { tldrStore: { lane: "serving", sourceStatus: "APPROVED", review: null, flags: [] } },
    flags: []
  }), true);

  assert.equal(isImportedGeneratedRowServable({
    status: "LIVE",
    lane: "reference",
    review_state: null,
    facts: { tldrStore: { lane: "serving", sourceStatus: "APPROVED", review: null, flags: [] } },
    flags: []
  }), false);

  assert.equal(isImportedGeneratedRowServable({
    status: "LIVE",
    lane: "serving",
    review_state: "paraphrase-pending",
    facts: { tldrStore: { lane: "serving", sourceStatus: "APPROVED", review: null, flags: [] } },
    flags: []
  }), false);

  assert.equal(isImportedGeneratedRowServable({
    status: "DRAFT",
    facts: { tldrStore: { lane: "serving", sourceStatus: "APPROVED", review: null, flags: [] } },
    flags: []
  }), false);

  assert.equal(isImportedGeneratedRowServable({
    status: "LIVE",
    facts: { tldrStore: { lane: "reference", sourceStatus: "REFERENCE_ONLY", flags: ["REFERENCE_ONLY_NEVER_SERVE_VERBATIM"] } },
    flags: []
  }), false);

  assert.equal(isImportedGeneratedRowServable({
    status: "LIVE",
    facts: { tldrStore: { lane: "serving", sourceStatus: "APPROVED", review: "paraphrase-pending", flags: ["PARAPHRASE_PENDING"] } },
    flags: []
  }), false);

  for (const sourceStatus of ["MANUAL_ONLY", "RAW_QUARANTINE", "DEPRECATED"]) {
    assert.equal(isImportedGeneratedRowServable({
      status: "LIVE",
      facts: { tldrStore: { lane: "serving", sourceStatus, review: null, flags: [] } },
      flags: []
    }), false);
  }
}

function testArtifactGeneration() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tldr-store-import-test-"));
  const inputPath = path.join(tempDir, "records.json");
  const existingRowsPath = path.join(tempDir, "existing-rows.json");
  fs.writeFileSync(existingRowsPath, "[]\n");
  fs.writeFileSync(inputPath, JSON.stringify({
    records: [
      record({ text: "This has an em dash \u2014 for review." }),
      record({
        key: "cc/sign/aries/actions",
        type: "vocab",
        category: "actions",
        lane: "reference",
        status: "REFERENCE_ONLY",
        text: "Reference only."
      }),
      record({
        key: "fallback/weekly-horoscope/collective",
        type: "fallback",
        category: "fallback",
        text: "Unsupported fallback."
      })
    ]
  }, null, 2));

  const report = runImporter([
    `--input=${inputPath}`,
    `--out-dir=${tempDir}`,
    `--existing-rows=${existingRowsPath}`,
    "--batch-id=test-batch"
  ]);

  assert.equal(report.mode, "DRY RUN");
  assert.equal(report.sqlExecuted, false);
  assert.equal(report.databaseChanged, false);
  assert.equal(report.publishApprovedEnabled, false);
  assert.equal(report.incomingRecords, 3);
  assert.equal(report.eligibleDraftInserts, 1);
  assert(fs.existsSync(path.join(tempDir, "tldr-astro-store-import-mapping.csv")));
  assert(fs.existsSync(path.join(tempDir, "tldr-astro-store-import-dash-report.csv")));
  assert(fs.existsSync(path.join(tempDir, "tldr-astro-store-import-rollback.sql")));

  const sql = fs.readFileSync(path.join(tempDir, "tldr-astro-store-import.sql"), "utf8");
  assert(!sql.includes("'LIVE'"), "dry-run SQL must not create LIVE rows");
  assert(sql.includes("lane") && sql.includes("review_state"), "dry-run SQL must include first-class serving guard columns");
  assert(sql.includes("on conflict") || sql.includes("No eligible"));
}

testKeyMapping();
testDuplicateConflicts();
testStatusSafety();
testExistingRowProtection();
testServingGuard();
testArtifactGeneration();
runAuthoredFallbackRowsTests();

console.log("tldr store import tests passed");
