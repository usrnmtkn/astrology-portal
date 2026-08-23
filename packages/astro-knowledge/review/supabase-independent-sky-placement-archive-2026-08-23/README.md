# Independent Supabase Sky Placement archive (2026-08-23)

This record preserves every independent Sky Placement row that existed in production before retirement from reader serving. No row was deleted. The exact 158-row set was exported and hashed before any update.

The reader uses the governed repository bundle as its Sky Placement source of truth. These independent Supabase rows used a separate key namespace and release gate, so they could override or be overridden by bundled content depending on which candidate happened to resolve first. Commit `67aa9fcf` intentionally changed the generated placement namespace and reader lookup from `sky.placement.{planet}.{sign}` to `sky.placement.base.{planet}.{sign}` on 2026-07-26. The rollout did not migrate or retire the 120 pre-existing legacy rows, and the alias family did not bridge them to the new `.base.` key. Those rows therefore remained marked `LIVE/serving` even though the current page could not request them.

The AI writing workflow still has two gates: the writer/judge gate records pipeline review, and the owner-review gate authorizes exact wording. Archiving these rows does not collapse or remove either gate.

## Preservation

- Source table: `public.generated_interpretations`
- Rows: 158
- Export SHA-256: `537a39f4430dc8acd3792c1c6fce00563fc2662b332f8d129664ed1780f0b5fd`
- `rows.json` file SHA-256: `2f1dea42209d66c0a62a577b22e271c589320afc698f130b517745d4bd7c7f10`
- Protected-content SHA-256: `b2c826213e925d523575530808294a36ac5ecc634342a18485cea25c2e277a26`
- Production change: `status=ARCHIVED`, `lane=reference` only
- Copy and provenance drift: 0
- Raw creator auth UUIDs are omitted from the repository archive and represented by one-way hashes.

The update is reversible because IDs and all non-routing data remain in production and the pre-change values are recorded in `rows.json`.
