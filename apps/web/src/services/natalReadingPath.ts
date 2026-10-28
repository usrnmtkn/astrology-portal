export type NatalReadingKind = "sect" | "twelfth-ruler";

export function natalReadingRoute(pathname: string) {
  const match = /^\/(you|friends\/([^/]+))\/natal\/(sect|twelfth-ruler)\/?$/u.exec(pathname);
  if (!match) return null;
  try {
    return { audience: match[2] ? "they" as const : "you" as const,
      chartId: match[2] ? decodeURIComponent(match[2]) : null, kind: match[3] as NatalReadingKind };
  } catch { return null; }
}
