import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { pointGlyph } from "../../components/charts/chartAssets";
import { ArticlePills } from "../../components/ArticlePills";
import { PageLoading } from "../../components/PageLoading";
import {
  inferArticleBlockStyle,
  noteTextFromBody,
  placementGlyphFromHeading,
  placementPlanetFromHeading,
  splitIntroParagraphs,
  type ArticleBlockStyle
} from "../../content/articleBlockStyle";
import { astro101LocationState, astro101ReaderPath } from "../../content/astro101";
import {
  houseCatalog,
  houseNumberFromContentKey,
  signCatalog,
  signKeyFromContentKey
} from "../../content/learnCatalog";
import {
  LEARN_ASPECT_INDEX,
  LEARN_ECLIPSE_INDEX,
  LEARN_HOUSE_INDEX,
  LEARN_JUMP_LINKS,
  LEARN_PHASE_INDEX,
  LEARN_PLANET_INDEX,
  LEARN_POINT_INDEX,
  LEARN_RETROGRADE_NATAL_INDEX,
  LEARN_RETROGRADE_SKY_INDEX,
  LEARN_SIGN_INDEX,
  type LearnElement
} from "../../content/learnIndexCatalog";
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
    <button
      aria-label="Back to Astro 101"
      className="sky-detail-back floating-back-button"
      type="button"
      onClick={() => onOpenPath("/learn")}
    >
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back</span>
    </button>
  );
}

function BlockLists({ lists }: { lists: Astro101Page["blocks"][number]["list"] }) {
  if (!lists?.length) return null;
  return (
    <>
      {lists.map((list, index) => {
        const Tag = list.ordered ? "ol" : "ul";
        return (
          <Tag className="learn-article-list" key={`${list.ordered ? "ol" : "ul"}-${index}`}>
            {list.items.map((item) => (
              <li key={item.slice(0, 48)}>{item}</li>
            ))}
          </Tag>
        );
      })}
    </>
  );
}

