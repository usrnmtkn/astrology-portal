# TLDR Astro Knowledge Base

This folder is the source-backed astrology knowledge base. It is intentionally separate from app-facing copy.

- `data/` contains reusable astrology knowledge and interpretation fields.
- `voice/` contains voice rules for a specific presentation layer.
- `generated/` contains reviewed user-facing copy generated from knowledge items.

The app joins knowledge and voice by stable IDs, such as `venus-conjunction-saturn`.

Do not treat final prose as the source of truth. If the TLDR Astro voice changes later, the source-backed knowledge in `data/` should remain reusable.
