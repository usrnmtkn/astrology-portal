import { useEffect, useState } from "react";
import { subscribeToContentUpdates } from "../../services/contentUpdateSignal";
import { loadReaderRows } from "../../services/readerContentClient";
import type { GeneratedContentRow } from "../../services/generatedContent";
import { connectionBridgeTemplates, fillConnectionSource, CONNECTION_ACTIVATION_PREFIX } from "../../content/connectionTransit";
import { contentPublication, publicationAllowsContent, subscribeToContentPublications } from "../../content/contentPublicationState";

export function useConnectionTransitSources(keys: string[]) {
  const [lifecycle, setLifecycle] = useState(0);
  useEffect(() => {
    const refresh = () => setLifecycle(value => value + 1);
    const stopPublications = subscribeToContentPublications(refresh);
    const stopUpdates = subscribeToContentUpdates(refresh);
    return () => { stopPublications(); stopUpdates(); };
  }, []);
  const identity = JSON.stringify([...new Set([...keys, ...connectionBridgeTemplates.map(t => t.contentKey)])].sort());
  const [state, setState] = useState<{ identity: string; rows: GeneratedContentRow[] }>({ identity: "", rows: [] });
  useEffect(() => {
    const controller = new AbortController();
    if (!keys.length) return () => controller.abort();
    const timer = setTimeout(() => controller.abort(), 20_000);
    void loadReaderRows({ keys: JSON.parse(identity) }, controller.signal).then(result => {
      if (!controller.signal.aborted) setState({ identity, rows: result.error ? [] : result.data ?? [] });
    }).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, [identity, lifecycle]);
  return {
    rows: state.identity === identity ? state.rows.filter(row => publicationAllowsContent(row.content_key, row.id, row.updated_at)) : [],
    publicationIdentity: JSON.stringify((JSON.parse(identity) as string[]).map(key => [key, contentPublication(key)?.revision]))
  };
}

/** No bundled synastry, reverse-key, audience or bond fallback is allowed here. */
export function publishedConnectionCopy(rows: GeneratedContentRow[], key: string, variables: Record<string, string>) {
  const row = rows.find(r => r.content_key === key && r.status === "LIVE" && r.lane === "serving" && !r.review_state);
  if (!row) return null;
  if (!publicationAllowsContent(key, row.id, row.updated_at)) return null;
  const sections = row.sections as { packageRecord?: { body?: string; body_you?: string; review_status?: string } } | null;
  const record = sections?.packageRecord;
  if (record?.review_status !== "approved") return null;
  const value = key.startsWith(CONNECTION_ACTIVATION_PREFIX) ? record.body_you : record.body;
  return typeof value === "string" ? fillConnectionSource(key, value, variables) : null;
}

export function connectionBridgeCopy(rows: GeneratedContentRow[], key: string, variables: Record<string, string>) {
  // Catalog wording is an editable draft starter, never an implicit publication.
  return publishedConnectionCopy(rows, key, variables);
}
