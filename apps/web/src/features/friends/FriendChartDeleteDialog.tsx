import { ModalDialog } from "../../components/ModalDialog";

export function FriendChartDeleteDialog({ name, pending, restoreFocusId, onClose, onDelete }: {
  name: string;
  pending: boolean;
  restoreFocusId?: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  return <ModalDialog title={`Delete ${name}?`} titleId="friend-chart-delete-title" variant="confirm"
    restoreFocusId={restoreFocusId}
    onClose={() => { if (!pending) onClose(); }}
    actions={<>
      <button className="modal-action" type="button" disabled={pending} onClick={onClose}>Cancel</button>
      <button className="modal-action modal-action--danger" type="button" disabled={pending} onClick={onDelete}>
        {pending ? "Deleting..." : "Delete chart"}
      </button>
    </>}>
    <p>This removes the saved chart and cannot be undone.</p>
  </ModalDialog>;
}
