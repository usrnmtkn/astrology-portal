import type { HTMLAttributes } from "react";
import {
  attributionGlyphs,
  formatAttribution,
  type AttributionFacts
} from "./attributionFormat";

export function AttributionLine({
  facts,
  className = "",
  ...props
}: HTMLAttributes<HTMLParagraphElement> & { facts: AttributionFacts }) {
  const glyphs = attributionGlyphs(facts);
  const badge = facts.kind === "transit_to_natal" ? glyphs[1] : glyphs[0];
  const text = formatAttribution(facts);

  return (
    <p className={`report-attribution${className ? ` ${className}` : ""}`} {...props}>
      <span className="report-attribution__glyphs" aria-hidden="true">
        <span className="report-attribution__glyph">{badge.value}</span>
      </span>
      <span>{text}</span>
    </p>
  );
}
