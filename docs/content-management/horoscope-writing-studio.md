# Horoscope writing in Content Studio

Open **Compose → AI Writing** (`#ai-writing`) to edit the daily, weekly or seasonal profile. Each profile contains voice guidance, reading structure, source guidance and the prompt that combines them. These are editorial instructions; they are separate from Calendar's collective overview templates and from reader passages.

The weekly starter follows the existing forecast-first horoscope contract. The daily and seasonal starters adapt its scope to the requested period. Starters are proposals, not approved prose, and a first visit does not write rows. Editing or saving a profile does not run a model or publish content.

## Editing

1. Choose a period and edit the guidance and prompt. The prompt must include `{{period}}`, `{{voiceGuidance}}`, `{{structure}}` and `{{sourceGuidance}}`. Unknown variables are rejected. Variables expand once; they cannot be nested inside the guidance fields.
2. Inspect **Writing prompt preview** to see the assembled editorial instructions. The governed run supplies facts, source evidence, argument approval and the response schema separately.
3. Save. A saved profile has its own revision, updated timestamp and SHA-256 digest. Unsaved edits survive period changes and navigation to another Studio section during the session. Leaving or refreshing the browser with unsaved edits triggers its unsaved-work warning.
4. If another editor saved first, reload the stored version for comparison. Your edits remain until you choose **Replace my edits with saved version**.
5. **Export saved profile** downloads the exact saved configuration and its receipt. Save local changes before exporting.

The export is a reproducible configuration snapshot. Its hash detects edits after export; it does not certify owner approval or prove the profile is still the newest stored revision. Export again after changing a profile when the next run should use the new version. Previous revisions are not yet available as a browsable history.

## Writer integration

The existing writing harness accepts the export:

```sh
node scripts/run-astro-writing-harness.mjs \
  --request /path/to/governed-request.json \
  --writing-profile /path/to/weekly-horoscope-writing-profile.json \
  --out /path/to/candidate.json
```

Alternatively provide the export as `writingProfile` in the request, but not both. The harness validates it before the pipeline starts. `generateDraft` includes its expanded instructions in the actual writer input and attaches `studioWritingProfile: {id, period, revision, updatedAt, sha256}` to the unapproved candidate. The full prompt is not copied into reader fields. The existing explicit live-call authorization, target/register checks, evidence requirements and owner argument gate remain in force.

The reader and twelve-sign edition editor are documented in [Horoscope editions](horoscope-editions.md). This profile integration does **not** itself generate horoscope prose, schedule writing, or automatically supply unrelated Sky and Calendar generation. The current canonical harness family map covers Sky Placement articles; the dedicated horoscope target/evidence mapping must be resolved before a horoscope writer call. Exporting a profile or edition brief is not a successful generation run.

## Storage and verification

The authenticated `generated-content?writingProfiles=true` API reads all three profiles and accepts one POST save with `{profile, expectedUpdatedAt}`. Missing periods return unsaved defaults. Profiles use reserved `studio-writing-profile/horoscope/{period}` keys in `generated_interpretations`, with `mode=article`, null target date, `status=DRAFT`, `lane=reference`, and empty reader body/summary. Generic content editing, deletion and publication reject those keys. The existing unique target index prevents concurrent first saves; later saves compare the opened `updated_at` in the database PATCH.

The actual-handler regression is `scripts/test-horoscope-writing-profiles.mts`, included in `test:content-studio-api`. Browser coverage is `npx playwright test --config playwright.horoscope-writing.config.ts`: mobile/desktop, light/dark, starter/saved states, prompt validation, export, recovery, conflicts, exact text preservation and heading typography parity. Tests use synthetic text and isolated storage; the injected writer makes no billed calls.

Set `STUDIO_PRODUCTION_ENTRY=1` to build and test the actual web entry at `/admin/content`. To verify deployed frontend assets with isolated test storage, also set `PLAYWRIGHT_BASE_URL` to the deployment URL. Production API/storage hydration is a separate authenticated read-only check.
