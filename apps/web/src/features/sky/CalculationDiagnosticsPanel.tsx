import type { SkySnapshot } from "../../types";
import type { LiveGeneratedContent } from "../../services/generatedContent";
import { validateAstrologyFacts } from "../../services/astrologyFacts";
import { fallbackArchitectureV3PackageVersion } from "../../content/fallbackArchitectureV3Runtime";
type GeneratedContentMap = Map<string, LiveGeneratedContent>;

export default function CalculationDiagnosticsPanel({
  generatedContent,
  hydrationState,
  sky
}: {
  generatedContent: GeneratedContentMap;
  hydrationState: "snapshot" | "hydrated";
  sky: SkySnapshot;
}) {
  const diagnosticsEnabled = import.meta.env.DEV
    || String(import.meta.env.VITE_ASTRO_DIAGNOSTICS ?? "false").toLowerCase() === "true";

  if (!diagnosticsEnabled) {
    return null;
  }

  const facts = sky.facts ?? [];
  const validation = validateAstrologyFacts(facts);
  const mercuryFact = facts.find((fact) => fact.planetOrPointId === "mercury" && fact.kind === "position");
  const sampleContent = generatedContent.get("sky.retrograde.mercury.cancer.retrograde_passage")
    ?? generatedContent.get("sky.placement.sun.cancer")
    ?? null;
  const cacheAge = sky.cacheState?.ageMs ?? Date.now() - new Date(sky.generatedAt).getTime();

  return (
    <details className="calculation-diagnostics-panel">
      <summary>Calculation diagnostics</summary>
      <dl>
        <dt>Calculation engine</dt>
        <dd>{sky.calculationProvenance?.library ?? "unknown"} {sky.calculationProvenance?.libraryVersion ?? ""}</dd>
        <dt>Calculation timestamp</dt>
        <dd>{sky.generatedAt}</dd>
        <dt>Calculation timezone</dt>
        <dd>{sky.location.timeZone ?? "UTC"}</dd>
        <dt>Zodiac and frame</dt>
        <dd>
          {sky.calculationProvenance?.zodiac ?? "unknown"}
          {" · "}
          {sky.calculationProvenance?.frame ?? "unknown"}
        </dd>
        <dt>House system</dt>
        <dd>{sky.calculationProvenance?.houseSystem === "whole_sign" ? "Whole Sign" : "unknown"}</dd>
        <dt>Lunar node model</dt>
        <dd>{sky.calculationProvenance?.nodeType === "true" ? "True Node" : sky.calculationProvenance?.nodeType ?? "unknown"}</dd>
        <dt>Calculation version</dt>
        <dd>{sky.calculationProvenance?.calculationVersion ?? "unknown"}</dd>
        <dt>Normalized fact ID</dt>
        <dd>{mercuryFact?.id ?? facts[0]?.id ?? "none"}</dd>
        <dt>Content record ID</dt>
        <dd>{sampleContent?.id ?? "none"}</dd>
        <dt>Snapshot/live source</dt>
        <dd>{typeof sampleContent?.sourceSnapshot?.sourceType === "string" ? sampleContent.sourceSnapshot.sourceType : sampleContent?.provider ?? "none"}</dd>
        <dt>Fallback package</dt>
        <dd>{fallbackArchitectureV3PackageVersion}</dd>
        <dt>Hydration state</dt>
        <dd>{hydrationState}</dd>
        <dt>Cache age</dt>
        <dd>{Number.isFinite(cacheAge) ? `${Math.max(0, Math.round(cacheAge / 1000))}s` : "unknown"}</dd>
        <dt>Snapshot verification</dt>
        <dd>{validation.ok ? "valid primary calculation" : validation.diagnostics.join("; ")}</dd>
      </dl>
    </details>
  );
}

