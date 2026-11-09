import "../../styles/learn.css";
import { FormattedProse, FormattedText } from "../../components/FormattedProse";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { pointGlyph } from "../../components/charts/chartAssets";
import { ArticlePills } from "../../components/ArticlePills";
import { PageLoading, PageLoadState } from "../../components/PageLoading";
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
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../../services/contentUpdateSignal";
import { loadLiveAstro101Pages, type Astro101Page } from "../../services/astro101Content";

type LearnExperienceProps = {
  pathname: string;
  onOpenPath: (path: string) => void;
};

function BlockLists({ lists }: { lists: Astro101Page["blocks"][number]["list"] }) {
  if (!lists?.length) return null;
  return lists.map((list, index) => {
    const Tag = list.ordered ? "ol" : "ul";
    return (
      <Tag className="learn-article-list" key={`${list.ordered ? "ol" : "ul"}-${index}`}>
        {list.items.map((item) => (
          <li key={item.slice(0, 48)}><FormattedText text={item} /></li>
        ))}
      </Tag>
    );
  });
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
  const prose = !lists && body ? fullDetailReaderFacingParagraphs([style === "note" || style === "callout" ? noteTextFromBody(body) : body])
    .map((paragraph, index) => <FormattedProse key={index} text={paragraph} />) : null;
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
        {body ? <blockquote><FormattedProse text={body} /></blockquote> : null}
      </figure>
    );
  }
  if (style === "placement") {
    const planet = placementPlanetFromHeading(heading);
    const glyph = planet ? pointGlyph(planet) : placementGlyphFromHeading(heading);
    const anchor = heading.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
    return (
      <section className="learn-placement" id={anchor || undefined}>
        <span className="learn-glyph-disk" aria-hidden="true">{glyph}</span>
        <div>
          {heading ? <h2>{heading}</h2> : null}
          {lists}
          {prose}
        </div>
      </section>
    );
  }
  if (style === "lede") {
    return body ? <FormattedProse className="learn-lede" text={body} /> : null;
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
  const category = houseMeta?.ordinal ?? signMeta?.name ??
    ({ chapter: "Chapter", point: "Points", retrograde: "Retrogrades", phase: "Moon" } as Partial<Record<Astro101Page["kind"], string>>)[page.kind];
  const kicker = category ? `Astro 101 / ${category}` : "Astro 101";

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
        {intro.lede ? <FormattedProse className="learn-lede" text={intro.lede} /> : null}
        {intro.paragraphs.map((paragraph) => (
          <FormattedProse key={paragraph.slice(0, 48)} text={paragraph} />
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
  element,
  elementEmoji,
  onOpen
}: {
  lead: string;
  leadExtra?: string;
  trail?: string;
  title: string;
  detail: string;
  element?: LearnElement;
  elementEmoji?: string;
  onOpen: () => void;
}) {
  return (
    <button type="button" className="learn-index-card" onClick={onOpen}>
      <span className="learn-index-card__top">
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

function LearnIndexGrid({ children }: { children: ReactNode }) {
  return <ul className="learn-index-grid">{children}</ul>;
}

function LearnSectionHeading({ children, id, hidden }: { children: ReactNode; id?: string; hidden?: boolean }) {
  return <header className={hidden ? "sr-only" : "learn-index-section__header"}><h2 id={id}>{children}</h2></header>;
}

function LearnHub({ pages, onOpenPath }: { pages: Astro101Page[]; onOpenPath: (path: string) => void }) {
  const cardGroups = new Map<string, Astro101Page[]>([["Chapters", []]]);
  for (const page of pages) {
    const title = page.kind === "chapter" ? "Chapters" : page.kind === "article" ? page.hubTitle : "";
    if (!title) continue;
    const group = cardGroups.get(title);
    if (group) group.push(page);
    else cardGroups.set(title, [page]);
  }

  const openKey = (kind: string, id: string) => {
    const page = pageByContentKey(pages, `education/astro-101/${kind}/${id}`);
    if (page) onOpenPath(page.slug);
  };
  const referenceGrid = (
    items: readonly { id: string; glyph: string; name: string; detail: string; meta: string }[],
    kind: string,
    showMeta = true
  ) => <LearnIndexGrid>{items.map((item) => (
    <li key={item.id}>
      <LearnIndexCard detail={item.detail} lead={item.glyph} title={item.name} trail={showMeta ? item.meta : undefined} onOpen={() => openKey(kind, item.id)} />
    </li>
  ))}</LearnIndexGrid>;

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

      {[...cardGroups].map(([title, cards]) => cards.length ? (
        <section className="learn-sheet learn-sheet--chapters" aria-label={title} key={title}>
          <LearnSectionHeading hidden={title === "Chapters"}>{title}</LearnSectionHeading>
          <ol className="learn-chapters">
            {cards.map((page) => (
              <li key={page.contentKey}>
                <button type="button" className="learn-chapter" onClick={() => onOpenPath(page.slug)}>
                  <span className="learn-chapter__copy">
                    <span className="learn-chapter__title">{page.headline}</span>
                    {page.summary ? <span className="learn-chapter__blurb"><FormattedText text={page.summary} /></span> : null}
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null)}

      <h2 className="learn-references-title">References</h2>

      <section className="learn-index-section learn-index-section--houses" id="learn-houses" aria-labelledby="learn-houses-title">
        <LearnSectionHeading id="learn-houses-title">The twelve houses</LearnSectionHeading>
        <LearnIndexGrid>
          {LEARN_HOUSE_INDEX.map((house) => {
            const href = pageByContentKey(pages, `education/astro-101/house/${house.id}`)?.slug
              ?? astro101ReaderPath("house", String(Number(house.id)));
            return (
              <li key={house.id}>
                <a
                  className="learn-house-card"
                  href={href}
                  onClick={(event) => {
                    event.preventDefault();
                    onOpenPath(href);
                  }}
                >
                  <span className="learn-house-card__top">
                    <span className="learn-house-card__mark">{house.roman}</span>
                    <span className="learn-house-card__mark" aria-hidden="true">{house.glyph}</span>
                  </span>
                  <span className="learn-house-card__foot">
                    <span className="learn-house-card__name">{house.name}</span>
                    <span className="learn-house-card__meta">Ruled by {house.ruler}</span>
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
              </li>
            );
          })}
        </LearnIndexGrid>
      </section>

      <section className="learn-index-section" id="learn-signs" aria-labelledby="learn-signs-title">
        <LearnSectionHeading id="learn-signs-title">The twelve zodiac signs</LearnSectionHeading>
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
        <LearnSectionHeading id="learn-planets-title">The planets</LearnSectionHeading>
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
        <LearnSectionHeading id="learn-points-title">Angles, points and asteroids</LearnSectionHeading>
        {referenceGrid(LEARN_POINT_INDEX, "point")}
      </section>

      <section className="learn-index-section" id="learn-aspects" aria-labelledby="learn-aspects-title">
        <LearnSectionHeading id="learn-aspects-title">The aspects</LearnSectionHeading>
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
        <LearnSectionHeading id="learn-retrogrades-title">The Retrogrades</LearnSectionHeading>
        <h3 className="learn-index-kicker">In the sky · transits</h3>
        {referenceGrid(LEARN_RETROGRADE_SKY_INDEX, "retrograde", false)}
        <h3 className="learn-index-kicker">In the natal chart</h3>
        {referenceGrid(LEARN_RETROGRADE_NATAL_INDEX, "retrograde")}
      </section>

      <section className="learn-index-section" id="learn-moon" aria-labelledby="learn-moon-title">
        <LearnSectionHeading id="learn-moon-title">The Lunar Phases</LearnSectionHeading>
        {referenceGrid(LEARN_PHASE_INDEX, "phase")}
        <h3 className="learn-index-kicker">Eclipses</h3>
        {referenceGrid(LEARN_ECLIPSE_INDEX, "phase")}
      </section>
    </div>
  );
}

export function LearnExperience({ pathname, onOpenPath }: LearnExperienceProps) {
  const [pages, setPages] = useState<Astro101Page[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(true);
  const [failure, setFailure] = useState<unknown>();
  const [attempt, setAttempt] = useState(0);
  const location = astro101LocationState(pathname);

  useEffect(() => {
    let cancelled = false;
    let revision = 0;
    const reload = () => {
      const requested = ++revision;
      setPending(true);
      loadLiveAstro101Pages().then(loaded => {
        if (!cancelled && requested === revision) { setPages(loaded); setFailed(false); setPending(false); }
      }).catch(error => {
        if (!cancelled && requested === revision) { setPages([]); setFailure(error); setFailed(true); setPending(false); }
      });
    };
    const unsubscribe = subscribeToContentUpdates(notice => {
      if (!notice.contentKey.startsWith("education/astro-101/")) return;
      // Hide an unpublished page immediately, even while the refreshed inventory is loading.
      if (!notice.published) setPages(current => current?.filter(page => page.contentKey !== notice.contentKey) ?? null);
      reload();
    });
    const stopRevalidation = subscribeToContentRevalidation(reload);
    reload();
    return () => { cancelled = true; unsubscribe(); stopRevalidation(); };
  }, [attempt]);

  const page = location && !location.hub
    ? pages?.find((item) => item.slug === location.slug) ?? null
    : null;
  const showBack = Boolean(location && !location.hub);
  const labelledBy = failed || !pages || !location || location.hub ? "learn-hub-title" : "learn-article-title";

  return (
    <section
      className={`learn-page${showBack ? " learn-article-page" : ""}`}
      aria-label="Astro 101"
      aria-labelledby={labelledBy}
    >
      {showBack ? (
        <button
          aria-label="Back to Astro 101"
          className="sky-detail-back floating-back-button"
          type="button"
          onClick={() => onOpenPath("/learn")}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          <span>Back</span>
        </button>
      ) : null}
      {(failed || !pages) && <header className="learn-article-header"><p className="learn-kicker">Learn</p><h1 className="article-title" id="learn-hub-title">Astro 101</h1></header>}
      <PageLoadState scope="page" what="Astro 101" cause={failure} failed={failed} pending={pending} onRetry={() => setAttempt(value => value + 1)}>
      {!pages ? <PageLoading message="Loading Astro 101…" /> : location && !location.hub && !page ? (
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
      </PageLoadState>
    </section>
  );
}

export function LearnRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
