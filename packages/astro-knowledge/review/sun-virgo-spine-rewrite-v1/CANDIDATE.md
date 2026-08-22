# Sun in Virgo — candidate rewrite against the current spine (needs_review)

**Status:** `needs_review`. Not owner-approved. No wording authority. Nothing here may reach a serving row until the owner approves the exact wording.

**Replaces (if approved):** the 2026-08-04 `sun-venus-24` article for `fallback-hook/sky-sign-copy/sun/virgo`.

## Why the old one was replaced

The 2026-08-04 article fails four rules that are now written down.

1. **The concrete range is a caricature.** "We sew on the loose button. We rewrite confusing instructions. We simplify a routine that drains energy." Button, instructions, routine is generic tidiness with nothing at stake. `WRITING-STANDARD.md` sentence mechanic 3 asks for a concrete range, not a keyword list, and the do-not-use list bans keyword lists dressed as prose.
2. **Collective "we" with nobody in it.** `CLAUDE.md` says collective does not mean abstract and asks for a concrete actor and action. The owner-approved venus/libra article (2026-08-14) is in direct address; this row predates that spine.
3. **The close is an abstract epigram.** "Confidence wears down under a standard that keeps moving" is `epigram_without_mechanism`, the same category as six of the nine correction pairs added to `owner-corrections.jsonl` on 2026-08-16.
4. **It makes one point twice.** The opening and the development both say that care produces a result and the standard keeps rising.

The one sentence worth keeping was buried: "An offer to help meets so many corrections that the helper backs away." That is the only line with a second person who changes behaviour. The rewrite builds the article on it.

## The argument

Virgo is not tidiness, it is the standard. The interesting thing about the Sun in Virgo is not that people notice details, it is that noticing is a trap: the person who catches the errors becomes the person the errors get routed to, the reward for being reliable is more work, and the people whose work keeps getting corrected quietly stop offering. That gives the article a second party, an observable cost, and something that can actually move.

## Slots

### opening

After moving through {{priorSign}} from {{priorSignEntryDate}} to {{priorSignExitDate}}, the Sun enters Virgo on {{entryDate}}, and the difference between how something is supposed to work and how it actually works stops being easy to ignore. The Sun governs identity, vitality, and who you are underneath the roles you perform. Virgo is not tidiness. Virgo is the standard: the part of you that checks the invoice against the contract, notices the schedule needs nine hours in an eight-hour day, and reads the instructions everyone else skipped. While the Sun is here, being the one who notices can start to feel like who you are. That holds up until noticing becomes the job.

### tension

Catching a mistake is useful, and useful gets remembered. Once you are the person who spots the error, the errors start arriving addressed to you. Drafts show up in your inbox to be read before they go out. A colleague stops checking their own numbers because you will catch it anyway. You may be working a second job nobody named, assembled from other people's near misses, and the reward is that nobody else has to think about it. The corrections still land on somebody, and that somebody starts to brace when your name appears on the message.

### development

The Sun moved through Virgo from {{previousResidencyEntryDateWithYear}} to {{previousResidencyExitDateWithYear}}. If you were the one checking then, you probably still are, and the list is longer now.

Watch what a small repair does. A cabinet door hangs crooked, so you take it off to fix the hinge, and with the door off you can see the frame is out of square, and once you are looking at the frame you notice the paint. Two hours later the door is on the floor and the kitchen is worse than when you started. A document does the same thing. You open it to fix one line, rewrite the section, find that the section above no longer matches, and send at midnight a version better than the four o'clock one in ways nobody will notice or pay for.

It shows up again in help you turn down. Someone offers to take a task, you explain how you do it, they do it their way, and you redo it once they have gone. They stop offering. You never asked them to stop. You made offering pointless.

Leave one thing at good enough this month and see who complains. Name the hour a task should take before you start, then stop when the hour is up. Let someone else's version ship. Then watch what actually breaks, and who besides you can tell.

### close

Before {{exitDate}}, the work will be better than it needed to be. You may be the only person who can tell.

