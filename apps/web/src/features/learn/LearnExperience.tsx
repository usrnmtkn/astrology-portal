import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { pointGlyph } from "../../components/charts/chartAssets";
import { ArticlePills } from "../../components/ArticlePills";
import { PageLoading } from "../../components/PageLoading";
import {
  inferArticleBlockStyle,
  noteTextFromBody,
  placementPlanetFromHeading,
  splitIntroParagraphs,
  type ArticleBlockStyle
} from "../../content/articleBlockStyle";
import { astro101LocationState } from "../../content/astro101";
import {
  chapterIndexLabel,
  houseCatalog,
  houseNumberFromContentKey,
  LEARN_HERO_GLYPHS,
  signCatalog,
  signKeyFromContentKey
} from "../../content/learnCatalog";
import { fullDetailReaderFacingParagraphs } from "../../content/readerSafety";
import { loadLiveAstro101Pages, type Astro101Page } from "../../services/astro101Content";

type LearnExperienceProps = {
  pathname: string;
  onOpenPath: (path: string) => void;
};

function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {fullDetailReaderFacingParagraphs([text]).map((paragraph, index) => (
        <p className={className} key={index}>{paragraph}</p>
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

function BlockView({
  style,
  heading,
  body
}: {
  style: ArticleBlockStyle;
  heading: string;
  body: string;
}) {
  if (style === "note" || style === "callout") {
    return (
      <aside className={`learn-note learn-note--${style}`} aria-label={style === "note" ? "Note" : "Callout"}>
        <span className="learn-kicker">{style === "note" ? "Note" : "Callout"}</span>
        <div>{body ? <Paragraphs text={noteTextFromBody(body)} /> : null}</div>
      </aside>
    );
  }
  if (style === "affirmation") {
    return (
      <figure className="learn-affirmation">
        {heading ? <figcaption className="learn-kicker">{heading}</figcaption> : null}
        {body ? <blockquote><p>{body}</p></blockquote> : null}
      </figure>
    );
  }
  if (style === "placement") {
    const planet = placementPlanetFromHeading(heading);
    const glyph = planet ? pointGlyph(planet) : "";
    return (
      <section className="learn-placement" id={planet ? planet.toLowerCase().replace(/\s+/g, "-") : undefined}>
        {glyph ? <span className="learn-glyph-disk" aria-hidden="true">{glyph}</span> : <span className="learn-glyph-disk" aria-hidden="true" />}
        <div>
          {heading ? <h2>{heading}</h2> : null}
          {body ? <Paragraphs text={body} /> : null}
        </div>
      </section>
    );
  }
  if (style === "lede") {
    return body ? <p className="learn-lede">{body}</p> : null;
  }
  return (
    <section className="article-section">
      {heading ? <h2>{heading}</h2> : null}
      {body ? <Paragraphs text={body} /> : null}
    </section>
  );
}

function LearnArticle({ page, onOpenPath }: { page: Astro101Page; onOpenPath: (path: string) => void }) {
  const house = houseNumberFromContentKey(page.contentKey);
  const houseMeta = house ? houseCatalog(house) : null;
  const signMeta = signCatalog(signKeyFromContentKey(page.contentKey));
  const source = page.intro || (page.blocks.length === 0 ? page.body : "");
  const intro = splitIntroParagraphs(source);
  const kicker = houseMeta
    ? `Astro 101 / ${houseMeta.ordinal}`
    : signMeta
      ? `Astro 101 / ${signMeta.name}`
      : page.kind === "chapter"
        ? "Astro 101 / Chapter"
        : "Astro 101";

  return (
    <article className="learn-sheet learn-sheet--article">
      <header className="learn-article-header">
        <p className="learn-kicker">{kicker}</p>
        <h1 className="article-title" id="learn-article-title">{page.headline}</h1>
        {houseMeta ? (
          <ArticlePills pills={{
            labels: [
              { label: `${houseMeta.roman}  ${houseMeta.ordinal}`, tone: "neutral" },
              { label: houseMeta.name, tone: "neutral" },
              { label: houseMeta.angularity, tone: "muted" },
              { label: `${houseMeta.naturalGlyph} ${houseMeta.naturalSign}`, tone: "neutral" }
            ]
          }} />
        ) : null}
        {signMeta && !houseMeta ? (
          <ArticlePills pills={{ labels: [{ label: `${signMeta.glyph} ${signMeta.name}`, tone: "neutral" }] }} />
        ) : null}
      </header>
      <div className="learn-article-body">
        {intro.lede ? <p className="learn-lede">{intro.lede}</p> : null}
        {intro.paragraphs.map((paragraph) => (
          <p key={paragraph.slice(0, 48)}>{paragraph}</p>
        ))}
        {intro.notes.map((note) => (
          <BlockView body={note} heading="" key={note.slice(0, 48)} style="note" />
        ))}
        {page.blocks.map((block, index) => (
          <BlockView
            body={block.body ?? ""}
            heading={block.heading ?? ""}
            key={`${block.heading || "block"}-${index}`}
            style={inferArticleBlockStyle(block)}
          />
        ))}
        {page.related.length > 0 ? (
          <nav aria-label="Related lessons" className="learn-related">
            <h2 className="learn-kicker">Related</h2>
            <ul>
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
    </article>
  );
}

function LearnHub({ pages, onOpenPath }: { pages: Astro101Page[]; onOpenPath: (path: string) => void }) {
  const chapters = useMemo(
    () => pages.filter((page) => page.kind === "chapter").sort((left, right) => left.contentKey.localeCompare(right.contentKey)),
    [pages]
  );
  const signs = useMemo(
    () => pages.filter((page) => page.kind === "sign").sort((left, right) => left.contentKey.localeCompare(right.contentKey)),
    [pages]
  );
  const houses = useMemo(
    () => pages.filter((page) => page.kind === "house").sort((left, right) => left.contentKey.localeCompare(right.contentKey)),
    [pages]
  );

  return (
    <div className="learn-hub">
      <section className="learn-sheet learn-sheet--hero" aria-labelledby="learn-hub-title">
        <div className="learn-hero">
          <div>
            <p className="learn-kicker">Learn</p>
            <h1 className="learn-hero__title" id="learn-hub-title">Astro 101</h1>
            <p className="learn-hero__intro">
              {chapters.length} short chapters on how a chart works, then a room-by-room tour of the twelve houses. Read in order, or open the house you're curious about.
            </p>
          </div>
          <ul className="learn-hero__glyphs" aria-hidden="true">
            {LEARN_HERO_GLYPHS.map((glyph) => (
              <li key={glyph}><span className="learn-glyph-disk">{glyph}</span></li>
            ))}
          </ul>
        </div>
      </section>

      {chapters.length > 0 ? (
        <section className="learn-sheet" aria-labelledby="learn-chapters-title">
          <header className="learn-sheet__header">
            <h2 id="learn-chapters-title">Chapters</h2>
            <p className="learn-kicker">{chapters.length} chapters</p>
          </header>
          <ol className="learn-chapters">
            {chapters.map((page, index) => (
              <li key={page.contentKey}>
                <button type="button" className="learn-chapter" onClick={() => onOpenPath(page.slug)}>
                  <span className="learn-chapter__num">{chapterIndexLabel(index)}</span>
                  <span className="learn-chapter__copy">
                    <span className="learn-chapter__title">{page.headline}</span>
                    {page.summary ? <span className="learn-chapter__blurb">{page.summary}</span> : null}
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {houses.length > 0 ? (
        <section className="learn-sheet" aria-labelledby="learn-houses-title">
          <header className="learn-sheet__header">
            <h2 id="learn-houses-title">The twelve houses</h2>
            <p className="learn-kicker">Where a planet plays out</p>
          </header>
          <ul className="learn-tiles">
            {houses.map((page) => {
              const meta = houseCatalog(houseNumberFromContentKey(page.contentKey));
              if (!meta) return null;
              return (
                <li key={page.contentKey}>
                  <button type="button" className="learn-tile" onClick={() => onOpenPath(page.slug)}>
                    <span className="learn-tile__meta">
                      <span>{meta.roman}</span>
                      <span aria-hidden="true">{meta.naturalGlyph}</span>
                    </span>
                    <span className="learn-tile__name">{meta.name}</span>
                    <span className="learn-tile__ordinal">{meta.ordinal}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {signs.length > 0 ? (
        <section className="learn-sheet" aria-labelledby="learn-signs-title">
          <header className="learn-sheet__header">
            <h2 id="learn-signs-title">The twelve signs</h2>
            <p className="learn-kicker">{signs.length} signs</p>
          </header>
          <ul className="learn-tiles">
            {signs.map((page) => {
              const meta = signCatalog(signKeyFromContentKey(page.contentKey));
              if (!meta) return null;
              return (
                <li key={page.contentKey}>
                  <button type="button" className="learn-tile" onClick={() => onOpenPath(page.slug)}>
                    <span className="learn-tile__meta">
                      <span aria-hidden="true">{meta.glyph}</span>
                    </span>
                    <span className="learn-tile__name">{meta.name}</span>
                    <span className="learn-tile__ordinal">Placements</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
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
    <section className="learn-page" aria-label="Astro 101" aria-labelledby={labelledBy}>
      {showBack ? <LearnBackButton onOpenPath={onOpenPath} /> : null}
      {failed ? (
        <article className="learn-sheet">
          <header className="learn-article-header">
            <p className="learn-kicker">Learn</p>
            <h1 className="article-title" id="learn-hub-title">Astro 101</h1>
            <p>Astro 101 could not load. Try again in a moment.</p>
          </header>
        </article>
      ) : location && !location.hub && !page ? (
        <article className="learn-sheet">
          <header className="learn-article-header">
            <p className="learn-kicker">Learn</p>
            <h1 className="article-title" id="learn-article-title">Page not found</h1>
            <p>That lesson is not live yet.</p>
          </header>
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
