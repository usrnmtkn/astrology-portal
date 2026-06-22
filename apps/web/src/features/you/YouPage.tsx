import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, MoreVertical, Pencil, Sparkles } from "lucide-react";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { SegmentedControl } from "../../components/SegmentedControl";

type YouTab = "transits" | "chart";

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
  natalAspectRows: ReactNode[];
  onCreateChart: () => void;
  onCloseTransitArticle?: () => void;
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
  natalChart,
  natalChartPending
}: {
  natalChart: ReactNode;
  natalChartPending: boolean;
}) {
  return (
    <aside className="chart-layout__visual" aria-label="Natal chart">
      {natalChart}
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
  elementalSummaryLabel,
  elementalSummarySentence,
  emptyHouseRows,
  natalAspectRows,
  planetRows,
  showNatalSignatures,
  signatureBody,
  signatureTitle
}: {
  bigThreeRows: ReactNode[];
  elementalSummaryLabel: string;
  elementalSummarySentence: string;
  emptyHouseRows: ReactNode[];
  natalAspectRows: ReactNode[];
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

      <span className="eyebrow section-label">Big Three</span>
      <div className="list you-list-card planet-placement-list" aria-label="Big three">
        {bigThreeRows}
      </div>

      {planetRows.length > 0 && (
        <>
          <span className="eyebrow section-label">Planets</span>
          <div className="list you-list-card planet-placement-list" aria-label="Planets">
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
          <div className="list you-aspects-list aspect-row-list natal-aspects-list" aria-label="Aspects">
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
  onCreateChart,
  personalTimingSummary
}: {
  aspectRows: ReactNode[];
  dailyUpdateSummary?: PersonalTimingSummary | null;
  hasSavedCurrentCity: boolean;
  onCreateChart: () => void;
  personalTimingSummary?: PersonalTimingSummary | null;
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
        </section>
      )}
      {hasSavedCurrentCity && dailyWriteup.length > 0 && (
        <section className="daily-horoscope-writeup" aria-label="Daily horoscope write-up">
          {dailyWriteup.map((section, sectionIndex) => (
            <div className="daily-horoscope-writeup__section" key={`${section.heading ?? "daily"}-${sectionIndex}`}>
              {section.heading ? <h3>{section.heading}</h3> : null}
              {section.body.map((paragraph, paragraphIndex) => (
                <p key={`${sectionIndex}-${paragraphIndex}`}>{paragraph}</p>
              ))}
            </div>
          ))}
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
      {hasSavedCurrentCity && aspectRows.length === 0 && (
        <section className="you-empty-card" aria-label="Transit setup">
          <span>Updates</span>
          <h3>No major updates to your chart today.</h3>
          <p>The sky is still moving, but nothing is pressing hard on your natal placements right now.</p>
          <button type="button" onClick={onCreateChart}>Edit details →</button>
        </section>
      )}
    </div>
  );
}

function isPlaceholderArticleText(value: string) {
  const normalized = value.trim().toLowerCase();

  return !normalized || normalized === "tldr" || normalized === "tl;dr";
}

function cleanArticleText(value?: string | null) {
  const text = (value ?? "").replace(/^TLDR:\s*/i, "").replace(/\s+/g, " ").trim();

  return isPlaceholderArticleText(text) ? "" : text;
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
  const sections = article.sections
    .map((section) => ({
      heading: cleanArticleHeading(section.heading),
      tldr: cleanArticleText(section.tldr),
      body: section.body
    }))
    .filter((section) => section.heading || section.tldr || articleParagraphs(section.body).length);
  const introParagraphs = article.bodyBeforeSections
    ? dedupeArticleParagraphs((article.body ?? [])
      .map((paragraph) => (typeof paragraph === "string" ? cleanArticleText(paragraph) : ""))
      .filter(Boolean))
    : [];
  const hasReadableBody = Boolean(summary || introParagraphs.length || sections.length);
  const summaryHeading = cleanArticleText(article.summaryHeading) || "Overview";
  const articleTldr = cleanArticleText(article.subtitle || summary || introParagraphs[0] || sections[0]?.tldr);
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
              {introParagraphs.length ? (
                <section className={`article-section sky-detail-section ${article.plainBody ? "sky-detail-plain-section" : "sky-detail-intro-section"}`}>
                  {introParagraphs.map((paragraph, index) => (
                    <p key={`intro-${index}`}>{paragraph}</p>
                  ))}
                </section>
              ) : null}
              {summary && !article.bodyBeforeSections ? (
                <section className="article-section sky-detail-section">
                  <h2>{summaryHeading}</h2>
                  <p>{summary}</p>
                </section>
              ) : null}
              {sections.map((section, index) => {
                const showTldr = section.tldr && section.tldr !== section.body;
                const bodyParagraphs = articleParagraphs(section.body);

                return (
                <section className="article-section sky-detail-section" key={`${section.heading}-${index}`}>
                  {section.heading ? <h2>{section.heading}</h2> : null}
                  {showTldr ? <p>{section.tldr}</p> : null}
                  {bodyParagraphs.map((paragraph, paragraphIndex) => (
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
  natalChart,
  natalChartPending,
  onCreateChart,
  onCloseTransitArticle,
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
  transitArticle
}: YouPageProps) {
  const [profileTab, setProfileTab] = useState<YouTab>("chart");

  if (!hasSavedBirthDetails) {
    return <YouEmptyState onCreateChart={onCreateChart} setupStepsLeft={setupStepsLeft} />;
  }

  if (transitArticle && onCloseTransitArticle) {
    return <YouTransitArticlePage article={transitArticle} onClose={onCloseTransitArticle} />;
  }

  return (
    <section className="you-page you-chart-page page-shell" aria-label="You">
      <div className="chart-layout">
        <YouNatalChartPanel natalChart={natalChart} natalChartPending={natalChartPending} />

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
              { value: "transits", label: "Updates" },
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
              natalAspectRows={natalAspectRows}
              planetRows={planetRows}
              showNatalSignatures={showNatalSignatures}
              signatureBody={signatureBody}
              signatureTitle={signatureTitle}
            />
          )}

          {profileTab === "transits" && (
            <YouUpdatesTab
              aspectRows={aspectRows}
              dailyUpdateSummary={dailyUpdateSummary}
              hasSavedCurrentCity={hasSavedCurrentCity}
              onCreateChart={onCreateChart}
              personalTimingSummary={personalTimingSummary}
            />
          )}
        </main>
      </div>
    </section>
  );
}
