import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { LoadingStatus } from "../../components/CardSkeleton";
import { useMinimumLoading } from "../../hooks/useMinimumLoading";
import { useSkeletonGeometry } from "../../hooks/useSkeletonGeometry";
import { SkyPlacementListSkeleton, SkyPlacementSection } from "./SkyToday";

const SummarySettled = createContext<((settled: boolean) => void) | null>(null);
const CardsSettled = createContext<((settled: boolean) => void) | null>(null);

function useSettledReport(context: typeof SummarySettled, settled: boolean) {
  const report = useContext(context);
  useLayoutEffect(() => { report?.(settled); }, [report, settled]);
}

export function useSkySummarySettled(settled: boolean) {
  useSettledReport(SummarySettled, settled);
}

export function useSkyCardsSettled(settled: boolean) {
  useSettledReport(CardsSettled, settled);
}

/** Keep the first reading together: the summary is not visible until its copy
 * and the transit cards are ready. Children stay mounted so their requests run
 * in parallel. After reveal, each existing content boundary owns revalidation.
 * This stores presentation readiness only, never another copy of the prose.
 */
export function SkyReadingLayout({ persistKey, pending, failed, placementCount = 3, children }: {
  persistKey: string;
  pending: boolean;
  failed: boolean;
  children: ReactNode;
  placementCount?: number;
}) {
  const [summarySettled, setSummarySettled] = useState(false);
  const [cardsSettled, setCardsSettled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ready = failed || !pending && summarySettled && cardsSettled;
  const holding = useMinimumLoading(!failed && !ready && !revealed);
  useLayoutEffect(() => {
    if (!ready || holding && !failed) return;
    setRevealed(true);
  }, [persistKey, ready, holding, failed]);
  const loading = !failed && (!ready && !revealed || holding);
  const geometry = useSkeletonGeometry(`sky:${persistKey}`, loading,
    ".sky-reading-layout__loading .planet-placement-row--sky", ".sky-reading-layout__content .planet-placement-row--sky");
  return <SummarySettled.Provider value={setSummarySettled}>
    <CardsSettled.Provider value={setCardsSettled}>
      <div ref={geometry} className="sky-reading-layout" aria-busy={loading}>
        {loading && <div className="sky-reading-layout__loading"><LoadingStatus>Loading the sky…</LoadingStatus><SkyPlacementSection><SkyPlacementListSkeleton count={placementCount} /></SkyPlacementSection></div>}
        <div className="sky-reading-layout__content" aria-hidden={loading || undefined}>{children}</div>
      </div>
    </CardsSettled.Provider>
  </SummarySettled.Provider>;
}
