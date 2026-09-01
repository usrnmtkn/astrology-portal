export function isFallbackOnlySkyPlacementPreview(
  href = typeof window === "undefined" ? "" : window.location.href
): boolean {
  try {
    return new URL(href).searchParams.get("skyPlacementPreview") === "fallback";
  } catch {
    return false;
  }
}

export function composeSkyPlacementFallbackParagraphs(paragraphs: string[]) {
  const readable = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);

  if (readable.length <= 2) return readable;

  const firstGroupEnd = Math.ceil(readable.length / 2);

  return [
    readable.slice(0, firstGroupEnd).join(" "),
    readable.slice(firstGroupEnd).join(" ")
  ];
}
