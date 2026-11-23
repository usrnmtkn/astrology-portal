import {MoreVertical, Pencil, Trash2} from "lucide-react";
import {ViewportMenu} from "../../components/ViewportMenu";

export function FriendChartActions({id, name, open, onToggle, onEdit, onDelete}: {
  id: string;
  name: string;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return <div className="manual-chart-actions friend-chart-profile-actions">
    <button id={`friend-menu-${id}`} className="friend-kebab" type="button"
      aria-label={`More actions for ${name}`} aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
      <MoreVertical size={24} aria-hidden="true" />
    </button>
    {open ? <ViewportMenu className="manual-chart-overflow-menu" aria-label={`${name} actions`}>
      <button id={`friend-edit-${id}`} type="button" role="menuitem" onClick={onEdit}>
        <Pencil size={17} aria-hidden="true" /><span>Edit</span>
      </button>
      <button type="button" role="menuitem" className="manual-chart-delete" onClick={onDelete}>
        <Trash2 size={17} aria-hidden="true" /><span>Delete</span>
      </button>
    </ViewportMenu> : null}
  </div>;
}
