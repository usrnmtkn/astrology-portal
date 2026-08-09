#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { runWritingPipeline } from "../src/astro-writing/runWritingPipeline.mjs";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
}

function outputText(payload) {
  return payload.output_text ?? (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("\n");
}

async function responsesClient({ stage, instructions, input, schema }) {
  const review = stage === "review";
  const model = review
    ? (process.env.OPENAI_REVIEW_MODEL ?? process.env.OPENAI_JUDGE_MODEL ?? "gpt-5.6-terra")
    : (process.env.OPENAI_GENERATION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6-sol");
  const effort = review ? "low" : (process.env.OPENAI_REASONING_EFFORT ?? "xhigh");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      instructions,
      input,
      reasoning: { effort },
      max_output_tokens: review ? 3000 : 12000,
      text: { format: { type: "json_schema", name: `tldr_astro_${stage}`, strict: true, schema } }
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error?.message ?? `OpenAI ${stage} failed with ${response.status}.`);
  const text = outputText(payload);
  if (!text) throw new Error(`OpenAI ${stage} returned no structured output.`);
  return JSON.parse(text);
}

const requestPath = argValue("--request");
const outputPath = argValue("--out");
if (!requestPath || !outputPath) throw new Error("Usage: node scripts/run-astro-writing-harness.mjs --request request.json --out result.json --authorize-live");
if (!process.argv.includes("--authorize-live")) throw new Error("No billed call was made. Pass --authorize-live only after explicit owner authorization.");
if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured.");

const request = JSON.parse(fs.readFileSync(path.resolve(requestPath), "utf8"));
const result = await runWritingPipeline({
  ...request,
  examples: readJsonl(path.resolve("data/writing/OWNER_APPROVED_EXAMPLES.jsonl")),
  corrections: readJsonl(path.resolve("data/writing/OWNER_CORRECTIONS.jsonl")),
  writerClient: responsesClient,
  reviewerClient: responsesClient
});
fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.report, null, 2));
