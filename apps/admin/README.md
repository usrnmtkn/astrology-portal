# TLDR Astro Admin

This workspace is the landing zone for extracting the content dashboard out of the public web app.

The app shell is runnable and owns the dashboard source. It still imports shared content and service modules from `apps/web/src` until those are extracted into a shared package.

## Extraction Checklist

1. Create the admin Vite shell. Done.
2. Mount the existing dashboard while it still lived in `apps/web/src/admin`. Done.
3. Move dashboard source and `admin.css` into this app. Done.
4. Extract shared content/service dependencies into a shared package or explicit admin client.
5. Move admin QA scripts and visual baselines under this app.

## Commands

- `npm run dev:admin`
- `npm run build:admin`
- `npm run preview:admin`
- `npm run qa:admin-boundary`
