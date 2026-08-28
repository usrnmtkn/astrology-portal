export type AccountProfileBootstrapAction = "start" | "reuse-pending" | "reuse-ready";

export function profileBootstrapLocalOwnerIds({
  accountId,
  cachedProfileId,
  legacyOwnerIds,
  persistedProfileId
}: {
  accountId: string;
  cachedProfileId?: string | null;
  legacyOwnerIds: string[];
  persistedProfileId?: string | null;
}) {
  return [cachedProfileId, persistedProfileId, accountId, ...legacyOwnerIds];
}

export function accountProfileBootstrapAction({
  accountId,
  appliedAccountId,
  remoteProfileReady
}: {
  accountId: string;
  appliedAccountId: string | null;
  remoteProfileReady: boolean;
}): AccountProfileBootstrapAction {
  if (accountId !== appliedAccountId) {
    return "start";
  }

  return remoteProfileReady ? "reuse-ready" : "reuse-pending";
}

export function scheduleProfileEnhancementsAfterPaint(callback: () => void) {
  if (typeof window === "undefined") {
    queueMicrotask(callback);
    return;
  }

  window.requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
}

export function revealProfileAndScheduleEnhancements({
  enhancements,
  isCancelled,
  onEnhancementError = () => undefined,
  revealProfile,
  scheduleAfterPaint = scheduleProfileEnhancementsAfterPaint
}: {
  enhancements: Array<() => Promise<unknown>>;
  isCancelled: () => boolean;
  onEnhancementError?: (error: unknown) => void;
  revealProfile: () => void;
  scheduleAfterPaint?: (callback: () => void) => void;
}) {
  if (isCancelled()) {
    return [];
  }

  revealProfile();

  const completions = enhancements.map(() => {
    let resolveCompletion: () => void = () => undefined;
    const promise = new Promise<void>((resolve) => {
      resolveCompletion = resolve;
    });

    return { promise, resolve: resolveCompletion };
  });

  scheduleAfterPaint(() => {
    if (isCancelled()) {
      completions.forEach(({ resolve }) => resolve());
      return;
    }

    enhancements.forEach((enhancement, index) => {
      void Promise.resolve()
        .then(enhancement)
        .catch(onEnhancementError)
        .then(completions[index].resolve);
    });
  });

  return completions.map(({ promise }) => promise);
}
