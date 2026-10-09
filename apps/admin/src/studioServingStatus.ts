export type StudioServingStatusSource = {
  id?: string | null;
  status?: string | null;
  updated_at?: string | null;
};

export function studioServingStatusRow(
  savedRow: StudioServingStatusSource | undefined,
  contentKey: string
) {
  // The badge describes the displayed saved revision. A published package
  // baseline must never lend its Live status to different, inactive wording.
  if (savedRow?.id) return savedRow;
  return { id: `package:${contentKey}` };
}
