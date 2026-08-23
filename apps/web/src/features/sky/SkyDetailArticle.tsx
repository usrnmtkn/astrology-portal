import { ChevronLeft } from "lucide-react";
import { Fragment, isValidElement, useLayoutEffect, type ReactNode } from "react";
import type { ContentBundle } from "../../content/types";
import { AspectGlyphs } from "../../components/charts/PlacementRows";
import {
  pointGlyph,
  signGlyph,
  zodiacAssetHref,
  zodiacSignIconFiles
} from "../../components/charts/chartAssets";
import { isReaderFacingCopy, readerFacingParagraphs } from "../../content/readerSafety";
import type { GeneratedContentDrilldown } from "../../services/generatedContent";
import { zodiacSignGlyphs, zodiacSigns } from "../../services/chartMath";
import { dedupeArticleSectionHeadings } from "../../utils/articleHeadings";
import {
  articleAspectGlyphPartsFromHeading,
  articleAspectTypeFromText,
  normalizedArticleAspectToneBucket
} from "../../utils/articleAspects";
import {
  cleanGeneratedSectionBody,
  cleanGeneratedSectionHeading,
  comparableText,
  escapeRegExpLiteral,
  isLegacySkyArticleScaffoldHeading,
  stripLegacySkyArticleScaffoldPrefix,
  stripTldrPrefix
} from "../../utils/articleText";

export type AspectToneBucket = "gifts" | "lessons";
export type RelatedAspectGroup = AspectToneBucket | "planets" | "points";

export type SkyDetailRelatedAspectRow = {
  key: string;
  aspectType?: string;
  group?: RelatedAspectGroup;
  node: ReactNode;
};

export type SkyDetailSection = {
  heading: string;
  body: ReactNode;
  sourceTag?: string;
  sourceKeys?: string[];
  role?: "main" | "aspect";
  aspectType?: string;
  group?: AspectToneBucket;
};

export type SkyDetailKeyDate = {
  date: string;
  label: string;
};

export type SkyHistoricalLookback = {
  heading: string;
  dateLabel: string;
  paragraphs: string[];
};

export type SkyPersonalizedPlacement = {
  body: string;
  contentKey: string;
  heading: "Where it lands for you";
  natalAspects: Array<{
    key: string;
    heading: string;
    body: string | null;
  }>;
};

export type SkyDetail = {
  routePath?: string;
  glyph: string;
  kicker: string;
  title: string;
  meta: string;
  duration?: string;
  tagline?: string;
  keyDates?: SkyDetailKeyDate[];
  keyDatesIntro?: string | null;
  closingCharge?: string | null;
  risingHoroscopes?: { risingSign?: string | null; house?: number; body: string; contentKey?: string }[];
  articleAspectPassages?: { natalPoint: string; aspect: string; body: string; contentKey: string }[];
  subtitle?: string;
  tldr?: string;
  suppressTldr?: boolean;
  lensHint?: ReactNode;
  compactHeader?: boolean;
  plainBody?: boolean;
  bodyBeforeSections?: boolean;
  retrograde?: boolean;
  body: ReactNode[];
  sections?: SkyDetailSection[];
  relatedAspects?: {
    heading: string;
    grouping?: "tone" | "counterpart";
    rows: Array<ReactNode | SkyDetailRelatedAspectRow>;
  };
  personalizedPlacement?: SkyPersonalizedPlacement | null;
  historicalLookback?: SkyHistoricalLookback | null;
  astrologyDrilldown?: GeneratedContentDrilldown | null;
  seriesLine?: string | null;
  mechanicsCaption?: string | null;
  content?: ContentBundle;
};

