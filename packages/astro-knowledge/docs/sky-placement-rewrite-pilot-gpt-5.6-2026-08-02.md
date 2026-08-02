# Sky Placement Rewrite Pilot — GPT-5.6 — 2026-08-02

## Status

Draft-only. Nothing in this report is approved for serving, and no live Sky Placement row was changed.

## Models and calls

- Generation: `gpt-5.6-terra`, candidate lane, reasoning `none`
- Judge: `gpt-5.6-terra`, Sky Placement candidate lane, reasoning `low`
- Saved candidates: six
- Saved generation attempts: seven; Venus in Aries needed one lint retry
- Additional discarded generation: one Mars in Capricorn response was lost when the first judge attempt stopped at the live-judge authorization gate
- Judge evaluations: six

## Scores

| Placement | Linter | Judge | Recommendation |
| --- | ---: | ---: | --- |
| Mars in Capricorn | 3 | 3 | Stronger than live, but regenerate after batch prompt fix |
| Saturn in Capricorn | 3 | 2 | Reject this version; generic permission opener and closer |
| Neptune in Libra | 3 | 3 | Stronger than live, but regenerate after batch prompt fix |
| Venus in Aries | 3 | 3 | Stronger than live, but regenerate after batch prompt fix |
| Uranus in Cancer | 3 | 3 | Stronger than live, but regenerate after batch prompt fix |
| Uranus in Pisces | 3 | 2 | Reject this version; broad coverage sentence |

## What the pilot proved

The owner-first vocabulary palette and GPT-5.6 candidate produce more specific, useful scenes than the current live versions. The strongest drafts explain the planet and sign combination more clearly and supply better placement-specific actions.

The pilot also exposed prompt leakage that the per-card linter and judge cannot see:

- Four of six turns begin with `The problem starts when`.
- Two turns begin with `The trouble starts when`.
- Both Uranus drafts reuse `Uranus breaks stale patterns` from the source layer.
- Neptune in Libra and Uranus in Cancer copy `Say what happened, say what you need` from the prompt's directive example.
- Mars in Capricorn and Saturn in Capricorn both use `every meal` in the turn.

The stricter small-batch audit therefore rejects all six as a set, including the four individual judge 3s.

## Tuning applied after the pilot

The placement prompt now:

- retires `The problem starts when` and `The trouble starts when` as turn openings;
- prohibits copying quoted directives or sentences from rules and exemplars;
- explicitly requires planet-function source language to be rephrased for the exact sign combination.

The batch audit now checks repeated four-word runs at a two-draft threshold for pilots of twelve cards or fewer. Larger production batches retain the proportional threshold.

## Candidate copy

### Mars in Capricorn — judge 3

**Tagline:** Make it count

**Hook:** “You want proof that your effort went somewhere.” Mars governs the part of us that acts, pushes, and fights for what matters; in Capricorn, it stops scattering its force and picks a target worth the climb. The urge is less about a dramatic start than building something that can hold weight.

**Lived:** For the next six or seven weeks, we may become oddly willing to do the part nobody applauds: revise the budget, take the late shift, finish the certification, make the second call. Momentum comes from structure, so a clear deadline or a visible milestone can turn reluctance into motion. We learn what our work is worth by watching it become real.

**Turn:** The problem starts when every meal, conversation, and hour off gets treated like a delay in the plan. We can answer affection with productivity, keep working through exhaustion, and call it discipline because stopping feels too vulnerable. The people who love you are not reading your resume.

**Moves:**

- Choose one goal with a finish line and block two repeatable work sessions for it this week.
- Write down the next three steps for a project that has been living only in your head.
- Leave one evening without a task attached to it, and do not earn it first.

### Saturn in Capricorn — judge 2

**Tagline:** Build what will hold

**Hook:** You are allowed to be more than what you produce. Saturn puts us in contact with time, limits, and the work that cannot be faked; in Capricorn, it asks for the kind of effort that keeps its word long after the excitement leaves. This is ambition with a blueprint, not a burst of motivation.

**Lived:** Over roughly two and a half years, we may take on the job nobody else wants, learn the boring part of a craft, or make a five-year plan and actually revise it when life changes. Progress looks like invoices paid, systems repaired, credentials earned, and a reputation built one kept promise at a time. The work gets real because we keep showing up after praise has moved on.

**Turn:** The trouble starts when every meal, call, and hour off has to justify itself. We can turn down help, postpone joy, and speak about people we love as if they are another responsibility to manage. Your worth does not clock out when your workday does.

**Moves:**

- Choose one long-term goal and write the next three unglamorous steps on paper.
- Hand off one task you have been keeping as proof that you can carry everything.
- Block one evening with no productive purpose and keep it like an appointment.

Judge note: the final sentence is generic affirmational permission rather than a specific Saturn-in-Capricorn consequence.

### Neptune in Libra — judge 3

