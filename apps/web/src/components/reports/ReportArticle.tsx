import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { isReaderFacingCopy, readerFacingParagraphs } from "../../content/readerSafety";
import { dedupeArticleSectionHeadings } from "../../utils/articleHeadings";
import { ModalPortal } from "../ModalPortal";
import { AttributionLine } from "./AttributionLine";
import type { AttributionFacts } from "./attributionFormat";

export type ReportCover = {
  kicker: string;
  title: string;
  subtitle?: string;
  meta?: string[];
  periodLine?: string;
  handleLine?: string;
  glyphLine?: string;
};

export type ReportChapter = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  attribution?: AttributionFacts;
  attributionText?: string;
  keyDates?: ReportKeyDate[];
  sourceTag?: string;
  image?: {
    src?: string;
    alt?: string;
  };
};

export type ReportKeyDate = {
  id: string;
  date: string;
  title: string;
  category?: "SELF" | "WORK" | "FRIENDS & FAMILY" | "SEX & LOVE";
  paragraphs: string[];
  attribution?: AttributionFacts;
  attributionText?: string;
};

export type ReportColophon = {
  factsEngine?: string;
  generatedAt?: string;
  entries?: Array<{ label: string; value: string }> | string[];
};

export type ReportDocument = {
  id: string;
  reportType: "year_ahead" | "relationship" | "saturn_return" | "report";
  cover: ReportCover;
  chapters: ReportChapter[];
  keyDates?: ReportKeyDate[];
  colophon: ReportColophon;
};

function readable(value: string | undefined) {
  return value && isReaderFacingCopy(value) ? value : "";
}

function ReportImageSlot({ chapter }: { chapter: ReportChapter }) {
  const src = chapter.image?.src?.trim();
  const alt = chapter.image?.alt?.trim() ?? "";

  return (
    <div className="report-chapter__image" data-report-block="image-slot">
      {src ? <img src={src} alt={alt} /> : <span className="report-chapter__image-placeholder" aria-hidden="true">✦</span>}
    </div>
  );
}

function ReportKeyDateSheet({
  keyDate,
  onClose
}: {
  keyDate: ReportKeyDate;
  onClose: () => void;
}) {
  const titleId = `report-key-date-${keyDate.id}`;

  return (
    <ModalPortal
      className="report-key-date-modal"
      closeOnBackdrop
      onClose={onClose}
      panelClassName="report-key-date-sheet"
      titleId={titleId}
      width="var(--container-dialog)"
    >
      <button className="modal-close" type="button" aria-label="Close key date" onClick={onClose}>
        <X size={18} aria-hidden="true" />
      </button>
      <div className="report-key-date-sheet__body">
        <p className="report-label">Key date</p>
        <p className="report-key-date-sheet__date">{keyDate.date}</p>
        <h2 id={titleId}>{keyDate.title}</h2>
        {readerFacingParagraphs(keyDate.paragraphs).map((paragraph, index) => (
          <p key={`${keyDate.id}-paragraph-${index}`}>{paragraph}</p>
        ))}
        {keyDate.attribution ? <AttributionLine facts={keyDate.attribution} /> : keyDate.attributionText ? <p className="report-attribution">{keyDate.attributionText}</p> : null}
      </div>
    </ModalPortal>
  );
}

