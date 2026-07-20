import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, MoreVertical, Pencil, Sparkles } from "lucide-react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SegmentedControl } from "../../components/SegmentedControl";
import { CareerArchetypeCard } from "../../components/charts/CareerArchetypeCard";
import { NatalChartDataTable, type NatalChartDataTableRow } from "../../components/charts/NatalChartDataTable";
import { SoulRoadmapCard } from "../../components/charts/SoulRoadmapCard";
import type { CareerArchetypeProfile } from "../../services/careerArchetype";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";
import { emergencyDetailFallbackCopy } from "../../content/emergencyCopy";
import { isReaderFacingCopy } from "../../content/readerSafety";
import { NatalAspectPatternActivationsSection, NatalAspectPatternsSection, type NatalAspectPatternsSectionStatus } from "./NatalAspectPatternsSection";

type YouTab = "transits" | "chart";
type NatalChartViewMode = "circle" | "table";

export type PersonalTimingSummary = {
  headline: string;
  summary: string;
  secondary?: string;
  writeup?: Array<{
    heading?: string;
    body: string[];
  }>;
  keyFactors: string[];
  status: "idle" | "loading" | "ready" | "error";
};

export type YouTransitArticle = {
  id: string;
  title: string;
  glyph?: string;
  subtitle: string;
  lensHint?: ReactNode;
  compactHeader?: boolean;
  plainBody?: boolean;
  bodyBeforeSections?: boolean;
  body?: ReactNode[];
  summary: string;
  summaryHeading?: string;
  sections: Array<{
    heading: string;
    tldr: string;
    body: string;
  }>;
  relatedAspects?: {
    heading: string;
    rows: ReactNode[];
  };
  meta: Array<{
    label: string;
    value: string;
  }>;
};

export type YouPageProps = {
  aspectRows: ReactNode[];
  bigThreeRows: ReactNode[];
  careerArchetypeProfile?: CareerArchetypeProfile | null;
  dailyUpdateSummary?: PersonalTimingSummary | null;
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  emptyHouseRows: ReactNode[];
  hasSavedBirthDetails: boolean;
  hasSavedCurrentCity: boolean;
  natalChart: ReactNode;
  natalChartPending: boolean;
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternTimingOverrides?: Record<string, NatalAspectPatternActivationTimingWindow>;
  natalAspectPatternStatus?: NatalAspectPatternsSectionStatus;
  updatesChart?: ReactNode;
  natalAspectRows: ReactNode[];
  natalTableRows: NatalChartDataTableRow[];
  onCreateChart: () => void;
  onCloseTransitArticle?: () => void;
  onOpenCareerDetail?: () => void;
  onOpenSoulRoadmapDetail?: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  planetRows: ReactNode[];
  profileAvatarUrl?: string;
  profileEmail: string;
  profileName: string;
  setupStepsLeft: number;
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
  signaturesReady: boolean;
  standaloneTransitRows?: ReactNode[];
  unknownBirthTime: boolean;
  transitArticle?: YouTransitArticle | null;
};

function YouEmptyState({
  onCreateChart,
  setupStepsLeft
}: {
  onCreateChart: () => void;
  setupStepsLeft: number;
}) {
  return (
    <section className="you-empty-state" aria-label="Create your chart">
      <h1>Create your chart.</h1>
      <p>
        Add your birth details to see your natal placements and what today's sky may be bringing up.
      </p>
      <button type="button" className="you-empty-cta" onClick={onCreateChart}>
        <span className="you-empty-cta-icon" aria-hidden="true">
          <Sparkles size={22} />
        </span>
        <span className="you-empty-cta-copy">
          <strong>Create your chart</strong>
          <em>{setupStepsLeft} steps left</em>
        </span>
      </button>
      <div className="you-empty-features" aria-label="Chart unlocks">
        <span>☉ Placements</span>
        <span>△ Aspects</span>
        <span>↗ Daily transits</span>
      </div>
    </section>
  );
}

