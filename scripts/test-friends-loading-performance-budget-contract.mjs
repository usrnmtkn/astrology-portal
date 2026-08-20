import assert from "node:assert/strict";
import {
  FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS,
  FRIENDS_LOADING_SAMPLE_COUNT,
  FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND,
  FRIENDS_SLOW_NETWORK_LATENCY_MS,
  friendsLoadingPerformanceBudgets
} from "../tests/visual/friendsLoadingPerformanceBudgets.ts";

const expectedBudgetKeys = [
  "coldListReadyMs",
  "directLinkSynastryReadyMs",
  "incompleteChartListReadyMs",
  "incompleteChartRepairReadyMs",
  "mobileNavigationReadyMs",
  "slowNetworkDetailShellReadyMs",
  "slowNetworkListReadyMs",
  "slowNetworkRelationshipEnhancedMs",
  "slowNetworkRelationshipLoadingReadyMs",
  "slowNetworkRelationshipReadyMs",
  "warmDetailReadyMs"
];

assert.deepEqual(
  Object.keys(friendsLoadingPerformanceBudgets).sort(),
  expectedBudgetKeys,
  "The Friends performance matrix must keep a threshold for every approved Step 8 readiness checkpoint."
);
assert.ok(
  FRIENDS_LOADING_SAMPLE_COUNT >= 3,
  "Each Friends loading scenario must run repeatedly instead of relying on a single favorable sample."
);
assert.ok(
  FRIENDS_SLOW_NETWORK_LATENCY_MS >= 400,
  "Slow-network QA must retain at least a 400 ms round-trip latency."
);
assert.ok(
  FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND <= 1_000_000,
  "Slow-network QA must not exceed the approved 8 Mbps download profile."
);
assert.ok(
  FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS >= 500,
  "Incomplete-chart QA must keep the calculation path slow enough to expose partial-paint regressions."
);
assert.ok(
  friendsLoadingPerformanceBudgets.warmDetailReadyMs
    < friendsLoadingPerformanceBudgets.coldListReadyMs,
  "The warm-cache contract must remain stricter than the cold-list contract."
);
assert.ok(
  friendsLoadingPerformanceBudgets.slowNetworkListReadyMs
    < FRIENDS_SLOW_NETWORK_LATENCY_MS + 1_500,
  "The cached Friends list must not inherit the deferred relationship-content delay."
);
assert.ok(
  friendsLoadingPerformanceBudgets.slowNetworkDetailShellReadyMs
    < FRIENDS_SLOW_NETWORK_LATENCY_MS + 1_500,
  "The chart-detail shell must not wait for deferred relationship content."
);
assert.ok(
  friendsLoadingPerformanceBudgets.incompleteChartListReadyMs
    < friendsLoadingPerformanceBudgets.incompleteChartRepairReadyMs,
  "Incomplete charts must paint as rows before their background enhancement completes."
);
assert.ok(
  friendsLoadingPerformanceBudgets.slowNetworkRelationshipLoadingReadyMs
    < friendsLoadingPerformanceBudgets.slowNetworkDetailShellReadyMs,
  "The relationship loading state must retain a stricter median than the detail shell."
);
assert.ok(
  friendsLoadingPerformanceBudgets.slowNetworkRelationshipEnhancedMs
    < friendsLoadingPerformanceBudgets.slowNetworkRelationshipReadyMs,
  "Incremental enhancement must stay small after the first authored card paints."
);
const hardCeilings = {
  coldListReadyMs: 800,
  warmDetailReadyMs: 500,
  directLinkSynastryReadyMs: 1_500,
  mobileNavigationReadyMs: 1_000,
  incompleteChartListReadyMs: 800,
  incompleteChartRepairReadyMs: 2_500,
  slowNetworkListReadyMs: 800,
  slowNetworkDetailShellReadyMs: 1_200,
  slowNetworkRelationshipLoadingReadyMs: 900,
  slowNetworkRelationshipReadyMs: 2_200,
  slowNetworkRelationshipEnhancedMs: 250
};

for (const [key, ceiling] of Object.entries(hardCeilings)) {
  assert.ok(
    friendsLoadingPerformanceBudgets[key] <= ceiling,
    `${key} may not exceed its approved hard ceiling of ${ceiling}ms.`
  );
}

console.log(JSON.stringify({
  status: "PASS",
  surface: "friends loading performance budgets",
  samplesPerScenario: FRIENDS_LOADING_SAMPLE_COUNT,
  budgets: friendsLoadingPerformanceBudgets
}, null, 2));
