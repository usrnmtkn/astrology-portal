import { useRef, useState } from "react";
import { calendarReminders as reminders, calendarSubscriptionUrls, loadCalendarSubscription, saveCalendarSubscription, type CalendarFeedCategory } from "./calendarSubscription";
import { Check, X } from "lucide-react";
import { AstroGlyph } from "./AstroGlyph";
import { CalendarKindTag } from "./CalendarKindTag";
import { CalendarSlideout } from "./CalendarSlideout";
import type { CalendarEventKind } from "./calendarKinds";

const feedItems = [
  { key: "lunations", name: "New & Full Moons", hint: "Plus eclipses", icon: "🌑🌕", kind: "lunation" as const, on: true },
  { key: "moon-signs", name: "Moon sign changes", hint: "Every 2–3 days", icon: "☽→♈", kind: "moon" as const, on: false },
  { key: "seasons", name: "Season changes", hint: "Sun enters a new sign", icon: "☉→♎", kind: "season" as const, on: true },
  { key: "ingresses", name: "Planet ingresses", hint: "Planets entering signs", icon: "♀→♏", kind: "ingress" as const, on: true },
  { key: "retrogrades", name: "Retrograde stations", hint: "Turning Rx and direct", icon: "♄ Rx", kind: "station" as const, on: true },
  { key: "key", name: "Key events", hint: "Highlighted transits", icon: "⭐", kind: "key" as const, on: true },
  { key: "weekly", name: "Weekly emotional forecast", hint: "Every Monday · link to the current forecast", icon: "☾∼", kind: "note" as const, weekly: true, on: true },
  { key: "aspects", name: "All aspects", hint: "Busy: several a day", icon: "☿□♄", kind: "aspect" as const, on: false }
] as const;

function FeedTag({
  kind,
  icon,
  weekly
}: {
  kind: CalendarEventKind;
  icon: string;
  weekly?: boolean;
}) {
  if (weekly) {
    return (
      <span className="calendar-kind calendar-kind--weekly" aria-hidden="true">
        <AstroGlyph text={icon} size="14" />
      </span>
    );
  }

  return <CalendarKindTag glyph={icon} kind={kind} />;
}

export function CalendarSubscribeSheet({ timeZone, onClose, onLinkReady }: {
  timeZone: string;
  onClose: () => void;
  onLinkReady: () => void;
}) {
  const [subscription, setSubscription] = useState(loadCalendarSubscription);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(
    feedItems.map(item => [item.key, subscription ? subscription.include.includes(item.key) : item.on])
  ));
  const [reminder, setReminder] = useState<typeof reminders[number]>(subscription?.reminder ?? "At the time");
  const [step, setStep] = useState<"include" | "ready">("include");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const include = feedItems.filter(item => enabled[item.key]).map(item => item.key) as CalendarFeedCategory[];
  const urls = subscription ? calendarSubscriptionUrls(subscription.token, window.location.origin) : null;

  async function prepareLink() {
    if (saving.current || !include.length) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const saved = await saveCalendarSubscription({ include, reminder, timeZone }, subscription);
      setSubscription(saved); setStep("ready"); onLinkReady();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Your calendar link could not be saved. Please try again."); }
    finally { saving.current = false; setBusy(false); }
  }
  async function copyLink() {
    if (!urls) return;
    try { await navigator.clipboard.writeText(urls.https); setCopied(true); setError(""); }
    catch { setError("Copy was unavailable. Select and copy the calendar link below."); }
  }

  return <CalendarSlideout label="Add to your calendar" onClose={onClose} variant="sheet">
    <div className="calendar-subscribe">
      <header className="calendar-subscribe__header">
        {step === "ready" ? <button className="calendar-subscribe__back" onClick={() => setStep("include")} type="button">Back</button> : <span />}
        <h2 className="calendar-subscribe__title">Add to your calendar</h2>
        <button aria-label="Close calendar subscription" className="calendar-subscribe__close" onClick={onClose} type="button"><X size={18} aria-hidden="true" /></button>
      </header>
      {error && <p className="calendar-subscribe__intro" role="alert">{error}</p>}
      {step === "include" ? <>
        <p className="calendar-subscribe__intro">Choose what appears in your calendar. Your personal link stays up to date as events are added or changed.</p>
        <section className="calendar-subscribe__section">
          <span className="calendar-subscribe__label">Include</span>
          <ul className="calendar-subscribe__feeds">{feedItems.map((item, index) => <li key={item.key}>
            <button aria-checked={enabled[item.key]} aria-label={item.name} disabled={busy}
              className={`calendar-subscribe__row${enabled[item.key] ? " is-on" : ""}${index === 0 ? " is-first" : ""}${index === feedItems.length - 1 ? " is-last" : ""}`}
              onClick={() => setEnabled(current => ({ ...current, [item.key]: !current[item.key] }))} role="switch" type="button">
              <FeedTag icon={item.icon} kind={item.kind} weekly={"weekly" in item && item.weekly} />
              <span className="calendar-subscribe__copy"><strong>{item.name}</strong><small>{item.hint}</small></span>
              <span className="calendar-subscribe__switch" aria-hidden="true" />
            </button>
          </li>)}</ul>
        </section>
        <section className="calendar-subscribe__section">
          <span className="calendar-subscribe__label">Remind me</span>
          <div className="calendar-subscribe__remind" role="group" aria-label="Remind me">{reminders.map(item => <button
            aria-pressed={reminder === item} className={reminder === item ? "is-on" : undefined} key={item} disabled={busy}
            onClick={() => setReminder(item)} type="button">{item}</button>)}</div>
        </section>
        <button className="calendar-subscribe__cta" disabled={busy || !include.length} onClick={() => void prepareLink()} type="button">
          {busy ? "Saving calendar link…" : subscription ? "Save calendar preferences" : "Create my calendar link"}
        </button>
        <p className="calendar-subscribe__note">{include.length ? "Free to subscribe · No payment required" : "Choose at least one event category"}</p>
      </> : urls ? <div className="calendar-subscribe__done">
        <span className="calendar-subscribe__mark" aria-hidden="true"><Check size={26} /></span>
        <span className="calendar-subscribe__title">Your calendar link is ready</span>
        <p className="calendar-subscribe__intro is-done">Open your calendar app below, then confirm the subscription there. Add this link once; future changes arrive when your calendar app refreshes.</p>
        <div className="calendar-subscribe__open">
          <a className="is-primary" href={urls.webcal} aria-label="Open Apple Calendar">Apple Calendar</a>
          <a className="is-primary" href={urls.google} target="_blank" rel="noopener noreferrer" aria-label="Open Google Calendar">Google Calendar</a>
          <a href={urls.outlook} target="_blank" rel="noopener noreferrer" aria-label="Open Outlook">Outlook</a>
          <button onClick={() => void copyLink()} type="button">{copied ? "Copied" : "Copy link"}</button>
        </div>
        <p className="calendar-subscribe__url"><input aria-label="Calendar subscription URL" readOnly value={urls.https} onFocus={event => event.currentTarget.select()} /></p>
        <p className="calendar-subscribe__note">If your app does not open, paste this link under Subscribe or From URL. Refresh timing and notification settings are controlled by your calendar app.</p>
        <button className="calendar-subscribe__back" onClick={() => { setStep("include"); setCopied(false); }} type="button">Edit what's included</button>
      </div> : null}
    </div>
  </CalendarSlideout>;
}
