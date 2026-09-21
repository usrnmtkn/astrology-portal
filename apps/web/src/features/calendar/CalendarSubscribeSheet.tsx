import { useMemo, useState } from "react";
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
  { key: "weekly", name: "Weekly emotional forecast", hint: "Every Monday · the mood of the week", icon: "☾∼", kind: "note" as const, weekly: true, on: true },
  { key: "aspects", name: "All aspects", hint: "Busy: several a day", icon: "☿□♄", kind: "aspect" as const, on: false }
] as const;

const reminders = ["None", "At the time", "Day before"] as const;
const plans = [
  { key: "once", name: "2026 only", price: "$11.99", per: "", note: "One-time · all of 2026", cta: "Get the 2026 AstroCal · $11.99", fine: "One payment. The feed runs through December 31, 2026 and never renews on its own." },
  { key: "yearly", name: "Every year", price: "$9.99", per: "/yr", note: "Renews each January", badge: "Save $2", cta: "Get AstroCal every year · $9.99/yr", fine: "Renews each January at $9.99. Cancel any time in your account; the feed runs to the end of the paid year." }
] as const;

const benefits = [
  "Every astro event of 2026 with dates, times and tips",
  "A weekly emotional forecast, every Monday",
  "Syncs to Apple, Google and Outlook, with reminders",
  "Works with screen readers and assistive tech"
];

type SubscribeStep = "include" | "paywall" | "done";

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

