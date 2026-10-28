import { PlacementRowSkeleton } from "../../components/charts/PlacementRows";
import { AspectListSkeleton } from "../../components/charts/AspectRowSkeleton";
import { LoadingStatus, SkeletonBar } from "../../components/CardSkeleton";
import { MINIMUM_SKELETON_MS } from "../../hooks/useMinimumLoading";
import type { ReactNode } from "react";
import { DeferredRender } from "../../components/DeferredRender";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";

export function SkyPlacementSection({ children }: { children: ReactNode }) {
  return (
    <section className="placement-section chart-section" aria-label="Placements">
      <div className="placements-heading">
        <h2 className="chart-section-title">Placements</h2>
      </div>

      {children}
    </section>
  );
}

export function SkyPlacementList({ children, loading = false }: { children: ReactNode; loading?: boolean }) {
  return (
    <div className="placement-table-wrap" aria-busy={loading} role="list" aria-label="Daily planetary placements">
      <div className="placement-table">
        {children}
      </div>
    </div>
  );
}

export function SkyPlacementListSkeleton({ count = 3, grouped = false, announce = true }: { count?: number; grouped?: boolean; announce?: boolean }) {
  const rows = (size: number) => <SkyPlacementList loading>
    {Array.from({ length: size }, (_, index) => <SkyPlacementListItem key={index} id={`loading-${index}`}><PlacementRowSkeleton /></SkyPlacementListItem>)}
  </SkyPlacementList>;
  return <>{announce ? <LoadingStatus>Loading description</LoadingStatus> : null}{grouped ? <>
    {[{label:"Planets",size:Math.max(0,count-4)},{label:"Points",size:Math.min(4,count)}].filter(group=>group.size).map(group=><section className="sky-placement-group" aria-label={group.label} key={group.label}><h3>{group.label}</h3>{rows(group.size)}</section>)}
    <section className="sky-placement-group sky-angle-group" aria-label="Angles"><h3>Angles</h3><div className="placement-table" aria-hidden="true">{[0,1].map(index=><button type="button" disabled tabIndex={-1} className="placement-table-row card-skeleton" key={index}><span className="placement-table-row__glyph card-skeleton-disc"/><span className="placement-table-row__body loading-lines"><SkeletonBar title/><SkeletonBar short/></span></button>)}</div></section>
  </> : rows(count)}</>;
}

export function SkyPlacementListItem({ children, id }: { children: ReactNode; id: string }) {
  return (
    <div className="sky-pl-item" role="listitem" key={id}>
      {children}
    </div>
  );
}

export function SkyAspectsSection({ children }: { children: ReactNode }) {
  return (
    <section className="aspect-section chart-section" aria-label="Aspects">
      <span className="eyebrow section-label aspect-section-label">Aspects</span>
      <div className="aspect-row-groups">
        {children}
      </div>
    </section>
  );
}

export function SkyAspectGroup({
  children,
  id,
  label
}: {
  children: ReactNode;
  id: string;
  label: AspectGiftLessonLabel;
}) {
  return (
    <div className="aspect-row-group" key={id}>
      <span className="eyebrow section-label aspect-row-group-label">{label}</span>
      <div className="aspects-card aspect-row-card">
        <div className="aspect-row-list">
          {children}
        </div>
      </div>
    </div>
  );
}

export function SkyTodayView({
  aspects,
  placements
}: {
  aspects: ReactNode;
  placements: ReactNode;
}) {
  return (
    <>
      <SkyPlacementSection>
        {placements}
      </SkyPlacementSection>
      {aspects ? <DeferredRender delay={MINIMUM_SKELETON_MS} fallback={<AspectListSkeleton />}>
        {aspects}
      </DeferredRender> : null}
    </>
  );
}
