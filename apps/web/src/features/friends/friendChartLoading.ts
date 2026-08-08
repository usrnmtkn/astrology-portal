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
