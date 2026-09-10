# Memory graph integration — 2026-09-10

The owner requested finishing the approved local memory graph's live integration in task `01a08d25-4329-7582-bc2f-369adb3c0013`. The graph is a separate lazy admin route with the pinned reference renderer and self-hosted font; no indexed source text is bundled into public browser assets.

The CI production build measured 3,047,325 bytes total JavaScript gzip and 128,375 bytes total CSS gzip. The graph route plus renderer accounts for 62,515 bytes, with a 13,879-byte stylesheet. Shared graph tokens in the canonical theme bring initial reader CSS to 48,190 bytes. The reference font adds a 14,792-byte lazy asset.

The feature allocation adds 65,000 bytes to the aggregate JavaScript cap and 14,500 bytes to aggregate CSS. Initial reader CSS gets 250 bytes of headroom; the combined reader boot cap, reader JavaScript cap, and all existing route caps remain unchanged. New independent 64,000-byte JavaScript and 14,500-byte CSS caps bound the graph, and the bundle check rejects its renderer, route, or stylesheet entering reader startup. No existing failed assertion is removed.

Vercel source packaging is scoped to `api/admin/memory-graph.ts` before the generic API rule. The memory rule is 235 characters, under Vercel's 256-character limit, and tests require every indexed source to be covered. The generic writing-runtime rule remains byte-identical to main and passes its 3,482-source runtime-asset contract.

Local verification covers owner denial/acceptance, exact text and hashes, source citations, bounded suggested connections, search, complete detail navigation, responsive legend, Content Studio navigation, and verified-key persistence. The production verification must confirm the deployed main SHA, anonymous API denial, and read-only access through the existing owner session. No production editorial mutations are authorized by this QA.
