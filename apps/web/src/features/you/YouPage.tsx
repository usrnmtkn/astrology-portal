import { Fragment, isValidElement, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, MoreVertical, Pencil, Sparkles } from "lucide-react";
import { DailyMoonContextTags, type DailyMoonContext } from "../../components/DailyMoonContextTags";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SegmentedControl } from "../../components/SegmentedControl";
import { AspectGiftLessonGroup } from "../../components/charts/AspectGiftLessonGroup";
import { AspectGlyphs } from "../../components/charts/PlacementRows";
import { NatalChartDataTable, type NatalChartDataTableRow } from "../../components/charts/NatalChartDataTable";
import { SkyWheel, type HouseSignLabelStyle, type InterChartAspectLine } from "../../components/charts/Wheels";
import type { SkySnapshot } from "../../types";
import type { NatalAspectPatternActivationTimingWindow, NatalAspectPatternReaderItem } from "../../services/natalAspectPatterns";
import { isReaderFacingCopy } from "../../content/readerSafety";
import { generatedContentParagraphs, generatedContentSections, type LiveGeneratedContent } from "../../services/generatedContent";
import { aspectGiftOrLesson, type AspectGiftLessonGroup as GiftLessonGroup } from "../../services/aspectGiftLesson";
import {
  NatalAspectPatternActivationsSection,
  NatalAspectPatternsSection,
  type NatalAspectPatternsSectionStatus
} from "./NatalAspectPatternsSection";
import { resolvedNatalAspectPatternSectionLabel } from "./natalAspectPatternLabels";
import { dedupeArticleSectionHeadings } from "../../utils/articleHeadings";
import type { WeeklyHoroscopeAssembly } from "../../services/weeklyHoroscope";
import { canonicalNatalAspectsForSnapshot } from "../../services/natalAspectFacts";

type YouTab = "transits" | "chart";
type NatalChartViewMode = "circle" | "table";
type AspectToneBucket = "gifts" | "lessons";
type RelatedAspectRow = {
  group?: AspectToneBucket | "planets" | "points";
  key: string;
  node: ReactNode;
};

function isRelatedAspectRow(row: ReactNode | RelatedAspectRow): row is RelatedAspectRow {
  return Boolean(row && typeof row === "object" && "node" in row && !isValidElement(row));
}

export type PersonalTimingSummary = {
  headline: string;
  summary: string;
  secondary?: string;
  moonContext?: DailyMoonContext;
  writeup?: Array<{
    heading?: string;
    body: string[];
  }>;
  keyFactors: string[];
  status: "idle" | "loading" | "ready" | "error";
};

export type DailyHoroscopeAssembly = {
  doItems?: string[];
  dontItems?: string[];
  specialSections: Array<{ headline: string; body: string }>;
  behindForecastRows: ReactNode[];
  derivation: Record<string, unknown>;
};

export type YouTransitArticle = {
  id: string;
  title: string;
  glyph?: string;
  subtitle: string;
  tldr?: string;
  lensHint?: ReactNode;
  lensHintLabel?: string;
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
    role?: "main" | "aspect";
    aspectType?: string;
    group?: AspectToneBucket;
    sourceTag?: string;
  }>;
  relatedAspects?: {
    heading: string;
    grouping?: "tone" | "counterpart";
    rows: Array<ReactNode | RelatedAspectRow>;
  };
  meta: Array<{
    label: string;
    value: string;
  }>;
  generatedContent?: LiveGeneratedContent | null;
};

export type YouPageProps = {
  aspectRows: ReactNode[];
  bigThreeRows: ReactNode[];
  dailyHoroscopeAssembly?: DailyHoroscopeAssembly | null;
  dailyUpdateSummary?: PersonalTimingSummary | null;
  weeklyHoroscopeAssembly?: WeeklyHoroscopeAssembly | null;
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  emptyHouseRows: ReactNode[];
  hasSavedBirthDetails: boolean;
  hasSavedCurrentCity: boolean;
  natalSky: SkySnapshot | null;
  natalChartStatus: "idle" | "loading" | "ready" | "error";
  natalChartError: string;
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternTimingOverrides?: Record<string, NatalAspectPatternActivationTimingWindow>;
  natalAspectPatternStatus?: NatalAspectPatternsSectionStatus;
  currentSky: SkySnapshot | null;
  houseSignLabelStyle: HouseSignLabelStyle;
  updateTransitAspectLines: InterChartAspectLine[];
  natalAspectGroups: GiftLessonGroup<ReactNode>[];
  natalTableRows: NatalChartDataTableRow[];
  onCreateChart: () => void;
  onCloseTransitArticle?: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  planetRows: ReactNode[];
  profileAvatarUrl?: string;
  profileEmail: string;
  profileHandle?: string | null;
  profileName: string;
  setupStepsLeft: number;
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
  signaturesReady: boolean;
  standaloneTransitRows?: ReactNode[];
  transitDateLabel: string;
  transitsLoading?: boolean;
  weeklyTransitRows?: ReactNode[];
  transitArticle?: YouTransitArticle | null;
};

