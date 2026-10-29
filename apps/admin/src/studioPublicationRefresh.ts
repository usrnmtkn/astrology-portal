import type { ContentUpdateNotice } from '../../web/src/services/contentUpdateSignal';

export type StudioPublicationRefreshState = 'idle' | 'pending' | 'error';
const refreshDeadlineMs = 20_000;

/** One active editor's verified ledger refresh; notices for other keys are ignored. */
export function createStudioPublicationRefresh(contentKey: string, dependencies: {
  refresh: () => Promise<void>;
  online: () => boolean;
  onState: (state: StudioPublicationRefreshState) => void;
}) {
  let requested = 0;
  let settled = 0;
  let running = false;
  let disposed = false;
  let state: StudioPublicationRefreshState = 'idle';
  function update(next: StudioPublicationRefreshState) {
    if (disposed) return;
    state = next;
    dependencies.onState(next);
  }
  async function drain() {
    running = true;
    try {
      while (!disposed && settled < requested) {
        const epoch = requested;
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            dependencies.refresh(),
            new Promise<never>((_, reject) => {
              timer = setTimeout(() => reject(new Error('Publication verification timed out.')), refreshDeadlineMs);
            })
          ]);
          if (epoch === requested) update(dependencies.online() ? 'idle' : 'error');
        } catch {
          if (epoch === requested) update('error');
        } finally {
          clearTimeout(timer);
          settled = epoch;
        }
      }
    } finally {
      running = false;
    }
  }
  function request() {
    if (disposed) return;
    requested += 1;
    update('pending');
    if (!running) void drain();
  }
  return {
    refresh: request,
    notice: (notice: ContentUpdateNotice) => { if (notice.contentKey === contentKey) request(); },
    retry: () => { if (state === 'error' && !running) request(); },
    dispose: () => { disposed = true; }
  };
}