export function ReportArticle({ report }: { report: ReportDocument }) {
  const [activeKeyDateId, setActiveKeyDateId] = useState<string | null>(null);
  const chapters = useMemo(() => dedupeArticleSectionHeadings(
    report.chapters.map((chapter) => ({ ...chapter, heading: chapter.title })),
    report.cover.title
  ), [report.chapters, report.cover.title]);
  const allKeyDates = [...(report.keyDates ?? []), ...report.chapters.flatMap((chapter) => chapter.keyDates ?? [])];
  const activeKeyDate = allKeyDates.find((keyDate) => keyDate.id === activeKeyDateId) ?? null;
  const subtitle = readable(report.cover.subtitle);
  const publicColophonLines = Array.isArray(report.colophon.entries) && report.colophon.entries.every((entry) => typeof entry === "string")
    ? report.colophon.entries as string[] : [];
  const legacyColophonEntries = publicColophonLines.length ? [] : [
    ...(report.colophon.factsEngine ? [{ label: "Facts engine", value: report.colophon.factsEngine }] : []),
    ...(report.colophon.generatedAt ? [{ label: "Generated", value: report.colophon.generatedAt }] : []),
    ...((report.colophon.entries ?? []) as Array<{ label: string; value: string }>)
  ].filter((entry) => readable(entry.label) && readable(entry.value));

  return (
    <main className="report-article-page" data-report-id={report.id} data-report-type={report.reportType}>
      <article className="report-article" aria-labelledby="report-cover-title">
        <header className="report-cover" data-report-block="cover">
          <p className="report-label">{report.cover.kicker}</p>
          <h1 id="report-cover-title">{report.cover.title}</h1>
          {report.cover.periodLine ? <p className="report-cover__period"><strong>{report.cover.periodLine}</strong></p> : null}
          {report.cover.handleLine ? <h2 className="report-cover__handle">{report.cover.handleLine}</h2> : null}
          {report.cover.glyphLine ? <><p className="report-cover__glyph">{report.cover.glyphLine}</p><hr /></> : null}
          {subtitle ? <p className="report-cover__subtitle">{subtitle}</p> : null}
          {report.cover.meta?.length ? (
            <ul className="report-cover__meta" aria-label="Report details">
              {report.cover.meta.filter(isReaderFacingCopy).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </header>

        <div className="report-chapters" data-report-block="chapters">
          {chapters.map((chapter) => {
            const paragraphs = readerFacingParagraphs(chapter.paragraphs);
            const sourceTag = readable(chapter.sourceTag);
            const headingId = `report-chapter-${chapter.id}`;

            return (
              <section
                className="report-chapter"
                key={chapter.id}
                aria-label={chapter.heading ? undefined : chapter.kicker}
                aria-labelledby={chapter.heading ? headingId : undefined}
              >
                <ReportImageSlot chapter={chapter} />
                <div className="report-chapter__copy">
                  <p className="report-label">{chapter.kicker}</p>
                  {chapter.heading ? <h2 id={headingId}>{chapter.heading}</h2> : null}
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${chapter.id}-paragraph-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                  {chapter.attribution ? <AttributionLine facts={chapter.attribution} /> : null}
                  {chapter.attributionText ? <p className="report-attribution"><em>{chapter.attributionText}</em></p> : null}
                  {chapter.keyDates?.length ? (
                    <div className="report-season-key-dates" data-report-block="key-dates">
                      <h3>Key dates</h3>
                      <div className="report-key-dates__list">
                        {chapter.keyDates.map((keyDate) => (
                          <button className="report-key-date" type="button" key={keyDate.id} onClick={() => setActiveKeyDateId(keyDate.id)} aria-haspopup="dialog">
                            <span>{keyDate.date}</span><strong>{keyDate.title}</strong>{keyDate.category ? <small>{keyDate.category}</small> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {sourceTag ? <p className="report-chapter__source">{sourceTag}</p> : null}
                </div>
              </section>
            );
          })}
        </div>

        {report.keyDates?.length ? (
          <section className="report-key-dates" data-report-block="key-dates" aria-labelledby="report-key-dates-title">
            <p className="report-label">Timeline</p>
            <h2 id="report-key-dates-title">Key dates</h2>
            <div className="report-key-dates__list">
              {report.keyDates.map((keyDate) => (
                <button
                  className="report-key-date"
                  type="button"
                  key={keyDate.id}
                  onClick={() => setActiveKeyDateId(keyDate.id)}
                  aria-haspopup="dialog"
                >
                  <span>{keyDate.date}</span>
                  <strong>{keyDate.title}</strong>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <footer className="report-colophon" data-report-block="colophon" aria-labelledby="report-colophon-title">
          <p className="report-label" id="report-colophon-title">Colophon</p>
          <dl>
            {legacyColophonEntries.map((entry) => (
              <div key={`${entry.label}-${entry.value}`}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
          {publicColophonLines.map((line, index) => <p key={`${index}-${line}`}><em>{line}</em></p>)}
        </footer>
      </article>

      {activeKeyDate ? (
        <ReportKeyDateSheet keyDate={activeKeyDate} onClose={() => setActiveKeyDateId(null)} />
      ) : null}
    </main>
  );
}
