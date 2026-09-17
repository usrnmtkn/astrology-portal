import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { fullDetailReaderFacingParagraphs } from "../../content/readerSafety";
import { astro101LocationState } from "../../content/astro101";
import { loadLiveAstro101Pages, type Astro101Page } from "../../services/astro101Content";
import { PageLoading } from "../../components/PageLoading";

type LearnExperienceProps = {
  pathname: string;
  onOpenPath: (path: string) => void;
};

function kindLabel(kind: string) {
  if (kind === "chapter") return "Chapter";
  if (kind === "sign") return "Sign";
  if (kind === "house") return "House";
  return "Lesson";
}

function pageLeadIn(page: Astro101Page) {
  return (page.intro || page.body || "").trim();
}

function shouldShowSummary(page: Astro101Page) {
  const summary = page.summary.trim();
  if (!summary) return false;
  const lead = pageLeadIn(page);
  return Boolean(lead) && !lead.startsWith(summary);
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {fullDetailReaderFacingParagraphs([text]).map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </>
  );
}

function LearnBackButton({ onOpenPath }: { onOpenPath: (path: string) => void }) {
  return (
    <button className="sky-detail-back floating-back-button" type="button" onClick={() => onOpenPath("/learn")}>
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Astro 101</span>
    </button>
  );
}

function LearnArticle({ page, onOpenPath }: { page: Astro101Page; onOpenPath: (path: string) => void }) {
  return (
    <article className="article-shell sky-detail-article">
      <div className="article-card sky-detail-card">
        <header className="article-id sky-detail-id">
          <div className="article-eyebrow">
            <span>Astro 101</span>
            <span className="article-eyebrow__slash" aria-hidden="true">/</span>
            <span>{kindLabel(page.kind)}</span>
          </div>
          <h1 className="article-title" id="learn-article-title">{page.headline}</h1>
          {shouldShowSummary(page) ? <p className="article-sub">{page.summary}</p> : null}
        </header>
        <hr className="article-rule" />
        <div className="article-body-card sky-detail-body">
          <div className="article-body-inner">
            {page.blocks.length > 0 ? (
              <>
                {page.intro ? (
                  <section className="article-section sky-detail-section">
                    <Paragraphs text={page.intro} />
                  </section>
                ) : null}
                {page.blocks.map((block, index) => (
                  <section className="article-section sky-detail-section" key={`${block.heading || "block"}-${index}`}>
                    {block.heading ? <h2>{block.heading}</h2> : null}
                    {block.body ? <Paragraphs text={block.body} /> : null}
                  </section>
                ))}
              </>
            ) : (
              <section className="article-section sky-detail-section sky-detail-plain-section">
                <Paragraphs text={page.body} />
              </section>
            )}
            {page.related.length > 0 ? (
              <nav className="article-section sky-detail-section" aria-label="Related lessons">
                <h2>Related</h2>
                <ul className="learn-related">
                  {page.related.map((item) => (
                    <li key={item.slug}>
                      <button type="button" className="learn-related__link" onClick={() => onOpenPath(item.slug)}>
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function LearnHub({ pages, onOpenPath }: { pages: Astro101Page[]; onOpenPath: (path: string) => void }) {
  const groups = useMemo(() => {
    const chapters = pages.filter((page) => page.kind === "chapter");
    const signs = pages.filter((page) => page.kind === "sign");
    const houses = pages.filter((page) => page.kind === "house");
    const other = pages.filter((page) => !["chapter", "sign", "house"].includes(page.kind));
    return [
      { label: "Chapters", items: chapters },
      { label: "Signs", items: signs },
      { label: "Houses", items: houses },
      { label: "More", items: other }
    ].filter((group) => group.items.length > 0);
  }, [pages]);

  return (
    <article className="article-shell sky-detail-article">
      <div className="article-card sky-detail-card">
        <header className="article-id sky-detail-id">
          <div className="article-eyebrow">
            <span>Learn</span>
          </div>
          <h1 className="article-title" id="learn-hub-title">Astro 101</h1>
        </header>
        <hr className="article-rule" />
        <div className="article-body-card sky-detail-body">
          <div className="article-body-inner">
            {groups.map((group) => (
              <section className="article-section sky-detail-section" key={group.label} aria-labelledby={`learn-${group.label}`}>
                <h2 id={`learn-${group.label}`}>{group.label}</h2>
                <ul className="learn-index">
                  {group.items.map((page) => (
                    <li key={page.contentKey}>
                      <button type="button" className="learn-index__link" onClick={() => onOpenPath(page.slug)}>
                        <span className="learn-index__title">{page.headline}</span>
                        {page.summary ? <span className="learn-index__summary">{page.summary}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

export function LearnExperience({ pathname, onOpenPath }: LearnExperienceProps) {
  const [pages, setPages] = useState<Astro101Page[] | null>(null);
  const [failed, setFailed] = useState(false);
  const location = astro101LocationState(pathname);

  useEffect(() => {
    let cancelled = false;
    loadLiveAstro101Pages()
      .then((loaded) => {
        if (!cancelled) setPages(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setPages([]);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!pages) {
    return <PageLoading message="Loading Astro 101…" />;
  }

  const page = location && !location.hub
    ? pages.find((item) => item.slug === location.slug) ?? null
    : null;
  const showBack = Boolean(location && !location.hub);
  const labelledBy = failed || !location || location.hub ? "learn-hub-title" : "learn-article-title";

  return (
    <section
      className="article-page sky-detail-page learn-page"
      aria-label="Astro 101"
      aria-labelledby={labelledBy}
    >
      {showBack ? <LearnBackButton onOpenPath={onOpenPath} /> : null}
      {failed ? (
        <article className="article-shell sky-detail-article">
          <div className="article-card sky-detail-card">
            <header className="article-id sky-detail-id">
              <div className="article-eyebrow"><span>Learn</span></div>
              <h1 className="article-title" id="learn-hub-title">Astro 101</h1>
              <p className="article-sub">Astro 101 could not load. Try again in a moment.</p>
            </header>
          </div>
        </article>
      ) : location && !location.hub && !page ? (
        <article className="article-shell sky-detail-article">
          <div className="article-card sky-detail-card">
            <header className="article-id sky-detail-id">
              <div className="article-eyebrow"><span>Learn</span></div>
              <h1 className="article-title" id="learn-article-title">Page not found</h1>
              <p className="article-sub">That lesson is not live yet.</p>
            </header>
          </div>
        </article>
      ) : page ? (
        <LearnArticle page={page} onOpenPath={onOpenPath} />
      ) : (
        <LearnHub pages={pages} onOpenPath={onOpenPath} />
      )}
    </section>
  );
}

export function LearnRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
