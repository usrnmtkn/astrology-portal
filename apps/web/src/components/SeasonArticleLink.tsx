import { useEffect, useState } from "react";
import { seasonArticleForIngress } from "../../../../src/shared/seasonArticle";
import { loadReaderRows } from "../services/readerContentClient";
import { subscribeToContentUpdates, subscribeToContentRevalidation } from "../services/contentUpdateSignal";
import { subscribeToContentPublications } from "../content/contentPublicationState";

export function SeasonArticleLink({ sign, startsAt, timeZone, className = "learn-jump__link" }: {
  sign: string; startsAt: string; timeZone: string; className?: string;
}) {
  const article = seasonArticleForIngress(sign, startsAt, timeZone);
  const [revision, setRevision] = useState(0);
  const [availableKey, setAvailableKey] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => { setAvailableKey(null); setRevision(value => value + 1); };
    const stops = [subscribeToContentUpdates(refresh), subscribeToContentRevalidation(refresh), subscribeToContentPublications(refresh)];
    return () => stops.forEach(stop => stop());
  }, []);
  useEffect(() => {
    if (!article) return;
    const controller = new AbortController();
    const deadline = AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]);
    void loadReaderRows({ keys: [article.key] }, deadline).then(result => {
      if (controller.signal.aborted) return;
      setAvailableKey(!result.error && result.data?.some(row => row.content_key === article.key && row.status === "LIVE"
        && row.lane === "serving" && !row.review_state && row.headline?.trim() && row.body?.trim()) ? article.key : null);
    }).catch(() => { if (!controller.signal.aborted) setAvailableKey(null); });
    return () => controller.abort();
  }, [article?.key, revision]);
  if (!article || availableKey !== article.key) return null;
  return <a className={className} href={article.href}>Read {sign[0].toUpperCase() + sign.slice(1).toLowerCase()} Season {article.year}</a>;
}
