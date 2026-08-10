"use strict";

const {
  agreementSummary,
  ledgerPath,
  loadLedger,
  recordVerdict,
  writeLedger
} = require("./daily-glance-verdict-ledger.js");

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

function main() {
  const args = process.argv.slice(2);
  const key = valueAfter(args, "--key");
  const verdict = valueAfter(args, "--verdict");
  const note = valueAfter(args, "--note");
  const ledger = loadLedger();
  const entry = recordVerdict(ledger, { key, verdict, note });
  writeLedger(ledger);
  const agreement = agreementSummary(ledger);
  process.stdout.write(`${entry.auditDate} ${entry.key}: ${entry.ownerVerdict}\n`);
  process.stdout.write(`agreement=${agreement.agreements}/${agreement.ruled} rate=${agreement.agreementRate === null ? "n/a" : `${(agreement.agreementRate * 100).toFixed(1)}%`} pending=${agreement.pending}\n`);
  process.stdout.write(`ledger=${ledgerPath}\n`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
