export const FRIENDS_LOADING_SAMPLE_COUNT = 3;
export const FRIENDS_SLOW_NETWORK_LATENCY_MS = 400;
export const FRIENDS_SLOW_NETWORK_DOWNLOAD_BYTES_PER_SECOND = 1_000_000;
export const FRIENDS_INCOMPLETE_CHART_CALCULATION_DELAY_MS = 750;

export const friendsLoadingPerformanceBudgets = {
  coldListReadyMs: 800,
  warmDetailReadyMs: 500,
  directLinkSynastryReadyMs: 1_500,
  mobileNavigationReadyMs: 1_000,
  incompleteChartListReadyMs: 800,
  incompleteChartRepairReadyMs: 2_500,
  slowNetworkListReadyMs: 800,
  slowNetworkDetailShellReadyMs: 1_200,
  slowNetworkRelationshipReadyMs: 2_200,
  slowNetworkRelationshipEnhancedMs: 2_500
} as const;
