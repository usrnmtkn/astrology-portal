export type StudioServingStatusSource = {
  id?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

export function studioServingStatusRow(
  savedRow: StudioServingStatusSource | undefined,
  contentKey: string
) {
  if (
    savedRow?.id
    && !savedRow.id.startsWith("package:")
    && (savedRow.status ?? "").toUpperCase() === "LIVE"
  ) {
    return savedRow;
  }
  return { id: `package:${contentKey}` };
}
