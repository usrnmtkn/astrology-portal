import "./studio-system.css";
import { StudioButton } from "./StudioControls";
import { AlertCircle, RefreshCw } from "lucide-react";
import { AdminDisclosureSummary } from "./AdminNativeControls";
import { studioShellAttributes } from "./studioTheme";
import { PageLoading } from "../../web/src/components/PageLoading";

export function AdminPageError({ detail, onRetry, recoveryHref }: {
  detail: string;
  onRetry: () => void;
  recoveryHref: string;
}) {
  return <main className="admin-dashboard admin-page-error" {...studioShellAttributes()}>
    <section className="admin-page-error-panel" aria-label="Page recovery">
      <p role="alert"><AlertCircle size={18} aria-hidden="true" />This page could not load.</p>
      <div className="admin-page-error-actions">
        <StudioButton type="button" onClick={onRetry}><RefreshCw size={16} aria-hidden="true" />Retry page</StudioButton>
        <a href={recoveryHref}>Open Review Queue</a>
        <StudioButton type="button" onClick={() => window.location.reload()}>Reload page</StudioButton>
      </div>
      {detail && <details>
        <AdminDisclosureSummary>Error details</AdminDisclosureSummary>
        <pre>{detail}</pre>
      </details>}
    </section>
  </main>;
}

export function AdminPageLoading({ label }: { label: string }) {
  return <main className="admin-dashboard studio-loading-page" {...studioShellAttributes()}>
    <PageLoading message={label} />
  </main>;
}
