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
    detailRoutePath && /^sky\/(?:placement|retrograde|lunation)\//u.test(detailRoutePath)
  );

  return isSkyPlacementList || isSkyPlacementDetail;
}

export function skyPlacementDescriptionState(
  description: string | null | undefined,
  contentStatus: SkyPlacementContentStatus
) {
  if (contentStatus === "loading" || contentStatus === "idle") return "loading" as const;
  if (description?.trim()) {
    return "ready" as const;
  }

  return "empty" as const;
}
