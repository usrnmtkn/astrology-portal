import type { ReactNode } from "react";
import { DeferredRender } from "../../components/DeferredRender";

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

export function SkyPlacementList({ children }: { children: ReactNode }) {
  return (
    <div className="placement-table-wrap" role="list" aria-label="Daily planetary placements">
      <div className="placement-table">
        {children}
      </div>
    </div>
  );
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

export function SkyAspectGroup({ children, id }: { children: ReactNode; id: string }) {
  return (
    <div className="aspect-row-group" key={id}>
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
        <DeferredRender fallback={<div className="deferred-render-placeholder deferred-render-placeholder--table" aria-hidden="true" />}>
          {placements}
        </DeferredRender>
      </SkyPlacementSection>
      <DeferredRender fallback={<div className="deferred-render-placeholder deferred-render-placeholder--aspects" aria-hidden="true" />}>
        {aspects}
      </DeferredRender>
    </>
  );
}
