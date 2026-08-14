# Spine quality gates v1: owner ruling

Status: recorded owner directive  
Date: 2026-08-14  
Generation calls: 0  
Serving changes: none

## Exact owner instruction

> SPINE QUALITY GATES: the spine is not satisfied by presence alone.
>
> Cause: the Venus in Libra draft contained every fast-mover spine element and
> was still flat. The slots were filled with keyword lists, hedged sentences,
> and a single long advisory sentence. Structural presence is not the standard;
> Saturn in Capricorn is. Add a QUALITY REQUIREMENT to each spine element, with
> Saturn as the reference and the Venus failures as the negative examples.
>
> 1. PLANET
>    Required: name where the planet becomes visible in ordinary life.
>    Saturn: "Saturn stands at the threshold where a choice becomes a
>    consequence. The deadline arrives, the bill comes due, and a weak structure
>    reveals itself in the person who has to absorb the extra hours."
>    Fails: a keyword list of domains with no verb of appearance ("Venus governs
>    relationships, creativity, attraction, and what we value" standing alone).
>    Deterministic check: flag a planet block whose only content is a
>    comma-separated list of abstract nouns.
>
> 2. CONDITION
>    Required when the planet has dignity in the sign: explain the rulership
>    through consequence, not as a label. AND, when the sign has a symbol, the
>    symbol must do interpretive work.
>    Saturn: "Saturn rules Capricorn, so the sign sharpens what Saturn already
>    cares about" plus "The sea-goat gives Capricorn a body built for two
>    environments: hooves for the climb and a tail that still belongs to the
>    water."
>    Fails: dignity stated as a fact with no consequence; sign symbol absent
>    entirely (Libra's scales never appeared in the Venus draft).
>    Deterministic check: if the target sign has a recorded symbol and the draft
>    never references it, flag for review. Mythology and symbolism are allowed
>    when they interpret the mechanism, banned when they decorate.
>
> 3. HANDOFF
>    Required: name the shift, not only the dates.
>    Saturn: "Capricorn changes the question from what everyone says they
>    believe to who does the work."
>    Fails: dates followed by generic theme language.
>
> 4. THESIS
>    Required: the cultural rule being challenged AND who benefits from it.
>    Saturn: "You have been taught to mistake endurance for ability... and the
>    arrangement is cheaper than hiring anyone else."
>    Fails: a thesis with no beneficiary named. The Venus draft never said who
>    profits from the reader's accommodation.
>
> 5. LIVED EVIDENCE
>    Required: two or three quick situations with nameable objects; none may
>    carry the argument alone; and at least one PULL-QUOTE line, a short
>    standalone sentence that states the whole argument.
>    Saturn: "If everything falls apart when one person takes a day off, that
>    person was the infrastructure."
>    Fails: one extended scenario (the website project), or correct scenes with
>    no memorable line.
>    Deterministic check: flag when a single scenario spans more than one
>    paragraph; flag when no sentence under 20 words in the lived section could
>    stand alone.
>
> 6. FAILURE MECHANISM
>    Required: how the useful skill becomes the problem, stated as behavior the
>    reader performs, not as a category.
>
> 7. STRATEGY
>    Required: short imperatives in sequence, a drumbeat.
>    Saturn: "Fix the handoff. Train someone else to do the work. Fund the
>    repair. Document what only one person knows."
>    Fails: one long advisory sentence.
>    Deterministic check: require at least two imperative sentences in the
>    strategy element.
>
> 8. CLOSE
>    Required: unhedged. States the condition or consequence flatly.
>    Saturn: "A structure is not stable if it only works when one person never
>    rests."
>    Fails: hedged or date-bound closes ("an arrangement may strain when...").
>    Deterministic check: flag hedging modals (may, might, can) in the final
>    sentence.
>
> 9. INHERITED-CLOSE RULE
>    A close carried over from an existing approved article is NOT automatically
>    current. Approved before the current standard does not mean approved
>    against it. Any inherited element must be judged against these gates and
>    flagged when it fails, rather than passed through because it once carried
>    approval.
>
> IMPLEMENT
> - Record these gates in the canonical rule docs alongside the fast-mover and
>   slow-mover spines.
> - Add the deterministic checks named above; report them as advisory findings
>   with the element and the reason, never as automatic rewrites.
> - Add the eight elements as required fields in the argument-outline stage so
>   the owner can see, before drafting, which quality requirement each element
>   intends to satisfy.
> - Regression: a draft passing structural presence but failing three or more
>   quality gates must not be presented as complete; report it as
>   spine-quality-incomplete.
>
> No billed calls. Report the recorded gates, the checks added, and a
> retro-evaluation of the last Venus draft and the Saturn page against all eight
> gates so the owner can see the difference measured.

