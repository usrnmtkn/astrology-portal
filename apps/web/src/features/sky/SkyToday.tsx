import type { ReactNode } from "react";

export function SkyPlacementSection({ children }: { children: ReactNode }) {
  return (
    <section className="placement-section chart-section" aria-label="Placements">
      <div className="placements-heading">
        <span className="eyebrow section-label chart-section-title">Placements</span>
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
