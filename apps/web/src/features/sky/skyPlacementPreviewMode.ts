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
