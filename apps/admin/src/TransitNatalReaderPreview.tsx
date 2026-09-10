import { adminCredentialHeaders } from "./adminSecret";
import { useEffect, useState } from "react";
import { renderTransitNatalPreview, type TransitNatalSelection } from "./transitNatalSources";
import { subscribeToContentUpdates } from "../../web/src/services/contentUpdateSignal";

type Preview = ReturnType<typeof renderTransitNatalPreview>;

export default function TransitNatalReaderPreview({ selection, voice, secret, onOpenSource }: {
  selection: TransitNatalSelection;
  voice: string;
  secret: string;
  onOpenSource: (contentKey: string, label: string) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ preview: Preview | null; error: string | null; loading: boolean }>({ preview: null, error: null, loading: true });
  useEffect(() => subscribeToContentUpdates(() => setRevision((value) => value + 1)), []);
  const { planet, sign, aspect, natalPoint } = selection;
  useEffect(() => {
    let cancelled = false;
    setState({ preview: null, error: null, loading: true });
    void (async () => {
      const response = await fetch("/api/admin/transit-natal-preview", {
        method: "POST", headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) },
        body: JSON.stringify({ planet, sign, aspect, natalPoint, voice })
      });
      const result = await response.json();
      if (cancelled) return;
      if (!response.ok || !result.rendered) throw new Error(result.error || "Reader preview unavailable.");
      const preview = result.rendered as Preview;
      setState({ preview, error: null, loading: false });
    })().catch((error) => {
      if (!cancelled) setState({ preview: null, error: error instanceof Error ? error.message : "Reader preview unavailable.", loading: false });
    });
    return () => { cancelled = true; };
  }, [planet, sign, aspect, natalPoint, voice, secret, revision]);

  return (
    <section className="admin-natal-source-group" aria-label="Effective transit to natal reader preview">
      <header>
        <p className="admin-eyebrow">Effective reader preview</p>
        <h3>What you see</h3>
        <p>This preview uses the reader package and eligible published updates. Drafts are excluded. Dates, motion, repeat passes, and copy variants depend on the calculated transit in the app.</p>
      </header>
      {state.loading ? <p role="status">Loading reader preview…</p> : state.preview ? (
        <article className="admin-natal-source-card">
          <div className="admin-natal-source-card-copy">
            <div className="admin-natal-source-card-heading"><h4>{state.preview.headline}</h4></div>
            {state.preview.body.split(/\n\n+/u).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {state.preview.sourceKeys.map((key) => <button type="button" key={key} onClick={() => onOpenSource(key, state.preview!.headline)}>Edit selected source <code>{key}</code></button>)}
          </div>
        </article>
      ) : <p role="alert">{state.error}</p>}
    </section>
  );
}
