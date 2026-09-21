import { FormattedProse } from "../../components/FormattedProse";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { LunarCalendarEvent } from "../../services/ephemeris";
import { AstroGlyph } from "./AstroGlyph";
import { CalendarKindLabel, CalendarKindTag } from "./CalendarKindTag";
import { CalendarSlideout } from "./CalendarSlideout";
import { calendarKindFromEvent, type CalendarEventKind } from "./calendarKinds";
import { handoffArticleForTitle } from "./calendarHandoff";
import {
  LUNAR_JOURNAL_SIGN_GLYPHS,
  type LunarJournalBlock
} from "./lunarJournal";

const PROSE_BLOCK_TYPES = new Set(["para", "heading", "cycle", "notice"]);

function isEclipseWitness(block: LunarJournalBlock) {
  const title = "title" in block ? block.title : "label" in block ? block.label : "";
  return /eclipse witness/i.test(title ?? "");
}

function orderJournalBlocks(blocks: LunarJournalBlock[] | undefined, kind: CalendarEventKind) {
  if (!blocks?.length) return [];
  if (kind !== "eclipse") return blocks;
  const witness = blocks.filter((block) => isEclipseWitness(block));
  if (!witness.length) return blocks;
  const rest = blocks.filter((block) => !isEclipseWitness(block));
  const prose = rest.filter((block) => PROSE_BLOCK_TYPES.has(block.type));
  const cards = rest.filter((block) => !PROSE_BLOCK_TYPES.has(block.type));
  return [...prose, ...witness, ...cards];
}

