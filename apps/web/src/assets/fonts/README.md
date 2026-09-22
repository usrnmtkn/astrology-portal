# Reader fonts

These unmodified WOFF2 files use the existing Newsreader v26 and Geist Mono v6
families from Google Fonts. `sources.json` records
the exact CDN URLs, sizes and SHA-256 hashes retrieved on 2026-09-21.

All original Unicode subsets are retained. The Latin faces are requested after
App downloads, alongside reader content, so they do not delay startup JavaScript.
The CSS preserves the existing normal weights (Newsreader 400–500, Geist Mono
400–700), display behavior and Unicode coverage. Vite emits content-hashed asset
URLs. Accessibility and symbol fonts retain their existing external loading.

Redistributed licenses are deployed at `/fonts/newsreader-OFL.txt` and
`/fonts/geistmono-OFL.txt`, copied from Google Fonts' upstream OFL records:

- https://github.com/google/fonts/blob/main/ofl/newsreader/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/geistmono/OFL.txt
