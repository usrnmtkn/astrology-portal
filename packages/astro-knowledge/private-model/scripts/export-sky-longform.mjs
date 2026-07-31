#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "../..");
const repoRoot = path.resolve(packageRoot, "../..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/sky-article-v1.json",
);
const outputDir = path.join(packageRoot, "private-model/.local-data");
const trainPath = path.join(outputDir, "sky-article-longform.train.jsonl");
const evalPath = path.join(outputDir, "sky-article-longform.eval.jsonl");
const manifestPath = path.join(outputDir, "sky-article-longform.manifest.json");

const sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJsonl = (file, rows) => {
  fs.writeFileSync(file, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
};

const DEVELOPER_PROMPT = [
  "You write long-form Sky articles in the approved TLDR Astro register.",
  "Use only the structured facts and approved editorial source material supplied by the user.",
  "Never calculate or infer placements, signs, houses, aspects, dates, degrees, or timing.",
  "Do not add a factual claim that is absent from the payload.",
  "Return only the final article body, with paragraph breaks preserved.",
].join(" ");

function containsPersonalData(text) {
  const email = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
  const phone = /\+?\d(?:[ ().-]*\d){9,14}\b/;
  const socialHandle = /(^|\s)@[a-z0-9_]{2,}/i;
  return email.test(text) || phone.test(text) || socialHandle.test(text);
}

function buildPayload(card) {
  return {
    task: "Assemble one sky-article-longform body from approved source material.",
    surface: "sky-article-longform",
    fact_source: "approved registry row with ephemeris-validated timing",
    event: {
      planet: card.planet,
      sign: card.sign,
      entry_year: card.entry_year,
      valid_from: card.valid_from,
      valid_to: card.valid_to,
      article_variant: card.article_variant || "direct",
      archive_only: Boolean(card.archive_only),
      key_dates: card.key_dates || [],
    },
    editorial_policy: {
      history_policy: card.history_policy || null,
      preview_policy: card.preview_policy || null,
      key_dates_mode: card.key_dates_mode || "authored",
    },
    approved_source_material: {
      preview_note: card.preview_note || null,
      core_theme: card.core_theme || null,
      sign_jurisdiction: card.sign_jurisdiction || null,
      lived_experience: card.lived_experience || null,
      rulership_twist: card.rulership_twist || null,
      history_echo: card.history_echo || null,
      closing_charge: card.closing_charge || null,
    },
  };
}

function buildExample(card) {
  const payload = buildPayload(card);
  const body = String(card.body || "").trim();
  if (!body) throw new Error(`${card.contentKey}: missing body`);
  if (containsPersonalData(body) || containsPersonalData(JSON.stringify(payload))) {
    throw new Error(`${card.contentKey}: possible personal data detected`);
  }
  const sourceSha = sha256(body);
  return {
    id: card.contentKey,
    surface: "sky-article-longform",
    source_sha256: sourceSha,
    source_review_status: card.review_status,
    source_keys: card.source_keys || [],
    messages: [
      { role: "developer", content: DEVELOPER_PROMPT },
      { role: "user", content: JSON.stringify(payload) },
      { role: "assistant", content: body },
    ],
  };
}

function splitExamples(examples) {
  if (examples.length < 2) return { train: examples, evalRows: [] };
  const ordered = [...examples].sort((a, b) => a.source_sha256.localeCompare(b.source_sha256));
  const evalCount = Math.max(1, Math.round(ordered.length * 0.2));
  return {
    train: ordered.slice(evalCount),
    evalRows: ordered.slice(0, evalCount),
  };
}

const source = readJson(sourcePath);
const approved = (source.authoredCards || []).filter((card) => card.review_status === "approved");
const seen = new Set();
const examples = approved.map(buildExample).filter((example) => {
  if (seen.has(example.source_sha256)) return false;
  seen.add(example.source_sha256);
  return true;
});
const { train, evalRows } = splitExamples(examples);

fs.mkdirSync(outputDir, { recursive: true });
writeJsonl(trainPath, train);
writeJsonl(evalPath, evalRows);

const manifest = {
  schema: "tldrastro-private-model-dataset-v1",
  surface: "sky-article-longform",
  generated_at: new Date().toISOString(),
  source_path: path.relative(repoRoot, sourcePath),
  source_version: source.version,
  approved_source_rows: approved.length,
  unique_examples: examples.length,
  train_examples: train.length,
  eval_examples: evalRows.length,
  minimum_train_examples: 50,
  ready_to_train: train.length >= 50 && evalRows.length > 0,
  train_sha256: sha256(fs.readFileSync(trainPath)),
  eval_sha256: sha256(fs.readFileSync(evalPath)),
  excluded_calibration_fixtures:
    "Owner fixtures without paired structured fact briefs remain eval references and are not training examples.",
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify(manifest, null, 2));