function JournalBlock({
  block,
  dateLine,
  timeCity,
  hasEventTime,
  natalSun,
  showJournalPrompts,
  onJournalPrompt
}: {
  block: LunarJournalBlock;
  dateLine: string;
  timeCity?: string;
  hasEventTime?: boolean;
  natalSun?: string | null;
  showJournalPrompts?: boolean;
  onJournalPrompt?: (text: string, options?: { tarot?: boolean }) => void;
}) {
  const [open, setOpen] = useState(false);

  if (block.type === "heading") return <h3>{block.text}</h3>;
  if (block.type === "para") return <FormattedProse text={block.text} />;
  if (block.type === "exact") {
    if (hasEventTime) return null;
    return <p className="calendar-reading__exact"><strong>Exact:</strong> {block.text || dateLine}</p>;
  }
  if (block.type === "times") {
    if (hasEventTime) return null;
    return (
      <section className="calendar-reading__card">
        <span className="calendar-reading__card-label">Exact time</span>
        <div className="calendar-reading__time-row">
          <span>{timeCity || "Your time"}</span>
          <strong>{dateLine}</strong>
        </div>
        {block.items.length > 0 ? (
          <>
            <button className="calendar-reading__toggle" onClick={() => setOpen((value) => !value)} type="button">
              {open ? "Less" : "More"}
            </button>
            {open ? (
              <ul className="calendar-reading__list">
                {block.items.map((item) => (
                  <li key={`${item.city}-${item.time}`}>
                    <span>{item.city}</span>
                    <strong>{item.time}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </section>
    );
  }
  if (block.type === "section" || block.type === "cycle" || block.type === "notice") {
    return (
      <section className="calendar-reading__card">
        {block.title ? <span className="calendar-reading__card-label">{block.title}</span> : null}
        {block.text ? <FormattedProse text={block.text} /> : null}
        {block.type === "cycle" && block.link && !/^https?:/i.test(block.link) ? (
          <span className="calendar-reading__toggle">Go to {block.link}</span>
        ) : null}
      </section>
    );
  }
  if (block.type === "bullets") {
    return (
      <section className="calendar-reading__card">
        {block.title ? <span className="calendar-reading__card-label">{block.title}</span> : null}
        <ul className="calendar-reading__list">
          {block.items.map((item) => <li key={item.slice(0, 48)}>{item}</li>)}
        </ul>
      </section>
    );
  }
  if (block.type === "callin" || block.type === "intent") {
    const label = block.label;
    const items = block.type === "intent" ? [block.text] : block.items;
    return (
      <section className="calendar-reading__card">
        {label ? <span className="calendar-reading__card-label">{label}</span> : null}
        {items.map((item) => <FormattedProse key={item.slice(0, 48)} text={item} />)}
      </section>
    );
  }
  if (block.type === "ritual") {
    return (
      <section className="calendar-reading__card">
        <span className="calendar-reading__card-label">{block.label ?? "Ritual"}</span>
        <ol className="calendar-reading__steps">
          {block.steps.map((step) => <li key={step.slice(0, 48)}>{step}</li>)}
        </ol>
        {block.notes?.length ? (
          <div className="calendar-reading__notes">
            {block.notes.map((note) => <FormattedProse key={note.slice(0, 48)} text={note} />)}
          </div>
        ) : null}
      </section>
    );
  }
  if (block.type === "prompt" || block.type === "tarot") {
    return (
      <section className="calendar-reading__card">
        <span className="calendar-reading__card-label">{block.label ?? (block.type === "tarot" ? "Tarot" : "Prompt")}</span>
        {block.text ? <FormattedProse text={block.text} /> : null}
        {showJournalPrompts && block.text && onJournalPrompt ? (
          <button
            className="calendar-reading__toggle"
            onClick={() => onJournalPrompt(block.text ?? "", { tarot: block.type === "tarot" })}
            type="button"
          >
            {block.type === "tarot" ? "Record your card" : "Write about this"}
            <ChevronRight size={13} aria-hidden="true" />
          </button>
        ) : null}
      </section>
    );
  }
  if (block.type === "bysign") {
    const mine = natalSun
      ? block.items.find((item) => item.sign.toLowerCase() === natalSun.toLowerCase())
      : null;
    const rest = mine ? block.items.filter((item) => item !== mine) : block.items.slice(1);
    const featured = mine ?? block.items[0];
    return (
      <section className="calendar-reading__card">
        {block.title ? <span className="calendar-reading__card-label">{block.title}</span> : null}
        {featured ? (
          <p className="calendar-reading__bysign">
            <AstroGlyph text={LUNAR_JOURNAL_SIGN_GLYPHS[featured.sign] ?? ""} />
            <span>
              <strong>{featured.sign}</strong>
              {featured.house ? ` · ${featured.house}` : ""}
              <small>{featured.text}</small>
            </span>
          </p>
        ) : null}
        {rest.length > 0 ? (
          <>
            <button className="calendar-reading__toggle" onClick={() => setOpen((value) => !value)} type="button">
              {open ? "Less" : "More"}
            </button>
            {open ? rest.map((item) => (
              <p className="calendar-reading__bysign" key={item.sign}>
                <AstroGlyph text={LUNAR_JOURNAL_SIGN_GLYPHS[item.sign] ?? ""} />
                <span>
                  <strong>{item.sign}</strong>
                  {item.house ? ` · ${item.house}` : ""}
                  <small>{item.text}</small>
                </span>
              </p>
            )) : null}
          </>
        ) : null}
      </section>
    );
  }
  return null;
}

export function CalendarEventReading({
  event,
  title,
  dateLine,
  paragraphs,
  journalBlocks,
  kind,
  natalSun,
  timeCity,
  showJournalPrompts,
  backLabel,
  onClose,
  onBack,
  onReadArticle,
  onJournalPrompt
}: {
  event: LunarCalendarEvent;
  title: string;
  dateLine: string;
  paragraphs: string[];
  journalBlocks?: LunarJournalBlock[];
  kind?: CalendarEventKind;
  element?: string;
  natalSun?: string | null;
  timeCity?: string;
  showJournalPrompts?: boolean;
  backLabel?: string;
  onClose: () => void;
  onBack?: () => void;
  onReadArticle?: () => void;
  onJournalPrompt?: (text: string, options?: { tarot?: boolean }) => void;
}) {
  const resolvedKind = kind ?? calendarKindFromEvent(event);
  const article = handoffArticleForTitle(event.title);
  // Internal Sky routes are independent of the optional external catalog.
  const canReadArticle = Boolean(onReadArticle && (
    (event.type === "aspect" && event.planets?.length === 2 && event.aspect)
    || (event.type === "lunation" && event.sign)
    || ((event.type === "ingress" || event.type === "station") && event.planet)
  ));
  const hasJournal = Boolean(journalBlocks?.length);
  const hasEventTime = Boolean(event.startsAt);
  let articleHost = "";
  try {
    articleHost = article?.article ? new URL(article.article).hostname.replace(/^www\./, "") : "";
  } catch {
    articleHost = "";
  }
  const articleTitle = article?.articleTitle || `${title.replace(/^The\s+/i, "")}, in full`;
  const orderedBlocks = orderJournalBlocks(journalBlocks, resolvedKind);

  return (
    <CalendarSlideout
      label="Event detail"
      leading={canReadArticle ? (
        <button className="calendar-reading__article-pill" onClick={onReadArticle} type="button">
          Read article
          <ChevronRight size={13} aria-hidden="true" />
        </button>
      ) : undefined}
      onClose={onClose}
      variant="event"
    >
      {onBack && backLabel ? (
        <button className="calendar-reading__back" onClick={onBack} type="button">
          <ChevronLeft size={14} aria-hidden="true" />
          {backLabel}
        </button>
      ) : null}
      <div className="calendar-reading__lockup">
        <div className="calendar-reading__overbrow">
          <CalendarKindTag event={event} kind={resolvedKind} />
          <CalendarKindLabel event={event} kind={resolvedKind} />
        </div>
        <h2 className="calendar-reading__title" id="calendar-reading-title">{title}</h2>
        <p className="calendar-reading__meta">{dateLine}</p>
      </div>
      <div className="calendar-reading__body">
        {hasJournal
          ? orderedBlocks.map((block, index) => (
            <JournalBlock
              block={block}
              dateLine={dateLine}
              hasEventTime={hasEventTime}
              key={`${block.type}-${index}`}
              natalSun={natalSun}
              onJournalPrompt={onJournalPrompt}
              showJournalPrompts={showJournalPrompts}
              timeCity={timeCity}
            />
          ))
          : paragraphs.filter(Boolean).map((text) => <FormattedProse key={text.slice(0, 48)} text={text} />)}
        {canReadArticle && article ? (
          <button className="calendar-reading__article-card" onClick={onReadArticle} type="button">
            <span className="calendar-reading__article-icon" aria-hidden="true" />
            <span>
              <span className="calendar-reading__article-label">Full article</span>
              <strong>{articleTitle}</strong>
              <small>{[articleHost, article?.readTime].filter(Boolean).join(" · ")}</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </CalendarSlideout>
  );
}
