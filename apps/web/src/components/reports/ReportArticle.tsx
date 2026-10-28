import { PreparedProse as FormattedProse } from "../FormattedWritingContent";
import { useMemo, useState } from "react";
import {
  fullDetailReaderFacingParagraphs,
  isReaderFacingCopy
} from "../../content/readerSafety";
import { dedupeArticleSectionHeadings } from "../../utils/articleHeadings";
import { ModalDialog } from "../ModalDialog";
import { ReportBack } from "./ReportStateCard";
import { AttributionLine } from "./AttributionLine";
import type { AttributionFacts } from "./attributionFormat";

export type ReportCover = {
  kicker: string;
  title: string;
  subtitle?: string;
  meta?: string[];
};

export type ReportChapter = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: string[];
  attribution?: AttributionFacts;
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
  paragraphs: string[];
  attribution?: AttributionFacts;
};

export type ReportColophon = {
  factsEngine: string;
  generatedAt?: string;
  entries?: Array<{ label: string; value: string }>;
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
  onClose,
  position
}: {
  keyDate: ReportKeyDate;
  position: string;
  onClose: () => void;
}) {
  const titleId = `report-key-date-${keyDate.id}`;

  return (
    <ModalDialog
      rootClassName="report-key-date-modal"
      onClose={onClose}
      className="report-key-date-sheet"
      titleId={titleId}
      title={keyDate.title}
      closeLabel="Close key date"
    >
        <p className="modal-dialog__meta">Key date · {position}</p>
        <p className="modal-dialog__meta">{keyDate.date}</p>
        {fullDetailReaderFacingParagraphs(keyDate.paragraphs).map((paragraph, index) => (
          <FormattedProse key={`${keyDate.id}-paragraph-${index}`} text={paragraph} />
        ))}
        {keyDate.attribution ? <AttributionLine facts={keyDate.attribution} /> : null}
    </ModalDialog>
  );
}

export function ReportArticle({ report, backHref = "/reports/" }: { report: ReportDocument; backHref?: string }) {
  const [activeKeyDateId, setActiveKeyDateId] = useState<string | null>(null);
  const chapters = useMemo(() => dedupeArticleSectionHeadings(
    report.chapters.map((chapter) => ({ ...chapter, heading: chapter.title })),
    report.cover.title
  ), [report.chapters, report.cover.title]);
  const activeKeyDate = report.keyDates?.find((keyDate) => keyDate.id === activeKeyDateId) ?? null;
  const subtitle = readable(report.cover.subtitle);
  const colophonEntries = [
    { label: "Facts engine", value: report.colophon.factsEngine },
    ...(report.colophon.generatedAt ? [{ label: "Generated", value: report.colophon.generatedAt }] : []),
    ...(report.colophon.entries ?? [])
  ].filter((entry) => entry.label.toLowerCase() !== "facts hash" && readable(entry.label) && readable(entry.value));

  return (
    <main className="report-article-page" data-report-id={report.id} data-report-type={report.reportType}>
      <ReportBack href={backHref}/>

      <article className="report-article" aria-labelledby="report-cover-title">
        <header className="report-cover" data-report-block="cover">
          <p className="report-label">{report.cover.kicker}</p>
          <h1 id="report-cover-title">{report.cover.title}</h1>
          {subtitle ? <p className="report-cover__subtitle">{subtitle}</p> : null}
          {report.cover.meta?.length ? (
            <ul className="report-cover__meta" aria-label="Report details">
              {report.cover.meta.filter(isReaderFacingCopy).map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </header>

        <div className="report-chapters" data-report-block="chapters">
          {chapters.map((chapter) => {
            const paragraphs = fullDetailReaderFacingParagraphs(chapter.paragraphs);
            const sourceTag = readable(chapter.sourceTag);
            const headingId = `report-chapter-${chapter.id}`;

            return (
              <section
                className="report-chapter"
                key={chapter.id}
                aria-label={chapter.heading ? undefined : chapter.kicker}
                aria-labelledby={chapter.heading ? headingId : undefined}
              >
                {chapter.image?.src && <ReportImageSlot chapter={chapter} />}
                <div className="report-chapter__copy">
                  <p className="report-label">{chapter.kicker}</p>
                  {chapter.heading ? <h2 id={headingId}>{chapter.heading}</h2> : null}
                  {paragraphs.map((paragraph, paragraphIndex) => (
                    <FormattedProse key={`${chapter.id}-paragraph-${paragraphIndex}`} text={paragraph} />
                  ))}
                  {chapter.attribution ? <AttributionLine facts={chapter.attribution} /> : null}
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
            {colophonEntries.map((entry) => (
              <div key={`${entry.label}-${entry.value}`}>
                <dt>{entry.label}</dt>
                <dd>{entry.value}</dd>
              </div>
            ))}
          </dl>
        </footer>
      </article>

      {activeKeyDate ? (
        <ReportKeyDateSheet keyDate={activeKeyDate} position={`${(report.keyDates?.findIndex(date => date.id === activeKeyDate.id) ?? 0) + 1} of ${report.keyDates?.length}`} onClose={() => setActiveKeyDateId(null)} />
      ) : null}
    </main>
  );
}
