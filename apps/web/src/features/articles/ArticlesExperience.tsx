import { ContentLoading } from "../../components/LoadingPatterns";
import "../../styles/learn.css";
import "../../styles/articles-blog.css";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { SegmentedControl } from "../../components/SegmentedControl";
import { ArticleCover } from "./ArticleCover";
import { ArticlePublishDate } from "./ArticlePublishDate";
import { FormattedProse, FormattedText } from "../../components/FormattedProse";
import { useMinimumLoading } from "../../hooks/useMinimumLoading";
import { PageLoading, PageLoadState } from "../../components/PageLoading";
import { ReaderUnavailable } from "../../components/ReaderUnavailable";
import { loadReaderRows } from "../../services/readerContentClient";
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../../services/contentUpdateSignal";
import { subscribeToContentPublications } from "../../content/contentPublicationState";
import type { GeneratedContentRow } from "../../services/generatedContent";
import { articleKeyFromHash, articleLibraryKind, articleLibraryPrefixes, articlePublicationIsDue, articleSortDate } from "../../../../../src/shared/articleLibrary";

const labels = { article: "Article", guide: "Guide", sky: "Sky article" };
function readable(row: GeneratedContentRow) {
  return articleLibraryKind(row) && row.status === "LIVE" && row.lane === "serving" && !row.review_state
    && articlePublicationIsDue(row) && Boolean(row.headline?.trim() && row.body?.trim());
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
  const [resolvedKey, setResolvedKey] = useState(key);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | "article" | "guide">("all");
  useEffect(() => {
    const navigate = () => { setKey(articleKeyFromHash(window.location.hash)); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    return () => { window.removeEventListener("hashchange", navigate); window.removeEventListener("popstate", navigate); };
  }, []);
  useEffect(() => {
    const refresh = () => setRevision(value => value + 1);
    const stopPublications = subscribeToContentPublications(refresh);
    const stopUpdates = subscribeToContentUpdates(refresh), stopRevalidation = subscribeToContentRevalidation(refresh);
    return () => { stopPublications(); stopUpdates(); stopRevalidation(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const deadline = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    setState("loading");
    // Direct readings need their exact publication, not the complete library.
    // The library still fails as a unit when any category is unavailable.
    const requests = key ? [loadReaderRows({ keys: [key] }, deadline)]
      : articleLibraryPrefixes.map(prefix => loadReaderRows({ prefix }, deadline));
    void Promise.all(requests).then(results => {
      if (controller.signal.aborted) return;
      setResolvedKey(key);
      if (results.some(result => result.error)) { setRows([]); setState("error"); return; }
      const unique = new Map(results.flatMap(result => result.data ?? []).filter(readable).map(row => [row.content_key, row]));
      setRows([...unique.values()].sort((a, b) => articleSortDate(b) - articleSortDate(a)));
      setState("ready");
    }).catch(() => {
      if (!controller.signal.aborted) { setResolvedKey(key); setRows([]); setState("error"); }
    });
    return () => controller.abort();
  }, [revision, key]);
  const selected = rows.find(row => row.content_key === key);
  const filtered = useMemo(() => rows.filter(row => (kind === "all" || (kind === "guide" ? articleLibraryKind(row) === "guide" : articleLibraryKind(row) !== "guide"))
    && [row.headline, row.summary].some(text => text?.toLowerCase().includes(query.trim().toLowerCase()))), [rows, kind, query]);

  const waiting = useMinimumLoading((state === "loading" || resolvedKey !== key) && (key ? !selected : rows.length === 0));
  const filters = <div className="articles-library-filters">
    <label className="articles-library-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Search articles and guides" placeholder="Search articles and guides" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <SegmentedControl ariaLabel="Article type" value={kind} onChange={setKind} options={[{value:"all",label:"All"},{value:"article",label:"Articles"},{value:"guide",label:"Guides"}]} />
  </div>;

  return <section className="learn-page articles-page" aria-label="Articles & Guides">
    {key && (state !== "ready" || selected) && <a className="sky-detail-back floating-back-button" href="#articles" aria-label="Back to Articles & Guides"><ChevronLeft size={18} aria-hidden="true" /><span>Back</span></a>}
    {key && (waiting || state === "error") && <header className="articles-library-header"><h1 className="article-title">Articles &amp; Guides</h1></header>}
    {key ? <PageLoadState key={key} scope="page" what="This article" failed={state === "error"} pending={waiting} onRetry={() => setRevision(value => value + 1)}>{waiting ? <PageLoading layout="reading" message="Loading articles and guides…" /> : selected ? <article className="learn-sheet learn-sheet--article">
      <header className="learn-article-header"><p className="learn-kicker">{labels[articleLibraryKind(selected)!]}</p><h1 className="article-title">{selected.headline}</h1><ArticlePublishDate row={selected} /></header>
      <div className="learn-article-body"><ArticleBody body={selected.body!} /></div>
    </article> : <ReaderUnavailable kind="article" />}</PageLoadState> : <div className="learn-hub">
      <header className="articles-library-header"><h1 className="article-title">Articles &amp; Guides</h1><p>Explore dated Sky articles and guides you can return to anytime.</p></header>
      {filters}
      <PageLoadState scope="page" what="Articles and guides" failed={state === "error"} pending={waiting} onRetry={() => setRevision(value => value + 1)}>{waiting ? <ContentLoading layout="articles" count={4} message="Loading articles and guides…" /> : filtered.length ? <><ArticleCover row={filtered[0]} index={0} featured />
        {filtered.length > 1 && <ul className="articles-library-list">{filtered.slice(1).map((row,index) => <li key={row.content_key}><ArticleCover row={row} index={index + 1} /></li>)}</ul>}
      </> : <p className="articles-library-empty" role="status">{rows.length ? (query.trim() ? `No articles or guides match “${query.trim()}”.` : "No articles or guides match these filters.") : "No articles or guides are published yet."}</p>}</PageLoadState>
    </div>}
  </section>;
}
