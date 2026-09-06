import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const unresolvedQueuePath = path.resolve(
  process.cwd(),
  "packages/astro-knowledge/generated/content-unresolved-queue-v1.json"
);
const guidedLunationContentKey =
  "authored/book-ritual-and-the-moon/lunation-horoscope/eclipse-lunar/pisces/rising-aquarius/house-2";
const missingEditorialReviewContentKey = "qa/editorial-review/missing-source-row";
const originalReadFileSync = fs.readFileSync;

type QueueRecord = Record<string, unknown> & {
  contentKey?: string;
  reason?: string;
};

type UnresolvedQueueReport = Record<string, unknown> & {
  items?: QueueRecord[];
  retiredItems?: QueueRecord[];
  actionableContentKeys?: string[];
  count?: number;
  issueCount?: number;
  workload?: Record<string, { records?: number; decisions?: number }>;
  reasonCounts?: Record<string, number>;
};

function withQaEditorialReviewFixtures(report: UnresolvedQueueReport): UnresolvedQueueReport {
  const retiredItems = Array.isArray(report.retiredItems) ? report.retiredItems : [];
  const guidedSource = retiredItems.find((item) => item.contentKey === guidedLunationContentKey);
  if (!guidedSource) {
    throw new Error(
      `QA fixture source missing from governed retirement history: ${guidedLunationContentKey}`
    );
  }

  // The production required queue is allowed to be empty. These records exist only
  // inside Playwright's in-memory read of the report so review and missing-row UI
  // behavior stays covered without turning retired content back into owner work.
  const qaFixtures: QueueRecord[] = [
    {
      ...guidedSource,
      id: "qa-guided-lunation-editorial-review",
      contentKey: guidedLunationContentKey,
      reason: "review-status",
      reviewStatus: "needs_review",
      workClass: "qa-editorial-review"
    },
    {
      ...guidedSource,
      id: "qa-missing-editorial-review-row",
      contentKey: missingEditorialReviewContentKey,
      reason: "review-status",
      reviewStatus: "needs_review",
      workClass: "qa-editorial-review",
      sourcePath: "tests/visual/qaUnresolvedContentFixtures.ts",
      objectPath: "/qa/missing-source-row",
      sourceSha256: "qa-only-missing-source-row"
    }
  ];

  const existingItems = Array.isArray(report.items) ? report.items : [];
  const existingKeys = new Set(existingItems.map((item) => item.contentKey).filter(Boolean));
  const insertedFixtures = qaFixtures.filter((item) => !existingKeys.has(item.contentKey));
  const items = [...existingItems, ...insertedFixtures];
  const reviewStatusCount = items.filter((item) => item.reason === "review-status").length;

  return {
    ...report,
    count: items.length,
    issueCount: new Set(items.map((item) => item.contentKey).filter(Boolean)).size,
    actionableContentKeys: items.map((item) => item.contentKey).filter((value): value is string => Boolean(value)),
    workload: {
      ...(report.workload ?? {}),
      "qa-editorial-review": {
        records: insertedFixtures.length,
        decisions: insertedFixtures.length
      }
    },
    reasonCounts: {
      ...(report.reasonCounts ?? {}),
      "review-status": reviewStatusCount
    },
    items
  };
}

function resolvedFilePath(file: Parameters<typeof fs.readFileSync>[0]) {
  if (file instanceof URL) return fileURLToPath(file);
  return path.resolve(String(file));
}

fs.readFileSync = ((file: Parameters<typeof fs.readFileSync>[0], options?: Parameters<typeof fs.readFileSync>[1]) => {
  const result = originalReadFileSync(file, options as never);
  if (resolvedFilePath(file) !== unresolvedQueuePath) return result;

  const sourceText = Buffer.isBuffer(result) ? result.toString("utf8") : String(result);
  const patchedText = `${JSON.stringify(withQaEditorialReviewFixtures(JSON.parse(sourceText)), null, 2)}\n`;
  const encoding = typeof options === "string" ? options : options?.encoding;
  return encoding ? Buffer.from(patchedText).toString(encoding) : Buffer.from(patchedText);
}) as typeof fs.readFileSync;

// `content-dashboard-admin-user-flows.spec.ts` imports `readFileSync` as a named
// builtin export before importing qaRuntimeGuards. Keep that live binding in sync
// with the QA wrapper above before the test module body reads the queue.
syncBuiltinESMExports();