function BlockView({
  style,
  heading,
  body,
  list
}: {
  style: ArticleBlockStyle;
  heading: string;
  body: string;
  list?: Astro101Page["blocks"][number]["list"];
}) {
  const lists = list?.length ? <BlockLists lists={list} /> : null;
  const prose = !lists && body ? <Paragraphs text={style === "note" || style === "callout" ? noteTextFromBody(body) : body} /> : null;
  if (style === "note" || style === "callout") {
    return (
      <aside className={`learn-note learn-note--${style}`} aria-label={style === "note" ? "Note" : "Callout"}>
        <span className="learn-kicker">{style === "note" ? "Note" : "Callout"}</span>
        <div>{lists}{prose}</div>
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
    const glyph = planet ? pointGlyph(planet) : placementGlyphFromHeading(heading);
    const anchor = heading.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
    return (
      <section className="learn-placement" id={anchor || undefined}>
        {glyph ? <span className="learn-glyph-disk" aria-hidden="true">{glyph}</span> : <span className="learn-glyph-disk" aria-hidden="true" />}
        <div>
          {heading ? <h2>{heading}</h2> : null}
          {lists}
          {prose}
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
      {lists}
      {prose}
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
        : page.kind === "point"
          ? "Astro 101 / Points"
          : page.kind === "retrograde"
            ? "Astro 101 / Retrogrades"
            : page.kind === "phase"
              ? "Astro 101 / Moon"
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
            list={block.list}
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

function pageByContentKey(pages: Astro101Page[], contentKey: string) {
  return pages.find((page) => page.contentKey === contentKey) ?? null;
}

function chapterPath(pages: Astro101Page[], slugTail: string) {
  const match = pages.find((page) => page.kind === "chapter" && page.slug.endsWith(`/${slugTail}`));
  return match?.slug ?? `/learn/astro-101/${slugTail}`;
}

function scrollToLearnSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LearnIndexCard({
  lead,
  leadExtra,
  trail,
  title,
  detail,
  pair,
  element,
  elementEmoji,
  onOpen
}: {
  lead: string;
  leadExtra?: string;
  trail?: string;
  title: string;
  detail: string;
  pair?: boolean;
  element?: LearnElement;
  elementEmoji?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="learn-index-card" onClick={onOpen}>
        <span className={`learn-index-card__top${pair ? " learn-index-card__top--pair" : ""}`}>
        <span className="learn-index-card__lead">
          <span>{lead}</span>
          {leadExtra ? <span>{leadExtra}</span> : null}
        </span>
        {trail ? <span className="learn-index-card__trail">{trail}</span> : null}
      </span>
      <span className="learn-index-card__foot">
        <span className="learn-index-card__title">{title}</span>
        {element ? (
          <span className={`learn-element-chip learn-element-chip--${element.toLowerCase()}`}>
            <span aria-hidden="true">{elementEmoji}</span>
            <span>{element}</span>
          </span>
        ) : (
          <span className="learn-index-card__detail">{detail}</span>
        )}
      </span>
      <ChevronRight className="learn-index-card__chevron" size={18} aria-hidden="true" />
    </button>
  );
}

function LearnHouseCard({
  roman,
  glyph,
  name,
  ruler,
  href,
  onOpen
}: {
  roman: string;
  glyph: string;
  name: string;
  ruler: string;
  href: string;
  onOpen: () => void;
}) {
  return (
    <a
      className="learn-house-card"
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onOpen();
      }}
    >
      <span className="learn-house-card__top">
        <span className="learn-house-card__mark">{roman}</span>
        <span className="learn-house-card__mark" aria-hidden="true">{glyph}</span>
      </span>
      <span className="learn-house-card__foot">
        <span className="learn-house-card__name">{name}</span>
        <span className="learn-house-card__meta">Ruled by {ruler}</span>
      </span>
      <svg className="learn-house-card__chevron" viewBox="0 0 10 18" fill="none" aria-hidden="true">
        <path
          d="M1.5 1.5 8.5 9l-7 7.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}

function LearnIndexGrid({ children }: { children: ReactNode }) {
  return <ul className="learn-index-grid">{children}</ul>;
}

function LearnHub({ pages, onOpenPath }: { pages: Astro101Page[]; onOpenPath: (path: string) => void }) {
  const chapters = useMemo(
    () => pages.filter((page) => page.kind === "chapter"),
    [pages]
  );

  const openKey = (kind: string, id: string) => {
    const page = pageByContentKey(pages, `education/astro-101/${kind}/${id}`);
    if (page) onOpenPath(page.slug);
  };

  return (
    <div className="learn-hub">
      <section className="learn-hero-card" aria-labelledby="learn-hub-title">
        <h1 className="learn-hero__title" id="learn-hub-title">Astro 101</h1>
        <nav className="learn-jump" aria-label="Astro 101 sections">
          {LEARN_JUMP_LINKS.map((link) => (
            <a
              className="learn-jump__link"
              href={`#learn-${link.id}`}
              key={link.id}
              onClick={(event) => {
                event.preventDefault();
                scrollToLearnSection(`learn-${link.id}`);
              }}
            >
              <span className="learn-jump__glyph" aria-hidden="true">{link.glyph}</span>
              {link.label}
            </a>
          ))}
        </nav>
      </section>

      {chapters.length ? (
        <section className="learn-sheet learn-sheet--chapters" aria-labelledby="learn-chapters-title">
          <h2 className="sr-only" id="learn-chapters-title">Chapters</h2>
          <ol className="learn-chapters">
            {chapters.map((page) => (
              <li key={page.contentKey}>
                <button type="button" className="learn-chapter" onClick={() => onOpenPath(page.slug)}>
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

      <h2 className="learn-references-title">References</h2>

      <section className="learn-index-section learn-index-section--houses" id="learn-houses" aria-labelledby="learn-houses-title">
        <header className="learn-index-section__header">
          <h2 id="learn-houses-title">The twelve houses</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_HOUSE_INDEX.map((house) => {
            const href = pageByContentKey(pages, `education/astro-101/house/${house.id}`)?.slug
              ?? astro101ReaderPath("house", String(Number(house.id)));
            return (
              <li key={house.id}>
                <LearnHouseCard
                  glyph={house.glyph}
                  href={href}
                  name={house.name}
                  onOpen={() => onOpenPath(href)}
                  roman={house.roman}
                  ruler={house.ruler}
                />
              </li>
            );
          })}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-signs" aria-labelledby="learn-signs-title">
        <header className="learn-index-section__header">
          <h2 id="learn-signs-title">The twelve zodiac signs</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_SIGN_INDEX.map((sign) => (
            <li key={sign.id}>
              <LearnIndexCard
                detail={sign.element}
                element={sign.element}
                elementEmoji={sign.emoji}
                lead={sign.glyph}
                onOpen={() => openKey("sign", sign.id)}
                title={sign.name}
                trail={sign.mode}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-planets" aria-labelledby="learn-planets-title">
        <header className="learn-index-section__header">
          <h2 id="learn-planets-title">The planets</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_PLANET_INDEX.map((planet) => (
            <li key={planet.id}>
              <LearnIndexCard
                detail={planet.detail}
                lead={planet.glyph}
                leadExtra={planet.extraGlyph}
                onOpen={() => onOpenPath(chapterPath(pages, planet.target))}
                title={planet.name}
                trail={planet.meta}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-points" aria-labelledby="learn-points-title">
        <header className="learn-index-section__header">
          <h2 id="learn-points-title">Angles, points and asteroids</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_POINT_INDEX.map((point) => (
            <li key={point.id}>
              <LearnIndexCard
                detail={point.detail}
                lead={point.glyph}
                onOpen={() => openKey("point", point.id)}
                title={point.name}
                trail={point.meta}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-aspects" aria-labelledby="learn-aspects-title">
        <header className="learn-index-section__header">
          <h2 id="learn-aspects-title">The aspects</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_ASPECT_INDEX.map((aspect) => (
            <li key={aspect.name}>
              <LearnIndexCard
                detail={aspect.blurb}
                lead={aspect.glyph}
                onOpen={() => onOpenPath(chapterPath(pages, "aspects"))}
                title={aspect.name}
                trail={`${aspect.angle} · ${aspect.kind}`}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-retrogrades" aria-labelledby="learn-retrogrades-title">
        <header className="learn-index-section__header">
          <h2 id="learn-retrogrades-title">The Retrogrades</h2>
        </header>
        <h3 className="learn-index-kicker">In the sky · transits</h3>
        <LearnIndexGrid>
          {LEARN_RETROGRADE_SKY_INDEX.map((item) => (
            <li key={item.id}>
              <LearnIndexCard
                detail={item.detail}
                lead={item.glyph}
                onOpen={() => openKey("retrograde", item.id)}
                title={item.name}
              />
            </li>
          ))}
        </LearnIndexGrid>
        <h3 className="learn-index-kicker">In the natal chart</h3>
        <LearnIndexGrid>
          {LEARN_RETROGRADE_NATAL_INDEX.map((item) => (
            <li key={item.id}>
              <LearnIndexCard
                detail={item.detail}
                lead={item.glyph}
                onOpen={() => openKey("retrograde", item.id)}
                title={item.name}
                trail={item.meta}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-moon" aria-labelledby="learn-moon-title">
        <header className="learn-index-section__header">
          <h2 id="learn-moon-title">The Lunar Phases</h2>
        </header>
        <LearnIndexGrid>
          {LEARN_PHASE_INDEX.map((item) => (
            <li key={item.id}>
              <LearnIndexCard
                detail={item.detail}
                lead={item.glyph}
                onOpen={() => openKey("phase", item.id)}
                title={item.name}
                trail={item.meta}
              />
            </li>
          ))}
        </LearnIndexGrid>
        <h3 className="learn-index-kicker">Eclipses</h3>
        <LearnIndexGrid>
          {LEARN_ECLIPSE_INDEX.map((item) => (
            <li key={item.id}>
              <LearnIndexCard
                detail={item.detail}
                lead={item.glyph}
                onOpen={() => openKey("phase", item.id)}
                title={item.name}
                trail={item.meta}
              />
            </li>
          ))}
        </LearnIndexGrid>
      </section>
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
    <section
      className={`learn-page${showBack ? " learn-article-page" : ""}`}
      aria-label="Astro 101"
      aria-labelledby={labelledBy}
    >
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
