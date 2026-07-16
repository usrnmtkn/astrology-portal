# TLDR Astro Admin

This workspace is the landing zone for extracting the content dashboard out of the public web app.

The app shell is runnable, but it still mounts the existing dashboard source from `apps/web/src/admin`. This keeps runtime behavior stable while the source move happens in smaller steps.

## Extraction Checklist

1. Create the admin Vite shell. Done.
2. Mount the existing dashboard while it still lives in `apps/web/src/admin`. Done.
3. Move dashboard source and `admin.css` into this app.
4. Extract shared content/service dependencies into a shared package or explicit admin client.
5. Move admin QA scripts and visual baselines under this app.

## Commands

- `npm run dev:admin`
- `npm run build:admin`
- `npm run preview:admin`
- `npm run qa:admin-boundary`
