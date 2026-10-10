import { Fragment, useEffect, useState } from "react";
import type { SkySnapshot } from "../../types";
import { natalInsightGuideKey, type NatalInsightId } from "../../content/natalInsightCatalog";
import { natalInsightReadingKey } from "../../services/natalInsightReading";
import { loadUserGeneratedInterpretation } from "../../services/userGeneratedContent";
import { loadLiveGeneratedContentForKeys } from "../../services/generatedContent";
import { composeNatalInsight, natalInsightBirthTimeKnown, natalInsightCompositionKeys, natalInsightCompositionPlan } from "../../services/natalInsightComposition";
import FormattedWritingContent from "../FormattedWritingContent";
import { natalReadingSections } from "./natalReadingSections";

function linkedPlacements(text: string) {
  const terms = /\b(?:(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto) in )?(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces)\b/gu;
  const nodes = [];
  let start = 0;
  for (const match of text.matchAll(terms)) {
    nodes.push(<Fragment key={match.index}>{text.slice(start, match.index)}<a href={`/learn/signs/${match[1].toLowerCase()}`}>{match[0]}</a></Fragment>);
    start = match.index! + match[0].length;
  }
  return <>{nodes}{text.slice(start)}</>;
}

/** Headings belong to the saved template; chart facts are interpolated upstream. */
export function NatalInsightProse({ body, audience = "you" }: { body: string; audience?: "you" | "friend" }) {
  const sections = natalReadingSections(body);
  const hasGroups = sections.some(section => section.heading && section.level === 2);
  let ordinal = 0;
  return <>{sections.map((section, index) => {
    const Heading = hasGroups && section.level === 3 ? "h3" : "h2";
    return <section className={`natal-insight-reading__section${section.band ? " natal-insight-reading__section--band" : ""}${!section.paragraphs.length ? " natal-insight-reading__section--group" : ""}`} key={index}>
      <div className="natal-reading-measure">
        {section.label && <p className="natal-reading-label">{String(++ordinal).padStart(2, "0")} · {section.label}</p>}
        {section.heading && <Heading><FormattedWritingContent inline text={section.heading} renderText={linkedPlacements} /></Heading>}
        {section.label === "chart ruler" && <p className="natal-reading-subtitle">Its sign shows how {audience === "you" ? "you" : "they"} act; its house shows where that energy goes.</p>}
        <div className="natal-reading-prose">{section.paragraphs.map((text, i) => <FormattedWritingContent key={i} text={text} emphasizeOpening renderText={linkedPlacements} />)}</div>
      </div>
    </section>;
  })}</>;
}

export function NatalInsightGuideBody({ body }: { body: string }) {
  // Preserve paragraph breaks, including older guides with single-line breaks.
  const paragraphs = body.replace(/([^\n])\n(?=\S)/gu, "$1\n\n");
  return <div className="natal-insight-guide">
    <FormattedWritingContent text={paragraphs} />
  </div>;
}

function NatalInsightGuide({ topic, untimed }: { topic: NatalInsightId; untimed: boolean }) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ key: string; status: "ready" | "error"; body: string } | null>(null);
  const key = natalInsightGuideKey(topic, untimed);
  useEffect(() => {
    let active = true;
    setResult(null);
    void loadLiveGeneratedContentForKeys([key], { requireFresh: true })
      .then(rows => { if (active) setResult({ key, status: "ready", body: rows.get(key)?.body ?? "" }); })
      .catch(() => { if (active) setResult({ key, status: "error", body: "" }); });
    return () => { active = false; };
  }, [key, retry]);
  if (!result || result.key !== key) return <p role="status">Loading the guide…</p>;
  if (result.status === "error") return <div role="alert"><p>The guide could not load.</p><button className="text-button" type="button" onClick={() => setRetry(n => n + 1)}>Try loading the guide again</button></div>;
  return result.body ? <details className="natal-reading-guide-disclosure"><summary>Read the guide</summary><NatalInsightGuideBody body={result.body} /></details> : null;
}

export function NatalInsightReading({ topic, sky, birthTimeKnown, subjectId, audience = "you" }: {
  topic: NatalInsightId; sky: SkySnapshot; birthTimeKnown: boolean; subjectId: string; audience?: "you" | "friend";
}) {
  const known = natalInsightBirthTimeKnown(sky, birthTimeKnown);
  return <>
    {topic === "approach" && known && <div className="natal-reading-intro"><p className="natal-reading-measure">{audience === "you" ? "Read in three parts: your rising sign, the planet that rules it, and your Sun." : "Read in three parts: their rising sign, the planet that rules it, and their Sun."}</p></div>}
    {!known && <div className="natal-insight-time-note"><p>Birth time is needed to include houses and angles in this reading.</p></div>}
    <NatalInsightInterpretation topic={topic} sky={sky} birthTimeKnown={known} subjectId={subjectId} audience={audience} />
    <div className="natal-reading-guide-wrap"><div className="natal-reading-measure"><NatalInsightGuide topic={topic} untimed={!known} /></div></div>
  </>;
}

function NatalInsightInterpretation({ topic, sky, birthTimeKnown, subjectId, audience }: {
  topic: NatalInsightId; sky: SkySnapshot; birthTimeKnown: boolean; subjectId: string; audience: "you" | "friend";
}) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ identity: string; status: "loading" | "ready" | "error"; body: string } | null>(null);
  const identity = JSON.stringify([subjectId, audience, topic, birthTimeKnown, sky]);
  useEffect(() => {
    let active = true;
    setResult({ identity, status: "loading", body: "" });
    void natalInsightReadingKey(topic, sky, birthTimeKnown, audience)
      .then(contentKey => loadUserGeneratedInterpretation({ subjectType: "natal_summary", subjectId, contentKey, throwOnError: true }))
      .then(async reading => {
        // A manually written, exact-chart reading remains the most specific source.
        // Shared passages cover other charts without creating private copies or AI calls.
        let body = reading?.status === "LIVE" ? reading.body : "";
        if (!body) {
          const plan = natalInsightCompositionPlan(topic, sky, birthTimeKnown, audience);
          const keys = natalInsightCompositionKeys(plan);
          if (keys.length) body = composeNatalInsight(plan, await loadLiveGeneratedContentForKeys(keys, { requireFresh: true }))?.body ?? "";
        }
        if (active) setResult({ identity, status: "ready", body });
      })
      .catch(() => { if (active) setResult({ identity, status: "error", body: "" }); });
    return () => { active = false; };
  }, [identity, retry]);
  if (!result || result.identity !== identity || result.status === "loading") return <p role="status">Loading your reading…</p>;
  if (result.status === "error") return <div role="alert"><p>This reading could not load.</p><button className="text-button" type="button" onClick={() => setRetry(n => n + 1)}>Try again</button></div>;
  return <div className="natal-insight-reading">
    {result.body ? <NatalInsightProse body={result.body} audience={audience} />
      : <p>A personalized reading for this chart is not available yet.</p>}
  </div>;
}
