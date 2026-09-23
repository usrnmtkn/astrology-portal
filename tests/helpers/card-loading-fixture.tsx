import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { PlanetPlacementRow } from "../../apps/web/src/components/charts/PlacementRows";
import { SkyPlacementList } from "../../apps/web/src/features/sky/SkyToday";
import { AspectListSkeleton } from "../../apps/web/src/components/charts/AspectRowSkeleton";
import { CalendarDayPanel } from "../../apps/web/src/features/calendar/CalendarDayPanel";
import { useMinimumLoading } from "../../apps/web/src/hooks/useMinimumLoading";

const event = { id: "fixture-event", type: "ingress", title: "Sun enters Virgo", startsAt: "2026-09-01T12:00:00Z", dateKey: "2026-09-01", planet: "Sun", toSign: "Virgo", sign: "Virgo", planets: ["Sun"], glyph: "☉", primary: true } as const;
const noop = () => {};

function Fixture({ loading, long, empty, failed, later, showSky }: { loading: boolean; long: boolean; empty: boolean; failed: boolean; later: boolean; showSky: boolean }) {
  const holding = useMinimumLoading(loading);
  return <>
    <SkyPlacementList loading={holding}>
      {Array.from({ length: later ? 4 : 3 }, (_, index) => <PlanetPlacementRow key={index} variant="sky" title="Sun in Virgo" pointName="Sun" glyph="☉" sign="Virgo" degree="12°" rangeLabel="Sep 1–30" onClick={noop} descriptionLoading={holding}
        description={holding ? undefined : long ? "A full owner-authored passage can contain several sentences, preserving its meaning across narrow mobile and wider desktop layouts. ".repeat(4) : "A short description."} />)}
    </SkyPlacementList>
    <AspectListSkeleton />
    <CalendarDayPanel dateKey="2026-09-01" title="Moon in Virgo" dateLine="September 1" metaLine="Waxing Moon" paragraphs={[]} embedded showSky={showSky} showCheckIn={false}
      contentState={failed ? "error" : loading ? "loading" : "ready"} onOpenEvent={noop} onCheckIn={noop}
      events={empty ? [] : ["ingress", "moon", "season"].map((kind, index) => ({
        event: { ...event, id: `${event.id}-${index}`, planets: [...event.planets] }, kind: kind as "ingress" | "moon" | "season", title: "Virgo season", excerpt: long ? "Full editorial excerpts retain all their text across every viewport. ".repeat(10) : "First excerpt line.\nSecond excerpt line.", meta: "Sep 1"
      }))}
      seasonTransits={empty ? [] : Array.from({ length: 3 }, (_, index) => ({ id: `transit-${index}`, glyph: "☉", title: "Sun in Virgo", meta: "Sep 1–30" }))} />
  </>;
}

const root = createRoot(document.getElementById("fixture")!);
const props = { loading: true, long: false, empty: false, failed: false, later: false, showSky: false };
(window as any).renderFixture = (next: Partial<typeof props>) => {
  Object.assign(props, next);
  flushSync(() => root.render(<Fixture {...props} />));
};
(window as any).renderFixture({});
