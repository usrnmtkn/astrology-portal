import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { PageLoading } from "../../components/PageLoading";

const SummarySettled = createContext<((settled: boolean) => void) | null>(null);
const revealedSkyReadings = new Set<string>();

export function useSkySummarySettled(settled: boolean) {
  const report = useContext(SummarySettled);
  useLayoutEffect(() => { report?.(settled); }, [report, settled]);
}

/** Keep the first reading together: nothing below the summary is visible while
 * its height is still unknown. Children stay mounted so their requests run in
 * parallel. After reveal, each existing content boundary owns revalidation.
 * This stores presentation readiness only, never another copy of the prose.
 */
export function SkyReadingLayout({ persistKey, pending, failed, children }: {
  persistKey: string;
  pending: boolean;
  failed: boolean;
  children: ReactNode;
}) {
  const previouslyRevealed = revealedSkyReadings.has(persistKey);
  const [summarySettled, setSummarySettled] = useState(previouslyRevealed);
  const [revealed, setRevealed] = useState(previouslyRevealed);
  const ready = failed || !pending && summarySettled;
  useLayoutEffect(() => {
    if (!ready) return;
    revealedSkyReadings.add(persistKey);
    setRevealed(true);
  }, [persistKey, ready]);
  const loading = !revealed && !failed;
  return <SummarySettled.Provider value={setSummarySettled}>
    <div className="sky-reading-layout" aria-busy={loading}>
      {loading && <div className="sky-reading-layout__loading"><PageLoading message="Loading the sky…" /></div>}
      <div className="sky-reading-layout__content" aria-hidden={loading || undefined}>{children}</div>
    </div>
  </SummarySettled.Provider>;
}
