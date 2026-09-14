import React, { Fragment, type ReactNode } from "react";
import type { LocationInput, SkySnapshot } from "../../types";
import type { SkyDetail } from "../sky/SkyDetailArticle";
import type { SkyPlacementContentStatus } from "../sky/skyPlacementContentState";
import { fullDetailReaderFacingParagraphs, isReaderFacingCopy } from "../../content/readerSafety";
import { dedupeArticleSectionHeadings } from "../../utils/articleHeadings";
import { cleanGeneratedSectionBody, cleanGeneratedSectionHeading, isLegacySkyArticleScaffoldHeading } from "../../utils/articleText";

/** Reject an old date/location while the shared Sky calculation is in flight. */
export function calendarSkyForDay(sky: SkySnapshot | null, dateKey: string, location: LocationInput): SkySnapshot | null {
  if (!sky || sky.location.latitude !== location.latitude || sky.location.longitude !== location.longitude
    || sky.location.timeZone !== location.timeZone || !Number.isFinite(Date.parse(sky.generatedAt))) return null;
  const actualDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: location.timeZone || "UTC", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(sky.generatedAt));
  return actualDate === dateKey ? sky : null;
}

function paragraphs(body: ReactNode): ReactNode[] {
  // Use the same reader boundary as the full Sky article, never a card excerpt.
  return typeof body === "string" ? fullDetailReaderFacingParagraphs([cleanGeneratedSectionBody(body)]) : body == null ? [] : [body];
}

export function CalendarDayReading({ dateKey, overview, moonSign, article, skyError, contentStatus }: {
  dateKey: string;
  overview: ReactNode;
  moonSign?: string;
  article: SkyDetail | null;
  skyError: boolean;
  contentStatus: SkyPlacementContentStatus;
}) {
  const sections = dedupeArticleSectionHeadings((article?.sections ?? [])
    .filter((section) => section.role !== "aspect")
    .map((section) => ({ ...section, heading: isLegacySkyArticleScaffoldHeading(section.heading) ? "" : cleanGeneratedSectionHeading(section.heading) }))
    .filter((section) => typeof section.body !== "string" || isReaderFacingCopy(section.body)), article?.title ?? "");
  const body = sections.length && !article?.bodyBeforeSections ? [] : (article?.body ?? []).flatMap(paragraphs);
  const hasCopy = body.length > 0 || sections.some((section) => paragraphs(section.body).length > 0);
  const loading = !skyError && (!overview || contentStatus === "loading" || contentStatus === "idle");
  return <>
    <section className="lunar-selected-card__body-section calendar-day-reading__overview" aria-labelledby="calendar-day-overview-heading" data-calendar-reading-date={dateKey}>
      <h3 id="calendar-day-overview-heading">Day overview</h3>
      {overview ?? <p role="status">{skyError ? "Day overview could not be loaded." : "Loading day overview…"}</p>}
    </section>
    <section className="lunar-selected-card__body-section calendar-day-reading__moon" aria-labelledby="calendar-day-moon-heading" data-moon-sign={moonSign}>
      <h3 id="calendar-day-moon-heading">{moonSign ? `Moon in ${moonSign}` : "Moon in sign"}</h3>
      {hasCopy ? <div className="calendar-day-reading__prose">
        {body.map((paragraph, index) => <p key={`body-${index}`}>{paragraph}</p>)}
        {sections.map((section, index) => <Fragment key={`section-${index}`}>
          {section.heading && <h4>{section.heading}</h4>}
          {paragraphs(section.body).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
        </Fragment>)}
        {article?.closingCharge && isReaderFacingCopy(article.closingCharge) && <p>{article.closingCharge}</p>}
      </div> : <p role="status">{loading ? "Loading Moon writing…" : "Moon writing is unavailable for this date."}</p>}
    </section>
  </>;
}
