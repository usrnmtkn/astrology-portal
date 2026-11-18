import type { ReactNode } from "react";
import { ModalDialog } from "./ModalDialog";

/** Shared reading surface for chart explanations and longer natal insights. */
export function ReadingDialog({ title, titleId, onClose, children, className = "", glyph }: {
  title: string;
  titleId: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  glyph?: ReactNode;
}) {
  return <ModalDialog title={title} titleId={titleId} onClose={onClose} glyph={glyph} className={className}>{children}</ModalDialog>;
}
