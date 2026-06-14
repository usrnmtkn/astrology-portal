import type { ReactNode } from "react";

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

export function SkyTodayView({
  aspects,
  placements
}: {
  aspects: ReactNode;
  placements: ReactNode;
}) {
  return (
    <>
      <SkyPlacementSection>{placements}</SkyPlacementSection>
      {aspects}
    </>
  );
}
