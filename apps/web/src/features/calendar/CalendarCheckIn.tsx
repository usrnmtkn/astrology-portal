import { useEffect, useMemo, useState } from "react";
import { withRequestDeadline } from "../../services/requestDeadline";
import { Check, ChevronLeft, ChevronRight, Tag, Users, X } from "lucide-react";
import { onAuthAccountChange } from "../../services/auth";
import type { CalendarCheckInPerson } from "./calendarCheckInPeople";
import {
  CALENDAR_CHECK_IN_LABEL_MAX,
  CALENDAR_CHECK_IN_MOOD_NOTE_MAX,
  CALENDAR_CHECK_IN_NOTE_MAX,
  CalendarCheckInAuthError,
  type CalendarCheckInEntry
} from "../../services/calendarCheckIns";
import { CalendarSlideout } from "./CalendarSlideout";

export type { CalendarCheckInEntry };

const CHECKIN_STEPS = 5;

export const CALENDAR_MOODS = [
  { label: "Terrible", path: "M7.6 11.6q1.6-2.2 3.2 0M13.2 11.6q1.6-2.2 3.2 0M9.4 16.4q2.6-2.2 5.2 0" },
  { label: "Not great", path: "M7.6 11h3.2M13.2 11h3.2M9.6 15.6h4.8" },
  { label: "Okay", path: "M9.1 10.4v.8M14.9 10.4v.8M9.8 15.2q2.2.8 4.4 0" },
  { label: "Good", path: "M7.6 10.4q1.6 2.2 3.2 0M13.2 10.4q1.6 2.2 3.2 0M9.4 14.4q2.6 2.4 5.2 0" },
  { label: "Great", path: "M7.6 10.2q1.6 2.2 3.2 0M13.2 10.2q1.6 2.2 3.2 0M9 13.9h6c0 2.3-1.35 3.6-3 3.6s-3-1.3-3-3.6z" }
] as const;

function normalizeEntry(value: Partial<CalendarCheckInEntry> | undefined): CalendarCheckInEntry {
  return {
    mood: typeof value?.mood === "number" ? value.mood : null,
    sleep: typeof value?.sleep === "number" ? value.sleep : 50,
    social: typeof value?.social === "number" ? value.social : 50,
    moodNote: value?.moodNote ?? "",
    note: value?.note ?? "",
    tags: Array.isArray(value?.tags) ? value.tags : [],
    people: Array.isArray(value?.people) ? value.people : []
  };
}

export function calendarMoodOf(entry?: Pick<CalendarCheckInEntry, "mood"> | null) {
  if (entry?.mood == null) return null;
  return CALENDAR_MOODS[entry.mood] ?? null;
}

export function sleepWordOf(value: number) {
  if (value < 20) return "exhausted";
  if (value < 40) return "a little tired";
  if (value < 60) return "moderately rested";
  if (value < 80) return "well rested";
  return "fully recharged";
}

export function socialWordOf(value: number) {
  if (value < 15) return "lonely";
  if (value < 30) return "solitary";
  if (value < 45) return "quiet";
  if (value < 60) return "balanced";
  if (value < 80) return "connected";
  return "full of people";
}

export function moodToneVar(mood: number) {
  return `var(--calendar-mood-${mood + 1})`;
}

export function checkInTitle(entry: CalendarCheckInEntry) {
  const mood = calendarMoodOf(entry)?.label;
  const rest = entry.sleep != null ? sleepWordOf(entry.sleep) : null;
  return [mood, rest].filter(Boolean).join(" · ");
}

export function checkInSubtitle(entry: CalendarCheckInEntry) {
  const note = (entry.moodNote || entry.note).split("\n")[0]?.trim();
  const social = entry.social != null ? socialWordOf(entry.social) : null;
  const tags = entry.tags.map((tag) => `#${tag}`);
  return [note, social, ...tags].filter(Boolean).join(" · ") || "Your check-in · tap to edit";
}

