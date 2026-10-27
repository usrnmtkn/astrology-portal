import { useEffect, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";
import { StudioButton } from "./StudioControls";
import { natalEditorialIdentity, type NatalEditorialSelection } from "./natalEditorialLibrary";

export default function NatalSectPlacementComparison({ selection, secret, friendName, body, status, revision }: {
  selection: NatalEditorialSelection; secret: string; friendName: string; body: string; status: string; revision: string;
}) {
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ key: string; base: string; general: string; error: string } | null>(null);
  const { passage, audience, sect, placement } = selection;
  const name = friendName.trim() || "Maya";
  const generalKey = natalEditorialIdentity({ ...selection, placement: undefined }).contentKey;
  const requestKey = JSON.stringify([passage, audience, sect, placement?.sign, placement?.house, name, revision]);
  const current = state?.key === requestKey ? state : null;
  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    async function load() {
      const [baseResponse, generalResponse] = await Promise.all([
        fetch("/api/admin/natal-placement-preview", { method: "POST", headers: { "content-type": "application/json", ...adminCredentialHeaders(secret) },
          body: JSON.stringify({ planet: passage, sign: placement!.sign, house: placement!.house === undefined ? "" : String(placement!.house), audience, ownerName: name, motion: "direct", overrides: [] }), signal: controller.signal }),
        fetch("/api/content-reader", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keys: [generalKey] }), signal: controller.signal })
      ]);
      const base = await baseResponse.json();
      const general = await generalResponse.json();
      if (!baseResponse.ok || typeof base?.rendered?.body !== "string") throw new Error(base?.error || "The existing placement reading could not be loaded.");
      if (!generalResponse.ok || !Array.isArray(general?.rows)) throw new Error("The published sect passage could not be loaded.");
      const row = general.rows.find((row: { content_key: string; status: string; lane: string; review_state: unknown }) => row.content_key === generalKey && row.status === "LIVE" && row.lane === "serving" && !row.review_state);
      if (!row || typeof row.body !== "string" || !row.body.trim()) throw new Error("No published general sect passage is available for comparison.");
      if (!controller.signal.aborted) setState({ key: requestKey, base: base.rendered.body, general: row.body, error: "" });
    }
    void load().catch(error => { if (!controller.signal.aborted) setState({ key: requestKey, base: "", general: "", error: error instanceof Error ? error.message : "The comparison could not be loaded." }); });
    return () => controller.abort();
  }, [passage, audience, sect, placement?.sign, placement?.house, secret, name, generalKey, revision, retry, requestKey]);
  const paragraphs = (text: string) => text.replace(/\{\{\s*ownerName\s*\}\}/gu, () => name).split(/\n\s*\n/u).map((paragraph, index) => <p key={index}>{paragraph}</p>);
  const panels = current ? [
    { title: "Existing placement reading", body: current.base },
    { title: "Published general sect passage", body: current.general },
    { title: status === "LIVE" ? "Published placement sect passage" : "Proposed placement sect passage", body }
  ] : [];
  return <div aria-label="Natal sect reading comparison">
    <p className="admin-field-hint">{placement?.house === undefined
      ? "The selected placement uses direct motion. This comparison includes the sign reading; a house, aspects and the ruler’s condition are not supplied."
      : "The selected placement uses direct motion. This comparison includes the sign and house reading; aspects and the ruler’s condition are not supplied."}</p>
    {!current ? <p role="status">Loading the existing reading…</p> : current.error ? <p role="alert">{current.error} <StudioButton onClick={() => setRetry(value => value + 1)}>Retry comparison</StudioButton></p>
      : panels.map(panel => <article key={panel.title} className="admin-natal-source-card" aria-label={panel.title}>
        <div className="admin-natal-source-card-copy"><div className="admin-natal-source-card-heading"><h4>{panel.title}</h4></div>
          {panel.body ? <div className="admin-natal-reader-preview-part">{paragraphs(panel.body)}</div> : <p>No placement-specific passage has been saved. The reader keeps the published general passage.</p>}
        </div>
      </article>)}
  </div>;
}
