#!/usr/bin/env node
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const registry = JSON.parse(fs.readFileSync(path.join(repoRoot, "scripts/fixtures/ephemeris-source-registry.json"), "utf8"));

function requestHeadOrProbe(url, redirectCount = 0) {
  return new Promise((resolve) => {
    const request = https.get(url, { headers: { "user-agent": "tldrastro-integrity-check/1.0" } }, (response) => {
      if (
        response.statusCode
        && response.statusCode >= 300
        && response.statusCode < 400
        && response.headers.location
        && redirectCount < 4
      ) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url).toString();
        requestHeadOrProbe(nextUrl, redirectCount + 1).then((next) => {
          resolve({
            redirectedFrom: url,
            ...next
          });
        });
        return;
      }

      const chunks = [];

      response.on("data", (chunk) => {
        if (chunks.reduce((total, item) => total + item.length, 0) < 2048) {
          chunks.push(chunk);
        }
      });
      response.on("end", () => {
        const bodyStart = Buffer.concat(chunks).toString("utf8");
        resolve({
          statusCode: response.statusCode ?? 0,
          contentType: response.headers["content-type"] ?? "",
          location: response.headers.location ?? null,
          bodyStartsWithPdf: bodyStart.startsWith("%PDF"),
          browserCheck: /Checking your browser|Enable JavaScript to proceed/i.test(bodyStart)
        });
      });
    });

    request.on("error", (error) => {
      resolve({ error: error.message });
    });
    request.setTimeout(15_000, () => {
      request.destroy(new Error("Request timed out."));
    });
  });
}

function localFileStatus(envName) {
  const localPath = process.env[envName];

  if (!localPath) {
    return { configured: false };
  }

  if (!fs.existsSync(localPath)) {
    return { configured: true, exists: false, path: localPath };
  }

  const handle = fs.openSync(localPath, "r");
  const buffer = Buffer.alloc(5);

  fs.readSync(handle, buffer, 0, buffer.length, 0);
  fs.closeSync(handle);

  return {
    configured: true,
    exists: true,
    path: localPath,
    sizeBytes: fs.statSync(localPath).size,
    bodyStartsWithPdf: buffer.toString("utf8").startsWith("%PDF")
  };
}

async function checkSource(source) {
  const probeUrl = source.probeUrl ?? source.pdfUrl ?? source.url;
  const remote = await requestHeadOrProbe(probeUrl);
  const expectedContentType = source.expectedContentType ?? "";
  const remoteMatchesExpectedType = Boolean(
    remote.statusCode >= 200
    && remote.statusCode < 300
    && (
      expectedContentType === "application/pdf"
        ? remote.bodyStartsWithPdf
        : String(remote.contentType ?? "").includes(expectedContentType) || Boolean(remote.statusCode)
    )
  );

  return {
    id: source.id,
    label: source.label,
    url: probeUrl,
    expectedContentType,
    remote,
    remoteMatchesExpectedType,
    local: source.localPathEnv ? localFileStatus(source.localPathEnv) : null,
    notes: source.notes ?? []
  };
}

const sources = [
  ...(registry.authoritative ?? []),
  ...(registry.secondarySanity ?? [])
];
const results = [];

for (const source of sources) {
  results.push(await checkSource(source));
}

const authoritativeReady = results
  .filter((result) => registry.authoritative?.some((source) => source.id === result.id))
  .some((result) => result.local?.bodyStartsWithPdf || result.remoteMatchesExpectedType);

console.log(JSON.stringify({
  ok: authoritativeReady,
  authoritativeReady,
  results
}, null, 2));

if (!authoritativeReady) {
  process.exitCode = 2;
}
