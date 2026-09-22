import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import "../../styles/lunar-calendar.css";
import {
  calendarMoodOf,
  CalendarMoodChip,
  CalendarCheckIn,
  checkInSubtitle,
  checkInTitle
} from "../calendar/CalendarCheckIn";
import {
  addCalendarCheckInLibraryItem,
  isCalendarDateKey,
  listCalendarCheckInLibrary,
  listCalendarCheckIns,
  removeCalendarCheckInLibraryItem,
  upsertCalendarCheckIn,
  type CalendarCheckInEntry
} from "../../services/calendarCheckIns";
import {
  accountJournalItemsFromEntries,
  accountJournalMoodHighlights,
  formatAccountJournalDateLine,
  formatAccountJournalDayLabel,
  groupAccountJournalEntries,
  localCalendarDateKey,
  type AccountJournalGroupBy
} from "./accountJournalGroups";

const GROUP_OPTIONS: Array<{ id: AccountJournalGroupBy; label: string }> = [
  { id: "days", label: "Days" },
  { id: "weeks", label: "Weeks" },
  { id: "months", label: "Months" }
];

export function AccountJournal({ accountId, accountChecked, accountError, onRetryAuth, onSignIn, onBack }: {
  accountId: string | null;
  accountChecked: boolean;
  accountError: string | null;
  onRetryAuth: () => void;
  onSignIn: () => void;
  onBack: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [entries, setEntries] = useState<Record<string, CalendarCheckInEntry>>({});
  const [libraryTags, setLibraryTags] = useState<string[]>([]);
  const [knownPeople, setKnownPeople] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<AccountJournalGroupBy>("days");
  const [composerDate, setComposerDate] = useState(localCalendarDateKey);
  const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!accountId || editingDateKey) return;
    let request: AbortController | undefined;

    async function loadJournal() {
      if (document.visibilityState === "hidden" || request) return;
      const controller = new AbortController();
      request = controller;
      setStatus("loading");
      setMessage("");
      try {
        const options = { expectedUserId: accountId!, signal: controller.signal };
        const [checkIns, library] = await Promise.all([
          listCalendarCheckIns(options),
          listCalendarCheckInLibrary(options)
        ]);
        if (controller.signal.aborted) return;
        setEntries(checkIns);
        setLibraryTags(library.tags);
        setKnownPeople(library.people);
        setStatus("ready");
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Your journal could not load.");
      } finally {
        if (request === controller) request = undefined;
      }
    }

    void loadJournal();
    // Mobile browsers suspend background pages. Re-read account storage when
    // the reader returns, reconnects, or keeps the journal open on two devices.
    window.addEventListener("focus", loadJournal);
    window.addEventListener("pageshow", loadJournal);
    window.addEventListener("online", loadJournal);
    document.addEventListener("visibilitychange", loadJournal);
    const timer = window.setInterval(loadJournal, 30_000);
    return () => {
      request?.abort();
      window.clearInterval(timer);
      window.removeEventListener("focus", loadJournal);
      window.removeEventListener("pageshow", loadJournal);
      window.removeEventListener("online", loadJournal);
      document.removeEventListener("visibilitychange", loadJournal);
    };
  }, [accountId, editingDateKey, refresh]);

  const items = useMemo(() => accountJournalItemsFromEntries(entries), [entries]);
  const groups = useMemo(() => groupAccountJournalEntries(items, groupBy), [groupBy, items]);
  const highlights = useMemo(() => accountJournalMoodHighlights(items), [items]);
  const editingDateLine = editingDateKey ? formatAccountJournalDateLine(editingDateKey) : "";

  function requireAccountId() {
    if (!accountId) {
      onRetryAuth();
      throw new Error("Your account could not be checked. Please try saving again.");
    }
    return accountId;
  }

  function openEditor(dateKey: string) {
    if (!isCalendarDateKey(dateKey)) {
      setMessage("Choose a valid date.");
      return;
    }
    setMessage("");
    setEditingDateKey(dateKey);
  }

  return (
    <section className="account-page account-journal-page page-shell--narrow" aria-label="Journal">
      <div className="page-back-row settings-back-row">
        <button className="settings-back-button floating-back-button" type="button" onClick={onBack}>
          <ChevronLeft size={20} aria-hidden="true" />
          <span>Account</span>
        </button>
      </div>

      <div className="account-page-heading">
        <h1>journal.</h1>
      </div>

      <section className="settings-group" aria-label="Add a check-in">
        <span className="settings-group-label">New entry</span>
        <div className="settings-card">
          <div className="settings-list">
            <label className="settings-row account-editable-row">
              <span className="settings-row__label">Date</span>
              <span className="settings-row__field">
                <input
                  aria-label="Journal date"
                  className="account-row-input"
                  onChange={(event) => setComposerDate(event.target.value)}
                  type="date"
                  value={composerDate}
                />
                <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
              </span>
            </label>
            <button
              className="settings-row settings-row-button account-journal-add"
              disabled={!accountId || status !== "ready"}
              onClick={() => openEditor(composerDate)}
              type="button"
            >
              <span className="settings-row-copy">
                <span className="settings-row-title">Add check-in</span>
                <small className="settings-row-description">
                  Saves to {isCalendarDateKey(composerDate) ? formatAccountJournalDateLine(composerDate) : "that date"}.
                </small>
              </span>
              <Plus size={19} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>

      <section className="settings-group" aria-label="Journal history">
        <span className="settings-group-label">History</span>
        <div className="account-journal-toolbar" role="group" aria-label="Group journal entries">
          <div className="segmented-control segmented-control--wide">
            {GROUP_OPTIONS.map((option) => (
              <button
                className={`segmented-control__item${groupBy === option.id ? " segmented-control__item--active" : ""}`}
                key={option.id}
                onClick={() => setGroupBy(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {highlights.length > 0 && (
          <div className="settings-card account-journal-highlights">
            <span className="settings-row-title">How you felt</span>
            <small className="settings-row-description">
              Based on {highlights.reduce((sum, item) => sum + item.count, 0)} {highlights.reduce((sum, item) => sum + item.count, 0) === 1 ? "answer" : "answers"}
            </small>
            <ul className="account-journal-moods">
              {highlights.map((share) => (
                <li className="account-journal-mood" key={share.mood}>
                  <span>
                    {share.label}
                    <span className="account-journal-mood__count">{share.percent}%</span>
                  </span>
                  <span className="account-journal-mood__track" aria-hidden="true">
                    <span
                      className="account-journal-mood__fill"
                      style={{
                        width: `${share.percent}%`,
                        background: `var(--calendar-mood-${share.mood + 1})`
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!accountChecked ? (
          <p className="account-action-message" role="status">Checking your account…</p>
        ) : !accountId ? (
          <>
            <p className="account-action-message" role="status">{accountError || "Sign in to see your saved journal on this device."}</p>
            <button type="button" className="account-handle-save" onClick={accountError ? onRetryAuth : onSignIn}>
              {accountError ? "Retry" : "Sign in"}
            </button>
          </>
        ) : (
          <>
            {status === "loading" && <p className="account-action-message" role="status">Loading your journal…</p>}
            {message && <p className="account-action-message" role="status">{message}</p>}
            <button type="button" className="account-handle-save" disabled={status === "loading"}
              onClick={() => setRefresh(value => value + 1)}>
              {status === "error" ? "Retry" : "Refresh journal"}
            </button>
          </>
        )}

        {accountId && status === "ready" && groups.length === 0 && (
          <div className="settings-card">
            <div className="settings-row">
              <span className="settings-row-copy">
                <span className="settings-row-title">No check-ins yet</span>
                <small className="settings-row-description">
                  Add one above. It saves to the date you choose.
                </small>
              </span>
            </div>
          </div>
        )}

        {groups.map((group) => (
          <div className="settings-group" key={group.key}>
            <span className="settings-group-label">{group.label}</span>
            <div className="settings-card">
              <div className="settings-list">
                <div className="settings-row account-journal-group-meta">
                  <span className="settings-row-description">{group.detail}</span>
                </div>
                {group.items.map((item) => {
                  const mood = calendarMoodOf(item);
                  return (
                    <button
                      className="settings-row settings-row-button account-journal-entry"
                      key={item.dateKey}
                      onClick={() => openEditor(item.dateKey)}
                      type="button"
                    >
                      <span className="settings-row-copy">
                        <span className="settings-row-title">
                          {groupBy === "days" ? checkInTitle(item) || "Check-in" : formatAccountJournalDayLabel(item.dateKey)}
                        </span>
                        <small className="settings-row-description">
                          {groupBy === "days"
                            ? checkInSubtitle(item)
                            : [checkInTitle(item), checkInSubtitle(item)].filter(Boolean).join(" · ")}
                        </small>
                      </span>
                      <span className="account-journal-entry__meta">
                        {mood ? <CalendarMoodChip mood={item.mood!} showLabel={false} /> : null}
                        <ChevronRight className="settings-row__chevron" size={18} aria-hidden="true" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </section>

      {editingDateKey && (
        <CalendarCheckIn
          dateKey={editingDateKey}
          dateLine={editingDateLine}
          knownPeople={knownPeople}
          libraryTags={libraryTags}
          onClose={() => setEditingDateKey(null)}
          onSignIn={onSignIn}
          onLibraryPersonAdd={async (name) => {
            await addCalendarCheckInLibraryItem("person", name, { expectedUserId: requireAccountId() });
            setKnownPeople((current) => current.includes(name) ? current : [...current, name]);
          }}
          onLibraryTagAdd={async (tag) => {
            await addCalendarCheckInLibraryItem("tag", tag, { expectedUserId: requireAccountId() });
            setLibraryTags((current) => current.includes(tag) ? current : [...current, tag]);
          }}
          onLibraryTagRemove={async (tag) => {
            await removeCalendarCheckInLibraryItem("tag", tag, { expectedUserId: requireAccountId() });
            setLibraryTags((current) => current.filter((item) => item !== tag));
          }}
          onSave={async (entry) => {
            const saved = await upsertCalendarCheckIn(editingDateKey, entry, { expectedUserId: requireAccountId() });
            setEntries((current) => ({ ...current, [editingDateKey]: saved }));
          }}
          signedIn
          value={entries[editingDateKey]}
        />
      )}
    </section>
  );
}
