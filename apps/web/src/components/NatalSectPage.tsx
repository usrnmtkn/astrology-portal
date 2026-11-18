import { useEffect, useId, useState } from "react";
import { ChevronLeft } from "lucide-react";
import type { SkySnapshot } from "../types";
import { natalChartReadings, natalReadingBody, type NatalReadingAudience } from "../content/natalChartReadings";
import { natalSectArticleParts, natalSectRoles, type NatalSect } from "../content/natalSectArticle";
import { subscribeToContentPublications } from "../content/contentPublicationState";
import { loadLiveGeneratedContentForKeys, renderGeneratedContentTemplate, type LiveGeneratedContent } from "../services/generatedContent";
import { closeNatalSectPage } from "../services/natalSectRoute";
import { FormattedProse } from "./FormattedProse";
import { PageLoading, PageLoadError } from "./PageLoading";
import { pointGlyph } from "./charts/chartAssets";
import "../styles/natal-sect-page.css";

export function NatalSectPage({ snapshot, audience, ownerName, chartId, loading = false }: {
  snapshot?: SkySnapshot | null; audience: NatalReadingAudience; ownerName?: string; chartId?: string; loading?: boolean;
}) {
  const reading = natalChartReadings(snapshot, audience).find(row => row.contentKey.includes("/sect/"));
  const key = reading?.contentKey;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ key: string; revision: number; row?: LiveGeneratedContent; error?: boolean } | null>(null);
  const titleId = useId();
  useEffect(() => subscribeToContentPublications(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    if (!key) return;
    let active = true;
    void loadLiveGeneratedContentForKeys([key], { requireFresh: true }).then(rows => {
      if (active) setState({ key, revision, row: rows.get(key) });
    }).catch(() => { if (active) setState({ key, revision, error: true }); });
    return () => { active = false; };
  }, [key, revision]);
  useEffect(() => { document.getElementById(titleId)?.focus({ preventScroll: true }); }, [titleId, key]);
  const pending = loading || Boolean(key && (state?.key !== key || state.revision !== revision));
  const body = !pending && key && state?.key === key ? natalReadingBody(state.row, audience, ownerName) : null;
  const sect: NatalSect = key?.endsWith("/night") ? "night" : "day";
  const rendered = body && state?.row ? renderGeneratedContentTemplate(state.row, audience === "they" ? { ownerName: ownerName! } : {}) : null;
  const parts = body ? natalSectArticleParts(body, sect, rendered?.sections) : null;
  const roles = natalSectRoles(sect);
  return <section className="natal-sect-page" aria-labelledby={titleId}>
    <button className="floating-back-button natal-sect-back" type="button" aria-label="Back" onClick={() => closeNatalSectPage(chartId)}>
      <ChevronLeft size={16} aria-hidden="true" /><span>Back</span>
    </button>
    <article className="natal-sect-article">
      <div className="natal-sect-intro">
        <header className="natal-sect-header">
          {reading && <span className="natal-sect-glyph" data-tone="support" aria-hidden="true">{sect === "day" ? "☉" : "☽"}</span>}
          <div><p className="natal-sect-meta">Sect · {audience === "you" ? "Your natal chart" : `${ownerName ?? "Friend"}'s natal chart`}</p>
            <h1 id={titleId} tabIndex={-1}>{reading?.label ?? "Chart sect"}</h1></div>
        </header>
        {pending ? <PageLoading message="Loading chart reading…" /> : state?.error
          ? <PageLoadError message="The chart reading could not load." onRetry={() => setRevision(value => value + 1)} />
          : !parts ? <p>{key ? "This chart reading is not available yet." : "A known birth time is needed to determine chart sect."}</p> : <>
            {parts.lead.split(/\n{2,}/u).map((text, index) => <FormattedProse key={index} text={text} />)}
            <dl className="natal-sect-roles" aria-label="Sect roles">{roles.map(fact => <div key={fact.role} data-tone={fact.tone}>
              <dt><span className="natal-sect-role-glyph" aria-hidden="true">{pointGlyph(fact.planet)}</span><span className="natal-sect-role-planet">{fact.planet}</span></dt><dd>{fact.role}</dd>
            </div>)}</dl>
          </>}
      </div>
      {parts && <div className="natal-sect-sections">{parts.sections.map((section, index) => <section key={index}>
        {section.fact && <header className="natal-sect-section-header" data-tone={section.fact.tone}>
          <span className="natal-sect-glyph" aria-hidden="true">{pointGlyph(section.fact.planet)}</span>
          <div><h2>{section.fact.planet}</h2><span>{section.fact.role}</span></div>
        </header>}
        {!section.fact && section.heading && <h2>{section.heading}</h2>}
        {section.body.split(/\n{2,}/u).map((text, paragraph) => <FormattedProse key={paragraph} text={text} />)}
      </section>)}</div>}
    </article>
  </section>;
}
