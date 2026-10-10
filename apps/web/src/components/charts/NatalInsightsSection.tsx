import { useId } from "react";
import { ChevronRight } from "lucide-react";
import { natalInsightTopics, type NatalInsightId } from "../../content/natalInsightCatalog";
import type { CmsGeneratedContentMap } from "../../content/cmsSurfaceOverrides";
import { natalInsightTitle } from "../../content/natalInsightTitle";

export function NatalInsightsSection({
  onOpenTopic, generatedContent, ownerName = "", audience = "you", birthTimeKnown = true
}: {
  onOpenTopic: (topic: NatalInsightId) => void;
  audience?: "you" | "friend";
  generatedContent?: CmsGeneratedContentMap | null;
  ownerName?: string;
  birthTimeKnown?: boolean;
}) {
  const headingId = useId();
  return (
    <section className="natal-insights-section" aria-labelledby={headingId}>
      <h2 className="eyebrow section-label" id={headingId}>Deeper insights</h2>
      <div className="natal-insights-list">
        {natalInsightTopics.map((topic) => {
          const title = natalInsightTitle(topic.id, audience, generatedContent, ownerName, birthTimeKnown);
          return (
            <button className="natal-insight" type="button" key={topic.id} data-insight={topic.id} onClick={() => onOpenTopic(topic.id)}>
              <span className="natal-insight__title">{title}</span>
              <ChevronRight aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
