export type DashboardOverlayRow = {
  id: string;
  content_key: string;
  status?: string | null;
  lane?: string | null;
  updated_at?: string | null;
};

export function selectLatestLiveServingDashboardRows<T extends DashboardOverlayRow>(
  rows: T[],
  currentKeys: ReadonlySet<string>,
  isApproved: (row: T) => boolean,
  isExcluded: (row: T) => boolean
) {
  const seen = new Set<string>();

  return [...rows]
    .sort((first, second) => {
      const firstUpdatedAt = Date.parse(first.updated_at ?? "");
      const secondUpdatedAt = Date.parse(second.updated_at ?? "");
      const firstVersion = Number.isFinite(firstUpdatedAt) ? firstUpdatedAt : 0;
      const secondVersion = Number.isFinite(secondUpdatedAt) ? secondUpdatedAt : 0;

      if (firstVersion !== secondVersion) {
        return secondVersion - firstVersion;
      }

      return String(second.id ?? "").localeCompare(String(first.id ?? ""));
    })
    .filter((row) => row.status === "LIVE" && row.lane === "serving")
    .filter((row) => currentKeys.has(row.content_key))
    .filter((row) => !isExcluded(row))
    .filter(isApproved)
    .filter((row) => {
      if (seen.has(row.content_key)) return false;
      seen.add(row.content_key);
      return true;
    });
}
