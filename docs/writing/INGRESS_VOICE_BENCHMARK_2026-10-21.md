# Ingress voice benchmark, October 21, 2026

The owner explicitly selected the revised Libra reader article as the ingress
writer's voice benchmark in
[the writing task](thread:01a15c54-6709-7872-821c-7303fa4383a8).
This follows the [connected-article repair](INGRESS_CONNECTED_ARTICLE_REVIEW_2026-10-21.md).
The selection authorizes ingress-only voice-reference use. It does not approve
publication, create a Content Studio draft or approve future generated prose.

## Changes

| Before | Now |
| --- | --- |
| Original owner Libra article plus the short approved Scorpio passage. | The complete revised Libra reader article is the primary voice benchmark. The original owner article and complete Scorpio passage remain supporting voice sources. |
| The manually revised article was not a positive source. | The owner's explicit benchmark request permits its style-only use, with the original assistant authorship, complete text, hash and task provenance. |
| Receipts identified the Scorpio reference alone. | Receipts identify the primary Libra benchmark and the separate supporting Scorpio reference. Both must pass integrity checks. |
| Overview guidance referred to Scorpio for depth. | Overview guidance identifies the revised Libra article as primary, while retaining the dated event opening and existing field contract. |

The prompt now says:

> The owner selected the complete revised Libra article as the primary voice benchmark for dated ingress writing. Read its connected development, ordinary language, recognizable human insight and room for enjoyment beside the complete original author season passages. The complete approved Scorpio passage is supporting voice evidence.

The public metadata record is
`data/writing/approved-voice-style/libra-ingress-benchmark-20261021.json`.
Complete Libra and Scorpio texts stay in protected server storage, supplied by
`PRIVATE_INGRESS_STYLE_REFERENCES` (gzip/base64) or the ignored local
`.private-documents/ingress-style-references.json`. They are never committed to
the public repository. Missing or corrupt private text stops dated writing
before a provider call.
It begins at the article title and ends at its final sentence. The two preceding
assistant editorial notes are excluded. Its exact text is 1,149 words, with SHA-256
`2e25f72d7fddd6db112a4e8b3c8ff9fed8250844940a263742ab630d0a937fd8`.
The text is assistant-written and owner-selected for voice, not owner-authored.
It has `factUseAuthorized: false`, `readerServing: false` and
`publicationAuthorized: false`.

The benchmark guides connected development, sentence movement, human insight
and emotional range. It is not a paragraph formula, a compulsory relationship
scenario or a source of dates and transit selection for other ingresses.
Current editorial corrections and the requested format still apply. There is no
new model stage, automatic judge, rewrite, retry or publication step.

## Source boundaries

| Input | Authority |
| --- | --- |
| KB, learning-axis and Calendar passages | Meaning. Complete sources remain unchanged. |
| Revised Libra benchmark, original owner article and approved Scorpio | Voice only. Historical facts and scenarios do not transfer. |
| Saved guide | Structural reference, preserved complete. |
| Calculated facts and ingress coverage plan | Dates, times, positions, motion and included transits. |

Other surfaces keep their existing reference selection. No saved profile,
source article, Calendar entry, content row, review state or publication state
was changed.

## Test cases and evidence

The authenticated handler was prepared against read-only source retrieval with
the provider fully intercepted. It returned 200, with one intercepted provider
request, zero paid calls, three source reads, two read-only snapshot RPCs and
zero database writes. Draft rendering was disabled.

| Check | Result |
| --- | --- |
| Exact benchmark boundary and source integrity | Passed: complete 1,149-word reader article, exact pinned hash, original assistant authorship, explicit voice-only approval and no introductory editorial notes. |
| Actual OpenAI and Claude handler payloads | Passed: complete primary benchmark and complete supporting Scorpio appear once each; all 14 original owner article paragraphs remain complete and ordered. |
| Corrupt or missing supporting reference | Passed: altered text, incorrect fact authority, missing support and mismatched receipts stop before rendering the request. |
| Scope isolation | Passed: non-ingress surfaces keep their existing references; dedicated Personal Transit and relationship writers retain their own workflow. |
| Real Libra 2026 and Taurus 2027 facts | Passed: required dates, lunar/ruler/aspect coverage, dignity and no unsupplied natal-house claims. |
| Before/after prepared request comparison | Passed: complete KB/axis/Calendar sources, saved template, all 32 event-meaning sources and calculated facts/coverage are identical. |
| Output and model contract | Passed: required keys, model and reasoning setting unchanged. Only the overview field's instruction text changes in the schema. |
| Approved-style and Ghostwriter tests | Eleven passed after the protected-storage release adjustment, including missing/corrupt sources and scope isolation. |
| Server typecheck and deployment-source packaging | Passed. |
| Full Content Studio API gate | Passed: complete unfiltered `npm run test:content-studio-api` exited 0 on the final runtime patch. Protected report fixtures stayed in process memory and all provider requests were intercepted. |
| Privacy and whitespace | Passed: 11,288 files scanned, no whitespace errors. |

Previous prepared request:
`a20cf339df33389368a8a39654dc2a5c651806b203c11dca5c8404aff2fff9ca`.
Benchmark prepared request:
`254b41605092d17faba34a095b11c37fda2689c4a04ef4328763e401312f7cba`.
The coverage-plan hash remains
`50fed3bb0559b20ababfa4c7ef52c637abbe2e94bf95c580f9cf8a89e9fd0758`.
Input length increases from 135,051 to 144,655 characters. These are character
counts, not token usage or a measured cost estimate.

These checks establish delivery, integrity and source boundaries. No new prose
was generated, so they do not establish a future draft's literary quality.
Only the owner can judge that writing and authorize its publication.

At the initial benchmark review, the implementation was local and uncommitted on
`codex/ingress-voice-repair-20261021`, based on
`ff9c51ffa3aa831258f7df94f5d555e4ee5dd95f`. Refreshed main is
`1efc3b0ab02334cc1b69337b3e235f64d859860a`: zero commits ahead and three behind.
The new main commit changes You/relationship transit titles and does not overlap
this benchmark or ingress prompt source files.
No paid generation, Content Studio draft save or publication was performed.
The later owner request authorizes commit, push, PR, checked merge and deployment
verification of the writer, while retaining the no-generation/no-draft-write boundary.
An authenticated `GET /api/admin/sky-article-template-slots?inspect=ingress-voice`
loads and verifies the same private sources as generation, returning receipt
hashes and roles only. It never calls a provider or changes content. Anonymous
access is denied; unavailable private storage returns an error.
