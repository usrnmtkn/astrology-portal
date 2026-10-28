import { useState } from "react";
import { ModalPortal } from "../../components/ModalPortal";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import type { ManualChart } from "../../services/manualCharts";
import { upcomingFriendBirthdays } from "./friendBirthdays";

export function FriendsBirthdays({ charts, now, timeZone, loading, onOpen }: {
  charts: ManualChart[]; now: string; timeZone: string; loading: boolean; onOpen: (chart: ManualChart) => void;
}) {
  const [open, setOpen] = useState(false);
  const birthdays = upcomingFriendBirthdays(charts, now, timeZone);
  const cluster = birthdays.slice(0, 3);
  const today = new Date(now).toLocaleDateString("en-CA", { timeZone });
  const dateLabel = (date: string) => date === today ? "Today" : new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: "UTC"
  });
  const names = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(cluster.map(({ chart }) => chart.displayName));
  const avatar = (chart: ManualChart) => <ProfileAvatar key={chart.id} name={chart.displayName} email="" />;

  return <aside className="friends-feed-sidebar" aria-label="Upcoming birthdays">
    <div className="friends-birthday-summary">
      <span>Upcoming birthdays</span>
      <h2>{names ? `${names}${cluster.length === 1 ? "’s birthday" : ""}` : loading ? "Loading birthdays…" : "No saved birthdays"}</h2>
      {cluster.length > 0 && <small>{cluster.map(({ date }) => dateLabel(date)).join(" · ")}</small>}
    </div>
    {cluster.length ? <>
      <button type="button" className="friends-birthday-avatars" aria-label="View friends’ birthdays" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        {cluster.map(({ chart }) => avatar(chart))}
      </button>
      {birthdays.length > 3 && <button type="button" className="friends-birthday-more" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="friends-birthday-avatars" aria-hidden="true">{birthdays.slice(3, 5).map(({ chart }) => avatar(chart))}</span>
        <span>{birthdays.length - 3} more birthdays</span><span aria-hidden="true">›</span>
      </button>}
    </> : !loading && <p>Birthdays appear here when a saved person’s chart includes a birth date.</p>}
    {open && <ModalPortal closeOnBackdrop onClose={() => setOpen(false)} panelClassName="friends-birthdays-dialog" titleId="friends-birthdays-title">
      <header><h2 id="friends-birthdays-title">Friends’ birthdays</h2><button type="button" className="modal-close" aria-label="Close birthdays" onClick={() => setOpen(false)}>×</button></header>
      <ul>{birthdays.map(({ chart, date }) => <li key={chart.id}>
        <button type="button" onClick={() => { setOpen(false); onOpen(chart); }}>
          {avatar(chart)}<span><strong>{chart.displayName}</strong><small>{dateLabel(date)}</small></span><span aria-hidden="true">›</span>
        </button>
      </li>)}</ul>
    </ModalPortal>}
  </aside>;
}