type NatalAspectPatternDetailSelection = {
  item: NatalAspectPatternReaderItem;
  nestedItems: NatalAspectPatternReaderItem[];
};

function natalAspectPatternDetailArticle({
  item,
  nestedItems
}: NatalAspectPatternDetailSelection): YouTransitArticle {
  const copy = item.copy.content;
  const sections = copy.sections
    .map((section) => ({
      body: section.body.trim(),
      heading: resolvedNatalAspectPatternSectionLabel(section)
    }))
    .filter((section): section is { body: string; heading: string } => Boolean(section.body && section.heading))
    .map((section) => ({
      heading: section.heading,
      tldr: "",
      body: section.body
    }));
  const supportingSections = nestedItems.flatMap((nestedItem) => {
    const nestedCopy = nestedItem.copy.content;
    const nestedIntro = {
      heading: `Supporting pattern: ${nestedCopy.headline}`,
      tldr: "",
      body: nestedCopy.overview
    };
    const nestedSections = nestedCopy.sections
      .map((section) => ({
        body: section.body.trim(),
        heading: resolvedNatalAspectPatternSectionLabel(section)
      }))
      .filter((section): section is { body: string; heading: string } => Boolean(section.body && section.heading))
      .map((section) => ({
        heading: `${nestedCopy.eyebrow || "Supporting pattern"}: ${section.heading}`,
        tldr: "",
        body: section.body
      }));

    return [nestedIntro, ...nestedSections];
  });
  const patternLabel = copy.eyebrow || "Chart pattern";

  return {
    id: `natal-aspect-pattern-${item.patternId}`,
    title: copy.headline,
    subtitle: patternLabel,
    summary: "",
    bodyBeforeSections: true,
    plainBody: true,
    body: [copy.overview],
    sections: [...sections, ...supportingSections],
    meta: [{ label: patternLabel, value: patternLabel }]
  };
}

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
  profileHandle,
  profileName,
  signaturesReady
}: {
  displayMoon: string;
  displayRising: string;
  displaySun: string;
  onEditProfile: () => void;
  profileAvatarUrl?: string;
  profileEmail: string;
  profileHandle?: string | null;
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
        <div className="you-profile-name-row">
          <h1>{profileName}</h1>
          {profileHandle ? <span className="you-profile-handle">@{profileHandle}</span> : null}
        </div>
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
  natalChartStatus,
  natalChartError,
  onViewModeChange,
  tableContent,
  viewMode
}: {
  ariaLabel?: string;
  natalChart: ReactNode;
  natalChartStatus: "idle" | "loading" | "ready" | "error";
  natalChartError: string;
  onViewModeChange?: (value: NatalChartViewMode) => void;
  tableContent?: ReactNode;
  viewMode?: NatalChartViewMode;
}) {
  const showViewToggle = Boolean(onViewModeChange && tableContent);

  return (
    <aside
      className="chart-layout__visual"
      aria-label={ariaLabel}
      data-chart-calculation-status={natalChartStatus}
    >
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
      {(natalChartStatus === "idle" || natalChartStatus === "loading") && (
        <section className="you-empty-card you-calculating-card" aria-label="Chart calculation">
          <span>Chart</span>
          <h3>Reading your chart.</h3>
          <p>The chart wheel and core signatures will appear as soon as the calculation finishes.</p>
        </section>
      )}
      {natalChartStatus === "error" && (
        <section
          className="you-empty-card you-calculating-card you-calculation-error-card"
          aria-label="Chart calculation error"
          role="alert"
        >
          <span>Chart</span>
          <h3>We could not calculate this chart.</h3>
          <p>{natalChartError || "The chart calculation failed without an error message."}</p>
        </section>
      )}
    </aside>
  );
}

