export type SkyPlacementContentStatus = "idle" | "loading" | "ready" | "error";

export function shouldLoadSkyPlacementContent({
  mode,
  hasSky,
  detailRoutePath
}: {
  mode: string;
  hasSky: boolean;
  detailRoutePath: string | null;
}) {
  const isSkyPlacementList = hasSky && (mode === "guest" || mode === "member");
  const isSkyPlacementDetail = Boolean(
    detailRoutePath && /^sky\/(?:placement|retrograde)\//u.test(detailRoutePath)
  );

  return isSkyPlacementList || isSkyPlacementDetail;
}

export function skyPlacementDescriptionState(
  description: string | null | undefined,
  contentStatus: SkyPlacementContentStatus
) {
  if (description?.trim()) {
    return "ready" as const;
  }

  return contentStatus === "loading" ? "loading" as const : "empty" as const;
}
