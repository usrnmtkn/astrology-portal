# Sky Placement combined 26-key serving diff proposal

Status: held for explicit owner serving confirmation. Nothing in this proposal is merged or deployed.

## Summary

- 26 exact approved article keys in scope.
- 24 Sun/Venus exact owner-approved fallback articles.
- Chiron in Aries and Nodes in Aquarius/Leo included from the already-approved promotion.
- 25 net-new keys.
- 1 exact payload replacement and manifest reassignment: Sun in Leo.
- 0 content-key removals.
- 3 reviewed fact rows proposed from `runtimeEligible: false` to `true`.
- Standard `staged_to_serving` transition metadata and verified deployment evidence attached.

## Sun in Leo overlap

`fallback-hook/sky-sign-copy/sun/leo` already serves under the legacy pre-manifest release. The proposed release replaces its exact payload and moves the same key under the new 26-key approval. It must not exist in both releases after application.

## Runtime eligibility flips

- `chiron-aries`: `false` → `true`
- `north-node-aquarius`: `false` → `true`
- `south-node-leo`: `false` → `true`

## Keys and payload hashes

- `fallback-hook/sky-sign-copy/sun/aries` — `ea710994f4401705fd2b7b3500f114fe2e0e6f78cc15d14f6fbe34aab25a691a`
- `fallback-hook/sky-sign-copy/sun/taurus` — `ff69e168fe1a714e422fb9f489d6605322f9fdde6afb6d36a52704a498d2fda3`
- `fallback-hook/sky-sign-copy/sun/gemini` — `ee36e3ff06fa8ed32292a1234f2e19b3b0cdcd4ab91729899f8008f08eb38e37`
- `fallback-hook/sky-sign-copy/sun/cancer` — `beecfca71db564105224ad11f0431862cf694fff17ab7c508f5493e42267b640`
- `fallback-hook/sky-sign-copy/sun/leo` — `05fd28c501373722550af86823c514637490a0371f838533cc1d202362867791` (replacement)
- `fallback-hook/sky-sign-copy/sun/virgo` — `c4c04844c7f031a2e98f9e86067bd1da19aa0ace5754c0360b9020d83b7bdc82`
- `fallback-hook/sky-sign-copy/sun/libra` — `8d05ce0d88a9e96cf431abeff24101fab295f2ee6d7ac921325e788531f8ec97`
- `fallback-hook/sky-sign-copy/sun/scorpio` — `0cd90c7c3696889f95ed1fadae25d93007f0026ef5dc44854ab63424ba5b2a9a`
- `fallback-hook/sky-sign-copy/sun/sagittarius` — `2ade56643a4d218a833de7b88c2a4d2f61d1684605e0e705d74f1d7d0bb53971`
- `fallback-hook/sky-sign-copy/sun/capricorn` — `2562624718de93b62d0637d850f7951539f01b1b09c79536b0234b1d0231ce90`
- `fallback-hook/sky-sign-copy/sun/aquarius` — `2f99022777ced3d942621d5dec73a4a55b55bd04b329b0736df270be6c70da5f`
- `fallback-hook/sky-sign-copy/sun/pisces` — `77c4e01f19adc36df32ad42b44be07f342aa662f4feaef8691097e048d88c3e2`
- `fallback-hook/sky-sign-copy/venus/aries` — `30933488bac57c6493626b03514303b3427860207e2008c629bba10681f557d0`
- `fallback-hook/sky-sign-copy/venus/taurus` — `803348edee831e3806b10cce6ec06d1041e8ca829b6d5140c37852f6501a1bed`
- `fallback-hook/sky-sign-copy/venus/gemini` — `eadd196bcb414c9e878f3b6ee5423b2c010e1b52c316574efd133b851d35611a`
- `fallback-hook/sky-sign-copy/venus/cancer` — `c9cb3c0074e03f23c7e906b047fb615161e0de3af428cadc84f63ff19c8ab64c`
- `fallback-hook/sky-sign-copy/venus/leo` — `16ba5cfc0a3b25b5b37e01ef1f957896589c5f28ff29becb0c6157df40266b56`
- `fallback-hook/sky-sign-copy/venus/virgo` — `b16234522caf52aaf14906399c3367c1f146629d60a541d4522f2c08cb1af751`
- `fallback-hook/sky-sign-copy/venus/libra` — `20495988d7cc75b55e33e4e630b133c7323f9206d5ad565ec0e2807053fdf7bb`
- `fallback-hook/sky-sign-copy/venus/scorpio` — `dfda3c9bbb325c5a2c1cce3fdbcbec2fa35171abd3946464830c947ae7c1f291`
- `fallback-hook/sky-sign-copy/venus/sagittarius` — `22edfb1a01c5fd9ee095ba1f942a92e28da21489990572767b2a709aea7c6c3c`
- `fallback-hook/sky-sign-copy/venus/capricorn` — `0c810c3f17c251e71160829e055492fa8d969cd5c3583c6b565df4dfec32feef`
- `fallback-hook/sky-sign-copy/venus/aquarius` — `e8531b3374ff342a139b5ab07e05781fd9ec28c3555e1b35c05c5885c1dfef07`
- `fallback-hook/sky-sign-copy/venus/pisces` — `25b9e4e763d143ee9c1855cc807fffe778c9236d9008268e8523e5c2ee9fc48e`
- `fallback-hook/sky-sign-copy/chiron/aries` — `bff7bc48c2e7a00650184a6ad59e36488c3037fdf91338d71eeadffe5f57a107`
- `fallback-hook/sky-sign-copy/nodes/aquarius-leo` — `57e4bba9bc1813d9a6f8e0925ed39ffe7c9def364d70dc5a3865a383ae1405b2`

## Deployment evidence

- Package: `v3-2026-08-04g`
- Verified: `2026-08-04`
- Source: `Vercel dpl_Cc7eZBaDB4qgWB7TtxxXncS4fhXW`
- Runtime capability: `sky-placement-on-demand-v1`

## Governance hold

The article approvals and the earlier Chiron/Nodes promotion approval do not authorize this combined serving diff. Source rows, runtime flags, the serving manifest, generated packages, merge, and deployment remain unchanged until the owner explicitly confirms this proposal.
