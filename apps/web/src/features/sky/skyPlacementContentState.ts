import type { SkySnapshot } from "../../types";

export type SkyPlacementContentStatus = "idle" | "loading" | "ready" | "error";

export function skySnapshotHasTransitWindows(sky: SkySnapshot) {
  return sky.positions.some((position) => Boolean(position.transitStart && position.transitEnd));
}

export function shouldLoadSkyPlacementContent({
  mode,
  detailRoutePath
}: {
  mode: string;
  hasSky?: boolean;
  detailRoutePath: string | null;
}) {
  const isSkyPlacementList = mode === "guest" || mode === "member";
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

export function skyPlacementCardsSettled(
  positions: ReadonlyArray<{ transitStart?: string | null; transitEnd?: string | null }>,
  contentStatus: SkyPlacementContentStatus,
  expectedCount: number
) {
  if (contentStatus === "error") return true;
  if (contentStatus !== "ready" || positions.length !== expectedCount) return false;
  return positions.every((position) => Boolean(position.transitStart && position.transitEnd));
}
