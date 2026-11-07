import { Suspense, useState } from "react";
import { studioLazy } from "./studioLazy";
import { StudioButton } from "./StudioControls";
import { PageLoading } from "../../../src/shared/components/PageLoading";
import type { WheelTooltipPreviewBody } from "../../web/src/content/wheelTooltipCopy";

const ChartPreview = studioLazy(() => import("./WheelTooltipChartPreview"));

export default function WheelTooltipDraftPreview({ contentKey, body, onChange, onSourceChange, pendingBodies, disabled }: { contentKey: string; body: string; onChange: (body: string) => void; onSourceChange: (key: string) => Promise<void>; pendingBodies: readonly WheelTooltipPreviewBody[]; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return <section className="admin-editor-guidance" aria-label="Unpublished wheel preview">
    <StudioButton aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "Close wheel preview" : "Preview on wheel"}</StudioButton>
    {open && <>
      <p>Unpublished preview. Your edits update the wheel as you type and stay while you explore sources. Nothing is saved or published.</p>
      <Suspense fallback={<PageLoading message="Loading wheel preview…" />}><ChartPreview contentKey={contentKey} body={body} onChange={onChange} onSourceChange={onSourceChange} pendingBodies={pendingBodies} disabled={disabled} /></Suspense>
    </>}
  </section>;
}