function inferredSectionQaSourceTag(section: { body?: ReactNode; sourceTag?: string }) {
  const sourceTag = typeof section.sourceTag === "string" ? section.sourceTag.trim() : "";

  if (sourceTag) {
    return sourceTag;
  }

  if (typeof section.body !== "string") {
    return "";
  }

  const trimmedBody = section.body.trim();

  if (/^\[(?:AUTHORED|FALLBACK)\s*·/u.test(trimmedBody)) {
    return "";
  }

  return "";
}

function detailMetaRows(meta: string) {
  const parts = meta.split("·").map((part) => part.trim()).filter(Boolean);

  if (parts.length === 0) {
    return [{ label: "Context", value: "Field guide" }];
  }

  return parts.map((part, index) => {
    const lower = part.toLowerCase();
    const label = lower.includes("orb")
      ? "Orb"
      : lower.includes("house")
        ? "House"
        : lower.includes("chapter")
          ? "Chapter"
      : lower === "today" || lower.includes("about ") || lower.includes("until ") || lower.includes("near exact")
        ? "Duration"
        : index === 0
          ? "Signature"
          : "Duration";

    return { label, value: part };
  });
}

type ArticleEyebrowGlyph = {
  key: string;
  label: string;
  text?: string;
  href?: string | null;
  house?: boolean;
};

function articleTitleSignGlyph(title: string, meta = "") {
  const source = `${title} ${meta}`;
  const sign = zodiacSigns.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(source));

  return sign ? zodiacSignGlyphs[sign] ?? "" : "";
}

function textArticleGlyph(text: string, label = text): ArticleEyebrowGlyph | null {
  return text ? { key: `text-${label}-${text}`, label, text } : null;
}

function signArticleGlyph(sign: string): ArticleEyebrowGlyph | null {
  const normalizedSign = zodiacSigns.find((candidate) => candidate.toLowerCase() === sign.toLowerCase());

  if (!normalizedSign) {
    return null;
  }

  return {
    key: `sign-${normalizedSign}`,
    label: normalizedSign,
    text: signGlyph(normalizedSign),
    href: zodiacAssetHref(zodiacSignIconFiles[normalizedSign])
  };
}

function uniqueArticleGlyphs(glyphs: Array<ArticleEyebrowGlyph | null>) {
  const seen = new Set<string>();

  return glyphs.filter((glyph): glyph is ArticleEyebrowGlyph => {
    if (!glyph || seen.has(glyph.key)) {
      return false;
    }

    seen.add(glyph.key);
    return true;
  });
}

function articleTitleHouseToken(title: string, meta = "") {
  const match = `${title} ${meta}`.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i);

  return match ? `${match[1]}H` : "";
}

function articleHouseToken(house: string | number) {
  const parsedHouse = typeof house === "number" ? house : Number.parseInt(house, 10);

  return Number.isFinite(parsedHouse) && parsedHouse >= 1 && parsedHouse <= 12 ? `${parsedHouse}H` : "";
}

function articlePlacementGlyphs(title: string, meta = "") {
  const source = `${title} ${meta}`;
  const match = source.match(
    /^(\w[\w\s]*?)(\s+Rx)?\s+in\s+(\w+)(?:\s+in\s+the\s+(\d+)(?:st|nd|rd|th)\s+house)?/i
  );

  if (!match) {
    return [];
  }

  const [, body, retrograde, sign, house] = match;
  return uniqueArticleGlyphs([
    textArticleGlyph(pointGlyph(body.trim()), body.trim()),
    retrograde ? textArticleGlyph("℞", "Retrograde") : null,
    signArticleGlyph(sign.trim()),
    house ? { key: `house-${house}`, label: `${house} house`, text: articleHouseToken(house), house: true } : null
  ]);
}

function articleEyebrowLabel(title: string, kicker?: string) {
  if (/\b(?:rx|retrograde)\b/i.test(title)) {
    return "Retrograde";
  }

  if (/\b(conjunction|opposition|square|trine|sextile|quincunx|aspect)\b/i.test(title)) {
    return "Aspect";
  }

  if (articleTitleSignGlyph(title)) {
    return "Placement";
  }

  return kicker?.trim() || "Article";
}

