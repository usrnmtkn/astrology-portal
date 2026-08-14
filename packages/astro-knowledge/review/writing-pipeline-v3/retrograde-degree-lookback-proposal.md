# Retrograde degree look-back proposal

Status: **owner-review-pending**  
Part of the approved fast-mover spine: **no**  
Implemented: **no**  
Used by the Venus in Libra writer packet: **no**

## What it would add

An optional, engine-fact history line connecting the current degree to the most recent
retrograde of the same planet that crossed the same degree or came within four degrees. It
would add dates and degree proximity only. It would not invent a recurring life theme or
historical interpretation.

## When it would trigger

Only when the engine can verify all of the following:

- the same planet;
- a prior retrograde interval;
- the current zodiacal degree;
- the closest degree reached during that prior retrograde;
- an absolute separation of 0° through 4°;
- the complete prior retrograde date range.

If any fact is missing, the line would render nothing. It would not search by sign alone,
substitute another cycle, or estimate dates.

## Example of the proposed output

Schematic example only; the values below are placeholders, not asserted ephemeris facts:

> Last retrograde near this degree: {{priorRetrogradeStartDate}} to
> {{priorRetrogradeEndDate}} ({{priorRetrogradeClosestDegree}};
> {{degreeDistance}}° from the current degree).

This example also proposes new reader-facing wording. Neither the rule nor the wording is
approved. Both require a separate owner ruling before any engine or template implementation.

