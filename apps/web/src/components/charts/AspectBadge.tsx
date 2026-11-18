import { aspectGlyph, normalizeAspectType, pointGlyph } from "./chartAssets";

/** The title names the planets; their shared reading cue shows only the aspect. */
export function AspectBadge({ aspect, planet, className = "" }: { aspect: string; planet?: string; className?: string }) {
  const type = normalizeAspectType(aspect).replace(/^conjunct$/u, "conjunction").replace(/^opposite$/u, "opposition").replace(/^inconjunct$/u, "quincunx");
  return <span className={`aspect-badge ${className}`.trim()} data-aspect={type} aria-hidden="true">{aspectGlyph(type)}{planet ? <span className="aspect-badge__planet">{pointGlyph(planet)}</span> : null}</span>;
}
