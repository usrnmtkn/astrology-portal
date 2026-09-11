# Memory graph integration — 2026-09-10

The owner requested finishing the approved local memory graph's live integration in task `01a08d25-4329-7582-bc2f-369adb3c0013`. The graph is a separate lazy admin route with the pinned reference renderer and self-hosted font; no indexed source text is bundled into public browser assets.

The CI production build measured 3,047,325 bytes total JavaScript gzip and 128,375 bytes total CSS gzip. The graph route plus renderer accounts for 62,515 bytes, with a 13,879-byte stylesheet. Shared graph tokens in the canonical theme bring initial reader CSS to 48,190 bytes. The reference font adds a 14,792-byte lazy asset.

The feature allocation adds 65,000 bytes to the aggregate JavaScript cap and 14,500 bytes to aggregate CSS. Initial reader CSS and combined reader boot each receive the same 250-byte shared-style allocation; the reader JavaScript cap and all existing route caps remain unchanged. After rebasing onto main `18c9b50f`, combined reader boot measures 470,025 bytes, so its cap is 470,250 bytes. New independent 64,000-byte JavaScript and 14,500-byte CSS caps bound the graph, and the bundle check rejects its renderer, route, or stylesheet entering reader startup. No existing failed assertion is removed.

Vercel source packaging is scoped to `api/admin/memory-graph.ts` before the generic API rule. The memory rule is 235 characters, under Vercel's 256-character limit, and tests require every indexed source to be covered. The generic writing-runtime rule remains byte-identical to main and passes its 3,482-source runtime-asset contract.

Local verification covers owner denial/acceptance, exact text and hashes, source citations, bounded suggested connections, search, complete detail navigation, responsive legend, Content Studio navigation, and verified-key persistence. The production verification must confirm the deployed main SHA, anonymous API denial, and read-only access through the existing owner session. No production editorial mutations are authorized by this QA.

The standalone admin build also receives the 65 kB aggregate feature allocation (383 kB → 448 kB). CI measured 442.8 kB total, including a 60.0 kB deferred memory route with its renderer. The graph has its own 64 kB cap and must remain outside the complete static admin entry graph; initial-entry and largest-chunk budgets are unchanged.
