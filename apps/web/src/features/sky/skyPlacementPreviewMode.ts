export type SkyPlacementPreviewMode = "normal" | "fallback-only";

export const skyPlacementPreviewModeQueryKey = "skyPlacementPreview";

export function readSkyPlacementPreviewMode(
  href = typeof window === "undefined" ? "" : window.location.href
): SkyPlacementPreviewMode {
  if (!href) return "normal";

  try {
    return new URL(href).searchParams.get(skyPlacementPreviewModeQueryKey) === "fallback"
      ? "fallback-only"
      : "normal";
  } catch {
    return "normal";
  }
}

export function shouldRenderCanonicalSkyV4Placement(
  href = typeof window === "undefined" ? "" : window.location.href
) {
  return readSkyPlacementPreviewMode(href) !== "fallback-only";
}

export function composeSkyPlacementFallbackParagraphs(paragraphs: string[]) {
  const readable = paragraphs.map((paragraph) => paragraph.trim()).filter(Boolean);

  if (readable.length <= 2) return readable;

  const totalCharacters = readable.reduce((total, paragraph) => total + paragraph.length, 0);
  let firstGroupEnd = 1;
  let firstGroupCharacters = readable[0].length;
  let smallestDifference = Math.abs(totalCharacters - (firstGroupCharacters * 2));

  for (let index = 1; index < readable.length - 1; index += 1) {
    firstGroupCharacters += readable[index].length;
    const difference = Math.abs(totalCharacters - (firstGroupCharacters * 2));

    if (difference < smallestDifference) {
      firstGroupEnd = index + 1;
      smallestDifference = difference;
    }
  }

  return [
    readable.slice(0, firstGroupEnd).join(" "),
    readable.slice(firstGroupEnd).join(" ")
  ];
}
