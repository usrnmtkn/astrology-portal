# Sky writing memory integration

Content Studio's explicit Sky placement and aspect generation actions now select
contextual correction evidence from the same three correction ledgers indexed by
TLDR Astro Memory. The existing meaning sources, voice examples, provider routing,
and approval workflow continue to own their respective responsibilities.

The server loads the current memory source configuration for each generation.
It excludes inactive and superseded sources or records, retired editorial rules,
other writing families, duplicate corrections, and unresolved contradictory
replacements. Same-family corrections rank ahead of cross-surface corrections;
target word matches and recorded correction dates refine the order. No timestamp
or authority is inferred from a filename or array position. At most eight complete
correction records enter the writer prompt; fewer are allowed instead of padding
the packet with unrelated evidence. Rejected text is explicitly marked as such.

The current effective-rule registry accompanies these corrections. Editorial
guidance stays advisory and cannot approve a draft. This integration does not
activate the broader historical graph as a prompt, add personal reports as
examples, or change the existing provider model or automated cron paths.

`source_snapshot.studioWritingMemory` stores a receipt with the deployed revision,
configuration and rule hashes, selected memory IDs, exact source lines and hashes,
selection reasons, excluded references, and the prompt hash. It contains no
correction bodies. IDs resolve to the same graph records at the same revision.
Rechecking a saved draft preserves this receipt and never runs a writer.

Source text is packaged only on the server. The Studio writing function's asset
contract covers every existing generic runtime asset plus its correction sources.
Missing or malformed sources fail before the provider call. Source updates become
live through the normal main deployment; refreshing the graph does not deploy them.

Verification includes synthetic selection/conflict/freshness fixtures, graph ID
and hash parity, a real service run with an isolated provider, the actual handler's
receipt persistence and recheck behavior, and the desktop/mobile Review Queue
workflow. These checks prove evidence delivery, not superior prose. Actual writing
quality still requires an owner comparison of generated drafts; no paid generation
or editorial approval is implied by this implementation.
