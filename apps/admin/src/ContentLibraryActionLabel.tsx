import { useEffect, useState } from 'react';
import type { LiveStatus } from './ContentLiveStatus';
import type { LibraryDestination } from './contentLibraryNavigation';

export default function ContentLibraryActionLabel({ row, destination, loadStatus }: {
  row: { id: string; status: string; updated_at?: string | null; sections?: unknown };
  destination: LibraryDestination;
  loadStatus: (row: { id: string; updated_at?: string | null }) => Promise<LiveStatus>;
}) {
  const [live, setLive] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    setLive(null);
    void loadStatus(row).then(status => { if (active) setLive(status.live); }).catch(() => {});
    return () => { active = false; };
  }, [row.id, row.updated_at, loadStatus]);
  const sections = row.sections as { packageDraft?: unknown } | null;
  if (row.status === 'DRAFT' && !row.id.startsWith('package:') || sections?.packageDraft) return <>Continue draft</>;
  if (live) return <>{destination.kind === 'article' ? 'Edit published article' : 'Edit published passage'}</>;
  return <>{destination.kind === 'article' || destination.kind === 'workspace' ? 'Open article' : 'Edit source'}</>;
}
