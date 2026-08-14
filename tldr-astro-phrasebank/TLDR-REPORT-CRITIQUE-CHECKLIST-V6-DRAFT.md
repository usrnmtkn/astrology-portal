# Report critique checklist v6 draft

**Status:** `needs_review`
**Version:** `report-critique-checklist-v6-draft`
**Owner approved:** `false`
**Active in production:** `false`
**Promotion authorized:** `false`
**Baseline:** `report-critique-checklist-v5`
**Candidate amendment source:** `TLDR-REPORT-EARNED-SENTENCE-RULING-OWNER.md`, owner ruling draft 2026-08-13.
**Governance:** This candidate does not alter the active v5 checklist. Activation requires fresh SHA-pinned owner approval.

The complete v5 checklist remains in force. Add the following candidate requirements only after approval.

## Earned-sentence pass

After the cold read and before returning `no_defects`, identify at least one sentence in every substantive prose unit that earns its place in ordinary language by doing at least one of these:

1. holding two true things at once;
2. naming the consequence nobody says out loud;
3. saying the ordinary thing exactly;
4. giving the permission or judgment the reader was waiting for.

The sentence must also pass the no-cleverness-tax clarity floor on first read. Decoration, aphorism, compressed metaphor, or an abstract closer does not satisfy the requirement.

If no sentence meets both floors, return one bounded `no_earned_sentence` finding for the substantive unit. This is a REVISE-tier defect. Scope the finding to the smallest paragraph that has enough factual and interpretive material to carry one earned sentence. The instruction names the missing function and preserves facts; it never supplies replacement prose.

## Labeled evidence

### Passes both floors

- `earned-positive-two-truths`: “Each new opportunity can look manageable by itself. The Moon in the 6th shows the total daily cost once they are added together.”
- `earned-positive-ordinary-exact`: “It may be the same project, but it does not have to be.”
- `earned-positive-consequence-question`: “after the first week, is the new method saving time, or has maintaining it become extra work?”

### Clear but unearned

- `earned-negative-safe-summary`: “The most useful changes are concrete.”
- `earned-negative-count-the-cost`: “The opportunity may still be worth taking, but the meetings, preparation, travel, revisions, and follow-up need to be counted before you agree.”
- `earned-negative-public-interest`: “Public interest may add deadlines and correspondence before the work itself is finished.”
- `earned-negative-end-of-period`: “By the end of the period, you have clearer evidence about which responsibilities to finish, which arrangements to revise, and which work is ready to share.”

These negatives are not inaccurate. They demonstrate a unit that is clear and compliant but unfinished because nothing lands.

## Finding contract amendment

`no_earned_sentence` joins the governed critique categories. It routes through the existing named-defect and bounded-splice chain. It is never a FAIL-tier astrology or specificity finding, and it never authorizes a full-unit rewrite.