function YouNatalTab({
  bigThreeRows,
  elementalSummaryLabel,
  elementalSummarySentence,
  emptyHouseRows,
  natalAspectGroups,
  natalAspectPatternItems,
  natalAspectPatternStatus,
  onOpenNatalAspectPatternDetail,
  planetRows,
  showNatalSignatures,
  signatureBody,
  signatureTitle
}: {
  bigThreeRows: ReactNode[];
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  emptyHouseRows: ReactNode[];
  natalAspectGroups: GiftLessonGroup<ReactNode>[];
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternStatus?: NatalAspectPatternsSectionStatus;
  onOpenNatalAspectPatternDetail: (item: NatalAspectPatternReaderItem, nestedItems: NatalAspectPatternReaderItem[]) => void;
  planetRows: ReactNode[];
  showNatalSignatures: boolean;
  signatureBody: string;
  signatureTitle: string;
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

      {natalAspectPatternStatus && (
        <NatalAspectPatternsSection
          items={natalAspectPatternItems ?? []}
          onOpenDetail={onOpenNatalAspectPatternDetail}
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

      {natalAspectGroups.map((group) => (
        <AspectGiftLessonGroup
          ariaLabel={`Your natal aspect ${group.label}`}
          key={group.key}
          label={group.label}
          listAriaLabel={`Your natal ${group.label.toLowerCase()}`}
          listClassName="natal-aspects-list"
        >
          {group.aspects}
        </AspectGiftLessonGroup>
      ))}
    </div>
  );
}

function YouUpdatesTab({
  aspectRows,
  dailyHoroscopeAssembly,
  dailyUpdateSummary,
  weeklyHoroscopeAssembly,
  hasSavedCurrentCity,
  natalAspectPatternItems,
  natalAspectPatternTimingOverrides,
  onCreateChart,
  standaloneTransitRows = [],
  transitDateLabel,
  transitsLoading = false,
  weeklyTransitRows = []
}: {
  aspectRows: ReactNode[];
  dailyHoroscopeAssembly?: DailyHoroscopeAssembly | null;
  dailyUpdateSummary?: PersonalTimingSummary | null;
  weeklyHoroscopeAssembly?: WeeklyHoroscopeAssembly | null;
  hasSavedCurrentCity: boolean;
  natalAspectPatternItems?: NatalAspectPatternReaderItem[];
  natalAspectPatternTimingOverrides?: Record<string, NatalAspectPatternActivationTimingWindow>;
  onCreateChart: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
  standaloneTransitRows?: ReactNode[];
  transitDateLabel: string;
  transitsLoading?: boolean;
  weeklyTransitRows?: ReactNode[];
}) {
  const dailyHeadline = dailyUpdateSummary?.headline.trim();
  const showDailyHeadline = dailyHeadline && dailyHeadline.toLowerCase() !== "tldr";
  const dailyWriteup = dailyUpdateSummary?.writeup?.filter((section) => section.body.length > 0) ?? [];
  const weeklyTransitSection = !hasSavedCurrentCity ? null : weeklyHoroscopeAssembly?.status === "error" ? (
    <section className="you-empty-card" aria-label="Weekly transits unavailable">
      <span>This week</span>
      <h3>Your weekly transits are not available yet.</h3>
      <p>We could not calculate this week. Try again in a moment.</p>
    </section>
  ) : !weeklyHoroscopeAssembly || weeklyHoroscopeAssembly.status === "loading" ? (
    <section className="weekly-horoscope__loading" aria-label="Loading weekly transits">
      <span className="summary-skeleton" aria-hidden="true"><span /><span /></span>
    </section>
  ) : weeklyTransitRows.length === 0 && !weeklyHoroscopeAssembly.macro ? null : (
    <section className="weekly-horoscope weekly-horoscope--embedded" aria-label="This week's transits">
      {weeklyHoroscopeAssembly.macro ? (
        <article className="weekly-horoscope__macro daily-horoscope-summary">
          <span className="eyebrow section-label">The macro view</span>
          <h3>{weeklyHoroscopeAssembly.macro.headline}</h3>
          {weeklyHoroscopeAssembly.macro.body
            .split(/\n{2,}/)
            .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </article>
      ) : null}
      {weeklyTransitRows.length > 0 ? (
        <div className="updates-aspect-list weekly-horoscope__transits" aria-label="Weekly transit cards">
          {weeklyTransitRows}
        </div>
      ) : null}
    </section>
  );

  return (
    <div className="subpane updates-section" id="sub-transits">
      {hasSavedCurrentCity && dailyUpdateSummary && (
        <section className={`daily-horoscope-summary${dailyUpdateSummary.status === "loading" ? " is-loading" : ""}`} aria-label="Daily horoscope summary">
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
          {dailyUpdateSummary.moonContext ? (
            <DailyMoonContextTags context={dailyUpdateSummary.moonContext} />
          ) : null}
        </section>
      )}
      {hasSavedCurrentCity
        && dailyHoroscopeAssembly?.doItems?.length === 3
        && dailyHoroscopeAssembly.dontItems?.length === 3 ? (
          <section className="daily-dodont" aria-label="Do and don't">
            <div>
              <span className="eyebrow section-label">Do</span>
              <ul>{dailyHoroscopeAssembly.doItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div>
              <span className="eyebrow section-label">Don&apos;t</span>
              <ul>{dailyHoroscopeAssembly.dontItems.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          </section>
        ) : null}
      {dailyHoroscopeAssembly?.specialSections.map((section) => (
        <section className="daily-special-section" key={section.headline}>
          <span className="eyebrow section-label">{transitDateLabel} sky</span>
          <h3>{section.headline}</h3>
          {section.body.split(/\n{2,}/).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
      ))}
      {weeklyTransitSection}
      {hasSavedCurrentCity && natalAspectPatternItems && (
        <NatalAspectPatternActivationsSection items={natalAspectPatternItems} timingOverrides={natalAspectPatternTimingOverrides} />
      )}
      <span className="eyebrow section-label">Areas of Your Life</span>
      {!hasSavedCurrentCity && (
        <section className="you-empty-card" aria-label="Current city needed">
          <span>Updates</span>
          <h3>Add your current city.</h3>
          <p>We need your current city to localize the selected date’s sky against your chart.</p>
          <button type="button" onClick={onCreateChart}>Add current city →</button>
        </section>
      )}
      {hasSavedCurrentCity && aspectRows.length > 0 && (
        <div className="updates-aspect-list" aria-label="Areas of your life">
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
      {hasSavedCurrentCity && transitsLoading && (
        <div className="feature-loading-fallback" role="status">
          Calculating transits for {transitDateLabel}…
        </div>
      )}
      {hasSavedCurrentCity && !transitsLoading && aspectRows.length === 0 && standaloneTransitRows.length === 0 && (
        <section className="you-empty-card" aria-label="Transit setup">
          <span>Updates</span>
          <h3>No major updates are active for {transitDateLabel}.</h3>
          <p>The sky is still moving, but no major personalized transit is pressing on your natal placements in this window.</p>
          <button type="button" onClick={onCreateChart}>Edit details →</button>
        </section>
      )}
      {hasSavedCurrentCity && dailyHoroscopeAssembly?.behindForecastRows.length ? (
        <>
          <span className="eyebrow section-label daily-behind-forecast-label">Behind this Forecast</span>
          <section className="daily-behind-forecast" aria-label="Behind this forecast">
            <div>{dailyHoroscopeAssembly.behindForecastRows}</div>
          </section>
        </>
      ) : null}
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

function contentSourceQaTag(value?: string | null) {
  const text = (value ?? "").trim();

  return /^\[(?:AUTHORED|FALLBACK)\s*·[^\]]+\]$/u.test(text) ? text : "";
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

const articleAspectTypePattern = /\b(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\b/i;

function normalizedArticleAspectType(value?: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();

  if (normalized === "conjunct") {
    return "conjunction";
  }

  if (normalized === "opposite") {
    return "opposition";
  }

  if (normalized === "inconjunct") {
    return "quincunx";
  }

  return normalized;
}

function articleAspectTypeFromText(value: string) {
  return normalizedArticleAspectType(value.match(articleAspectTypePattern)?.[1] ?? "");
}

function articleAspectToneBucket(aspectType?: string): AspectToneBucket {
  return aspectGiftOrLesson(normalizedArticleAspectType(aspectType));
}

function articleAspectGlyphPartsFromHeading(heading: string) {
  const match = heading.match(/^\s*(.+?)\s+(conjunction|conjunct|sextile|square|trine|opposition|opposite|quincunx|inconjunct)\s+(.+?)\s*$/iu);

  if (!match) {
    return null;
  }

  return {
    from: match[1].trim(),
    aspect: normalizedArticleAspectType(match[2]),
    to: match[3].trim()
  };
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

  const dateRange = meta.find((row) => row.label.toLowerCase() === "date range");

  if (dateRange) {
    return cleanArticleText(dateRange.value) || dateRange.label;
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
  backAriaLabel = "Back to updates",
  onClose
}: {
  article: YouTransitArticle;
  backAriaLabel?: string;
  onClose: () => void;
}) {
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [article.id]);

  const generated = article.generatedContent?.status === "LIVE" ? article.generatedContent : null;
  const generatedSections = generatedContentSections(generated);
  const generatedParagraphs = generatedContentParagraphs(
    generatedSections.length && generated ? { ...generated, sections: {} } : generated
  );
  const generatedHeadline = generated?.headline && isReaderFacingCopy(generated.headline)
    ? cleanArticleHeading(generated.headline)
    : "";
  const generatedSummary = generated?.summary && isReaderFacingCopy(generated.summary)
    ? cleanArticleText(generated.summary)
    : "";
  const displayArticle: YouTransitArticle = generated && (generatedParagraphs.length || generatedSections.length)
    ? {
        ...article,
        title: generatedHeadline || article.title,
        summary: generatedSummary,
        bodyBeforeSections: generatedParagraphs.length > 0,
        body: generatedParagraphs,
        sections: generatedSections.map((section) => ({
          heading: section.heading,
          tldr: "",
          body: section.body
        }))
      }
    : article;
  const summary = cleanArticleText(displayArticle.summary);
  const introParagraphs = displayArticle.bodyBeforeSections
    ? dedupeArticleParagraphs((displayArticle.body ?? [])
      .map((paragraph) => (typeof paragraph === "string" ? cleanArticleText(paragraph) : ""))
      .filter(Boolean))
    : [];
  const summaryHeading = cleanArticleText(displayArticle.summaryHeading) || "Overview";
  const rawSectionTldr = displayArticle.sections
    .map((section) => cleanArticleText(section.tldr))
    .find((value) => value && value.toLowerCase() !== "tldr" && !contentSourceQaTag(value)) ?? "";
  const authoredBodyCopies = [
    summary,
    ...introParagraphs,
    ...displayArticle.sections.flatMap((section) => articleParagraphs(section.body))
  ].map(normalizedArticleCopy).filter(Boolean);
  // TLDR is an authored slot. Never infer it from subtitle, summary, or body.
  const articleTldrCandidate = cleanArticleText(displayArticle.tldr || rawSectionTldr);
  const normalizedTldrCandidate = normalizedArticleCopy(articleTldrCandidate);
  const articleTldr = articleTldrCandidate && !authoredBodyCopies.some((body) => (
    body === normalizedTldrCandidate || body.startsWith(normalizedTldrCandidate)
  )) ? articleTldrCandidate : "";
  const seenCopy = new Set<string>();

  if (articleTldr) {
    seenCopy.add(normalizedArticleCopy(articleTldr));
  }

  const displaySummary = summary && !isDuplicateArticleCopy(summary, seenCopy) ? summary : "";
  const displayIntroParagraphs = introParagraphs.filter((paragraph) => !isDuplicateArticleCopy(paragraph, seenCopy));
  const displaySummaryHeading = displaySummary
    ? dedupeArticleSectionHeadings([{ heading: summaryHeading }], article.title)[0].heading
    : "";
  const rawSections = displayArticle.sections
    .map((section) => {
      const tldr = cleanArticleText(section.tldr);
      const sourceTag = contentSourceQaTag(section.sourceTag) || contentSourceQaTag(section.tldr);
      const bodyParagraphs = articleParagraphs(section.body)
        .filter((paragraph, paragraphIndex) => !(paragraphIndex === 0 && sourceTag && paragraph === sourceTag))
        .filter((paragraph) => !isDuplicateArticleCopy(paragraph, seenCopy));
      const displayTldr = tldr && !contentSourceQaTag(section.tldr) && !isDuplicateArticleCopy(tldr, seenCopy) ? tldr : "";

      return {
        heading: cleanArticleHeading(section.heading),
        role: section.role,
        aspectType: section.aspectType || articleAspectTypeFromText(`${section.heading} ${section.body}`),
        group: section.group ?? articleAspectToneBucket(section.aspectType || articleAspectTypeFromText(section.heading)),
        sourceTag,
        tldr: displayTldr,
        bodyParagraphs
      };
    })
    .filter((section) => section.tldr || section.bodyParagraphs.length);
  const sections = dedupeArticleSectionHeadings(
    rawSections,
    [displayArticle.title, ...(displaySummaryHeading ? [displaySummaryHeading] : [])]
  );
  const mainSections = sections.filter((section) => section.role !== "aspect");
  const aspectSections = sections.filter((section) => section.role === "aspect");
  const relatedAspectGroups = displayArticle.relatedAspects?.grouping === "counterpart"
    ? ([
        { key: "planets", label: "Planetary Aspects" },
        { key: "points", label: "Angles and Points" }
      ]).map((group) => ({
        ...group,
        rows: displayArticle.relatedAspects?.rows.filter((row) => (
          isRelatedAspectRow(row) && row.group === group.key
        )) ?? []
      })).filter((group) => group.rows.length > 0)
    : [{
        key: "all",
        label: "",
        rows: displayArticle.relatedAspects?.rows ?? []
      }];
  const aspectGroups = ([
    { id: "gifts" as const, label: "Gifts" },
    { id: "lessons" as const, label: "Lessons" }
  ]).map((group) => ({
    ...group,
    sections: aspectSections.filter((section) => section.group === group.id)
  })).filter((group) => group.sections.length > 0);
  const hasReadableBody = Boolean(displaySummary || displayIntroParagraphs.length || sections.length);
  const passKeyDates = displayArticle.meta.filter((row) => /^Pass \d+$/u.test(row.label) && cleanArticleText(row.value));
  const eyebrowLabel = articleEyebrowLabel(displayArticle.title, displayArticle.meta);
  const eyebrowGlyphs = articleEyebrowGlyphs(displayArticle);

  return (
    <section
      className="article-page sky-detail-page you-transit-article-page"
      aria-label={`${displayArticle.title} article`}
      aria-labelledby="you-transit-article-title"
    >
      <button className="sky-detail-back floating-back-button" type="button" aria-label={backAriaLabel} onClick={onClose}>
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
            <h1 className="article-title" id="you-transit-article-title">{displayArticle.title}</h1>
            {articleTldr ? (
              <div className="article-tldr">
                <span className="ui-pill ui-pill--neutral article-tldr__label">TLDR</span>
                <p className="article-sub article-tldr__copy">{articleTldr}</p>
              </div>
            ) : null}
          </header>

          {hasReadableBody ? <hr className="article-rule" /> : null}

          {displaySummary || displayIntroParagraphs.length || mainSections.length ? (
          <div className="article-body-card sky-detail-body">
            <div className="article-body-inner">
              {displayArticle.lensHint ? (
                <aside className="article-lens-hint" aria-label={displayArticle.lensHintLabel ?? "Placement lens"}>
                  {typeof displayArticle.lensHint === "string" ? <p>{cleanArticleText(displayArticle.lensHint)}</p> : displayArticle.lensHint}
                </aside>
              ) : null}
              {displayIntroParagraphs.length ? (
                <section className={`article-section sky-detail-section ${displayArticle.plainBody ? "sky-detail-plain-section" : "sky-detail-intro-section"}`}>
                  {displayIntroParagraphs.map((paragraph, index) => (
                    <p key={`intro-${index}`}>{paragraph}</p>
                  ))}
                </section>
              ) : null}
              {displaySummary && !displayArticle.bodyBeforeSections ? (
                <section className="article-section sky-detail-section">
                  {displaySummaryHeading ? <h2>{displaySummaryHeading}</h2> : null}
                  <p>{displaySummary}</p>
                </section>
              ) : null}
              {mainSections.map((section, index) => {
                const showTldr = section.tldr && normalizedArticleCopy(section.tldr) !== normalizedArticleCopy(section.bodyParagraphs[0]);

                return (
                <section className="article-section sky-detail-section" key={`${section.heading}-${index}`}>
                  {section.heading ? <h2>{section.heading}</h2> : null}
                  {section.sourceTag ? <p>{section.sourceTag}</p> : null}
                  {showTldr ? <p>{section.tldr}</p> : null}
                  {section.bodyParagraphs.map((paragraph, paragraphIndex) => (
                    <p key={`${section.heading || "section"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                  ))}
                </section>
                );
              })}
              {passKeyDates.length ? (
                <section className="article-section sky-detail-section sky-placement-key-dates" aria-labelledby="you-transit-key-dates-title">
                  <h2 id="you-transit-key-dates-title">Key dates</h2>
                  <dl>
                    {passKeyDates.map((row) => (
                      <div key={`${row.label}-${row.value}`}>
                        <dt>{cleanArticleText(row.value)}</dt>
                        <dd>{row.label}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
              {displayArticle.relatedAspects?.rows.length ? (
                <section className="article-related-aspects" aria-labelledby="you-transit-related-aspects-title">
                  <h2 className="eyebrow section-label article-related-aspects__label" id="you-transit-related-aspects-title">
                    {displayArticle.relatedAspects.heading}
                  </h2>
                  {relatedAspectGroups.map((group) => (
                    <div className="article-related-aspects__group" key={group.key}>
                      {group.label ? (
                        <h3 className="eyebrow section-label article-related-aspects__label article-related-aspects__group-label">
                          {group.label}
                        </h3>
                      ) : null}
                      <div className="article-related-aspects__list aspect-row-list">
                        {group.rows.map((row, index) => (
                          isRelatedAspectRow(row)
                            ? <Fragment key={row.key || `related-aspect-${index}`}>{row.node}</Fragment>
                            : <Fragment key={`related-aspect-${index}`}>{row}</Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ) : null}
              <div className="sky-detail-end" aria-hidden="true">✦</div>
            </div>
          </div>
          ) : null}
        </div>

        {aspectGroups.length ? aspectGroups.map((group) => (
          <Fragment key={group.id}>
            <h2
              className="eyebrow section-label article-related-aspects__label article-related-aspects__label--outside"
              id={`you-transit-aspects-${group.id}`}
            >
              {group.label}
            </h2>
            <section
              className="article-card article-related-aspects article-related-aspects-card"
              aria-labelledby={`you-transit-aspects-${group.id}`}
            >
              <div className="article-related-aspects__group">
                <div className="article-related-aspects__copy-list">
                  {group.sections.map((section, index) => {
                    const showTldr = section.tldr && normalizedArticleCopy(section.tldr) !== normalizedArticleCopy(section.bodyParagraphs[0]);
                    const glyphParts = section.heading ? articleAspectGlyphPartsFromHeading(section.heading) : null;

                    return (
                      <section className="article-section sky-detail-section article-related-aspects__copy" key={`aspect-${section.heading}-${index}`}>
                        {section.heading ? (
                          <div className="article-related-aspects__copy-heading">
                            {glyphParts ? <AspectGlyphs from={glyphParts.from} aspect={glyphParts.aspect} to={glyphParts.to} /> : null}
                            <h3>{section.heading}</h3>
                          </div>
                        ) : null}
                        {section.sourceTag ? <p>{section.sourceTag}</p> : null}
                        {showTldr ? <p>{section.tldr}</p> : null}
                        {section.bodyParagraphs.map((paragraph, paragraphIndex) => (
                          <p key={`${section.heading || "aspect"}-${index}-${paragraphIndex}`}>{paragraph}</p>
                        ))}
                      </section>
                    );
                  })}
                </div>
              </div>
            </section>
          </Fragment>
        )) : null}
      </article>
    </section>
  );
}

export function YouPage({
  aspectRows,
  bigThreeRows,
  dailyHoroscopeAssembly,
  dailyUpdateSummary,
  weeklyHoroscopeAssembly,
  displayMoon,
  displayRising,
  displaySun,
  elementalSummaryLabel,
  elementalSummarySentence,
  emptyHouseRows,
  hasSavedBirthDetails,
  hasSavedCurrentCity,
  natalAspectGroups,
  natalAspectPatternItems,
  natalAspectPatternTimingOverrides,
  natalAspectPatternStatus,
  natalTableRows,
  natalSky,
  natalChartStatus,
  natalChartError,
  currentSky,
  houseSignLabelStyle,
  updateTransitAspectLines,
  onCreateChart,
  onCloseTransitArticle,
  personalTimingSummary,
  planetRows,
  profileAvatarUrl,
  profileEmail,
  profileHandle,
  profileName,
  setupStepsLeft,
  showNatalSignatures,
  signatureBody,
  signatureTitle,
  signaturesReady,
  standaloneTransitRows = [],
  transitDateLabel,
  transitsLoading = false,
  weeklyTransitRows = [],
  transitArticle
}: YouPageProps) {
  const [profileTab, setProfileTab] = useState<YouTab>("transits");
  const [natalChartViewMode, setNatalChartViewMode] = useState<NatalChartViewMode>("circle");
  const [natalAspectPatternDetail, setNatalAspectPatternDetail] = useState<NatalAspectPatternDetailSelection | null>(null);
  const natalOnlyAspects = canonicalNatalAspectsForSnapshot(natalSky);
  const natalChart = natalSky ? (
    <div className="wheel natal-wheel chart-shell" id="wheel-natal" aria-label="Natal chart wheel">
      <div className="chart-frame">
        <SkyWheel
          positions={natalSky.positions}
          aspects={natalOnlyAspects}
          ascendant={natalSky.ascendant}
          ascendantLongitude={natalSky.ascendantLongitude}
          midheavenLongitude={natalSky.midheavenLongitude}
          showHouses
          houseSignLabelStyle={houseSignLabelStyle}
          variant="natal"
          aspectInspector
        />
      </div>
    </div>
  ) : null;
  const updatesChart = natalSky && currentSky ? (
    <div className="wheel natal-wheel chart-shell" id="wheel-updates-transits" aria-label="Transit chart wheel">
      <div className="chart-frame">
        <SkyWheel
          positions={natalSky.positions}
          aspects={[]}
          transitPositions={currentSky.positions}
          transitAspects={updateTransitAspectLines}
          ascendant={natalSky.ascendant}
          ascendantLongitude={natalSky.ascendantLongitude}
          midheavenLongitude={natalSky.midheavenLongitude}
          showHouses
          houseSignLabelStyle={houseSignLabelStyle}
          variant="natal"
        />
      </div>
    </div>
  ) : null;
  const activeChart = profileTab === "transits" && updatesChart ? updatesChart : natalChart;
  const activeChartLabel = profileTab === "transits" && updatesChart ? "Transit chart" : "Natal chart";
  const natalTableContent = natalTableRows.length > 0 ? (
    <NatalChartDataTable rows={natalTableRows} title="Your natal placement table" />
  ) : null;

  if (!hasSavedBirthDetails) {
    return <YouEmptyState onCreateChart={onCreateChart} setupStepsLeft={setupStepsLeft} />;
  }

  if (natalAspectPatternDetail) {
    return (
      <YouTransitArticlePage
        article={natalAspectPatternDetailArticle(natalAspectPatternDetail)}
        backAriaLabel="Back to natal chart"
        onClose={() => setNatalAspectPatternDetail(null)}
      />
    );
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
          natalChartStatus={natalChartStatus}
          natalChartError={natalChartError}
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
            profileHandle={profileHandle}
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
              elementalSummaryLabel={elementalSummaryLabel}
              elementalSummarySentence={elementalSummarySentence}
              emptyHouseRows={emptyHouseRows}
              natalAspectGroups={natalAspectGroups}
              natalAspectPatternItems={natalAspectPatternItems}
              natalAspectPatternStatus={natalAspectPatternStatus}
              onOpenNatalAspectPatternDetail={(item, nestedItems) => {
                setNatalAspectPatternDetail({ item, nestedItems });
              }}
              planetRows={planetRows}
              showNatalSignatures={showNatalSignatures}
              signatureBody={signatureBody}
              signatureTitle={signatureTitle}
            />
          )}

          {profileTab === "transits" && (
            <YouUpdatesTab
              aspectRows={aspectRows}
              dailyHoroscopeAssembly={dailyHoroscopeAssembly}
              dailyUpdateSummary={dailyUpdateSummary}
              weeklyHoroscopeAssembly={weeklyHoroscopeAssembly}
              hasSavedCurrentCity={hasSavedCurrentCity}
              natalAspectPatternItems={natalAspectPatternItems}
              natalAspectPatternTimingOverrides={natalAspectPatternTimingOverrides}
              onCreateChart={onCreateChart}
              personalTimingSummary={personalTimingSummary}
              standaloneTransitRows={standaloneTransitRows}
              transitDateLabel={transitDateLabel}
              transitsLoading={transitsLoading}
              weeklyTransitRows={weeklyTransitRows}
            />
          )}
        </main>
      </div>
    </section>
  );
}
