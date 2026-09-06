# North Node exact Calendar release — 48 rows

Status: bounded owner-approved release source package.

This package contains the 48 exact owner-approved North Node conjunction, sextile, square, and opposition passages in six reviewable payload chunks (`north-node-48-01.json` through `north-node-48-06.json`), plus the owner ruling that binds all 48 rows as one release.

The owner replied **"yes please continue"** immediately after the plan explicitly said to ship these 48 approved North Node passages into the governed Calendar exact-aspect corpus.

The release script deterministically generates:
- 48 new LIVE runtime transit sources with the exact hash-bound `readerCopy`
- the bounded owner authorization
- 48 per-key exact-approval records
- the shipping manifest
- a 48-row owner-payload overlay
- the full 296-row current owner projection from the immutable previous 248 + this overlay

Guards:
- South Node is excluded.
- Trines are excluded because they are already approved and serving.
- Quincunxes/minor aspects are excluded.
- Existing North Node trines must remain byte-equivalent to the prior owner projection.
- Sun opposition Moon and Saturn opposition Pluto remain protected exact benchmarks.

The pull-request gate materializes the release in its CI workspace before running the release-specific verification and the existing exact Sky aspect routing test. The generated serving files are not committed by this source-only preflight commit; they are the deterministic outputs to commit after the gate is green.
