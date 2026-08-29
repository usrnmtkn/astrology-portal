export type FriendChartLoadingStateInput = {
  authAccountChecked: boolean;
  isAuthConfigured: boolean;
  remoteAccountId: string | null;
  remoteProfileReady: boolean;
};

export type FriendChartRepairScheduler = {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, delay?: number) => number;
  clearTimeout: (handle: number) => void;
};

const FRIEND_CHART_REPAIR_IDLE_TIMEOUT_MS = 250;
const FRIEND_CHART_REPAIR_FALLBACK_DELAY_MS = 16;

export function resolveFriendChartLoadingState({
  authAccountChecked,
  isAuthConfigured,
  remoteAccountId,
  remoteProfileReady
}: FriendChartLoadingStateInput) {
  const databaseReady = remoteAccountId ? remoteProfileReady : authAccountChecked;

  return {
    allowCachedChartsWhileLoading: !isAuthConfigured || databaseReady,
    chartsReady: databaseReady
  };
}

export function scheduleFriendChartRepair(
  callback: () => void,
  scheduler: FriendChartRepairScheduler = window
) {
  if (scheduler.requestIdleCallback && scheduler.cancelIdleCallback) {
    const idleTask = scheduler.requestIdleCallback(callback, {
      timeout: FRIEND_CHART_REPAIR_IDLE_TIMEOUT_MS
    });

    return () => scheduler.cancelIdleCallback?.(idleTask);
  }

  const timeoutTask = scheduler.setTimeout(callback, FRIEND_CHART_REPAIR_FALLBACK_DELAY_MS);
  return () => scheduler.clearTimeout(timeoutTask);
}

export function friendChartRepairBatch<Chart extends { id: string }>(
  charts: Chart[],
  selectedChartId: string | null
) {
  const selectedChart = selectedChartId
    ? charts.find((chart) => chart.id === selectedChartId)
    : null;

  return selectedChart ? [selectedChart] : charts;
}

export async function enhanceFriendChartsAtomically<Chart>(
  charts: Chart[],
  enhance: (chart: Chart) => Promise<Chart | null>,
  commit: (charts: Chart[]) => void,
  cancelled: () => boolean = () => false
) {
  const enhanced = await Promise.all(charts.map(async (chart) => {
    try {
      return await enhance(chart);
    } catch {
      return null;
    }
  }));

  if (cancelled()) {
    return;
  }

  const completed = enhanced.filter((chart) => chart !== null) as Chart[];

  if (completed.length > 0) {
    commit(completed);
  }
}
