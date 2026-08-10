"use strict";

const fs = require("fs");
const path = require("path");

const packageRoot = path.resolve(__dirname, "..");
const ledgerPath = process.env.DAILY_GLANCE_VERDICT_LEDGER_PATH
  ? path.resolve(process.env.DAILY_GLANCE_VERDICT_LEDGER_PATH)
  : path.join(packageRoot, "review", "daily-glance-judge-verdict-ledger.json");
const VERDICTS = new Set(["kept", "owner-rewrote", "took-candidate"]);

function emptyLedger() {
  return {
    schemaVersion: 1,
    policy: {
      pending: "Automatically appended audit flag awaiting an owner ruling.",
      agreement: "owner-rewrote and took-candidate mean the flag was actionable; kept means the owner rejected the flag. Pending entries are excluded from the agreement denominator."
    },
    entries: []
  };
}

function loadLedger(filePath = ledgerPath) {
  if (!fs.existsSync(filePath)) return emptyLedger();
  const ledger = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries)) throw new Error(`Invalid daily-glance verdict ledger: ${filePath}`);
  return ledger;
}

function writeLedger(ledger, filePath = ledgerPath) {
  fs.writeFileSync(filePath, `${JSON.stringify(ledger, null, 2)}\n`);
}

function isAuditFlag(row) {
  return Number(row.judgeScore ?? row.score) === 1 || (row.failedDimensions || []).length > 0;
}

function appendPendingFlags(ledger, report) {
  const seen = new Set(ledger.entries.map((entry) => `${entry.auditDate}|${entry.key}`));
  let appended = 0;
  for (const row of report.rows.filter(isAuditFlag)) {
    const identity = `${report.date}|${row.key}`;
    if (seen.has(identity)) continue;
    ledger.entries.push({
      auditDate: report.date,
      key: row.key,
      judgeScore: Number(row.score),
      failedDimensions: [...(row.failedDimensions || [])],
      ownerVerdict: "pending"
    });
    seen.add(identity);
    appended += 1;
  }
  ledger.entries.sort((left, right) => left.auditDate.localeCompare(right.auditDate) || left.key.localeCompare(right.key));
  return appended;
}

function agreementSummary(ledger) {
  const ruled = ledger.entries.filter((entry) => VERDICTS.has(entry.ownerVerdict));
  const agreements = ruled.filter((entry) => entry.ownerVerdict !== "kept");
  const disagreements = ruled.filter((entry) => entry.ownerVerdict === "kept");
  return {
    flagged: ledger.entries.length,
    pending: ledger.entries.filter((entry) => entry.ownerVerdict === "pending").length,
    ruled: ruled.length,
    agreements: agreements.length,
    disagreements: disagreements.length,
    agreementRate: ruled.length ? Number((agreements.length / ruled.length).toFixed(4)) : null,
    definition: ledger.policy.agreement
  };
}

function recordVerdict(ledger, { key, verdict, note }) {
  if (!key) throw new Error("Missing --key.");
  if (!VERDICTS.has(verdict)) throw new Error(`Invalid --verdict ${JSON.stringify(verdict)}. Use kept, owner-rewrote, or took-candidate.`);
  const entry = ledger.entries
    .filter((candidate) => candidate.key === key && candidate.ownerVerdict === "pending")
    .sort((left, right) => right.auditDate.localeCompare(left.auditDate))[0];
  if (!entry) throw new Error(`No pending verdict-ledger entry for ${key}.`);
  entry.ownerVerdict = verdict;
  if (note !== undefined) entry.ownerNote = String(note);
  return entry;
}

module.exports = {
  VERDICTS,
  agreementSummary,
  appendPendingFlags,
  emptyLedger,
  isAuditFlag,
  ledgerPath,
  loadLedger,
  recordVerdict,
  writeLedger
};