export function CalendarSubscribeSheet({
  counts,
  subscribed,
  timeZoneLabel,
  onClose,
  onSubscribed
}: {
  counts: Record<string, number>;
  subscribed: boolean;
  timeZoneLabel?: string;
  onClose: () => void;
  onSubscribed: () => void;
}) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => (
    Object.fromEntries(feedItems.map((item) => [item.key, item.on]))
  ));
  const [reminder, setReminder] = useState<(typeof reminders)[number]>("At the time");
  const [copied, setCopied] = useState(false);
  const [plan, setPlan] = useState<(typeof plans)[number]["key"]>("once");
  const [step, setStep] = useState<SubscribeStep>("include");
  const [destination, setDestination] = useState("Apple Calendar");

  const selectedCount = useMemo(() => (
    feedItems.reduce((total, item) => total + (enabled[item.key] ? counts[item.key] ?? 0 : 0), 0)
  ), [counts, enabled]);
  const includeQuery = feedItems.filter((item) => enabled[item.key]).map((item) => item.key).join(",");
  const feedUrl = `webcal://tldrastro.com/feed/2026.ics?include=${encodeURIComponent(includeQuery)}&remind=${encodeURIComponent(reminder)}`;
  const selectedPlan = plans.find((item) => item.key === plan) ?? plans[0];
  const city = timeZoneLabel?.split(" · ")[0] ?? timeZoneLabel ?? "your time zone";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function openCalendar(name: string) {
    setDestination(name);
    if (subscribed) {
      onSubscribed();
      setStep("done");
      return;
    }
    setStep("paywall");
  }

  return (
    <CalendarSlideout label="Add to your calendar" onClose={onClose} variant="sheet">
      <div className="calendar-subscribe">
        <header className="calendar-subscribe__header">
          {step === "paywall" ? (
            <button className="calendar-subscribe__back" onClick={() => setStep("include")} type="button">
              Back
            </button>
          ) : (
            <span />
          )}
          <h2 className="calendar-subscribe__title">Add to your calendar</h2>
          <button
            aria-label="Close"
            className="calendar-subscribe__close"
            onClick={onClose}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {step === "include" ? (
          <>
            <p className="calendar-subscribe__intro">
              Subscribe once and the sky shows up next to your own events. It updates on its own.
            </p>
            <section className="calendar-subscribe__section">
              <span className="calendar-subscribe__label">Include</span>
              <ul className="calendar-subscribe__feeds">
                {feedItems.map((item, index) => (
                  <li key={item.key}>
                    <button
                      aria-checked={enabled[item.key]}
                      aria-label={item.name}
                      className={`calendar-subscribe__row${enabled[item.key] ? " is-on" : ""}${index === 0 ? " is-first" : ""}${index === feedItems.length - 1 ? " is-last" : ""}`}
                      onClick={() => setEnabled((current) => ({ ...current, [item.key]: !current[item.key] }))}
                      role="switch"
                      type="button"
                    >
                      <FeedTag
                        icon={item.icon}
                        kind={item.kind}
                        weekly={"weekly" in item && item.weekly}
                      />
                      <span className="calendar-subscribe__copy">
                        <strong>{item.name}</strong>
                        <small>{item.hint}</small>
                      </span>
                      <span className="calendar-subscribe__switch" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
            <section className="calendar-subscribe__section">
              <span className="calendar-subscribe__label">Remind me</span>
              <div className="calendar-subscribe__remind" role="radiogroup" aria-label="Remind me">
                {reminders.map((item) => (
                  <button
                    aria-pressed={reminder === item}
                    className={reminder === item ? "is-on" : undefined}
                    key={item}
                    onClick={() => setReminder(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
            <section className="calendar-subscribe__section">
              <span className="calendar-subscribe__label">Open in</span>
              <div className="calendar-subscribe__open">
                <button className="is-primary" onClick={() => openCalendar("Apple Calendar")} type="button">Apple Calendar</button>
                <button className="is-primary" onClick={() => openCalendar("Google Calendar")} type="button">Google Calendar</button>
                <button onClick={() => openCalendar("Outlook")} type="button">Outlook</button>
                <button onClick={() => void copyLink()} type="button">{copied ? "Copied" : "Copy link"}</button>
              </div>
              <p className="calendar-subscribe__note">
                {selectedCount > 0 ? `${selectedCount} events in 2026` : "Nothing selected"}
                {city ? ` · Times in ${city}` : ""}
                {" · Remove any time from your calendar app"}
              </p>
            </section>
          </>
        ) : null}

            {step === "paywall" ? (
          <div className="calendar-subscribe__paywall">
            <div className="calendar-subscribe__paywall-head">
              <p className="calendar-subscribe__pill">2026 AstroCal</p>
              <p className="calendar-subscribe__headline">The whole sky, in your calendar</p>
              <p className="calendar-subscribe__intro is-paywall">
                {selectedCount} events in 2026, updated as the year unfolds.
              </p>
            </div>
            <ul className="calendar-subscribe__benefits">
              {benefits.map((item) => (
                <li key={item}>
                  <Check size={14} aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="calendar-subscribe__plans">
              {plans.map((item) => (
                <button
                  aria-pressed={plan === item.key}
                  className={plan === item.key ? "is-on" : undefined}
                  key={item.key}
                  onClick={() => setPlan(item.key)}
                  type="button"
                >
                  {"badge" in item && item.badge ? <em>{item.badge}</em> : null}
                  <strong>{item.name}</strong>
                  <span className="calendar-subscribe__price">
                    {item.price}
                    {item.per ? <small>{item.per}</small> : null}
                  </span>
                  <small>{item.note}</small>
                </button>
              ))}
            </div>
            <button
              className="calendar-subscribe__cta"
              onClick={() => {
                onSubscribed();
                setStep("done");
              }}
              type="button"
            >
              {selectedPlan.cta}
            </button>
            <p className="calendar-subscribe__note">{selectedPlan.fine}</p>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="calendar-subscribe__done">
            <span className="calendar-subscribe__mark" aria-hidden="true">
              <Check size={26} />
            </span>
            <span className="calendar-subscribe__title">You're subscribed</span>
            <p className="calendar-subscribe__intro is-done">
              Your feed is on its way to {destination}. It shows up as "TLDR Astro 2026" and stays in sync all year. If nothing opened, paste this link into your calendar app under Subscribe or From URL.
            </p>
            <p className="calendar-subscribe__url">
              <span>{feedUrl}</span>
              <button onClick={() => void copyLink()} type="button">{copied ? "Copied" : "Copy"}</button>
            </p>
            <button className="calendar-subscribe__back" onClick={() => setStep("include")} type="button">
              Edit what's included
            </button>
          </div>
        ) : null}
      </div>
    </CalendarSlideout>
  );
}
