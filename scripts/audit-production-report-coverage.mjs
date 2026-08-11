#!/usr/bin/env node

import crypto from "node:crypto";
import {
  reportFactors,
  resolveManifestationSets
} from "../api/_lib/report-generation.ts";

const baseUrl = (process.env.PRODUCTION_BASE_URL || "https://tldrastro.vercel.app").replace(/\/+$/u, "");
const adminSecret = process.env.CONTENT_GENERATION_SECRET?.trim();
const reportIdArgument = process.argv.find((argument) => argument.startsWith("--report-id="));
const reportId = reportIdArgument?.slice("--report-id=".length).trim();

if (!adminSecret) throw new Error("CONTENT_GENERATION_SECRET is required to audit stored Production facts.");
if (!reportId) throw new Error("Pass the exact Production report id with --report-id=<uuid>.");

const response = await fetch(`${baseUrl}/api/admin/report-fulfillment`, {
  headers: { accept: "application/json", authorization: `Bearer ${adminSecret}` }
});
if (!response.ok) {
  throw new Error(`Production report dashboard returned HTTP ${response.status}.`);
}

const dashboard = await response.json();
if (!Array.isArray(dashboard?.reports)) throw new Error("Production report dashboard returned an invalid reports contract.");
const report = dashboard.reports.find((candidate) => candidate?.id === reportId);
if (!report) throw new Error(`Production report ${reportId} was not found.`);
if (!report.facts || typeof report.facts !== "object" || Array.isArray(report.facts)) {
  throw new Error(`Production report ${reportId} has no stored facts bundle.`);
}

const factsJson = JSON.stringify(report.facts);
const factors = reportFactors(report.facts);
const coverage = resolveManifestationSets(factors);
const result = {
  schemaVersion: "production-report-coverage-v1",
  auditedAt: new Date().toISOString(),
  baseUrl,
  reportId,
  factsSha256: crypto.createHash("sha256").update(factsJson).digest("hex"),
  factorCount: factors.length,
  resolvedCount: coverage.resolved.length,
  sourceGapCount: coverage.gaps.length,
  sourceGaps: coverage.gaps
};

console.log(JSON.stringify(result, null, 2));
if (coverage.gaps.length) process.exitCode = 1;
