export type SkyPublicationRow = { id: string; content_key: string; updated_at?: string | null; status?: string | null; event_type?: string | null;
  published_at?: string | null; source_snapshot?: unknown };
export function skyPublicationRecord(row?: SkyPublicationRow | null): Record<string, any> {
  const snapshot = row?.source_snapshot as Record<string, any> | null | undefined;
  return snapshot?.skyArticlePublication ?? {};
}
export function skyPublicationState(row?: SkyPublicationRow | null) { return skyPublicationRecord(row).state; }
export function skyPublicationIsFuture(row?: SkyPublicationRow | null) { return Date.parse(skyPublicationRecord(row).publishAt ?? '') > Date.now(); }
export function skyPublicationScheduled(row?: SkyPublicationRow | null) {
  return row?.status === 'DRAFT' && skyPublicationState(row) === 'scheduled';
}
