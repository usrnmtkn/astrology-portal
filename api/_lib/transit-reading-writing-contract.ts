import fs from "node:fs";

export const GENERATED_REPORT_WRITING_CONTRACT_PATH = "tldr-astro-phrasebank/TLDR-GENERATED-REPORT-BREADTH-AND-VOICE-V1.md";

export function generatedReportWritingContract() {
  return fs.readFileSync(GENERATED_REPORT_WRITING_CONTRACT_PATH, "utf8");
}