export function CalendarMoodStar({
  mood = 2,
  filled = true,
  className
}: {
  mood?: number;
  filled?: boolean;
  className?: string;
}) {
  const face = CALENDAR_MOODS[mood] ?? CALENDAR_MOODS[2];

  return (
    <svg className={`${className ?? ""} ${filled ? "is-filled" : "is-empty"}`.trim()} viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="calendar-month-mood__star"
        d="M12 .9c.8 0 1.45.5 1.8 1.35l2.35 5 5.45.7c1.75.2 2.4 2.05 1.15 3.25l-4.05 3.75 1.05 5.45c.35 1.75-1.3 2.9-2.85 2.05L12 19.85l-4.9 2.6c-1.55.85-3.2-.3-2.85-2.05l1.05-5.45L1.25 11.2C0 10 .65 8.15 2.4 7.95l5.45-.7 2.35-5C10.55 1.4 11.2.9 12 .9z"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        className="calendar-month-mood__face"
        d={face.path}
        fill="none"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CalendarMoodChip({
  mood,
  showLabel = true
}: {
  mood: number;
  showLabel?: boolean;
}) {
  const face = CALENDAR_MOODS[mood];
  if (!face) return null;

  return (
    <span className="calendar-month-chip calendar-month-mood" title={face.label}>
      <CalendarMoodStar className="calendar-month-mood__mark" mood={mood} />
      {showLabel ? <span className="calendar-month-chip__text">{face.label}</span> : null}
    </span>
  );
}

function CheckInSlider({
  ariaLabel,
  value,
  onChange
}: {
  ariaLabel: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="calendar-checkin__slider">
      <span className="calendar-checkin__slider-track">
        <span className="calendar-checkin__slider-fill" style={{ width: `calc(${value}% + var(--lunar-space-24))` }} />
        <span
          className="calendar-checkin__slider-thumb"
          style={{ left: `calc(${value}% - ${value * 0.44}px + var(--lunar-space-2))` }}
        />
        <input
          aria-label={ariaLabel}
          max={100}
          min={0}
          onChange={(event) => onChange(Number(event.target.value))}
          type="range"
          value={value}
        />
      </span>
    </label>
  );
}

export function CalendarCheckIn({
  dateKey,
  dateLine,
  prompt,
  value,
  startStep = 0,
  openTagSheet = false,
  tarotMode = false,
  signedIn = false,
  libraryTags = [],
  knownPeople = [],
  libraryLoadState = "ready",
  onRetryLibrary,
  onClose,
  onSave,
  onSignIn,
  onLibraryTagAdd,
  onLibraryTagRemove,
  onLibraryPersonAdd
}: {
  dateKey: string;
  dateLine: string;
  prompt?: string;
  value?: CalendarCheckInEntry;
  startStep?: number;
  openTagSheet?: boolean;
  tarotMode?: boolean;
  signedIn?: boolean;
  libraryTags?: string[];
  knownPeople?: string[];
  libraryLoadState?: "loading" | "ready" | "error";
  onRetryLibrary?: () => void;
  onClose: () => void;
  onSave: (entry: CalendarCheckInEntry) => void | Promise<void>;
  onSignIn?: () => void;
  onLibraryTagAdd?: (tag: string) => void | Promise<void>;
  onLibraryTagRemove?: (tag: string) => void | Promise<void>;
  onLibraryPersonAdd?: (name: string) => void | Promise<void>;
}) {
  const initial = normalizeEntry(value);
  const [step, setStep] = useState(startStep);
  const [mood, setMood] = useState<number | null>(initial.mood);
  const [sleep, setSleep] = useState(initial.sleep);
  const [social, setSocial] = useState(initial.social);
  const [moodNote, setMoodNote] = useState(initial.moodNote);
  const [note, setNote] = useState(initial.note);
  const [tags, setTags] = useState<string[]>(initial.tags);
  const [people, setPeople] = useState<string[]>(initial.people);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [picker, setPicker] = useState<"tags" | "people" | null>(openTagSheet ? "tags" : null);
  const [creating, setCreating] = useState(tarotMode);
  const [draftTag, setDraftTag] = useState(tarotMode ? "Card: " : "");
  const [draftPerson, setDraftPerson] = useState("");
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [personOptions, setPersonOptions] = useState<CalendarCheckInPerson[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(false);
  const [peopleRetry, setPeopleRetry] = useState(0);

  useEffect(() => {
    if (picker !== "people" || !signedIn) return;
    let active = true;
    let request = 0;
    let controller: AbortController | undefined;
    const load = async () => {
      const current = ++request;
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      setPersonOptions([]);
      setPeopleLoading(true);
      setPeopleError(false);
      try {
        const result = await withRequestDeadline(async requestSignal => {
          const { loadCalendarCheckInPeople } = await import("./calendarCheckInPeople");
          requestSignal.throwIfAborted();
          return loadCalendarCheckInPeople();
        }, { signal });
        if (!active || current !== request) return;
        setPersonOptions(result.people);
        setPeopleError(result.incomplete);
      } catch {
        if (active && current === request) setPeopleError(true);
      } finally {
        if (active && current === request) setPeopleLoading(false);
      }
    };
    void load();
    const unsubscribe = onAuthAccountChange(() => { void load(); });
    return () => { active = false; controller?.abort(); unsubscribe(); };
  }, [picker, signedIn, peopleRetry]);

  const entry = useMemo<CalendarCheckInEntry>(() => ({
    mood,
    sleep,
    social,
    moodNote,
    note,
    tags,
    people
  }), [mood, sleep, social, moodNote, note, tags, people]);

  const moodWord = CALENDAR_MOODS[mood ?? 2]?.label.toLowerCase() ?? "okay";
  const availableTags = [...new Set([...libraryTags, ...tags])];
  const personQuery = draftPerson.trim().toLocaleLowerCase();
  const availablePeople = signedIn ? personOptions : [];
  const matchingPeople = [
    ...availablePeople,
    ...[...new Set([...knownPeople, ...people])]
      .filter(name => !availablePeople.some(person => person.name === name))
      .map(name => ({ id: `name:${name}`, name, kind: "" as const, handle: undefined }))
  ].filter(person => `${person.name} ${person.handle ?? ""}`.toLocaleLowerCase().includes(personQuery));
  const readyToSave = mood != null || Boolean(moodNote.trim() || note.trim() || tags.length || people.length);
  const isCardTag = (tag: string) => /^card:/i.test(tag);
  const tagLabel = (tag: string) => tag.replace(/^card:\s*/i, "");

  async function persist(next: CalendarCheckInEntry) {
    if (!signedIn) {
      onSignIn?.();
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(next);
      setSaved(true);
      window.setTimeout(() => onClose(), 700);
      return true;
    } catch (error) {
      if (error instanceof CalendarCheckInAuthError) {
        setSaveError(error.message);
        onSignIn?.();
      } else {
        setSaveError("This check-in could not be saved. Try again.");
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  function goNext() {
    if (saving || libraryBusy) return;
    if (step < 4) {
      setStep((current) => current + 1);
      return;
    }
    if (!readyToSave) {
      onClose();
      return;
    }
    void persist(entry);
  }

  async function deleteTag(tag: string) {
    if (libraryBusy) return;
    setLibraryBusy(true);
    setLibraryError(null);
    try {
      await onLibraryTagRemove?.(tag);
      setTags((current) => current.filter((item) => item !== tag));
    } catch {
      setLibraryError("This tag could not be deleted. Try again.");
    } finally { setLibraryBusy(false); }
  }

  function toggleTag(tag: string) {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]);
  }

  async function addTag() {
    if (libraryBusy) return;
    const next = draftTag.trim().slice(0, CALENDAR_CHECK_IN_LABEL_MAX);
    if (!next) return;
    setLibraryBusy(true);
    setLibraryError(null);
    try {
      await onLibraryTagAdd?.(next);
      setTags(current => current.includes(next) ? current : [...current, next]);
      setDraftTag("");
      setCreating(false);
    } catch {
      setLibraryError("This tag could not be saved. Try again.");
    } finally { setLibraryBusy(false); }
  }

  async function addPerson() {
    if (libraryBusy) return;
    const next = draftPerson.trim().slice(0, CALENDAR_CHECK_IN_LABEL_MAX);
    if (!next) return;
    setLibraryBusy(true);
    setLibraryError(null);
    try {
      await onLibraryPersonAdd?.(next);
      setPeople(current => current.includes(next) ? current : [...current, next]);
      setDraftPerson("");
    } catch {
      setLibraryError("This name could not be saved. Try again.");
    } finally { setLibraryBusy(false); }
  }

  function togglePerson(name: string) {
    setPeople((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name]);
  }

  return (
    <CalendarSlideout
      label="Check-in"
      leading={(
        <>
          <span className="calendar-slideout__date">{dateLine}</span>
          <span className="calendar-checkin__dots" aria-label={`Step ${step + 1} of ${CHECKIN_STEPS}`}>
            {Array.from({ length: CHECKIN_STEPS }, (_, index) => (
              <span
                className={index < step ? "is-done" : index === step ? "is-current" : undefined}
                key={index}
              />
            ))}
          </span>
        </>
      )}
      onClose={onClose}
      variant="checkin"
    >
      <div className="calendar-checkin">
        <div className={`calendar-checkin__stage${step >= 3 ? " is-entry" : ""}`}>
          {step === 0 && (
            <div className="calendar-checkin__block">
              <h2>How are you feeling?</h2>
              <div className="calendar-checkin__moods">
                {CALENDAR_MOODS.map((face, index) => (
                  <button
                    aria-label={face.label}
                    aria-pressed={mood === index}
                    className={mood === index ? "is-selected" : undefined}
                    key={face.label}
                    onClick={() => setMood(index)}
                    type="button"
                  >
                    <CalendarMoodStar filled={mood === index} mood={index} />
                  </button>
                ))}
              </div>
              <div className="calendar-checkin__ends">
                <span>Terrible</span>
                <span>Great</span>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="calendar-checkin__block">
              <h2>How rested do you feel?</h2>
              <p className="calendar-checkin__echo">Today I feel<br /><strong>{sleepWordOf(sleep)}.</strong></p>
              <CheckInSlider ariaLabel="Rested" onChange={setSleep} value={sleep} />
              <div className="calendar-checkin__ends">
                <span>Not at all</span>
                <span>Very</span>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="calendar-checkin__block">
              <h2>How was your time with people?</h2>
              <p className="calendar-checkin__echo">Today I feel<br /><strong>{socialWordOf(social)}.</strong></p>
              <CheckInSlider ariaLabel="Social" onChange={setSocial} value={social} />
              <div className="calendar-checkin__ends">
                <span>Mostly alone</span>
                <span>Full of people</span>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="calendar-checkin__block is-entry">
              <div className="calendar-checkin__pills">
                <button onClick={() => { setLibraryError(null); setPicker("tags"); }} type="button">
                  <Tag size={14} aria-hidden="true" />
                  Tags
                  {tags.length > 0 ? <span>{tags.length}</span> : null}
                </button>
                <button onClick={() => { setLibraryError(null); setPicker("people"); }} type="button">
                  <Users size={14} aria-hidden="true" />
                  People
                  {people.length > 0 ? <span>{people.length}</span> : null}
                </button>
              </div>
              <h2>What's on your mind?</h2>
              <p className="calendar-checkin__summary">Today I feel {moodWord}, {sleepWordOf(sleep)} and {socialWordOf(social)}.</p>
              {tags.length > 0 && (
                <div className="calendar-checkin__chips">
                  {tags.map((tag) => (
                    <button className={isCardTag(tag) ? "is-card" : undefined} key={tag} onClick={() => toggleTag(tag)} type="button">
                      {isCardTag(tag) ? tagLabel(tag) : `#${tag}`}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              {people.length > 0 && (
                <div className="calendar-checkin__people">
                  {people.map((name) => (
                    <button key={name} onClick={() => togglePerson(name)} type="button">
                      <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                      {name}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                maxLength={CALENDAR_CHECK_IN_MOOD_NOTE_MAX}
                onChange={(event) => setMoodNote(event.target.value)}
                placeholder="Start writing…"
                rows={6}
                value={moodNote}
              />
            </div>
          )}
          {step === 4 && (
            <div className="calendar-checkin__block is-entry">
              <div className="calendar-checkin__pills">
                <button onClick={() => { setLibraryError(null); setPicker("tags"); }} type="button">
                  <Tag size={14} aria-hidden="true" />
                  Tags
                  {tags.length > 0 ? <span>{tags.length}</span> : null}
                </button>
                <button onClick={() => { setLibraryError(null); setPicker("people"); }} type="button">
                  <Users size={14} aria-hidden="true" />
                  People
                  {people.length > 0 ? <span>{people.length}</span> : null}
                </button>
              </div>
              <h2>{prompt || "Anything else?"}</h2>
              {people.length > 0 && (
                <div className="calendar-checkin__people">
                  {people.map((name) => (
                    <button key={name} onClick={() => togglePerson(name)} type="button">
                      <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
                      {name}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              {tags.length > 0 && (
                <div className="calendar-checkin__chips">
                  {tags.map((tag) => (
                    <button className={isCardTag(tag) ? "is-card" : undefined} key={tag} onClick={() => toggleTag(tag)} type="button">
                      {isCardTag(tag) ? tagLabel(tag) : `#${tag}`}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              <textarea
                maxLength={CALENDAR_CHECK_IN_NOTE_MAX}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Start writing…"
                rows={6}
                value={note}
              />
            </div>
          )}
        </div>
        {saveError ? (
          <p className="calendar-checkin__status" role="status">
            {saveError}
          </p>
        ) : null}
        <footer className="calendar-checkin__footer">
          {step > 0 ? (
            <button aria-label="Back" className="calendar-checkin__round" disabled={saving} onClick={() => setStep((current) => current - 1)} type="button">
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
          ) : <span />}
          <button className="calendar-checkin__skip" disabled={saving} onClick={() => (step < 4 ? setStep((current) => current + 1) : onClose())} type="button">
            Skip
          </button>
          <button
            aria-label={step < 4 ? "Next" : signedIn ? "Save" : "Sign in to save"}
            className={`calendar-checkin__round${step < 4 || readyToSave || !signedIn ? " is-next" : ""}${saved ? " is-saved" : ""}`}
            disabled={saving || libraryBusy}
            onClick={goNext}
            type="button"
          >
            {step < 4 ? <ChevronRight size={14} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
          </button>
        </footer>
        <p className="sr-only">{dateKey}</p>
      </div>
      {picker === "tags" && (
        <div className="calendar-checkin-picker">
          <button aria-label="Close tags" className="calendar-checkin-picker__scrim" onClick={() => setPicker(null)} type="button" />
          <div className="calendar-checkin-picker__sheet" data-screen-label="Tags">
            <header>
              <span>Your Tags</span>
              <button aria-label="Done" onClick={() => { setPicker(null); setCreating(false); }} type="button">
                <Check size={18} aria-hidden="true" />
              </button>
            </header>
            {libraryLoadState === "loading" ? <p role="status">Loading your tags…</p> : null}
            {libraryLoadState === "error" ? <p role="alert">Your saved tags could not load. <button onClick={onRetryLibrary} type="button">Retry tags</button></p> : null}
            {availableTags.length === 0 && !creating ? (
              <p className="calendar-checkin-picker__empty">Keep your journey organized and easy to explore. Add tags to group and filter your entries.</p>
            ) : null}
            {creating ? (
              <div className="calendar-checkin-picker__create">
                <span className="calendar-checkin-picker__illustration" aria-hidden="true" />
                <input
                  aria-label="Tag name"
                  autoFocus
                  disabled={libraryBusy || libraryLoadState === "loading"}
                  maxLength={CALENDAR_CHECK_IN_LABEL_MAX}
                  onChange={(event) => setDraftTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addTag();
                    }
                  }}
                  placeholder={tarotMode ? "Which card did you draw?" : "# Name Your Tag"}
                  value={draftTag}
                />
              </div>
            ) : (
              <div className="calendar-checkin__tag-list">
                {availableTags.map((tag) => {
                  const on = tags.includes(tag);
                  return (
                    <span className={`calendar-checkin__chip-wrap${on ? " is-on" : ""}${isCardTag(tag) ? " is-card" : ""}`} key={tag}>
                      <button aria-pressed={on} disabled={libraryBusy || libraryLoadState === "loading"} onClick={() => toggleTag(tag)} type="button">
                        {isCardTag(tag) ? tagLabel(tag) : `#${tag}`}
                      </button>
                      <button aria-label={`Delete tag ${tagLabel(tag)}`} disabled={libraryBusy || libraryLoadState === "loading"} onClick={() => { void deleteTag(tag); }} type="button">
                        <X size={12} aria-hidden="true" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {creating ? (
              <button
                className={`calendar-checkin__add${draftTag.trim() ? " is-ready" : ""}`}
                disabled={libraryBusy || libraryLoadState === "loading" || !draftTag.trim()}
                onClick={() => { void addTag(); }}
                type="button"
              >
                Add tag
              </button>
            ) : (
              <button className="calendar-checkin__add is-ready" disabled={libraryBusy || libraryLoadState === "loading"} onClick={() => setCreating(true)} type="button">New tag</button>
            )}
            {libraryError ? <p role="alert">{libraryError}</p> : null}
          </div>
        </div>
      )}
      {picker === "people" && (
        <div className="calendar-checkin-picker">
          <button aria-label="Close people" className="calendar-checkin-picker__scrim" onClick={() => setPicker(null)} type="button" />
          <div className="calendar-checkin-picker__sheet" data-screen-label="Friends">
            <header>
              <span>Who was this with?</span>
              <button aria-label="Done" onClick={() => setPicker(null)} type="button">
                <Check size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="calendar-checkin-picker__people">
              <span className="calendar-checkin__add-row">
                <input
                  aria-label="Search charts, friends, or names"
                  maxLength={CALENDAR_CHECK_IN_LABEL_MAX}
                  onChange={(event) => setDraftPerson(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void addPerson();
                    }
                  }}
                  placeholder="Search charts, friends, or add a name"
                  type="search"
                  value={draftPerson}
                />
                <button className={draftPerson.trim() ? "is-ready" : undefined} disabled={libraryBusy || libraryLoadState === "loading" || !draftPerson.trim()} onClick={() => { void addPerson(); }} type="button">Add</button>
              </span>
              {peopleLoading ? <p role="status">Loading charts and friends…</p> : null}
              {libraryLoadState === "error" ? <p role="alert">Your saved names could not load. <button onClick={onRetryLibrary} type="button">Retry names</button></p> : null}
              {matchingPeople.map((person) => {
                const on = people.includes(person.name);
                return (
                  <button aria-pressed={on} className={on ? "is-on" : undefined} key={person.id} onClick={() => togglePerson(person.name)} type="button">
                    <span aria-hidden="true">{person.name.slice(0, 1).toUpperCase()}</span>
                    <span className="calendar-checkin-picker__person-copy">
                      {person.name}
                      {person.kind ? <small>{person.kind}{person.handle ? ` · @${person.handle}` : ""}</small> : null}
                    </span>
                    {on ? <Check size={16} aria-hidden="true" /> : null}
                  </button>
                );
              })}
              {!peopleLoading && personQuery && matchingPeople.length === 0 ? <p>No matching charts or friends. You can add this name to your notes.</p> : null}
              {peopleError ? (
                <div role="alert">
                  <p>Some charts or friends could not load.</p>
                  <button onClick={() => setPeopleRetry(current => current + 1)} type="button">Retry</button>
                </div>
              ) : null}
              {libraryError ? <p role="alert">{libraryError}</p> : null}
              <p>Names you add here are just for your notes. Nobody gets tagged or notified.</p>
            </div>
          </div>
        </div>
      )}
    </CalendarSlideout>
  );
}
