# TLDR Astro project memory

The Memory graph is at `/admin/content/memory`, linked from Content Studio’s Operations navigation. It reuses verified Content Studio owner sessions and emergency admin access. The read-only API verifies access before reading source data, and sends private, no-store responses. The canvas loads complete text for a bounded sample after authorization; search details load on demand. Memory source data is never imported into browser assets.

The canvas connects repository sources to their records and draws documented qualifications and literal repository citations. Supersessions are retained in the index; hidden historical endpoints are not drawn. Dashed shared-term links are separately labeled suggestions: a deterministic TF-IDF overlap calculation requires at least three specific shared terms and a 0.28 cosine score, then keeps at most two suggestions per memory across different sources. Each suggestion exposes its matching words. It does not establish semantic truth, supersession, approval, or writing authority. Search remains lexical and conversations are not ingested automatically. The authenticated viewer follows the owner-requested heyhaigh.ai memory-graph controls: a full-screen canvas, floating search and results, a legend, and zoom controls. It uses a self-hosted Geist Mono font (SIL OFL included), 280 × 38 px search field with 13 px text, 12 px result chips with 6 × 12 px padding, 164 px legend with a 49 px header, and 64 × 36 px Fit control. These measured values are shared graph tokens in theme.css. The large page title remains available to screen readers. The access gate continues to use Content Studio authentication.

`config/agent-memory-sources-v1.json` defines the curated source list and relationships. The active authority index contributes its live document links. Examples preserve complete source text; source and body hashes identify the exact evidence. Historical and rejected examples are excluded by default. Later owner qualifications accompany every recall. Empty example records are reported and omitted.

This is project-context retrieval. It does not replace the canonical writer or governed Satori evidence compiler, approve prose, or promote content. Original record metadata remains available in detail responses. Decisions remain unverified task notes.

## Local recall

From this checkout:

```sh
node scripts/agent-memory.mjs recall "topic" --repo /path/to/verified/tldrastro --ref origin/main --fetch
node scripts/agent-memory.mjs search "topic" --repo /path/to/verified/tldrastro --kind rule
node scripts/agent-memory.mjs show MEMORY_ID --repo /path/to/verified/tldrastro
```

The CLI validates the Git remote, reads pinned Git objects, and records source snapshots and provenance. `--fetch` refreshes remote refs. Without it, the output identifies the remote-tracking snapshot as potentially stale. The implementation’s source configuration is used while this feature is unmerged; no working-tree rules or examples are substituted for pinned source data.

`remember --file note.json` saves a local note with required `title`, `body`, `source_uri`, and `source_date`. The default local state directory is `/Users/mprez/Code/tldr-astro-memory/state`; override it with `--state`. Local notes are returned separately in `localNotes` and do not appear on the website. Website decisions belong in `data/agent-memory/decisions.jsonl` through the repository review workflow. Website memory updates with deployment.

The personal `tldr-astro-memory` skill discovers the CLI for future tasks. Its installed path references the implementation checkout; update that path if the checkout moves.

## Verification and review

```sh
npm run test:content-studio-api
npm run qa:css-audit
npm run test:agent-memory-browser
```

The browser command builds the current web bundle first and starts a fresh localhost server. It exercises the real memory handler using a test-only credential, with desktop/mobile viewports and both OS color preferences. No production credentials or writes are needed. The API suite includes memory access, exact text, rejection, history, filtering, and deployment source-packaging checks.

For a manual local review, configure the existing project’s public Supabase URL and publishable key in the ignored `apps/web/.env.local` first. Reuse the existing admin secret there if emergency access is needed. Do not copy service-role keys. Then:

```sh
npm run build:agent-memory-preview
npm run preview:agent-memory
```

Open `http://127.0.0.1:4197/admin/content/memory` and sign in as owner, or use the configured emergency secret. Supabase must allow the local callback URL for Google sign-in. The preview build fails if public auth configuration is missing, and startup checks that the browser and server use the same project. A fresh regular web build removes that verification marker. This dedicated preview only serves the memory API; other Content Studio APIs require the normal application environment. Automated graph tests explicitly use isolated test mode and credentials.

Production is not changed by local work. Merge an approved feature into main and let the repository’s Vercel Git integration deploy it. Verify owner access and graph retrieval on that deployment before claiming it live.

## Reference frontend implementation

The owner requested a 1:1 recreation of https://heyhaigh.ai/memory-graph. The implementation uses its actual renderer, `@supermemory/memory-graph@0.1.8` (MIT), with the same seven-day new-state patches and legend labels. `scripts/memory-graph-reference-plugin.mjs` applies narrow, checked adaptations in both Vite builds and development; an unexpected upstream bundle fails the build. It also labels absent source dates honestly. The pinned library supplies its original canvas physics, node shapes, zoom/pan, source popovers, controls, glass treatment, and 164 × 637 px desktop legend. Checked adaptations draw the server-provided project edges and label the legend with Shared terms, Supersedes, Qualifies, and Cites. Memory clicks open the full-provenance detail panel, where connections can be inspected and followed. The wrapper reproduces the reference search, chip, detail panel, Back control, and animations. Wrapper values live in shared theme tokens; third-party component CSS stays upstream.

The terminal shader is adapted from React Bits, using OGL 1.0.8 and the reference's settings. Its MIT + Commons Clause notice is included in `apps/admin/src/assets/React-Bits-LICENSE.txt`; this effect is used inside the application. WebGL resources and animation listeners are released when leaving the graph. Reduced-motion disables decorative animation.

The 37 current sources contain far more memories than the reference dataset. The canvas shows up to 24 complete current records spread evenly across each source (320 records at the current snapshot), with truthful rendered-node statistics. Search covers the full index and preserves the canvas while results change. TLDR-specific provenance is available after the complete passage in the detail popup, and large result sets paginate. No source data is sent to HeyHaigh, Supermemory, or another memory service. Unknown dates do not acquire fake timestamps or new-state badges.

## Local owner-access authority

The dedicated manual preview checks credentials against the existing Content Studio server when local validation rejects them. Production's protected owner-email allowlist and current emergency key are not available from an old checkout; copying only public Supabase configuration does not reproduce its authorization policy. `scripts/memory-preview-auth.mjs` sends only the three supported credential headers to the fixed `tldrastro.vercel.app` read-only source-drafts endpoint, requires a successful authenticated JSON response, rejects redirects and unexpected responses, and never forwards graph data. Upstream outages return a retryable 503 rather than logging the owner out. No arbitrary verification URL or client-supplied trust header is accepted.

This delegation exists only in the loopback manual-preview server. The deployed memory API still verifies Content Studio's own production configuration directly. Automated previews use isolated local credentials; separate tests exercise delegated session/key acceptance, ordinary-member denial, invalid keys, bad upstream responses, and outages. The access form keeps errors below the title and stops polling an already rejected credential until the session changes or another key is entered.

The legend remains available below 768 px: a labeled Legend control sits at the top right and opens the same panel. Its expanded body scrolls on short screens. Desktop retains the reference's dimensions and position. The saved collapse preference is respected; a narrow first visit defaults to collapsed.


## Connection provenance

`visualMemoryGraph` caches its bounded projection per immutable index and returns `connections` separately from `index.edges`. Recorded edges retain their direction and citation evidence; suggested edges include lexical scores and shared terms. The renderer uses dashed, undirected strokes for suggestions and colored arrows for recorded relationships. It never fabricates embedding vectors or maps a topic match onto an update. Exact memory bodies, hashes, review states, and canonical-writer eligibility remain unchanged. Detail responses expose only connections in this canvas sample; full-index search and recall remain available.
