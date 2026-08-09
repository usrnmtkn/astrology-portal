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
  const text = formatAttribution(facts);

  return (
    <p className={`report-attribution${className ? ` ${className}` : ""}`} {...props}>
      <span className="report-attribution__glyphs" aria-hidden="true">
        {glyphs.map((glyph, index) => (
          <span className="report-attribution__glyph" key={`${glyph.label}-${index}`}>{glyph.value}</span>
        ))}
      </span>
      <span>{text}</span>
    </p>
  );
}