function YouProfileSummary({
  displayMoon,
  displayRising,
  displaySun,
  onEditProfile,
  profileAvatarUrl,
  profileEmail,
  profileName,
  signaturesReady
}: {
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  onEditProfile: () => void;
  profileAvatarUrl?: string;
  profileEmail: string;
  profileName: string;
  signaturesReady: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && menuRef.current?.contains(target)) {
        return;
      }

      setMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="you-profile-card" aria-label="Profile summary">
      <ProfileAvatar
        avatarUrl={profileAvatarUrl}
        className="you-profile-monogram"
        email={profileEmail}
        name={profileName}
        size="large"
      />
      <div className="you-profile-copy">
        <h1>{profileName}</h1>
        {signaturesReady ? (
          <div className="you-signature-row" aria-label="Big three">
            <span><span aria-hidden="true">☉</span>{displaySun}</span>
            <span><span aria-hidden="true">☽</span>{displayMoon}</span>
            <span><span aria-hidden="true">↑</span>{displayRising}</span>
          </div>
        ) : (
          <p className="you-profile-status">Calculating chart signatures...</p>
        )}
      </div>
      <div className="you-profile-actions" ref={menuRef}>
        <button
          className="manual-chart-menu-trigger you-profile-menu-trigger"
          type="button"
          aria-label="Profile options"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MoreVertical size={22} aria-hidden="true" />
        </button>
        {menuOpen ? (
          <span className="manual-chart-overflow-menu you-profile-overflow-menu" role="menu" aria-label="Profile options">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onEditProfile();
              }}
            >
              <Pencil size={17} aria-hidden="true" />
              <span>Edit details</span>
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function YouNatalChartPanel({
  ariaLabel = "Natal chart",
  natalChart,
  natalChartPending,
  onViewModeChange,
  tableContent,
  viewMode
}: {
  ariaLabel?: string;
  natalChart: ReactNode;
  natalChartPending: boolean;
  onViewModeChange?: (value: NatalChartViewMode) => void;
  tableContent?: ReactNode;
  viewMode?: NatalChartViewMode;
}) {
  const showViewToggle = Boolean(onViewModeChange && tableContent);

  return (
    <aside className="chart-layout__visual" aria-label={ariaLabel}>
      {showViewToggle && viewMode ? (
        <SegmentedControl
          value={viewMode}
          options={[
            { value: "circle", label: "Circle" },
            { value: "table", label: "Table" }
          ]}
          onChange={(value) => onViewModeChange?.(value)}
          ariaLabel="Natal chart display"
          className="natal-chart-view-toggle"
          compact
        />
      ) : null}
      {viewMode === "table" && tableContent ? tableContent : natalChart}
      {natalChartPending && (
        <section className="you-empty-card you-calculating-card" aria-label="Chart calculation">
          <span>Chart</span>
          <h3>Reading your chart.</h3>
          <p>The chart wheel and core signatures will appear as soon as the calculation finishes.</p>
        </section>
      )}
    </aside>
  );
}

function YouNatalTab({
  bigThreeRows,
  careerArchetypeProfile,
  displayMoon,
  displayRising,
  displaySun,
  elementalSummaryLabel,
  elementalSummarySentence,
  emptyHouseRows,
  natalAspectRows,
  natalAspectPatternItems,
  natalAspectPatternStatus,
  onOpenCareerDetail,
  onOpenSoulRoadmapDetail,
  planetRows,
  showNatalSignatures,
  signatureBody,
  signatureTitle,
  unknownBirthTime
}: {
  bigThreeRows: ReactNode[];
  careerArchetypeProfile?: CareerArchetypeProfile | null;
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  emptyHouseRows: ReactNode[];
  natalAspectRows: ReactNode[];
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternStatus?: NatalAspectPatternsSectionStatus;
  onOpenCareerDetail?: () => void;
  onOpenSoulRoadmapDetail?: () => void;
  planetRows: ReactNode[];
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
  unknownBirthTime: boolean;
}) {
  return (
    <div className="subpane" id="sub-chart">
      {showNatalSignatures && (
        <>
          <span className="eyebrow section-label">Your signatures</span>
          <section className="you-signatures-card" aria-label="Your signatures">
            <div className="you-signatures-main">
              <h3>{signatureTitle}</h3>
              <p>{signatureBody}</p>
            </div>
            <div className="elemental-balance" aria-label="Elemental balance">
              <div className="elemental-balance-head">
                <span className="eyebrow section-label">Elemental balance</span>
                <span>{elementalSummaryLabel}</span>
              </div>
              <p>{elementalSummarySentence}</p>
            </div>
          </section>
        </>
      )}

      <SoulRoadmapCard
        moon={displayMoon}
        onOpenDetail={onOpenSoulRoadmapDetail}
        rising={displayRising}
        risingPending={unknownBirthTime || displayRising === "Rising pending"}
        sun={displaySun}
      />

      {careerArchetypeProfile && careerArchetypeProfile.sections.length > 0 && (
        <CareerArchetypeCard onOpenDetail={onOpenCareerDetail} profile={careerArchetypeProfile} />
      )}

      {natalAspectPatternStatus && (
        <NatalAspectPatternsSection
          items={natalAspectPatternItems ?? []}
          status={natalAspectPatternStatus}
        />
      )}

      <span className="eyebrow section-label">Big Three</span>
      <div className="list you-list-card planet-placement-list" aria-label="Natal placements">
        {bigThreeRows}
      </div>

      {planetRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Planets</span>
          <div className="list you-list-card planet-placement-list" aria-label="Bodies in signs and houses">
            {planetRows}
          </div>
        </>
      )}

      {emptyHouseRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Empty houses</span>
          <div className="list you-list-card planet-placement-list" aria-label="Empty houses">
            {emptyHouseRows}
          </div>
        </>
      )}

      {natalAspectRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Aspects</span>
          <div className="list you-aspects-list aspect-row-list natal-aspects-list" aria-label="Natal aspects">
            {natalAspectRows}
          </div>
        </>
      )}
    </div>
  );
}

