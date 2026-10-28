import { useId, useState, type ReactNode } from "react";
import { Expand, X } from "lucide-react";
import { ModalPortal } from "../ModalPortal";

export function ChartFullscreenButton({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return <>
    <button type="button" className="natal-chart-expand" aria-label={`Open full ${title.toLowerCase()}`} onClick={() => setOpen(true)}><Expand size={18} aria-hidden="true" /></button>
    {open && <ModalPortal className="chart-fullscreen-modal-root" panelClassName="chart-fullscreen-panel" titleId={titleId} onClose={() => setOpen(false)} closeOnBackdrop>
      <div className="chart-fullscreen-overlay">
        <header className="chart-fullscreen-header"><h2 className="chart-fullscreen-title" id={titleId}>{title}</h2><button className="chart-fullscreen-close" type="button" aria-label="Close full-screen chart" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button></header>
        <div className="chart-fullscreen-wheel-wrap"><div className="chart-shell chart-shell--fullscreen">{children}</div></div>
      </div>
    </ModalPortal>}
  </>;
}
