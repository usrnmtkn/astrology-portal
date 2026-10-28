import { useEffect, useRef, useState } from "react";
import { Plus, Send, ChartNoAxesCombined } from "lucide-react";
import { ViewportMenu } from "../../components/ViewportMenu";
import type { FriendsTopLevelView } from "../../components/FriendsPageShell";
import { isFriendsFeedFilter, type FriendsFeedFilter } from "./friendsFeedSources";

export function FriendsWorkspaceHeader({ activeView, circleCount, chartCount, requestCount, onSelectView, onInvite, onAddChart, filter, onFilterChange }: {
  activeView: FriendsTopLevelView; circleCount: number; chartCount: number; requestCount: number;
  onSelectView: (view: FriendsTopLevelView) => void; onInvite: () => void; onAddChart: () => void;
  filter: FriendsFeedFilter; onFilterChange: (value: FriendsFeedFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener("pointerdown", pointer); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", pointer); document.removeEventListener("keydown", key); };
  }, [open]);
  const tabs: { value: FriendsTopLevelView; label: string; count?: number }[] = [
    { value: "feed", label: "Feed" }, { value: "circle", label: "Circle", count: circleCount },
    { value: "charts", label: "Charts", count: chartCount }, { value: "requests", label: "Requests", count: requestCount }
  ];
  return <header className={`friends-workspace-heading${activeView === "feed" ? " friends-workspace-heading--feed" : ""}`}>
    <h1>Friends</h1>
    <div className="friends-workspace-controls">
      <div className="friends-unified-tabs" role="tablist" aria-label="Friends views">{tabs.map(tab => <button type="button" role="tab" key={tab.value}
        id={`friends-${tab.value}-tab`} aria-controls={`friends-${tab.value}-panel`} aria-selected={activeView === tab.value}
        tabIndex={activeView === tab.value ? 0 : -1} onKeyDown={event => {
          const index=tabs.findIndex(item=>item.value===tab.value);
          const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:event.key==='ArrowRight'?(index+1)%tabs.length:event.key==='ArrowLeft'?(index+tabs.length-1)%tabs.length:null;
          if(next===null)return;event.preventDefault();onSelectView(tabs[next].value);document.getElementById(`friends-${tabs[next].value}-tab`)?.focus();
        }}
        className={activeView === tab.value ? "active" : ""} onClick={() => onSelectView(tab.value)}>
        {tab.label}{tab.count !== undefined && <span className={`friends-workspace-count${tab.value === "requests" && tab.count ? " friends-tab-count" : ""}`}>{tab.count}</span>}
      </button>)}</div>
      <div className="friends-workspace-action" ref={menuRef}>
        {activeView === "feed" ? <select aria-label="Filter friends feed" value={filter} onChange={event => {if(isFriendsFeedFilter(event.target.value)) onFilterChange(event.target.value);}}>
          <option value="all">All</option><option value="circle">Circle</option><option value="charts">Charts</option>
        </select> : <button type="button" className="friends-add-button" aria-label="Add" aria-haspopup="menu" aria-expanded={open} ref={triggerRef} onClick={() => setOpen(value => !value)}><Plus size={18} aria-hidden="true"/><span>Add</span></button>}
        {open && <ViewportMenu className="friends-add-menu" aria-label="Add to Friends" onKeyDown={event=>{
          if(event.key==='Tab'){setOpen(false);return;}
          const items=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="menuitem"]'));
          const index=items.indexOf(document.activeElement as HTMLButtonElement);
          const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:event.key==='ArrowUp'?(index+items.length-1)%items.length:null;
          if(next!==null){event.preventDefault();items[next]?.focus();}
        }}>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onInvite(); }}><Send size={20} aria-hidden="true"/><span>Invite friend<small>They join your circle</small></span></button>
          <button role="menuitem" type="button" onClick={() => { setOpen(false); onAddChart(); }}><ChartNoAxesCombined size={20} aria-hidden="true"/><span>Add a chart</span></button>
        </ViewportMenu>}
      </div>
    </div>
  </header>;
}
