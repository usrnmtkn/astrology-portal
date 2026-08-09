export const FRIENDS_LOADING_SAMPLE_COUNT = 3;
export const FRIENDS_SLOW_NETWORK_LATENCY_MS = 400;
export const FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND = 1_000_000;
export const FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS = 750;

export const friendsLoadingPerformanceBudgets = {
  coldListReadyMs: 1_800,
  warmDetailReadyMs: 700,
  directLinkSynastryReadyMs: 1_500,
  mobileNavigationReadyMs: 1_800,
  incompleteChartListReadyMs: 1_800,
  incompleteChartRepairReadyMs: 3_500,
  slowNetworkListReadyMs: 1_800,
  slowNetworkDetailShellReadyMs: 1_800,
  slowNetworkRelationshipReadyMs: 3_500,
  slowNetworkRelationshipEnhancedMs: 6_000
} as const;
