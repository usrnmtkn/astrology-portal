import fs from "node:fs";
import { buildAskTldrEvergreenSupportAudit } from "../api/_lib/ask-tldr-evergreen-support-audit.ts";

const reportWindow = JSON.parse(fs.readFileSync(new URL("./fixtures/marie-report-frozen-facts.json", import.meta.url), "utf8"));
const audit = buildAskTldrEvergreenSupportAudit({
  reportWindow,
  now: new Date("2026-09-05T12:00:00Z")
});

console.log(JSON.stringify(audit, null, 2));
