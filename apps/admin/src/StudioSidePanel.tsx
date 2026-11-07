import { useEffect, useId, useRef, type ReactNode } from 'react';
import { StudioButton } from './StudioControls';

/** Keep retained editors mounted while their native dialog presentation closes. */
export default function StudioSidePanel({ title, children, onClose, onMinimize, busy = false, open = true, modal = true }: {
  title: string; children: ReactNode; onClose: () => void; onMinimize?: () => void; busy?: boolean; open?: boolean; modal?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useId();
  useEffect(() => {
    const node = dialog.current;
    const previous = document.activeElement;
    if (open) {
      if (modal) node?.showModal();
      else node?.show();
    }
    return () => {
      node?.close();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, [open, modal]);
  return <dialog ref={dialog} className="studio-side-panel" aria-labelledby={heading} aria-busy={busy}
    onKeyDown={event => {
      event.stopPropagation();
      if (!modal && event.key === 'Escape') { event.preventDefault(); if (!busy) onClose(); }
    }}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="studio-section-header">
      <h2 id={heading}>{title}</h2>
      <div className="admin-toolbar-actions">
        {onMinimize && <StudioButton onClick={onMinimize}>Minimize</StudioButton>}
        <StudioButton disabled={busy} onClick={onClose} aria-label={`Close ${title}`}>Close</StudioButton>
      </div>
    </header>
    <div className="studio-side-panel-content">{children}</div>
  </dialog>;
}
