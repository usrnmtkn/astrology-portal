import { readFileSync } from "node:fs";

// Input is JSONL extracted from Vercel runtime logs, never browser storage or user records.
const groups = new Map();
for (const line of readFileSync(process.argv[2] ?? 0, "utf8").split("\n")) {
  let row;
  try { row = JSON.parse(line); if (typeof row.message === "string") row = JSON.parse(row.message); } catch { continue; }
  if (row.type !== "reader_performance") continue;
  for (const event of row.events ?? []) {
    const key = [row.revision, event.checkpoint, event.viewport, event.network, event.cache].join(" / ");
    const group = groups.get(key) ?? { ready: [], errors: 0, timeouts: 0, cancelled: 0 };
    if (event.outcome === "ready") group.ready.push(event.durationMs);
    else if (event.outcome === "timeout") group.timeouts++;
    else if (event.outcome === "cancelled") group.cancelled++;
    else group.errors++;
    groups.set(key, group);
  }
}
const output = [];
for (const [segment, group] of groups) {
  group.ready.sort((a, b) => a - b);
  const percentile = p => group.ready.length >= 20 ? group.ready[Math.ceil(p * group.ready.length) - 1] : null;
  output.push({ segment, samples: group.ready.length, p75Ms: percentile(.75), p95Ms: percentile(.95),
    errors: group.errors, timeouts: group.timeouts, cancelled: group.cancelled,
    evidence: group.ready.length < 20 ? "insufficient samples" : "sampled successful completions; inspect failures separately" });
}
console.log(JSON.stringify(output, null, 2));
