# Sky Placement batches 2–4 serving proposal

Status: **awaiting explicit owner serving approval**

No serving source row, manifest release, generated package, approval state, or production deployment has changed.

## Exact scope

- Combined runtime-eligible set after approval: **19 keys**
- Batch 2 already serving and unchanged: **7 keys**
- New proposed staged-to-serving transition: **12 keys**
- Removed keys: **0**
- Changed existing keys: **0**
- Excluded: Chiron in Aries and the Aquarius/Leo Nodes axis; their fact rows remain runtime-ineligible pending separate review.

## Retained batch-2 keys

- `fallback-hook/sky-sign-copy/mercury/aries`
- `fallback-hook/sky-sign-copy/mercury/taurus`
- `fallback-hook/sky-sign-copy/mercury/cancer`
- `fallback-hook/sky-sign-copy/mercury/leo`
- `fallback-hook/sky-sign-copy/mercury/libra`
- `fallback-hook/sky-sign-copy/mercury/scorpio`
- `fallback-hook/sky-sign-copy/mercury/sagittarius`

## Proposed new serving keys

- `fallback-hook/sky-sign-copy/mercury/capricorn`
- `fallback-hook/sky-sign-copy/mercury/aquarius`
- `fallback-hook/sky-sign-copy/mars/taurus`
- `fallback-hook/sky-sign-copy/mars/gemini`
- `fallback-hook/sky-sign-copy/mars/cancer`
- `fallback-hook/sky-sign-copy/mars/leo`
- `fallback-hook/sky-sign-copy/mars/virgo`
- `fallback-hook/sky-sign-copy/mars/sagittarius`
- `fallback-hook/sky-sign-copy/mars/aquarius`
- `fallback-hook/sky-sign-copy/mars/pisces`
- `fallback-hook/sky-sign-copy/neptune/aries`
- `fallback-hook/sky-sign-copy/pluto/aquarius`

## Deployment gate

- Package: `v3-2026-08-04b`
- Verified: `2026-08-04T18:17:03Z`
- Vercel deployment: `dpl_GxWYk5B8bKdxEices36VEmf1G2mA`

## Exact payload evidence

- Batch 2 articles: `1bd9b0be3876d458d5d23a325365b2d2272d2dfd090181294e7911522e3d6e9c`
- Batch 3 articles: `c537f4626c66be809b3c41ef3e892d343b34b58af960cd37ef1e8afe4511f9ae`
- Batch 4 articles: `981d59629d5fb83c42db63c8705a138c8774c11edfcb42f7b87905766fabb509`
- Proposed 12 source rows: `f1375704c0a20568599a285530601618690e78ab58a1f2401dcb06f47016d030`
- Combined 19-key list: `574901c913b3ce5e72946f1caec7b7d2fbabdaf36bf65d9c44110fea673dafe1`

## Required approval

> I explicitly approve the exact 12-key batches 3 and 4 staged_to_serving diff, producing the combined 19-key batches 2 through 4 serving set, recorded in sky-placement-batches-2-through-4-serving-diff-proposal-2026-08-04.json.

After explicit approval, the serving implementation may add the 12 exact source rows, add the batch-3 and batch-4 manifest releases, regenerate package hashes, and run runtime parity, reader safety, build, and bundle-budget tests.
