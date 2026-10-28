import { useEffect, useState, type RefObject } from "react";
import type { SkyDetail } from "./SkyDetailArticle";

export default function SkyReaderExportStatus({ articleRef, detail, residencyAspectsPending, residencyAspectsFailed }: {
  articleRef: RefObject<HTMLElement | null>;
  detail: SkyDetail;
  residencyAspectsPending: boolean;
  residencyAspectsFailed: boolean;
}) {
  const [csvExportStatus, setCsvExportStatus] = useState('');
  useEffect(() => {
    if (!detail.readerExport || detail.placementFactsPending || residencyAspectsPending || new URL(window.location.href).searchParams.get('studioExport') !== 'sky-article-csv') return;
    let cancelled = false;
    void import('./skyReaderCsvExport').then(({ exportStatus }) => {
      if (!cancelled) setCsvExportStatus(exportStatus(articleRef.current, detail, residencyAspectsFailed));
    }).catch(() => { if (!cancelled) setCsvExportStatus('The article CSV could not be downloaded. Reload this page to try again.'); });
    return () => { cancelled = true; };
  }, [detail, residencyAspectsPending, residencyAspectsFailed]);
  return csvExportStatus ? <p role="status" className="article-sub">{csvExportStatus}</p> : null;
}
