import { PlacementRowSkeleton } from "../../components/charts/PlacementRows";
import { AspectListSkeleton } from "../../components/charts/AspectRowSkeleton";
import { LoadingStatus } from "../../components/CardSkeleton";
import { MINIMUM_SKELETON_MS } from "../../hooks/useMinimumLoading";
import type { ReactNode } from "react";
import { DeferredRender } from "../../components/DeferredRender";
import type { AspectGiftLessonLabel } from "../../services/aspectGiftLesson";

export function SkyPlacementSection({ children }: { children: ReactNode }) {
  return (
    <section className="placement-section chart-section" aria-label="Transits">
      <div className="placements-heading">
        <span className="eyebrow section-label chart-section-title">Transits</span>
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

export function SkyPlacementListSkeleton({ count = 3 }: { count?: number }) {
  return <SkyPlacementList loading>
    <LoadingStatus>Loading description</LoadingStatus>
    {Array.from({ length: count }, (_, index) => <SkyPlacementListItem key={index} id={`loading-${index}`}>
      <PlacementRowSkeleton />
    </SkyPlacementListItem>)}
  </SkyPlacementList>;
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
