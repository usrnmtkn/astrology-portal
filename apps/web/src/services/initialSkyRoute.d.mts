export function isInitialSkyReaderHash(hash: string): boolean;
export function eligiblePlacementHintHref(href: string): boolean;
export function eligiblePlacementHintContinuation(
  originalHref: string,
  currentHref: string,
  workerSupported: boolean,
  initialCaptured: boolean
): boolean;
