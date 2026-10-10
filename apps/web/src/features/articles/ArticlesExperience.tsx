import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FormattedProse, FormattedText } from "../../components/FormattedProse";
import { PageLoading } from "../../components/PageLoading";
import { loadReaderRows } from "../../services/readerContentClient";
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../../services/contentUpdateSignal";
import type { GeneratedContentRow } from "../../services/generatedContent";
import { articleKeyFromHash, articleLibraryKind, articleLibraryPrefixes, articleReaderHref, type ArticleLibraryKind } from "../../../../../src/shared/articleLibrary";

const labels = { article: "Article", guide: "Guide", sky: "Sky article" };
function readable(row: GeneratedContentRow) {
  return articleLibraryKind(row) && row.status === "LIVE" && row.lane === "serving" && !row.review_state
    && Boolean(row.headline?.trim() && row.body?.trim());
}

/** Render authored headings and every paragraph, without deriving an excerpt. */
function ArticleBody({ body }: { body: string }) {
  const blocks = body.split(/(^#{1,6} .+$)/mu).filter(Boolean);
  return <>{blocks.map((block, index) => {
    const heading = block.match(/^(#{1,6}) (.+)$/u);
    if (heading) {
      const Heading = `h${Math.min(6, Math.max(2, heading[1].length))}` as "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={index}><FormattedText text={heading[2]} /></Heading>;
    }
    return block.split(/\n\s*\n/u).filter(text => text.trim()).map((text, paragraph) => <FormattedProse key={`${index}-${paragraph}`} text={text} />);
  })}</>;
}

export default function ArticlesExperience() {
  const [rows, setRows] = useState<GeneratedContentRow[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [revision, setRevision] = useState(0);
  const [key, setKey] = useState(() => articleKeyFromHash(window.location.hash));
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<ArticleLibraryKind | "all">("all");
  useEffect(() => {
    const navigate = () => { setKey(articleKeyFromHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    return () => { window.removeEventListener("hashchange", navigate); window.removeEventListener("popstate", navigate); };
  }, []);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const stopUpdates = subscribeToContentUpdates(refresh), stopRevalidation = subscribeToContentRevalidation(refresh);
    return () => { stopUpdates(); stopRevalidation(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const deadline = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    setState("loading");
    // Fail as a unit: a failed category is not an empty library.
    void Promise.all(articleLibraryPrefixes.map(prefix => loadReaderRows({ prefix }, deadline))).then(results => {
      if (controller.signal.aborted) return;
      if (results.some(result => result.error)) { setRows([]); setState("error"); return; }
      const unique = new Map(results.flatMap(result => result.data ?? []).filter(readable).map(row => [row.content_key, row]));
      setRows([...unique.values()].sort((a, b) => (b.target_date ?? b.updated_at).localeCompare(a.target_date ?? a.updated_at)));
      setState("ready");
    }).catch(() => {
      if (!controller.signal.aborted) { setRows([]); setState("error"); }
    });
    return () => controller.abort();
  }, [revision]);
  const selected = rows.find(row => row.content_key === key);
  const filtered = useMemo(() => rows.filter(row => (kind === "all" || articleLibraryKind(row) === kind)
    && [row.headline, row.summary].some(text => text?.toLowerCase().includes(query.trim().toLowerCase()))), [rows, kind, query]);

  return <section className="learn-page articles-page" aria-label="Articles & Guides">
    {key && <a className="sky-detail-back floating-back-button" href="#articles" aria-label="Back to Articles & Guides"><ChevronLeft size={18} aria-hidden="true" />Back</a>}
    {state === "loading" ? <PageLoading message="Loading articles and guides…" /> : state === "error" ? <div className="learn-sheet articles-library-state">
      <h1 className="article-title">Articles &amp; Guides</h1><p role="alert">Articles and guides could not load.</p>
      <button className="learn-jump__link" onClick={() => setRevision(value => value + 1)}>Try again</button>
    </div> : key ? selected ? <article className="learn-sheet learn-sheet--article">
      <header className="learn-article-header"><p className="learn-kicker">{labels[articleLibraryKind(selected)!]}</p><h1 className="article-title">{selected.headline}</h1></header>
      <div className="learn-article-body"><ArticleBody body={selected.body!} /></div>
    </article> : <div className="learn-sheet articles-library-state"><h1 className="article-title">Article unavailable</h1><p>This article is not currently published.</p></div> : <div className="learn-hub">
      <header className="articles-library-header"><h1 className="article-title">Articles &amp; Guides</h1><p>Explore dated Sky articles and guides you can return to anytime.</p></header>
      <div className="articles-library-filters">
        <label>Search articles and guides<input type="search" value={query} onChange={event => setQuery(event.target.value)} /></label>
        <label>Type<select value={kind} onChange={event => setKind(event.target.value as typeof kind)}>
          <option value="all">All</option><option value="sky">Sky articles</option><option value="guide">Guides</option><option value="article">Articles</option>
        </select></label>
      </div>
      {filtered.length ? <ul className="articles-library-list">{filtered.map(row => <li key={row.content_key}><a className="learn-sheet articles-library-card" href={articleReaderHref(row.content_key)}>
        <span className="learn-kicker">{labels[articleLibraryKind(row)!]}</span><h2 className="learn-chapter__title">{row.headline}</h2>
        {row.summary && <FormattedProse text={row.summary} />}<ChevronRight aria-hidden="true" size={20} />
      </a></li>)}</ul> : <p role="status">{rows.length ? "No articles match these filters." : "No articles or guides are published yet."}</p>}
    </div>}
  </section>;
}