function articleEyebrowGlyphs({
  glyph,
  meta,
  title
}: {
  glyph?: string;
  meta?: string;
  title: string;
}) {
  const placementGlyphs = articlePlacementGlyphs(title, meta);

  if (placementGlyphs.length > 0) {
    return placementGlyphs;
  }

  const sign = zodiacSigns.find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(`${title} ${meta}`));

  return uniqueArticleGlyphs([
    ...(glyph ? glyph.split(/\s+/).filter(Boolean).map((part) => textArticleGlyph(part)) : []),
    sign ? signArticleGlyph(sign) : null,
    articleTitleHouseToken(title, meta)
      ? { key: `house-${articleTitleHouseToken(title, meta)}`, label: articleTitleHouseToken(title, meta), text: articleTitleHouseToken(title, meta), house: true }
      : null
  ]);
}

function stripArticleTitlePrefix(value: string, title: string) {
  const cleaned = stripTldrPrefix(value)
    .replace(/\s+/g, " ")
    .trim();
  const normalizedTitle = title.replace(/\s+/g, " ").trim();

  if (!cleaned || !normalizedTitle) {
    return cleaned;
  }

  return cleaned
    .replace(new RegExp(`^${escapeRegExpLiteral(normalizedTitle)}\\s*[:\\-–—]?\\s*`, "i"), "")
    .trim();
}

function articleTldrText(value: string, title = "") {
  return stripArticleTitlePrefix(value, title);
}

function isArticleTldrBodyDuplicate(tldr: string, bodyCopies: Set<string>) {
  const normalizedTldr = comparableText(tldr).replace(/\b\.\.\.$/u, "").trim();

  if (!normalizedTldr) {
    return true;
  }

  return Array.from(bodyCopies).some((body) => (
    body === normalizedTldr
    || body.startsWith(normalizedTldr)
    || normalizedTldr.startsWith(body)
  ));
}

function isTimingOnlyArticleSection(section: { heading: string; body: ReactNode }) {
  const bodyText = typeof section.body === "string" ? section.body.trim() : "";

  return /^(pre-shadow|retrograde|post-shadow):/i.test(bodyText);
}

function isSuppressedSkyDetailSectionHeading(heading: string) {
  const normalized = heading.trim().toLowerCase();

  return normalized === "logic" || normalized === "large scale" || normalized === "large-scale";
}

function isRetrogradeTimelineNode(node: ReactNode) {
  if (!isValidElement<{ className?: string }>(node)) {
    return false;
  }

  return typeof node.props.className === "string" && node.props.className.includes("retrograde-detail-line");
}

function normalizedAspectToneBucket(aspectType?: string): AspectToneBucket {
  return normalizedArticleAspectToneBucket(aspectType);
}

function normalizeRelatedAspectRow(row: ReactNode | SkyDetailRelatedAspectRow, index: number): SkyDetailRelatedAspectRow {
  if (
    row
    && typeof row === "object"
    && "node" in row
    && !isValidElement(row)
  ) {
    const relatedRow = row as SkyDetailRelatedAspectRow;
    return {
      ...relatedRow,
      key: relatedRow.key || `related-aspect-${index}`,
      group: relatedRow.group ?? normalizedAspectToneBucket(relatedRow.aspectType)
    };
  }

  return {
    key: `related-aspect-${index}`,
    aspectType: "",
    group: "lessons",
    node: row
  };
}

const skyPlacementDateLinePattern = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s+\d{4})?\s+(?:to|through|[-–])\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}$/iu;

function skyPlacementDateLine(value: ReactNode) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/gu, " ").trim();
  return skyPlacementDateLinePattern.test(normalized) ? normalized : null;
}

