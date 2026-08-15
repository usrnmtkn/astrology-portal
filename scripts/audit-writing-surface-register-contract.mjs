#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertSurfaceRegisterContract } from "../src/astro-writing/surfaceRegisterContract.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reviewRoot = path.join(repoRoot, "packages/astro-knowledge/review");

function jsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return jsonFiles(absolute);
    return entry.isFile() && entry.name.endsWith(".json") ? [absolute] : [];
  });
}

const requests = [];
for (const filePath of jsonFiles(reviewRoot)) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value) || !value.meaningInput || !value.task) continue;
  assertSurfaceRegisterContract(value.target, { surface: value.surface, register: value.register });
  requests.push(path.relative(repoRoot, filePath));
}

if (requests.length === 0) throw new Error("SURFACE_REGISTER_AUDIT_GAP:no_writer_requests_found");
console.log(`surface/register contract audit passed (${requests.length} writer requests)`);
for (const request of requests) console.log(`- ${request}`);
