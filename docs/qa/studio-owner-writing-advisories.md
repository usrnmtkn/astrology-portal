# Owner writing advisories

Owner direction, November 3, 2026: “make topic and wording checks advisory across Content Studio so I can publish whatever I write. Keep the technical checks”.

An authenticated owner's explicit publication preserves the complete saved wording. Topic, tarot, punctuation, vocabulary, quoted drafting labels, perspective, aspect-pattern language and prose-claim findings do not veto that action or suppress its reader paragraphs. Suggestions remain available in the editor. Horoscope preflight reports prose findings as advisories, without an additional override decision.

Technical requirements remain enforced: owner authentication, current saved versions, immutable content identity and calculated windows, complete required passages, valid variables and compositions, supported reader routes, exact publication receipts, retirement and private draft/source boundaries. Automated generation and source ingestion retain their own checks; a writing result does not publish itself. Existing source rows and historical approved prose are unchanged.

Acceptance evidence:

- `scripts/test-studio-owner-wording.mts`: actual save/publish/read, typed package sources, public projection, Node/browser/shipped reader parity, unchanged original, draft privacy and stale refusal. Synthetic prose includes Tarot, years, “degree”, a quoted editor note, em dashes and old vocabulary exclusions. The same regression fails against the preceding main revision at the save veto.
- Existing owner-publication, horoscope-publication, secondary personalized CRUD and Calendar feed tests cover the changed paths. Horoscope tests retain invalid signed-window and incomplete-edition refusals; automatic status-only publishing still cannot impersonate an explicit owner action.
- `tests/visual/studio-publication-status.spec.ts`: desktop/mobile and light/dark publish/reload/live edit, complete reader text, optional advice, retirement, failure and pending-ledger recovery. All network content writes use isolated actual-handler storage, including direct anonymous publication ranges against deployed assets.
- Full `npm run test:content-studio-api`, `npm run test:content`, type, design-system, privacy and required hosted gates must pass on the release revision. Production verification must name the main merge commit's READY deployment and repeat the rendered journey without mutating owner content.