export function SkyDetailArticle({
  detail,
  onClose
}: {
  detail: SkyDetail;
  onClose: () => void;
}) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [detail.title, detail.meta]);

  const metaRows = detailMetaRows(detail.meta);
  const articleBody = detail.body.filter((node) => (
    !isRetrogradeTimelineNode(node) && (typeof node !== "string" || isReaderFacingCopy(node))
  ));
  const paragraphs = articleBody;
  const rawGeneratedSections = (detail.sections ?? []).filter(
    (section) => !isTimingOnlyArticleSection(section) && !isSuppressedSkyDetailSectionHeading(section.heading)
  ).map((section) => ({
    ...section,
    heading: cleanGeneratedSectionHeading(section.heading)
  })).map((section) => ({
    ...section,
    heading: isLegacySkyArticleScaffoldHeading(section.heading) ? "" : section.heading,
    body: typeof section.body === "string" ? cleanGeneratedSectionBody(section.body) : section.body
  })).filter((section) => typeof section.body !== "string" || isReaderFacingCopy(section.body));
  const generatedSections = dedupeArticleSectionHeadings(rawGeneratedSections, detail.title);
  const contentSections = generatedSections.filter((section) => section.role !== "aspect");
  const aspectSections = generatedSections
    .filter((section) => section.role === "aspect")
    .map((section, index) => ({
      ...section,
      key: `${section.heading || "aspect"}-${index}`,
      aspectType: section.aspectType || articleAspectTypeFromText(`${section.heading} ${typeof section.body === "string" ? section.body : ""}`),
      group: section.group ?? normalizedAspectToneBucket(section.aspectType || articleAspectTypeFromText(section.heading))
    }));
  const drilldown = detail.astrologyDrilldown;
  const authoredTldr = detail.tldr ? stripArticleTitlePrefix(detail.tldr, detail.title) : "";
  const articleBodyComparableCopies = new Set(
    [
      ...paragraphs.filter((paragraph): paragraph is string => typeof paragraph === "string"),
      ...generatedSections.flatMap((section) => (
        typeof section.body === "string"
          ? section.body.split(/\n{2,}/)
          : []
      ))
    ]
      .map((paragraph) => comparableText(stripTldrPrefix(stripLegacySkyArticleScaffoldPrefix(paragraph))))
      .filter(Boolean)
  );
  // TLDR is an explicit authored slot; subtitle and body are never substitutes.
  const articleSubCandidate = detail.suppressTldr ? "" : articleTldrText(authoredTldr, detail.title);
  const articleSub = isReaderFacingCopy(articleSubCandidate) && !isArticleTldrBodyDuplicate(articleSubCandidate, articleBodyComparableCopies)
    ? articleSubCandidate
    : "";
  const articleSubComparable = comparableText(articleSub);
  const rawDisplaySections = contentSections.filter((section, index) => {
    if (index !== 0 || !articleSubComparable || typeof section.body !== "string") {
      return true;
    }

    return comparableText(stripLegacySkyArticleScaffoldPrefix(section.body)) !== articleSubComparable;
  });
  const firstDisplaySectionParagraphs = typeof rawDisplaySections[0]?.body === "string"
    ? rawDisplaySections[0].body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
  const leadingSectionDate = skyPlacementDateLine(firstDisplaySectionParagraphs[0]);
  const displaySections = leadingSectionDate
    ? rawDisplaySections.map((section, index) => (
        index === 0
          ? { ...section, body: firstDisplaySectionParagraphs.slice(1).join("\n\n") }
          : section
      )).filter((section) => typeof section.body !== "string" || section.body.trim())
    : rawDisplaySections;
  const rawFallbackParagraphs = paragraphs.filter((paragraph) => (
    typeof paragraph !== "string" || comparableText(stripTldrPrefix(paragraph)) !== articleSubComparable
  ));
  const leadingPlacementDate = skyPlacementDateLine(rawFallbackParagraphs[0]);
  const fallbackParagraphs = leadingPlacementDate
    ? rawFallbackParagraphs.slice(1)
    : rawFallbackParagraphs;
  const headerDate = leadingSectionDate ?? leadingPlacementDate ?? detail.duration;
  const [bodyLede, ...bodySectionParagraphs] = fallbackParagraphs;
  const eyebrowLabel = articleEyebrowLabel(detail.title, detail.kicker);
  const eyebrowGlyphs = articleEyebrowGlyphs({
    glyph: detail.glyph,
    meta: metaRows.map((row) => row.value).join(" "),
    title: detail.title
  });
  const relatedAspectRows = (detail.relatedAspects?.rows ?? []).map(normalizeRelatedAspectRow);
  const relatedAspectGrouping = detail.relatedAspects?.grouping ?? "tone";
  const aspectGroupDefinitions = relatedAspectGrouping === "counterpart"
    ? ([
        { id: "planets" as const, label: "Planetary aspects" },
        { id: "points" as const, label: "Angles and points" }
      ])
    : ([
        { id: "gifts" as const, label: "Gifts" },
        { id: "lessons" as const, label: "Lessons" }
      ]);
  const aspectGroups = aspectGroupDefinitions.map((group) => ({
    ...group,
    sections: relatedAspectGrouping === "tone"
      ? aspectSections.filter((section) => section.group === group.id)
      : [],
    rows: relatedAspectRows.filter((row) => row.group === group.id)
  })).filter((group) => group.sections.length > 0 || group.rows.length > 0);
  const hasAspectCard = aspectGroups.length > 0;
  const hasReadableBody = Boolean(
    detail.lensHint ||
      (detail.plainBody && fallbackParagraphs.length > 0) ||
      displaySections.length > 0 ||
      fallbackParagraphs.length > 0 ||
      detail.mechanicsCaption ||
      drilldown
  );
  const isAspectsOnlyArticle = hasAspectCard && !hasReadableBody;

  return (
    <section
      className={`article-page sky-detail-page${detail.compactHeader ? " you-transit-article-page" : ""}`}
      aria-label={`${detail.title} field guide`}
      aria-labelledby="sky-detail-title"
    >
      <button className="sky-detail-back floating-back-button" type="button" aria-label="Close detail" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>
      <article className={`article-shell sky-detail-article${detail.compactHeader ? " you-transit-article" : ""}`}>
        <div className={`article-card sky-detail-card${isAspectsOnlyArticle ? " sky-detail-card--aspects-only" : ""}`}>
          <header className="article-id sky-detail-id">
            <div className="article-eyebrow" aria-label={eyebrowGlyphs.length ? `${eyebrowLabel}: ${eyebrowGlyphs.map((glyph) => glyph.label).join(" ")}` : eyebrowLabel}>
              <span>{eyebrowLabel}</span>
              {eyebrowGlyphs.length ? (
                <>
                  <span className="article-eyebrow__slash" aria-hidden="true">/</span>
                  <span className="article-eyebrow__glyphs" aria-hidden="true">
                    {eyebrowGlyphs.map((glyph) => (
                      <span className={glyph.house ? "article-eyebrow__house" : glyph.href ? "article-eyebrow__icon" : undefined} key={glyph.key}>
                        {glyph.href ? <img src={glyph.href} alt="" aria-hidden="true" /> : glyph.text}
                      </span>
                    ))}
                  </span>
                </>
              ) : null}
            </div>
            <h1 className="article-title" id="sky-detail-title">{detail.title}</h1>
            {detail.tagline ? (
              <p className="article-sub sky-detail-tagline">{detail.tagline}</p>
            ) : null}
            {headerDate ? (
              <p className="article-duration">{headerDate}</p>
            ) : null}
            {articleSub ? (
              <div className="article-tldr">
                <span className="ui-pill ui-pill--neutral article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{articleSub}</p>
              </div>
            ) : null}
          </header>

          {hasReadableBody ? <hr className="article-rule" /> : null}

          {hasReadableBody ? (
          <div className="article-body-card sky-detail-body">
            <div className="article-body-inner">
              {detail.lensHint ? (
                <aside className="article-lens-hint" aria-label="Placement lens">
                  {typeof detail.lensHint === "string" ? <p>{detail.lensHint}</p> : detail.lensHint}
                </aside>
              ) : null}
              {detail.plainBody && fallbackParagraphs.length > 0 ? (
                <section className="article-section sky-detail-section sky-detail-plain-section">
                  {fallbackParagraphs.map((paragraph, paragraphIndex) => (
                    <p key={`plain-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </section>
              ) : displaySections.length > 0 ? (
                <>
                  {detail.bodyBeforeSections && fallbackParagraphs.length > 0 ? (
                    <section className="article-section sky-detail-section sky-detail-intro-section">
                      {fallbackParagraphs.map((paragraph, paragraphIndex) => (
                        <p key={`intro-${paragraphIndex}`}>{paragraph}</p>
                      ))}
                    </section>
                  ) : null}
                  {displaySections.map((section, index) => {
                    const bodyParagraphs = typeof section.body === "string"
                      ? section.body.split(/\n{2,}/).map((paragraph) => stripLegacySkyArticleScaffoldPrefix(paragraph)).filter(Boolean)
                      : [];
                    const sectionHeading = typeof section.heading === "string" ? section.heading : "";
                    const sourceTag = inferredSectionQaSourceTag(section);
                    const bodyAlreadyStartsWithTag = sourceTag && bodyParagraphs[0]?.trim() === sourceTag;

                    return (
                      <section className="article-section sky-detail-section" key={`${section.heading || "section"}-${index}`}>
                        {sectionHeading ? <h2>{sectionHeading}</h2> : null}
                        {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}
                        {bodyParagraphs.length > 0
                          ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                            <p key={`${section.heading || "section"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                          ))
                          : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}
                      </section>
                    );
                  })}
                </>
              ) : (
                <>
                  {bodyLede ? (
                    <section className="article-section sky-detail-section">
                      <p className="sky-detail-lede">{bodyLede}</p>
                    </section>
                  ) : null}
                  {bodySectionParagraphs.length > 0 ? (
                    <section className="article-section sky-detail-section">
                      {bodySectionParagraphs.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </section>
                  ) : null}
                </>
              )}
              {detail.keyDates?.length ? (
                <section className="article-section sky-detail-section sky-placement-key-dates" aria-labelledby="sky-detail-key-dates-title">
                  <h2 id="sky-detail-key-dates-title">Key dates</h2>
                  {detail.keyDatesIntro ? <p>{detail.keyDatesIntro}</p> : null}
                  <dl>
                    {detail.keyDates.map((keyDate) => (
                      <div key={`${keyDate.date}-${keyDate.label}`}>
                        <dt>{keyDate.date}</dt>
                        {keyDate.label ? <dd>{keyDate.label}</dd> : null}
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              {detail.closingCharge ? (
                <section className="article-section sky-detail-section sky-placement-closing-charge">
                  <p>{detail.closingCharge}</p>
                </section>
              ) : null}
              {detail.risingHoroscopes?.length ? (
                <section
                  className="article-section sky-detail-section"
                  id="sky-rising-horoscopes"
                  aria-labelledby="sky-rising-horoscopes-title"
                >
                  <h2 id="sky-rising-horoscopes-title">Horoscopes by rising sign</h2>
                  {detail.risingHoroscopes.map((entry) => (
                    <div key={entry.risingSign}>
                      <h3 className="sky-rising-horoscope__title">
                        {entry.risingSign} &amp; {entry.risingSign} Rising
                      </h3>
                      {readerFacingParagraphs([entry.body]).map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  ))}
                </section>
              ) : null}
              {detail.seriesLine ? (
                <aside className="article-section sky-detail-section sky-aspect-series" aria-label="Aspect series">
                  <p>{detail.seriesLine}</p>
                </aside>
              ) : null}
              {detail.mechanicsCaption ? (
                <aside className="article-section sky-detail-section sky-aspect-mechanics" aria-labelledby="sky-aspect-mechanics-title">
                  <h2 id="sky-aspect-mechanics-title">What this looks like in space</h2>
                  <p>{detail.mechanicsCaption}</p>
                </aside>
              ) : null}
              {drilldown ? (
                <details className="sky-detail-drilldown">
                  <summary>{drilldown.title || "Why this?"}</summary>
                  <div className="sky-detail-drilldown-body">
                    {drilldown.summary ? <p>{drilldown.summary}</p> : null}
                    {drilldown.factors.length > 0 ? (
                      <dl>
                        {drilldown.factors.map((factor) => (
                          <div key={`${factor.label}-${factor.technicalFact}`}>
                            <dt>{factor.label}</dt>
                            <dd>
                              <strong>{factor.technicalFact}</strong>
                              <span>{factor.plainMeaning}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {drilldown.whyThisScene ? <p>{drilldown.whyThisScene}</p> : null}
                    {drilldown.timingNote ? <p>{drilldown.timingNote}</p> : null}
                  </div>
                </details>
              ) : null}
              {detail.historicalLookback ? (
                <section className="article-section sky-detail-section sky-detail-historical-lookback" aria-labelledby="sky-detail-historical-title">
                  <h2 id="sky-detail-historical-title">{detail.historicalLookback.heading}</h2>
                  <p className="sky-detail-historical-lookback__date">{detail.historicalLookback.dateLabel}</p>
                  {detail.historicalLookback.paragraphs.map((paragraph, index) => (
                    <p key={`historical-${index}`}>{paragraph}</p>
                  ))}
                </section>
              ) : null}
              <div className="sky-detail-end" aria-hidden="true">✦</div>
            </div>
          </div>
          ) : null}
        </div>

        {hasAspectCard ? (
          <h2 className="sr-only" id="sky-detail-related-aspects-title">
            {detail.relatedAspects?.heading ?? "Aspects to the planet"}
          </h2>
        ) : null}

        {hasAspectCard ? aspectGroups.map((group) => (
          <Fragment key={group.id}>
            <h3
              className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside"
              id={`sky-detail-related-aspects-${group.id}`}
            >
              {group.label}
            </h3>
            <section
              className="article-card article-related-aspects article-related-aspects-card"
              aria-labelledby={`sky-detail-related-aspects-${group.id}`}
            >
              <div className="article-related-aspects__group">
                {group.sections.length ? (
                  <div className="article-related-aspects__copy-list">
                    {group.sections.map((section) => {
                      const bodyParagraphs = typeof section.body === "string"
                        ? section.body.split(/\n{2,}/).map((paragraph) => stripLegacySkyArticleScaffoldPrefix(paragraph)).filter(Boolean)
                        : [];
                      const sectionHeading = typeof section.heading === "string" ? section.heading : "";
                      const glyphParts = sectionHeading ? articleAspectGlyphPartsFromHeading(sectionHeading) : null;
                      const sourceTag = inferredSectionQaSourceTag(section);
                      const bodyAlreadyStartsWithTag = sourceTag && bodyParagraphs[0]?.trim() === sourceTag;

                      return (
                        <section className="article-section sky-detail-section article-related-aspects__copy" key={section.key}>
                          {sectionHeading ? (
                            <div className="article-related-aspects__copy-heading">
                              {glyphParts ? <AspectGlyphs from={glyphParts.from} aspect={glyphParts.aspect} to={glyphParts.to} /> : null}
                              <h4>{sectionHeading}</h4>
                            </div>
                          ) : null}
                          {sourceTag && !bodyAlreadyStartsWithTag ? <p>{sourceTag}</p> : null}
                          {bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                              <p key={`${section.key}-${paragraphIndex}`}>{paragraph}</p>
                            ))
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}
                        </section>
                      );
                    })}
                  </div>
                ) : null}
                {group.rows.length ? (
                  <div className="article-related-aspects__list aspect-row-list">
                    {group.rows.map((row) => (
                      <Fragment key={row.key}>{row.node}</Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          </Fragment>
        )) : null}

        {detail.personalizedPlacement ? (
          <>
            <h2
              className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside"
              id="sky-detail-personalized-placement-title"
            >
              {detail.personalizedPlacement.heading}
            </h2>
            <section
              className="article-card sky-detail-personalized-placement"
              id="sky-personalized-placement"
              aria-labelledby="sky-detail-personalized-placement-title"
            >
              <div className="article-body-card sky-detail-body">
                <div className="article-body-inner">
                  <section className="article-section sky-detail-section">
                    <p>{detail.personalizedPlacement.body}</p>
                    {detail.personalizedPlacement.natalAspects.length > 0 ? (
                      <>
                        <h3>Aspects to the natal chart</h3>
                        {detail.personalizedPlacement.natalAspects.map((aspect) => (
                          <section className="sky-detail-personalized-aspect" key={aspect.key}>
                            <h4>{aspect.heading}</h4>
                            {aspect.body ? <p>{aspect.body}</p> : null}
                          </section>
                        ))}
                      </>
                    ) : null}
                  </section>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </article>
    </section>
  );
}
