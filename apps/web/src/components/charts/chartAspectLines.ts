import type { CSSProperties } from "react";
import { normalizeAspectType } from "./chartAssets";

type AspectLineFamily = "union" | "hard" | "flow" | "adjust" | "minor-hard" | "muted";

function aspectLineFamily(type: string): AspectLineFamily {
  switch (normalizeAspectType(type)) {
    case "conjunction":
      return "union";
    case "opposition":
    case "square":
      return "hard";
    case "trine":
    case "sextile":
      return "flow";
    case "quincunx":
    case "inconjunct":
    case "semisextile":
      return "adjust";
    case "semisquare":
    case "sesquiquadrate":
      return "minor-hard";
    default:
      return "muted";
  }
}

export function aspectLineClass(type: string) {
  return `aspect-line-${aspectLineFamily(type)} aspect-line-${normalizeAspectType(type)}`;
}

export function aspectLineStyle(type: string, orb: number): CSSProperties {
  const family = aspectLineFamily(type);
  const normalizedType = normalizeAspectType(type);
  const tightness = Math.max(0.45, Math.min(1, 1 - orb / 8));
  const subtleWidthBoost = tightness > 0.82 ? 0.15 : 0;
  const settings: Record<AspectLineFamily, { stroke: string; dash: string; opacity: number; width: number }> = {
    union: { stroke: "var(--aspect-union)", dash: "none", opacity: 0.72, width: 1.8 },
    hard: { stroke: "var(--aspect-hard)", dash: "none", opacity: 0.78, width: 1.8 },
    flow: {
      stroke: "var(--aspect-flow)",
      dash: normalizedType === "sextile" ? "6 5" : "none",
      opacity: normalizedType === "sextile" ? 0.68 : 0.72,
      width: normalizedType === "sextile" ? 1.6 : 1.7
    },
    adjust: {
      stroke: "var(--aspect-adjust)",
      dash: normalizedType === "semisextile" ? "2 5" : "7 5",
      opacity: normalizedType === "semisextile" ? 0.62 : 0.68,
      width: normalizedType === "semisextile" ? 1.5 : 1.6
    },
    "minor-hard": { stroke: "var(--aspect-hard)", dash: "2 5", opacity: 0.62, width: 1.5 },
    muted: { stroke: "var(--aspect-muted)", dash: "4 5", opacity: 0.45, width: 1.4 }
  };
  const style = settings[family];
  const opacity = Math.max(0.38, style.opacity * Math.max(0.72, tightness));

  return {
    "--aspect-line-stroke": style.stroke,
    "--aspect-line-dash": style.dash,
    "--aspect-line-opacity": opacity.toFixed(2),
    "--aspect-line-width": (style.width + subtleWidthBoost).toFixed(2)
  } as CSSProperties;
}
