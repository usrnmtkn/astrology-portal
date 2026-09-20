import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";
import { PageLoading } from "../../components/PageLoading";

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
export function SkyReadingLayout({ persistKey, pending, failed, children }: {
  persistKey: string;
  pending: boolean;
  failed: boolean;
  children: ReactNode;
}) {
  const [summarySettled, setSummarySettled] = useState(false);
  const [cardsSettled, setCardsSettled] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const ready = failed || !pending && summarySettled && cardsSettled;
  useLayoutEffect(() => {
    if (!ready) return;
    setRevealed(true);
  }, [persistKey, ready]);
  const loading = !failed && !ready && !revealed;
  return <SummarySettled.Provider value={setSummarySettled}>
    <CardsSettled.Provider value={setCardsSettled}>
      <div className="sky-reading-layout" aria-busy={loading}>
        {loading && <div className="sky-reading-layout__loading"><PageLoading message="Loading the sky…" /></div>}
        <div className="sky-reading-layout__content" aria-hidden={loading || undefined}>{children}</div>
      </div>
    </CardsSettled.Provider>
  </SummarySettled.Provider>;
}
