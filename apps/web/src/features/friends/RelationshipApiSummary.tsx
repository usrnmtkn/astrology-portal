import type { RelationshipCompareResponse } from "../../services/tldrastroApi";

export type RelationshipCompareStatus = "idle" | "loading" | "ready" | "error";

export function RelationshipApiSummary({
  mode,
  response,
  status
}: {
  mode: "synastry" | "composite";
  response: RelationshipCompareResponse | null;
  status: RelationshipCompareStatus;
}) {
  if (!response && status !== "loading") {
    return null;
  }

  const headline = response?.app.headline ?? "Calculating relationship pattern";
  const summary = response?.app.summary
    ?? "Checking synastry contacts, composite aspects, and relationship patterns.";
  const keyFactors = response?.app.keyFactors ?? [];

  return (
    <section className="relationship-api-summary" aria-label={`${mode} relationship summary`}>
      <span className="eyebrow section-label">{mode === "synastry" ? "Relationship patterns" : "Composite pattern"}</span>
      <h3>{headline}</h3>
      <p>{summary}</p>
      {keyFactors.length > 0 && (
        <ul>
          {keyFactors.slice(0, 4).map((factor) => (
            <li key={factor}>{factor}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
