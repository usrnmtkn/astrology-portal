# Aspect Pattern Activation Copy Review Ledger

Reviewed on 2026-07-19 for `aspect_pattern_activation_copy_resolver_v1`.

All fields were reviewed for each fixture: eyebrow, headline, overview, current_emphasis, transit_trigger, pattern_role, linked_patterns, timing, watch_for, and confidence_note.

## Decisions

| Fixture ID | Pattern | Target role | Timing | Confidence | Trigger mode | Level | Decision | Issues | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `t-square-apex-applying` | T-square | apex | applying | exact | single | source_grounded_template | revise | too_technical, repetitive | Replaced raw aspect headline and report-like trigger language with ordinary contact language. |
| `t-square-opposition-separating` | T-square | opposition_axis | separating | exact | single | source_grounded_template | revise | too_technical, timing_overstatement | Kept opposition route distinct from apex route and changed timing to describe closest contact having passed. |
| `grand-square-shared-planet` | Grand Square | opposition_axis | applying | exact | shared_planet | source_grounded_template | revise | repetitive, internal_language_leak | Collapsed four duplicate T-square names into `four T-squares`; kept unequal-volume guardrail. |
| `grand-trine-separating` | Grand Trine | pattern_member | separating | exact | single | source_grounded_template | revise | overclaim | Preserved low-friction language without promising luck, talent, ease, or opportunity. |
| `kite-focal-applying` | Kite | focal_planet | applying | exact | single | source_grounded_template | revise | wrong_role | Preserved focal planet, opposition, and underlying Grand Trine without calling the focal planet an apex. |
| `kite-resource-separating` | Kite | resource_planet | separating | exact | single | source_grounded_template | revise | wrong_role, internal_language_leak | Mapped internal spine role to reader-safe resource planet language. |
| `yod-apex-applying` | Yod | apex | applying | strong | single | source_grounded_template | revise | overclaim | Removed guarantee language and kept adjustment/timing language qualified. |
| `mystic-rectangle-member-separating` | Mystic Rectangle | opposition_axis | separating | exact | single | source_grounded_template | revise | overclaim | Preserved two-opposition structure without promising balance, harmony, or resolution. |
| `t-square-multi-trigger-mixed` | T-square | apex | mixed | exact | multiple | source_grounded_template | revise | repetitive | Added one combined multi-trigger sentence instead of separate transit paragraphs. |
| `t-square-exact` | T-square | apex | exact | exact | single | source_grounded_template | revise | timing_overstatement | Uses closest-contact language without claiming the date is uniquely important. |
| `t-square-applying` | T-square | apex | applying | exact | single | source_grounded_template | keep |  | Applying route remains distinct as still building. |
| `t-square-separating` | T-square | apex | separating | exact | single | source_grounded_template | keep |  | Separating route remains distinct as closest contact passed. |
| `wide-yod-apex` | Yod | apex | applying | wide | single | source_grounded_template | revise | vague | Added explicit wider-pattern confidence note. |
| `partial-yod-apex` | Yod | apex | applying | partial | single | source_grounded_template | revise | vague | Added explicit partial-pattern confidence note. |
| `emergency-t_square` | T-square | apex | applying | exact | single | emergency_fallback | keep |  | Readable emergency fallback. |
| `emergency-grand_square` | Grand Square | opposition_axis | applying | exact | single | emergency_fallback | keep |  | Readable emergency fallback. |
| `emergency-grand_trine` | Grand Trine | pattern_member | separating | exact | single | emergency_fallback | keep |  | Readable emergency fallback. |
| `emergency-kite` | Kite | resource_planet | separating | exact | single | emergency_fallback | keep |  | Readable emergency fallback. |
| `emergency-yod` | Yod | apex | applying | strong | single | emergency_fallback | keep |  | Readable emergency fallback with prohibited Yod language blocked. |
| `emergency-mystic_rectangle` | Mystic Rectangle | opposition_axis | separating | exact | single | emergency_fallback | keep |  | Readable emergency fallback. |

## Before And After Examples

Before:

```text
Timing state: applying. Use the supplied activation timing only; do not infer a new date window.
```

After:

```text
This contact is still building.
```

Before:

```text
Saturn is making a Opposition to Sun with an orb of 1.2 degrees.
```

After:

```text
Saturn is making an opposition to Sun, close by 1.2 degrees.
```

Before:

```text
Moon also belongs to T-square, T-square, T-square, and T-square, so related pattern themes may be active alongside this one without being equally loud.
```

After:

```text
Moon also belongs to four T-squares, so several connected parts of the chart may feel more noticeable at the same time without being equally loud.
```

Before:

```text
Jupiter are also contacting this pattern, so read this as one combined moment rather than separate unrelated hits.
```

After:

```text
There is also contact from Jupiter, so read this as one combined moment rather than separate unrelated hits.
```
