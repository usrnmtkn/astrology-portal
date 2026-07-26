# Codex prompt: ship the sky-aspect pipeline to prod WITHOUT the social/friends work

The working tree on `calendar-zodiacseason` mixes two features. Deploy ONLY the
sky-aspect + judge pipeline. The social/friends feature and its migrations are
NOT ready (its 9 migrations are not applied to prod) and must not ship.

Create a clean branch from the last committed HEAD and add only the sky changes.

## Include whole (sky-only files — verified no social content)

- `api/cron/generate-sky-aspects.ts` (new)
- `api/_lib/current-sky.ts`
- `apps/web/src/services/generatedContentKeys.ts`
- `apps/web/supabase/migrations/20260725230000_sky_aspect_judge_verdict.sql`
  — the ONLY new migration that ships
- `packages/astro-knowledge/**` (voice, scripts, data/pairs/sun-chiron.json, docs, README, package.json, CODEX-*.md)
- `scripts/test-sky-aspect-integration.mjs`

## Include sky hunks only (leave the social hunks in these files behind)

- `apps/web/src/App.tsx` — the sky-aspect reader gate only (~110 sky lines; the ~228 social lines stay out)
- `apps/admin/src/GeneratedContentAdminDashboard.tsx` — the "Sky voice: needs review" queue + audit sample
- `api/admin/generated-content.ts` — the judge fields only
- `apps/web/src/services/generatedContent.ts` — sky/judge only
- `apps/web/src/types.ts` — sky judge types only
- `apps/admin/src/admin.css` — sky dashboard styles only
- `apps/web/src/services/ephemeris.ts` — the sky change only
- `package.json` — the sky test script(s) only (`lint:sky-voice`, `test:judge-calibration`), not social
- `vercel.json` — the sky cron/env only

## Exclude entirely (social/friends)

`api/account.ts`, `apps/web/src/features/friends/**`, `SocialFriendsPanel.tsx`,
`apps/web/src/services/socialFriends.ts`, the social hunks of `auth.ts`,
`FriendsPageShell.tsx`, `FriendCircleFeed.tsx`, `FriendChartsList.tsx`,
`FriendDetail.tsx`, the social hunks of `YouPage.tsx`, all `*_social_*` /
`social_*` migrations (190000, 215000, 220000, 223000, 224500, 231500, 233000,
234500, 001500), `apps/web/supabase/tests/**`, `apps/web/supabase/README.md`,
`docs/friend-connections-*.md`, `scripts/test-social-friends-contract.mjs`,
`.github/workflows/social-friends-security.yml`, and the social CSS
(`friends.css` etc.) unless a sky surface visibly needs it.

## Verify before deploy (hard gates)

1. `git diff <base>..HEAD | grep -iE "friend|social|handle|circle|block"` returns
   nothing meaningful. No social leakage.
2. The only new migration present is `20260725230000_sky_aspect_judge_verdict.sql`.
3. In `packages/astro-knowledge`: `npm run validate`, `npm run lint:sky-voice`,
   `npm run test:judge-calibration` (must pass 17/17 clean, weak drafts caught).
4. `node scripts/test-sky-aspect-integration.mjs` passes.
5. Web + server typecheck and production build pass.

## Deploy and confirm

- Deploy the branch to Vercel production.
- Confirm `/api/cron/generate-sky-aspects` resolves (no SPA fall-through).
- Trigger the cron once. Confirm cards land as `DRAFT` with judge verdicts,
  score-3 auto-publish, score-2 in the review queue.

## Report back

Branch name, the leakage-grep result, calibration numbers, build result, and a
copy of the first ~10 generated cards (unedited) for a voice audit.
