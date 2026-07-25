import { useEffect, useMemo, useState } from "react";
import {
  getSkyAspectStoryPacketRecords,
  resolveSkyAspectStoryPacket
} from "../../web/src/content/skyAspectStoryPackets/skyAspectStoryPacketResolver.mjs";

const aspects = ["all", "conjunction", "sextile", "trine", "square", "opposition"] as const;
const statuses = ["all", "approved-user-locked", "approved-user"] as const;
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];

function title(value: string) {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function SkyAspectStoryPacketReview() {
  const records = getSkyAspectStoryPacketRecords();
  const [aspect, setAspect] = useState<(typeof aspects)[number]>("all");
  const [status, setStatus] = useState<(typeof statuses)[number]>("approved-user");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [signA, setSignA] = useState("aries");
  const [signB, setSignB] = useState("libra");
  const [dynamicDraft, setDynamicDraft] = useState("");

  const filtered = useMemo(
    () => records.filter((record) => {
      const matchesAspect = aspect === "all" || record.aspect === aspect;
      const matchesStatus = status === "all" || record.editorialStatus === status;
      const haystack = `${record.id} ${record.title} ${record.body}`.toLowerCase();
      return matchesAspect && matchesStatus && haystack.includes(query.trim().toLowerCase());
    }),
    [aspect, query, records, status]
  );

  const selected = filtered.find((record) => record.id === selectedId)
    ?? filtered[0]
    ?? null;

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  useEffect(() => {
    setDynamicDraft(selected?.sentenceRoles.planetaryDynamic ?? "");
  }, [selected?.id, selected?.sentenceRoles.planetaryDynamic]);

  const hasDraftSubstitution = Boolean(
    selected && dynamicDraft.trim() && dynamicDraft.trim() !== selected.sentenceRoles.planetaryDynamic
  );
  const preview = selected
    ? resolveSkyAspectStoryPacket({
        planetA: selected.planetA,
        planetB: selected.planetB,
        aspect: selected.aspect,
        signA,
        signB,
        audience: "admin",
        surface: "sky",
        signSpecificPlanetaryDynamic: hasDraftSubstitution
          ? { text: dynamicDraft, previewOnly: true, sourceKey: "admin-unsaved-preview" }
          : undefined
      })
    : null;

  return (
    <section className="admin-template-page sky-packet-review">
      <section className="admin-content-toolbar">
        <div>
          <p className="admin-eyebrow">Exact-aspect packets</p>
          <h2>Current-sky story review</h2>
          <p>Each preview resolves one intact five-sentence packet. All 225 V10.1 packets are owner-approved for reader use; later imports require a separate approval.</p>
        </div>
        <div className="sky-packet-counts" aria-label="Packet status counts">
          <span className="ui-pill admin-status status-live">5 locked</span>
          <span className="ui-pill admin-status status-live">220 approved</span>
        </div>
      </section>

      <section className="sky-packet-filters" aria-label="Story packet filters">
        <label>
          <span>Exact aspect</span>
          <select value={aspect} onChange={(event) => setAspect(event.target.value as (typeof aspects)[number])}>
            {aspects.map((value) => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </label>
        <label>
          <span>Editorial status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}>
            {statuses.map((value) => <option key={value} value={value}>{title(value)}</option>)}
          </select>
        </label>
        <label>
          <span>Search</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Planet pair, id, or phrase" />
        </label>
      </section>

      <section className="sky-packet-workspace">
        <aside className="admin-panel sky-packet-list" aria-label={`${filtered.length} matching story packets`}>
          <header>
            <p className="admin-eyebrow">Review queue</p>
            <strong>{filtered.length} packets</strong>
          </header>
          <div>
            {filtered.map((record) => (
              <button
                key={record.id}
                type="button"
                className={record.id === selected?.id ? "is-selected" : ""}
                onClick={() => setSelectedId(record.id)}
              >
                <span>{record.title}</span>
                <small>{record.editorialStatus}</small>
              </button>
            ))}
          </div>
        </aside>

        {selected && preview && (
          <article className="admin-panel sky-packet-preview">
            <header>
              <div>
                <p className="admin-eyebrow">{selected.id}</p>
                <h2>{selected.title}</h2>
              </div>
              <span className="ui-pill admin-status status-live">
                {selected.editorialStatus}
              </span>
            </header>

            <section>
              <h3>Canonical five-sentence body</h3>
              <p>{selected.body}</p>
            </section>

            <section className="sky-packet-sign-preview">
              <div>
                <h3>Complete sign-context preview</h3>
                <p>Only a reviewed planetary-dynamic sentence may replace the packet’s third sentence. This editor is preview-only and does not publish.</p>
              </div>
              <div className="sky-packet-sign-controls">
                <label>
                  <span>{title(selected.planetA)} sign</span>
                  <select value={signA} onChange={(event) => setSignA(event.target.value)}>
                    {signs.map((sign) => <option key={sign} value={sign}>{title(sign)}</option>)}
                  </select>
                </label>
                <label>
                  <span>{title(selected.planetB)} sign</span>
                  <select value={signB} onChange={(event) => setSignB(event.target.value)}>
                    {signs.map((sign) => <option key={sign} value={sign}>{title(sign)}</option>)}
                  </select>
                </label>
              </div>
              <label>
                <span>Planetary dynamic substitution</span>
                <textarea rows={4} value={dynamicDraft} onChange={(event) => setDynamicDraft(event.target.value)} />
              </label>
              <p className="sky-packet-resolved-preview">{preview.body}</p>
            </section>

            <dl className="sky-packet-diagnostics">
              <div><dt>Resolver</dt><dd>{preview.provenance.resolver}</dd></div>
              <div><dt>Selection key</dt><dd>{preview.provenance.selectionKey}</dd></div>
              <div><dt>Packet boundary</dt><dd>{preview.provenance.fallbackLevel}</dd></div>
              <div><dt>Collective lead</dt><dd>{preview.provenance.collectiveLeadUsed ? "used" : "suppressed"}</dd></div>
              <div><dt>Planetary dynamic</dt><dd>{preview.provenance.planetaryDynamicSource}</dd></div>
              <div><dt>Source status</dt><dd>{selected.sourceEditorialStatus ?? selected.editorialStatus}</dd></div>
              <div><dt>Reader state</dt><dd>LIVE eligible</dd></div>
            </dl>
          </article>
        )}
      </section>
    </section>
  );
}
