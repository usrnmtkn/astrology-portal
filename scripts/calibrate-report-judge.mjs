#!/usr/bin/env node

import fs from "node:fs";
import { REPORT_JUDGE_THRESHOLD } from "../api/_lib/report-fulfillment-config.ts";
import { callReportModel } from "../api/_lib/report-model-client.ts";
import { deterministicCalibrationScore, reportJudgeCalibrationFixtures } from "../api/_lib/report-judge.ts";
import { judgeModelTarget } from "../api/_lib/report-model-client.ts";
import { loadActiveReportJudgePrompt } from "../api/_lib/report-prompt-versions.ts";

const live = process.argv.includes("--live");
const threshold = REPORT_JUDGE_THRESHOLD;
const fixtures = reportJudgeCalibrationFixtures();
const rows = [];

async function score(id, text, expected) {
  if (!live) {
    const result = deterministicCalibrationScore(text);
    return { id, expected, score: result.overall, findings: result.defects };
  }
  const rubric = loadActiveReportJudgePrompt();
  const result = await callReportModel({
    ...judgeModelTarget(),
    prompt: `${rubric.text}\n\nCALIBRATION_TEXT\n${text}`,
    schemaName: "report_judge_calibration",
    schema: {
      type: "object", additionalProperties: false, required: ["overall", "findings"],
      properties: { overall: { type: "number", minimum: 0, maximum: 1 }, findings: { type: "array", items: { type: "string" } } }
    }
  });
  return { id, expected, score: result.value.overall, findings: result.value.findings };
}

for (const reference of fixtures.references) rows.push(await score(reference.sourcePath, reference.text, "pass"));
for (const degraded of fixtures.degraded) rows.push(await score(degraded.id, degraded.text, "below"));

const failures = rows.filter((row) => row.expected === "pass" ? row.score < threshold : row.score >= threshold);
console.table(rows.map((row) => ({ fixture: row.id, expected: row.expected, score: row.score.toFixed(3), findings: row.findings.join(",") || "none" })));
if (process.env.REPORT_JUDGE_CALIBRATION_OUTPUT) fs.writeFileSync(process.env.REPORT_JUDGE_CALIBRATION_OUTPUT, `${JSON.stringify({ live, threshold, rows }, null, 2)}\n`);
if (failures.length) throw new Error(`Report judge calibration failed for: ${failures.map((row) => row.id).join(", ")}`);
console.log(`Report judge calibration passed (${live ? "live" : "mock"}): ${rows.length} fixtures at threshold ${threshold}.`);