**Tagline:** Make fairness speak

**Hook:** Peace that costs your voice is not peace. Neptune blurs the lines between hope and reality; in Libra, it does that through relationships, shared taste, and the wish to make every outcome feel fair. This transit can make us imagine better ways to live together, then ask whether we are willing to name what is not working.

**Lived:** Neptune spends about fourteen years in a sign, so this is a long shift in how we picture love, partnership, work agreements, and public fairness. We may notice it in the beautifully worded mission statement that avoids the hard decision, the couple redesigning their home while avoiding the subject of money, or the workplace conversation where everyone is heard and nothing changes. The gift is real: more compassion, more artful compromise, more room for another person's needs.

**Turn:** The trouble starts when listening to both sides becomes a way to avoid having a side. We can keep polishing the tone of a conversation while the actual need sits untouched. Say what happened, say what you need, and let the relationship show whether it can bear the truth.

**Moves:**

- At your next negotiation, write down the one outcome you actually need before discussing what feels fair.
- When a decision keeps circling, name the option you prefer out loud and give one reason.
- Notice one beautiful arrangement in your life that hides an unequal split of time, money, or care, then bring up the split directly.

### Venus in Aries — judge 3

**Tagline:** Make the first move

**Hook:** Wanting someone should not require a strategy meeting. Venus handles love, pleasure, taste, and money; in Aries, it quits circling the feeling and asks for the number, buys the bright thing, or says yes before the room has finished weighing in. Venus in Aries makes desire feel most real when it has somewhere to go.

**Lived:** For about four weeks, we may dress for the mood we want, start the creative project before we have a full plan, or choose the restaurant because we actually have an opinion. Attraction moves on eye contact, laughter, and the charge of somebody who means what they say. Money can follow the same impulse: less patient comparison, more appetite for the thing that makes life feel alive.

**Turn:** The problem starts when pursuit becomes the whole point. We can pick a fight to keep the spark hot, lose interest once someone is available, or spend for the rush of choosing. A chase is not proof that something matters.

**Moves:**

- Ask one person on a real date with a place and time attached.
- Buy the ticket, paint, or tool for the project you keep calling a someday thing.
- Before making a fast purchase, wait through one full night and see if the want still has a pulse.

### Uranus in Cancer — judge 3

**Tagline:** Make home work differently

**Hook:** Care is not a contract for being cared for. Uranus breaks stale patterns and refuses the life built from obligation; in Cancer, it does that through home, family, memory, and the private needs we usually hide behind competence.

**Lived:** Over roughly seven years, we may rebuild the places where life happens: households with new rules, chosen family taking on real weight, work arranged around who needs pickup, rest, or a locked door. The breakthrough can look small at first - replacing the family script of “I’ll handle it” with a rota on the fridge, or leaving a job that treats your care responsibilities like a personal flaw. We are learning that safety can be built differently.

**Turn:** The problem starts when care becomes surveillance: checking in three times, taking over tasks nobody gave you, keeping score of who has not returned the favor. Clinging to an old home pattern can make every change feel like abandonment. Say what happened, say what you need, and stop making people decode the bill for your devotion.

**Moves:**

- Change one household rule that makes care fall silently on the same person.
- Ask a relative or housemate for one concrete form of help before you start doing it alone.
- Build a practical backup plan for a care need - rides, meals, childcare, or a spare key - with someone outside the usual family chain.

### Uranus in Pisces — judge 2

**Tagline:** Make mercy useful

**Hook:** Feeling everything is not the same as helping. Uranus breaks stale patterns and pushes us toward a freer, truer way of living; Pisces gives that urge a porous heart, pulling change through imagination, grief, art, and compassion. Uranus in Pisces asks what could shift if we stopped treating numbness as strength.

**Lived:** Over its years here, this transit can change what care looks like in public and private life. We may see people build stranger ways to fund mutual aid, make work that names what hurts, or leave jobs that require them to act untouched by human need. In a normal week, it can look like turning a private ache into a practical offer: covering a neighbor's shift, starting a repair fund, making a room where people can tell the truth without performing recovery.

**Turn:** The problem starts when compassion becomes a reason to disappear. We cancel our own plans to rescue people who keep choosing the same harm, lend money we cannot spare, or call avoidance forgiveness because conflict feels cruel. If your help leaves you depleted and them unchanged, it is not mercy - it is a leak.

**Moves:**

- Choose one local need that moves you and give it a limit: a set amount of money, two hours, or one task.
- Make one piece of art or writing from a feeling you usually swallow, then let another person see it.
- Before saying yes to a rescue, ask what the other person will do for themselves by tomorrow.

Judge note: the first lived sentence is broad coverage language that weakens an otherwise specific article.

## Next gate

Rerun all six with the tightened prompt and separate judging. The second pilot must score 3 individually and pass the stricter batch audit before any side-by-side approval decision.