function YouUpdatesTab({
  aspectRows,
  dailyUpdateSummary,
  hasSavedCurrentCity,
  natalAspectPatternItems,
  natalAspectPatternTimingOverrides,
  onCreateChart,
  personalTimingSummary,
  standaloneTransitRows = []
}: {
  aspectRows: ReactNode[];
  dailyUpdateSummary?: PersonalTimingSummary | null;
  hasSavedCurrentCity: boolean;
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternTimingOverrides?: Record<string, NatalAspectPatternActivationTimingWindow>;
  onCreateChart: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  standaloneTransitRows?: ReactNode[];
}) {
  const dailyHeadline = dailyUpdateSummary?.headline.trim();
  const showDailyHeadline = dailyHeadline && dailyHeadline.toLowerCase() !== "tldr";
  const dailyWriteup = dailyUpdateSummary?.writeup?.filter((section) => section.body.length > 0) ?? [];

  return (
    <div className="subpane updates-section" id="sub-transits">
      {hasSavedCurrentCity && dailyUpdateSummary && (
        <section className={`daily-horoscope-summary${dailyUpdateSummary.status === "loading" ? " is-loading" : ""}`} aria-label="Daily horoscope summary">
          <span className="eyebrow section-label">TLDR</span>
          {showDailyHeadline ? <h3>{dailyHeadline}</h3> : null}
          <p>{dailyUpdateSummary.summary}</p>
          {dailyUpdateSummary.secondary ? <p className="daily-horoscope-summary__secondary">{dailyUpdateSummary.secondary}</p> : null}
          {dailyUpdateSummary.status === "loading" ? (
            <span className="summary-skeleton" aria-hidden="true">
              <span />
              <span />
            </span>
          ) : null}
          {dailyWriteup.length > 0 && (
            <div className="daily-horoscope-summary__writeup" aria-label="Daily horoscope write-up">
              {dailyWriteup.map((section, sectionIndex) => (
                <div className="daily-horoscope-writeup__section" key={`${section.heading ?? "daily"}-${sectionIndex}`}>
                  {section.heading ? <h3>{section.heading}</h3> : null}
                  {section.body.map((paragraph, paragraphIndex) => (
                    <p key={`${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {hasSavedCurrentCity && personalTimingSummary && (
        <section className="personal-timing-summary" aria-label="Personal timing summary">
          <span className="eyebrow section-label">Timing</span>
          <h3>{personalTimingSummary.headline}</h3>
          <p>{personalTimingSummary.summary}</p>
          {personalTimingSummary.keyFactors.length > 0 && (
            <ul>
              {personalTimingSummary.keyFactors.slice(0, 4).map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      {hasSavedCurrentCity && natalAspectPatternItems && (
        <NatalAspectPatternActivationsSection items={natalAspectPatternItems} timingOverrides={natalAspectPatternTimingOverrides} />
      )}
      <span className="eyebrow section-label">Aspects</span>
      {!hasSavedCurrentCity && (
        <section className="you-empty-card" aria-label="Current city needed">
          <span>Updates</span>
          <h3>Add your current city.</h3>
          <p>We need your current city to localize today’s sky against your chart.</p>
          <button type="button" onClick={onCreateChart}>Add current city →</button>
        </section>
      )}
      {hasSavedCurrentCity && aspectRows.length > 0 && (
        <div className="updates-aspect-list" aria-label="Aspects">
          {aspectRows}
        </div>
      )}
      {hasSavedCurrentCity && standaloneTransitRows.length > 0 && (
        <>
          <span className="eyebrow section-label">House transits</span>
          <div className="updates-aspect-list" aria-label="House transits">
            {standaloneTransitRows}
          </div>
        </>
      )}
      {hasSavedCurrentCity && aspectRows.length === 0 && standaloneTransitRows.length === 0 && (
        <section className="you-empty-card" aria-label="Transit setup">
          <span>Updates</span>
          <h3>No major updates are active today.</h3>
          <p>The sky is still moving, but no major personalized transit is pressing on your natal placements in this window.</p>
          <button type="button" onClick={onCreateChart}>Edit details →</button>
        </section>
      )}
    </div>
  );
}

function isPlaceholderArticleText(value: string) {
  const normalized = value.trim().toLowerCase();

  return (
    !normalized ||
    normalized === "tldr" ||
    normalized === "tl;dr" ||
    /^\d{1,2}°(?:\d{1,2})?'?$/.test(normalized) ||
    /^reviewed\b/.test(normalized) ||
    /^draft\b/.test(normalized)
  );
}

function cleanArticleText(value?: string | null) {
  const text = (value ?? "").replace(/^TLDR:\s*/i, "").replace(/\s+/g, " ").trim();

  return isPlaceholderArticleText(text) || !isReaderFacingCopy(text) ? "" : text;
}

function articleParagraphs(value?: string | null) {
  return (value ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => cleanArticleText(paragraph))
    .filter(Boolean);
}

function dedupeArticleParagraphs(paragraphs: string[]) {
  const seen = new Set<string>();

  return paragraphs.filter((paragraph) => {
    const normalized = paragraph.replace(/\s+/g, " ").trim().toLowerCase();

    if (!normalized || seen.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
}

function normalizedArticleCopy(value?: string | null) {
  return cleanArticleText(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function isDuplicateArticleCopy(value: string, seen: Set<string>) {
  const normalized = normalizedArticleCopy(value);

  if (!normalized || seen.has(normalized)) {
    return true;
  }

  seen.add(normalized);
  return false;
}

function cleanArticleHeading(value?: string | null) {
  return cleanArticleText(value).replace(/^\d{1,2}\s*[.\-·:]\s*/u, "").trim();
}

const articleZodiacGlyphs: Record<string, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓"
};

function articleTitleSignGlyph(title: string, meta = "") {
  const source = `${title} ${meta}`;
  const sign = Object.keys(articleZodiacGlyphs).find((candidate) => new RegExp(`\\b${candidate}\\b`, "i").test(source));

  return sign ? articleZodiacGlyphs[sign] : "";
}

function articleTitleHouseToken(title: string, meta = "") {
  const match = `${title} ${meta}`.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+house\b/i);

  return match ? `${match[1]}H` : "";
}

function articleEyebrowLabel(title: string, meta: YouTransitArticle["meta"]) {
  if (/\b(conjunction|opposition|square|trine|sextile|quincunx|aspect)\b/i.test(title)) {
    return "Aspect";
  }

  if (articleTitleSignGlyph(title)) {
    return "Placement";
  }

  return meta.find((row) => cleanArticleText(row.value))?.label || "Article";
}

function articleEyebrowGlyphs(article: YouTransitArticle) {
  const metaText = article.meta.map((row) => row.value).join(" ");
  const parts = [
    ...(article.glyph ? article.glyph.split(/\s+/).filter(Boolean) : []),
    articleTitleSignGlyph(article.title, metaText),
    articleTitleHouseToken(article.title, metaText)
  ].filter(Boolean);

  return Array.from(new Set(parts));
}

function YouTransitArticlePage({
  article,
  onClose
}: {
  article: YouTransitArticle;
  onClose: () => void;
}) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [article.id]);

  const summary = cleanArticleText(article.summary);
  const introParagraphs = article.bodyBeforeSections
    ? dedupeArticleParagraphs((article.body ?? [])
      .map((paragraph) => (typeof paragraph === "string" ? cleanArticleText(paragraph) : ""))
      .filter(Boolean))
    : [];
  const summaryHeading = cleanArticleText(article.summaryHeading) || "Overview";
  const rawSectionTldr = article.sections.map((section) => cleanArticleText(section.tldr)).find(Boolean) ?? "";
  const articleTldrCandidate = cleanArticleText(article.subtitle || summary || introParagraphs[0] || rawSectionTldr);
  const articleTldr = articleTldrCandidate && normalizedArticleCopy(articleTldrCandidate) !== normalizedArticleCopy(introParagraphs[0])
    ? articleTldrCandidate
    : "";
  const seenCopy = new Set<string>();

  if (articleTldr) {
    seenCopy.add(normalizedArticleCopy(articleTldr));
  }

  const displaySummary = summary && !isDuplicateArticleCopy(summary, seenCopy) ? summary : "";
  const displayIntroParagraphs = introParagraphs.filter((paragraph) => !isDuplicateArticleCopy(paragraph, seenCopy));
  const sections = article.sections
    .map((section) => {
      const tldr = cleanArticleText(section.tldr);
      const bodyParagraphs = articleParagraphs(section.body).filter((paragraph) => !isDuplicateArticleCopy(paragraph, seenCopy));
      const displayTldr = tldr && !isDuplicateArticleCopy(tldr, seenCopy) ? tldr : "";

      return {
        heading: cleanArticleHeading(section.heading),
        tldr: displayTldr,
        bodyParagraphs
      };
    })
    .filter((section) => section.tldr || section.bodyParagraphs.length);
  const hasReadableBody = Boolean(displaySummary || displayIntroParagraphs.length || sections.length);
  const fallbackParagraph = hasReadableBody || article.relatedAspects?.rows.length
    ? ""
    : emergencyDetailFallbackCopy(article.title);
  const eyebrowLabel = articleEyebrowLabel(article.title, article.meta);
  const eyebrowGlyphs = articleEyebrowGlyphs(article);

  return (
    <section
      className="article-page sky-detail-page you-transit-article-page"
      aria-label={`${article.title} article`}
      aria-labelledby="you-transit-article-title"
    >
      <button className="sky-detail-back floating-back-button" type="button" aria-label="Back to updates" onClick={onClose}>
        <ChevronLeft size={18} aria-hidden="true" />
        <span>Back</span>
      </button>
      <article className="article-shell sky-detail-article you-transit-article">
        <div className="article-card sky-detail-card">
          <header className="article-id sky-detail-id">
            <div className="article-eyebrow" aria-label={eyebrowGlyphs.length ? `${eyebrowLabel}: ${eyebrowGlyphs.join(" ")}` : eyebrowLabel}>
              <span>{eyebrowLabel}</span>
              {eyebrowGlyphs.length ? (
                <>
                  <span className="article-eyebrow__slash" aria-hidden="true">/</span>
                  <span className="article-eyebrow__glyphs" aria-hidden="true">
                    {eyebrowGlyphs.map((part) => (
                      <span className={/^\d{1,2}H$/.test(part) ? "article-eyebrow__house" : undefined} key={part}>{part}</span>
                    ))}
                  </span>
                </>
              ) : null}
            </div>
            <h1 className="article-title" id="you-transit-article-title">{article.title}</h1>
            {articleTldr ? (
              <div className="article-tldr">
                <span className="ui-pill ui-pill--neutral article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{articleTldr}</p>
              </div>
            ) : null}
          </header>

          <hr className="article-rule" />

          <div className="article-body-card sky-detail-body">
            <div className="article-body-inner">
              {article.lensHint ? (
                <aside className="article-lens-hint" aria-label="Placement lens">
                  {typeof article.lensHint === "string" ? <p>{cleanArticleText(article.lensHint)}</p> : article.lensHint}
                </aside>
              ) : null}
              {displayIntroParagraphs.length ? (
                <section className={`article-section sky-detail-section ${article.plainBody ? "sky-detail-plain-section" : "sky-detail-intro-section"}`}>
                  {displayIntroParagraphs.map((paragraph, index) => (
                    <p key={`intro-${index}`}>{paragraph}</p>
                  ))}
                </section>
              ) : null}
              {displaySummary && !article.bodyBeforeSections ? (
                <section className="article-section sky-detail-section">
                  <h2>{summaryHeading}</h2>
                  <p>{displaySummary}</p>
                </section>
              ) : null}
              {sections.map((section, index) => {
                const showTldr = section.tldr && normalizedArticleCopy(section.tldr) !== normalizedArticleCopy(section.bodyParagraphs[0]);

                return (
                <section className="article-section sky-detail-section" key={`${section.heading}-${index}`}>
                  {section.heading ? <h2>{section.heading}</h2> : null}
                  {showTldr ? <p>{section.tldr}</p> : null}
                  {section.bodyParagraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${section.heading || "section"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </section>
                );
              })}
              {article.relatedAspects?.rows.length ? (
                <section className="article-related-aspects" aria-label={article.relatedAspects.heading}>
                  <span className="eyebrow section-label article-related-aspects__label">{article.relatedAspects.heading}</span>
                  <div className="article-related-aspects__list aspect-row-list">
                    {article.relatedAspects.rows}
                  </div>
                </section>
              ) : null}
              {fallbackParagraph ? (
                <section className="article-section sky-detail-section">
                  <p>{fallbackParagraph}</p>
                </section>
              ) : null}
              <div className="sky-detail-end" aria-hidden="true">✦</div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
}

export function YouPage({
  aspectRows,
  bigThreeRows,
  careerArchetypeProfile,
  dailyUpdateSummary,
  displayMoon,
  displayRising,
  displaySun,
  elementalSummaryLabel,
  elementalSummarySentence,
  emptyHouseRows,
  hasSavedBirthDetails,
  hasSavedCurrentCity,
  natalAspectRows,
  natalAspectPatternItems,
  natalAspectPatternTimingOverrides,
  natalAspectPatternStatus,
  natalTableRows,
  natalChart,
  natalChartPending,
  updatesChart,
  onCreateChart,
  onCloseTransitArticle,
  onOpenCareerDetail,
  onOpenSoulRoadmapDetail,
  personalTimingSummary,
  planetRows,
  profileAvatarUrl,
  profileEmail,
  profileName,
  setupStepsLeft,
  showNatalSignatures,
  signatureBody,
  signatureTitle,
  signaturesReady,
  standaloneTransitRows = [],
  unknownBirthTime,
  transitArticle
}: YouPageProps) {
  const [profileTab, setProfileTab] = useState<YouTab>("chart");
  const [natalChartViewMode, setNatalChartViewMode] = useState<NatalChartViewMode>("circle");
  const activeChart = profileTab === "transits" && updatesChart ? updatesChart : natalChart;
  const activeChartLabel = profileTab === "transits" && updatesChart ? "Transit chart" : "Natal chart";
  const natalTableContent = natalTableRows.length > 0 ? (
    <NatalChartDataTable rows={natalTableRows} title="Your natal placement table" />
  ) : null;

  if (!hasSavedBirthDetails) {
    return <YouEmptyState onCreateChart={onCreateChart} setupStepsLeft={setupStepsLeft} />;
  }

  if (transitArticle && onCloseTransitArticle) {
    return <YouTransitArticlePage article={transitArticle} onClose={onCloseTransitArticle} />;
  }

  return (
    <section className="you-page you-chart-page page-shell" aria-label="You">
      <div className="chart-layout">
        <YouNatalChartPanel
          ariaLabel={activeChartLabel}
          natalChart={activeChart}
          natalChartPending={natalChartPending}
          onViewModeChange={profileTab === "chart" ? setNatalChartViewMode : undefined}
          tableContent={profileTab === "chart" ? natalTableContent : undefined}
          viewMode={profileTab === "chart" ? natalChartViewMode : "circle"}
        />

        <main className="chart-layout__content">
          <YouProfileSummary
            displayMoon={displayMoon}
            displayRising={displayRising}
            displaySun={displaySun}
            onEditProfile={onCreateChart}
            profileAvatarUrl={profileAvatarUrl}
            profileEmail={profileEmail}
            profileName={profileName}
            signaturesReady={signaturesReady}
          />

          <SegmentedControl
            id="you-subtabs"
            value={profileTab}
            options={[
              { value: "transits", label: "Transits" },
              { value: "chart", label: "Natal Chart" }
            ]}
            onChange={setProfileTab}
            ariaLabel="Profile sections"
            className="app-tabs profile-tabs you-profile-tabs you-chart-tabs"
          />

          {profileTab === "chart" && (
            <YouNatalTab
              bigThreeRows={bigThreeRows}
              careerArchetypeProfile={careerArchetypeProfile}
              displayMoon={displayMoon}
              displayRising={displayRising}
              displaySun={displaySun}
              elementalSummaryLabel={elementalSummaryLabel}
              elementalSummarySentence={elementalSummarySentence}
              emptyHouseRows={emptyHouseRows}
              natalAspectRows={natalAspectRows}
              natalAspectPatternItems={natalAspectPatternItems}
              natalAspectPatternStatus={natalAspectPatternStatus}
              onOpenCareerDetail={onOpenCareerDetail}
              onOpenSoulRoadmapDetail={onOpenSoulRoadmapDetail}
              planetRows={planetRows}
              showNatalSignatures={showNatalSignatures}
              signatureBody={signatureBody}
              signatureTitle={signatureTitle}
              unknownBirthTime={unknownBirthTime}
            />
          )}

          {profileTab === "transits" && (
            <YouUpdatesTab
              aspectRows={aspectRows}
              dailyUpdateSummary={dailyUpdateSummary}
              hasSavedCurrentCity={hasSavedCurrentCity}
              natalAspectPatternItems={natalAspectPatternItems}
              natalAspectPatternTimingOverrides={natalAspectPatternTimingOverrides}
              onCreateChart={onCreateChart}
              personalTimingSummary={personalTimingSummary}
              standaloneTransitRows={standaloneTransitRows}
            />
          )}
        </main>
      </div>
    </section>
  );
}
