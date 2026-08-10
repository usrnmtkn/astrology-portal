"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  agreementSummary,
  appendPendingFlags,
  emptyLedger,
  recordVerdict
} = require("./daily-glance-verdict-ledger.js");

const ledger = emptyLedger();
const report = {
  date: "2026-08-10",
  rows: [
    { key: "square/sun", score: 1, failedDimensions: [] },
    { key: "soft/chiron", score: 2, failedDimensions: ["voice", "specificity"] },
    { key: "soft/mars", score: 2, failedDimensions: [] }
  ]
};

assert.strictEqual(appendPendingFlags(ledger, report), 2);
assert.strictEqual(appendPendingFlags(ledger, report), 0, "same audit date/key must be idempotent");
assert.deepStrictEqual(agreementSummary(ledger), {
  flagged: 2,
  pending: 2,
  ruled: 0,
  agreements: 0,
  disagreements: 0,
  agreementRate: null,
  definition: ledger.policy.agreement
});

recordVerdict(ledger, { key: "square/sun", verdict: "kept", note: "Owner says the serving copy remains stronger." });
recordVerdict(ledger, { key: "soft/chiron", verdict: "took-candidate" });
const agreement = agreementSummary(ledger);
assert.strictEqual(agreement.ruled, 2);
assert.strictEqual(agreement.agreements, 1);
assert.strictEqual(agreement.disagreements, 1);
assert.strictEqual(agreement.agreementRate, 0.5);
assert.strictEqual(ledger.entries.find((entry) => entry.key === "square/sun").ownerNote, "Owner says the serving copy remains stronger.");
assert.throws(() => recordVerdict(ledger, { key: "soft/mars", verdict: "kept" }), /No pending/iu);
assert.throws(() => recordVerdict(emptyLedger(), { key: "square/sun", verdict: "approved" }), /Invalid --verdict/iu);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-glance-ledger-test-"));
const tempLedger = path.join(tempDir, "ledger.json");
fs.writeFileSync(tempLedger, `${JSON.stringify({ ...emptyLedger(), entries: [{
  auditDate: "2026-08-10",
  key: "square/sun",
  judgeScore: 1,
  failedDimensions: ["voice"],
  ownerVerdict: "pending"
}] }, null, 2)}\n`);
execFileSync(process.execPath, [path.join(__dirname, "record-daily-glance-audit-verdict.js"), "--key", "square/sun", "--verdict", "owner-rewrote", "--note", "Exact owner rewrite supplied."], {
  env: { ...process.env, DAILY_GLANCE_VERDICT_LEDGER_PATH: tempLedger },
  stdio: "pipe"
});
const recorded = JSON.parse(fs.readFileSync(tempLedger, "utf8")).entries[0];
assert.strictEqual(recorded.ownerVerdict, "owner-rewrote");
assert.strictEqual(recorded.ownerNote, "Exact owner rewrite supplied.");
fs.rmSync(tempDir, { recursive: true, force: true });

process.stdout.write("daily-glance verdict-ledger tests passed\n");
