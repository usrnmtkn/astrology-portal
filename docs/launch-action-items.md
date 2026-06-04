# TLDR Astro Launch Action Items

Last updated: 2026-06-04

## Secrets And Environment

- [ ] Rotate the OpenAI API key before production launch because the setup key was pasted into chat.
- [ ] Rotate the Supabase service role key before production launch because the setup key was pasted into chat.
- [ ] Replace local setup keys with the rotated launch keys in `.env.local`.
- [ ] Add the rotated `OPENAI_API_KEY` to Vercel as a server-only environment variable.
- [x] Add `OPENAI_MODEL` to Vercel. Default: `gpt-4.1-mini`.
- [x] Add `VITE_SUPABASE_URL` to Vercel.
- [x] Add `SUPABASE_URL` to Vercel, or confirm the backend can use `VITE_SUPABASE_URL`.
- [ ] Add the rotated `SUPABASE_SERVICE_ROLE_KEY` to Vercel. This must be the service role key, not the anon or publishable key.
- [x] Add `CONTENT_GENERATION_SECRET` to Vercel.
- [x] Add `CRON_SECRET` to Vercel.
- [ ] Confirm no server-only keys appear in browser bundles, frontend source, screenshots, CSV exports, or committed files.

## Supabase

- [x] Apply `apps/web/supabase/migrations/20260604183000_generated_interpretations.sql`.
- [x] Confirm `generated_interpretations` exists in Supabase.
- [x] Confirm row level security is enabled.
- [ ] Confirm the browser cannot write directly to `generated_interpretations`.
- [x] Confirm the service role key can upsert generated draft rows from the backend route.

## OpenAI Content Generation

- [x] Test OpenAI generation locally with a small manual payload.
- [x] Test generation plus Supabase save after the Supabase table exists.
- [x] Confirm generated content saves as `DRAFT`.
- [x] Confirm the generated output includes `headline`, `summary`, `body`, and `sections`.
- [ ] Confirm generated content follows the TLDR Astro voice rules:
  - no em dashes
  - no backend/source wording
  - source-backed claims only
  - clear lived experience
  - practical action or reflection
- [ ] Review the first 10 generated Sky drafts manually before using them in production.

## Vercel Cron

- [ ] Confirm Vercel Cron is enabled for the project.
- [ ] Confirm `/api/cron/generate-sky` runs with `CRON_SECRET`.
- [ ] Confirm daily Sky generation creates one `DRAFT` row per target date.
- [ ] Confirm failed cron runs are visible in Vercel logs.

## Website Read Path

- [x] Build frontend read logic for `generated_interpretations`.
- [x] Only show rows with `status = LIVE` to regular users.
- [x] Fall back to local knowledge-base content when no `LIVE` generated row exists.
- [ ] Keep Sky, You, Synastry, and Composite content keyed separately.
- [x] Add protected review API before allowing generated drafts to become `LIVE`.
- [ ] Add admin or super-user dashboard UI for reviewing generated drafts.

## Content Review

- [x] Create a human review workflow for generated rows.
- [x] Track reviewer notes and status changes.
- [ ] Reject or rewrite any output that:
  - invents unsupported astrology
  - sounds generic or mechanical
  - gives deterministic predictions
  - uses therapy/self-help cliches
  - exposes backend/source language
- [ ] Approve a small content set first, then expand.

## Deployment

- [x] Run `npm run build`.
- [ ] Commit the generation pipeline and launch checklist.
- [ ] Push to `main`.
- [ ] Deploy to Vercel production.
- [ ] Confirm production env vars are set before triggering generation.
- [ ] Trigger one manual production generation job and confirm the database row is created.