## Rendered preview

Rendered through `renderSkyPlacement` with entry 2026-08-22, exit 2026-09-22, prior sign Leo, previous residency 2025-08-22 to 2025-09-22.

> August 22 to September 22, 2026
>
> After moving through Leo from July 22 to August 22, the Sun enters Virgo on August 22, and the difference between how something is supposed to work and how it actually works stops being easy to ignore. The Sun governs identity, vitality, and who you are underneath the roles you perform. Virgo is not tidiness. Virgo is the standard: the part of you that checks the invoice against the contract, notices the schedule needs nine hours in an eight-hour day, and reads the instructions everyone else skipped. While the Sun is here, being the one who notices can start to feel like who you are. That holds up until noticing becomes the job.
>
> Catching a mistake is useful, and useful gets remembered. Once you are the person who spots the error, the errors start arriving addressed to you. Drafts show up in your inbox to be read before they go out. A colleague stops checking their own numbers because you will catch it anyway. You may be working a second job nobody named, assembled from other people's near misses, and the reward is that nobody else has to think about it. The corrections still land on somebody, and that somebody starts to brace when your name appears on the message.
>
> The Sun moved through Virgo from August 22, 2025 to September 22, 2025. If you were the one checking then, you probably still are, and the list is longer now.
>
> Watch what a small repair does. A cabinet door hangs crooked, so you take it off to fix the hinge, and with the door off you can see the frame is out of square, and once you are looking at the frame you notice the paint. Two hours later the door is on the floor and the kitchen is worse than when you started. A document does the same thing. You open it to fix one line, rewrite the section, find that the section above no longer matches, and send at midnight a version better than the four o'clock one in ways nobody will notice or pay for.
>
> It shows up again in help you turn down. Someone offers to take a task, you explain how you do it, they do it their way, and you redo it once they have gone. They stop offering. You never asked them to stop. You made offering pointless.
>
> Leave one thing at good enough this month and see who complains. Name the hour a task should take before you start, then stop when the hour is up. Let someone else's version ship. Then watch what actually breaks, and who besides you can tell.
>
> Before September 22, the work will be better than it needed to be. You may be the only person who can tell.

## Verification record

| Check | Result |
| --- | --- |
| Mechanical do-not-use scan (33 patterns incl. em dash, `whether`, `real`/`true`, `settle`/`steady`/`comfort`/`warmth`, room metaphor, `the catch`, wellness vocabulary, clinical register) | 0 hits |
| `validateCopy`, family `sky-placement-page`, register `second_person`, all 32 owner corrections loaded, per-slot expected placeholders | 0 violations in all four slots |
| `reviewDraft` on the fully rendered article | `PASS` |
| Unresolved `{{...}}` after render | 0 |
| One-sentence body paragraphs | none |
| Body word count | 454 (venus/libra, the current approved spine, is ~450) |
| `body_you` equals the four slots joined by a blank line | yes, required by `test-fallback-refresh-wiring.mjs` |

Pre-flight read in the composing session, per `CLAUDE.md`: `TLDR-WRITING-AUTHORITY-INDEX.md`, `WRITING-STANDARD.md`, `TLDR-REGISTER-PER-SURFACE-RULING-OWNER.md`, and the owner-approved venus/libra and saturn/capricorn rows as the current spine evidence.

## Open questions for the owner

1. **The imperative block** in `development` ("Leave one thing at good enough this month...") mirrors the venus/libra move ("Say what you want... Then watch what happens"). Confirm that is the intended spine beat and not a formula that should vary per article.
2. **The recurrence sentence** now does work instead of reciting a date, but it sits at the top of `development`. It may belong at the head of `tension`.
3. **Length.** This is 454 words against the old article's 258. If the sun-venus-24 batch is rewritten, all 24 grow by roughly that factor.
4. **`try_this`** is retained unchanged in the row and still not rendered. Confirm it should be dropped rather than carried.
5. **Batch scope.** If the button line is representative, the other 23 rows in the 2026-08-04 batch have the same shape and register.
