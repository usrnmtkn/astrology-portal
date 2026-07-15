# TLDR Astro Mustache Mad-Libs v2.2

This is the executable template companion to the editorial specification. Every template below contains literal Mustache fields. Codex should implement these shapes as named templates, resolve the slots from reviewed sources, and render them without exposing unresolved braces.

## 0. Rendering contract

### Slot types

- **Fact slots** come only from calculated astrology: `{{body}}`, `{{sign}}`, `{{house_ordinal}}`, `{{aspect_verb}}`, `{{orb_display}}`, dates, phases, motion, dignity, sect, and pass data.
- **Interpretive slots** come from the narrowest eligible reviewed combination source: `{{lived_scene}}`, `{{habitual_response}}`, `{{felt_tension}}`, `{{meaning_bridge}}`, `{{practical_action}}`.
- **Supporting sources** may constrain an interpretive slot. They may not create additional keyword sentences.
- Raw keywords are metadata. Never interpolate a keyword array into prose.
- If a required exact-combination source is absent, return `SOURCE_GAP`. Do not manufacture prose from planet, sign, aspect, or house definitions.

### Mustache conventions

```mustache
{{value}}                         plain escaped value
{{#has_value}}...{{/has_value}}  render when true
{{^has_value}}...{{/has_value}}  render when false
```

Do not place punctuation outside an optional block when that would leave orphaned commas or periods.

### Shared record envelope

```mustache
template_id: {{template_id}}
template_version: {{template_version}}
surface: {{surface}}
record_id: {{record_id}}
status: {{status}}
primary_source_key: {{primary_source_key}}
{{#supporting_source_keys}}supporting_source_key: {{.}}
{{/supporting_source_keys}}
```

### Required narrative test

Before rendering, the resolver must be able to complete this sentence with one scene:

```text
This entry is about the moment when {{one_coherent_situation}}.
```

If the answer is a list such as “money, intimacy, trust, and shared resources,” the record fails composition.

---

# 1. Home: daily horoscope

## 1A. Friction day

```mustache
{{editorial_headline}}

{{date_display}}

{{lived_scene}} may make {{felt_tension}} harder to ignore today. {{habitual_response}} can feel like the fastest way through it, but it may leave {{specific_cost}}. {{practical_action}}.
```

## 1B. Opening day

```mustache
{{editorial_headline}}

{{date_display}}

An opening may appear when {{lived_scene}}. It could be easy to miss if {{avoidance_pattern}}. {{practical_action}}, then let the response tell you what is possible.
```

## 1C. Reset day

```mustache
{{editorial_headline}}

{{date_display}}

{{routine_scene}} may be ready for a small change. You do not have to overturn {{larger_commitment}} to interrupt {{stale_pattern}}. {{specific_reset}}.
```

## 1D. Conversation day

```mustache
{{editorial_headline}}

{{date_display}}

The conversation may change once {{unspoken_issue}} is named. If you notice yourself {{habitual_response}}, pause before the exchange becomes about {{secondary_conflict}}. {{clarifying_question_or_request}}.
```

### Daily phrase slots

`{{practical_action}}` may take one source-supported form:

```text
Ask the question before filling in the answer
Change one part of the routine and notice what follows
Make the request specific enough to receive a real response
Let the first step be smaller than the final decision
Name what you can do before promising what you cannot
```

Do not use the same opening lane on consecutive records.

---

# 2. Home: today’s Moon forecast

Moon phase and Moon sign are separate records and separate templates.

## 2A. Moon phase: New Moon

```mustache
NEW MOON

The lunar cycle is beginning again. {{new_beginning_scene}} does not need a finished plan yet. Choose {{seed_action}}, and give it enough privacy to take root.
```

## 2B. Moon phase: Waxing Crescent

```mustache
WAXING CRESCENT MOON

The first signs of movement are becoming visible. Support {{early_effort}} before judging its final shape. {{small_building_action}}.
```

## 2C. Moon phase: First Quarter

```mustache
FIRST QUARTER MOON

The plan has reached a point of friction. {{decision_scene}} may require action before every doubt is resolved. Choose the obstacle you are willing to work with, then {{decisive_action}}.
```

## 2D. Moon phase: Waxing Gibbous

```mustache
WAXING GIBBOUS MOON

The work is in refinement now. Look closely at {{developing_effort}} and adjust what is almost, but not quite, supporting it. {{refinement_action}}.
```

## 2E. Moon phase: Full Moon

```mustache
FULL MOON

Something has reached visibility. {{culmination_scene}} may show you what has grown and what can no longer be overlooked. Acknowledge {{clear_result}}, then decide what deserves a response.
```

## 2F. Moon phase: Waning Gibbous

```mustache
WANING GIBBOUS MOON

The cycle is turning toward integration. Put words around {{lesson_or_result}} while it is still fresh. Share what is useful, and release the need to make the experience mean everything.
```

## 2G. Moon phase: Last Quarter

```mustache
LAST QUARTER MOON

Revision is part of the work now. {{outgrown_structure}} may have carried you this far without being able to carry you further. {{release_or_revision_action}}.
```

## 2H. Moon phase: Balsamic Moon

```mustache
BALSAMIC MOON

The lunar cycle is closing. Let {{ending_scene}} become quieter instead of forcing one more result from it. Compost {{outgrown_pattern}}, and leave room for the next beginning.
```

## 2I. Moon sign: need-led

```mustache
MOON SIGN

{{moon_sign}}

The Moon is in {{moon_sign}}. {{embodied_need}} may be easier to feel than explain. {{boundary_or_care_action}}. {{energy_protection_or_connection_permission}}.
```

## 2J. Moon sign: scene-led

```mustache
MOON SIGN

{{moon_sign}}

{{ordinary_scene}} may carry more feeling while the Moon is in {{moon_sign}}. Notice {{body_signal}} before deciding what the moment requires. {{short_permission}}.
```

## 2K. Moon sign: imperative compact

```mustache
{{moon_sign}} Moon: {{imperative_one}}. {{imperative_two}}. {{compassionate_limit}}.
```

Moon-sign phrase shapes:

```text
Feel it before explaining it
Protect the quiet you need
Move the feeling through the body
Choose company that does not require a disguise
Care for others without volunteering past your limit
```

---

# 3. Home: planetary horoscopes

## 3A. Current planet/sign list card

This is navigation, not an interpretation paragraph.

```mustache
{{body_glyph}}  {{body}}{{#is_retrograde}} Rx{{/is_retrograde}} in {{sign}}
{{start_date_display}} – {{end_date_display}}
```

Optional status row:

```mustache
{{#has_status}}{{status_label}}{{/has_status}}{{#has_dignity}} · {{dignity_label}}{{/has_dignity}}
```

## 3B. Personalized planet/sign/house: claim-led

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

{{scene_claim}}. While {{body}} moves through {{sign}} and your {{house_ordinal}} house, {{same_subject_development}}. {{reflective_question_one}}? {{#has_reflective_question_two}}{{reflective_question_two}}?{{/has_reflective_question_two}}

{{compassionate_bridge}}. {{practical_action}}.
```

## 3C. Personalized planet/sign/house: lived-moment-led

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

You may notice {{lived_scene}}. {{body_sign_dynamic}} becomes personal in your {{house_ordinal}} house through {{specific_house_scene}}. If {{habitual_response}}, {{likely_cost}}. {{practical_action}}.
```

## 3D. Personalized planet/sign/house: question-led

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

What happens when {{central_question}}? This {{body}} in {{sign}} passage brings that question into {{specific_house_scene}}. Notice {{observable_behavior}}. {{second_question}}? {{practical_action}}.
```

## 3E. Personalized planet/sign/house: tension-and-compassion

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

{{lived_tension}}. It makes sense that {{understandable_response}} when {{specific_pressure}}. The work is to {{developmental_task}} without {{unhelpful_extreme}}. {{practical_action}}.
```

Resolver rule:

```text
current body/sign exact source
    + resolved rising-sign whole-sign house
    + reviewed body/sign/house combination or eligible scene source
    = personalized planetary horoscope
```

The house selects one scene. It must not create a keyword list.

---

# 4. Transits

An exact reviewed aspect-pair or point-pair source is required for interpretive prose.

## 4A. Short-term challenging theme

```mustache
{{editorial_headline}}

{{timing_display}}{{#has_exact_date}} · Exact {{exact_date_display}}{{/has_exact_date}}

{{immediate_lived_scene}}. {{habitual_response}} may intensify {{specific_cost}}. {{practical_action}}.

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4B. Short-term supportive theme

```mustache
{{editorial_headline}}

{{timing_display}}{{#has_exact_date}} · Exact {{exact_date_display}}{{/has_exact_date}}

{{available_opening}}. You could miss it by {{underuse_pattern}}. {{deliberate_participation}}.

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4C. Short-term conjunction

```mustache
{{editorial_headline}}

{{timing_display}}{{#has_exact_date}} · Exact {{exact_date_display}}{{/has_exact_date}}

{{two_functions_becoming_entangled_scene}}. It may be difficult to separate {{function_a_lived}} from {{function_b_lived}} right now. {{concentration_action}}.

The astro: Transiting {{transiting_point}} conjoins your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4D. Short-term angle contact

```mustache
{{editorial_headline}}

{{timing_display}}{{#has_exact_date}} · Exact {{exact_date_display}}{{/has_exact_date}}

{{angle_specific_scene}} may feel more immediate than usual. {{behavioral_consequence}}. {{proportionate_adjustment}}.

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{angle_name}}. Orb: {{orb_display}}.
```

If there is no exact Mars–Ascendant source, for example:

```mustache
status: SOURCE_GAP
reason: No eligible reviewed exact source for {{transiting_point}} {{aspect_name}} natal {{natal_point_or_angle}}.
```

## 4E. Long-term pressure/restructuring

```mustache
{{editorial_headline}}

{{timing_display}} · Long-term

{{recurring_lived_scene}}.

{{repeating_pattern}}. {{pressure_meaning}}.

{{#has_practical_action}}{{practical_action}}.{{/has_practical_action}}

{{#has_pass_context}}{{pass_context}}{{/has_pass_context}}

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4F. Long-term opening/expansion

```mustache
{{editorial_headline}}

{{timing_display}} · Long-term

{{recurring_opportunity_scene}}.

{{trust_or_capacity_pattern}}. {{capacity_being_developed}}.

{{#has_practical_action}}{{deliberate_participation}}.{{/has_practical_action}}

{{#has_pass_context}}{{pass_context}}{{/has_pass_context}}

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4G. Long-term disruption/liberation

```mustache
{{editorial_headline}}

{{timing_display}} · Long-term

{{recurring_disruption_scene}}.

{{stability_pattern}} may no longer contain {{emerging_need}}. {{liberating_meaning}}.

{{#has_practical_action}}{{bounded_experiment}}.{{/has_practical_action}}

{{#has_pass_context}}{{pass_context}}{{/has_pass_context}}

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4H. Long-term dissolution/uncertainty

```mustache
{{editorial_headline}}

{{timing_display}} · Long-term

{{uncertain_lived_scene}}.

{{old_certainty}} may be losing definition before {{new_orientation}} is ready. {{discernment_meaning}}.

{{#has_practical_action}}{{grounding_action}}.{{/has_practical_action}}

{{#has_pass_context}}{{pass_context}}{{/has_pass_context}}

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

## 4I. Long-term transformation

```mustache
{{editorial_headline}}

{{timing_display}} · Long-term

{{recurring_power_or_loss_scene}}.

{{control_pattern}} has been protecting {{underlying_vulnerability}}, but it may now be intensifying {{specific_cost}}. {{transformational_meaning}}.

{{#has_practical_action}}{{practical_action}}.{{/has_practical_action}}

{{#has_pass_context}}{{pass_context}}{{/has_pass_context}}

The astro: Transiting {{transiting_point}} {{aspect_verb}} your natal {{natal_point}}{{#has_natal_sign}} in {{natal_sign}}{{/has_natal_sign}}{{#has_natal_house}} in the {{natal_house_ordinal}} house{{/has_natal_house}}. Orb: {{orb_display}}.
```

### Transit phrase shapes

Use only when supported by the exact pair source:

```text
Ask for what you need before you pull away
Let the next action show what the agreement can support
Pause long enough to choose the outcome you are trying to create
Take the opening seriously without demanding that it solve everything
Use the return of this issue as a checkpoint, not a verdict
```

Avoid automatic transitions such as “You may be noticing,” “Maybe you,” and “This transit reveals.” They are optional variants, never fixed beats.

---

# 5. Me / Natal

## 5A. Placement core: resource-led

```mustache
{{body}} in {{sign}} in the {{house_ordinal}} house

{{body_in_sign_lived_claim}}. In the {{house_ordinal}} house, this becomes visible through {{one_house_scene}}. {{integrated_resource}}.
```

## 5B. Placement core: developmental tension

```mustache
{{body}} in {{sign}} in the {{house_ordinal}} house

{{body_in_sign_lived_tension}}. You may recognize it most clearly when {{one_house_scene}}. {{habitual_response}} can protect {{underlying_need}} while making {{specific_cost}} harder to avoid. {{developmental_direction}}.
```

## 5C. Placement core: relational expression

```mustache
{{body}} in {{sign}} in the {{house_ordinal}} house

{{relational_scene}} often shows how {{body_function_lived}} works through {{sign_style_lived}} for you. In the {{house_ordinal}} house, {{same_relationship_subject}}. {{relational_growth_edge}}.
```

## 5D. Placement core: private/internal expression

```mustache
{{body}} in {{sign}} in the {{house_ordinal}} house

Much of this placement may happen before anyone else can see it. {{private_lived_process}}. The {{house_ordinal}} house locates that process in {{one_private_house_scene}}. {{integration_direction}}.
```

## 5E. Eligible sect modifier

Render only when reliable birth time and horizon data exist.

```mustache
{{#has_reliable_sect}}
{{#is_day_chart}}Because this is a day chart, {{sect_modifier_day}}.{{/is_day_chart}}
{{#is_night_chart}}Because this is a night chart, {{sect_modifier_night}}.{{/is_night_chart}}
{{#has_calculated_mercury_sect}}{{mercury_sect_sentence}}{{/has_calculated_mercury_sect}}
{{/has_reliable_sect}}
```

Do not render any sect sentence when `has_reliable_sect` is false. Do not use natal sect to rank transits automatically.

## 5F. Natal retrograde modifier

```mustache
{{#is_natal_retrograde}}{{retrograde_internalization_scene}}. {{retrograde_revision_pattern}}.{{/is_natal_retrograde}}
```

## 5G. Dignity modifier

```mustache
{{#has_dignity}}{{dignity_lived_effect}}.{{/has_dignity}}
```

Never print a dignity label as a personality verdict. The modifier must describe how the function operates.

## 5H. Ruler bridge

```mustache
{{#has_ruler_bridge}}{{sign}} answers to {{ruler_body}} here. With {{ruler_body}} in {{ruler_sign}} in the {{ruler_house_ordinal}} house, {{ruler_bridge_same_subject}}.{{/has_ruler_bridge}}
```

## 5I. Supportive natal aspect modifier

```mustache
{{#has_supportive_aspect}}{{supportive_aspect_scene}} can give this placement another way to respond. {{supportive_capacity}}.{{/has_supportive_aspect}}
```

## 5J. Challenging natal aspect modifier

```mustache
{{#has_challenging_aspect}}{{challenging_aspect_scene}} can make the placement harder to use consistently. {{integration_practice}}.{{/has_challenging_aspect}}
```

## 5K. Full natal placement composition

```mustache
{{body}} in {{sign}} in the {{house_ordinal}} house

{{placement_core_paragraph}}

{{#has_reliable_sect}}{{sect_paragraph}}{{/has_reliable_sect}}

{{#is_natal_retrograde}}{{retrograde_paragraph}}{{/is_natal_retrograde}}

{{#has_dignity}}{{dignity_paragraph}}{{/has_dignity}}

{{#has_ruler_bridge}}{{ruler_bridge_paragraph}}{{/has_ruler_bridge}}

{{#has_supportive_aspects}}{{supportive_aspects_paragraph}}{{/has_supportive_aspects}}

{{#has_challenging_aspects}}{{challenging_aspects_paragraph}}{{/has_challenging_aspects}}
```

Suppress absent or repetitive modifiers. The order is fixed; the number rendered is not.

## 5L. Angles: Ascendant

```mustache
Ascendant in {{sign}}

{{first_impression_scene}}. You tend to meet unfamiliar situations by {{approach_pattern}}. {{sign_style_lived}} shapes what others encounter first, while {{growth_edge}}.
```

## 5M. Angles: Midheaven

```mustache
Midheaven in {{sign}}

{{public_role_scene}}. Your direction becomes clearer when {{vocational_pattern}}. {{sign_style_lived}} influences how you handle visibility, responsibility, and the work you want attached to your name.
```

## 5N. Angles: Descendant

```mustache
Descendant in {{sign}}

{{partnership_scene}}. You may be drawn toward people who {{projected_or_sought_quality}}. The work is to recognize {{relational_quality}} as something to negotiate consciously, not simply expect another person to carry.
```

## 5O. Angles: IC

```mustache
IC in {{sign}}

{{private_foundation_scene}}. Home and belonging may depend on {{root_pattern}}. {{restorative_or_boundary_direction}}.
```

## 5P. Natal aspect: conjunction

```mustache
{{point_a}} conjunct {{point_b}}

{{combined_function_scene}}. These two functions are difficult to separate in your chart, so {{lived_consequence}}. {{integration_direction}}.
```

## 5Q. Natal aspect: supportive

```mustache
{{point_a}} {{aspect_name}} {{point_b}}

{{supportive_lived_scene}}. {{point_a_function_lived}} and {{point_b_function_lived}} can cooperate when {{activation_condition}}. {{capacity_direction}}.
```

## 5R. Natal aspect: square

```mustache
{{point_a}} square {{point_b}}

{{recurring_internal_conflict_scene}}. When {{point_a_need}} presses against {{point_b_need}}, you may {{habitual_response}}. The tension becomes useful when {{integration_direction}}.
```

## 5S. Natal aspect: opposition

```mustache
{{point_a}} opposite {{point_b}}

{{polarity_scene}}. You may alternate between {{pole_a_behavior}} and {{pole_b_behavior}}, especially when {{activation_condition}}. {{relational_or_internal_balance}}.
```

---

# 6. Sky

Sky is collective. It must not use natal houses or second-person personalization unless the surface explicitly says how the collective event may be observed.

## 6A. Collective planet in sign: compact card

```mustache
{{body}}{{#is_retrograde}} Rx{{/is_retrograde}} in {{sign}}
{{start_date_display}} – {{end_date_display}}
{{compact_collective_claim}}
```

## 6B. Collective planet in sign: inner planet

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

{{collective_lived_scene}} may become more noticeable while {{body}} moves through {{sign}}. {{body_sign_dynamic_in_same_scene}}. {{#has_collective_response}}{{collective_response}}.{{/has_collective_response}}
```

## 6C. Collective planet in sign: social planet

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

{{shared_priority_or_pressure_scene}} may develop over this passage. {{body_sign_dynamic_in_same_subject}}. Watch how {{observable_collective_pattern}} changes what people reward, require, or organize around.
```

## 6D. Collective planet in sign: outer planet

```mustache
{{body}} in {{sign}}

{{start_date_display}} – {{end_date_display}}

This longer passage places {{collective_structure_or_assumption}} under sustained change. {{slow_collective_development}}. Its meaning will become clearer through repeated events, not one dramatic day.
```

## 6E. Current-sky aspect: challenging

```mustache
{{point_a}} {{aspect_name}} {{point_b}}

{{timing_display}}{{#has_exact_time}} · Exact {{exact_time_display}}{{/has_exact_time}}

{{collective_friction_scene}} may bring {{two_functions_conflict}} into sharper contact. {{#has_response}}{{proportionate_collective_response}}.{{/has_response}}

The astro: {{point_a}} {{aspect_verb}} {{point_b}}. Orb: {{orb_display}}.
```

## 6F. Current-sky aspect: supportive

```mustache
{{point_a}} {{aspect_name}} {{point_b}}

{{timing_display}}{{#has_exact_time}} · Exact {{exact_time_display}}{{/has_exact_time}}

{{collective_opening_scene}} can make {{cooperative_function}} easier to access. {{#has_response}}{{deliberate_collective_use}}.{{/has_response}}

The astro: {{point_a}} {{aspect_verb}} {{point_b}}. Orb: {{orb_display}}.
```

## 6G. Pre-shadow

```mustache
{{body}} enters pre-shadow

{{start_date_display}} – {{station_retrograde_date_display}}

{{early_recurrence_scene}} may introduce material that returns during the retrograde. Notice what begins repeating, but do not force a conclusion yet.

The astro: {{body}} entered its pre-retrograde shadow at {{shadow_degree_display}} {{sign}}.
```

## 6H. Station retrograde

```mustache
{{body}} stations retrograde in {{sign}}

{{station_date_display}}

{{station_lived_scene}} may slow, double back, or require review. The station concentrates the change of direction, so give {{affected_process}} more time than usual.

The astro: {{body}} stationed retrograde at {{station_degree_display}} {{sign}} on {{station_date_display}}.
```

## 6I. Retrograde passage

```mustache
{{body}} Rx in {{sign}}

{{station_retrograde_date_display}} – {{station_direct_date_display}}

{{review_scene}} may return in a form that makes the unfinished part easier to recognize. Revisit {{specific_material}} before committing to {{premature_next_step}}. {{#has_practical_action}}{{practical_action}}.{{/has_practical_action}}

The astro: {{body}} is retrograde in {{sign}} from {{station_retrograde_date_display}} through {{station_direct_date_display}}.
```

## 6J. Cazimi during retrograde

```mustache
{{body}} cazimi

{{exact_date_display}}

The retrograde reaches a moment of clarity around {{review_subject}}. A detail that was obscured may become easier to name. Record the insight before asking it to become a finished answer.

The astro: The Sun conjoins retrograde {{body}} at {{exact_degree_display}} {{sign}} on {{exact_date_display}}.
```

## 6K. Station direct

```mustache
{{body}} stations direct in {{sign}}

{{station_date_display}}

{{reviewed_process}} begins moving forward again, though momentum may return gradually. Use what the retrograde clarified to make {{next_decision}} more deliberate.

The astro: {{body}} stationed direct at {{station_degree_display}} {{sign}} on {{station_date_display}}.
```

## 6L. Post-shadow

```mustache
{{body}} clears post-shadow

{{station_direct_date_display}} – {{shadow_exit_date_display}}

The retrograde story is moving through its final degrees. {{integration_scene}} may show whether the revision can hold under ordinary conditions. Complete {{specific_follow_through}}.

The astro: {{body}} clears its post-retrograde shadow at {{shadow_degree_display}} {{sign}} on {{shadow_exit_date_display}}.
```

## 6M. Ingress

```mustache
{{body}} enters {{sign}}

{{ingress_date_display}}{{#has_exit_date}} – {{exit_date_display}}{{/has_exit_date}}

{{collective_focus_shift}} becomes more noticeable as {{body}} enters {{sign}}. {{same_subject_development}}. {{#has_response}}{{proportionate_collective_response}}.{{/has_response}}

The astro: {{body}} entered {{sign}} at {{ingress_time_display}} on {{ingress_date_display}}{{#has_timezone}} {{timezone_display}}{{/has_timezone}}.
```

## 6N. Exact calendar event

```mustache
{{event_title}}

{{event_date_display}}{{#has_exact_time}} · {{exact_time_display}}{{/has_exact_time}}

{{event_lived_meaning}}. {{#has_response}}{{event_response}}.{{/has_response}}

The astro: {{technical_event_sentence}}
```

## 6O. Calendar list row

```mustache
{{event_date_compact}}  {{event_title}}{{#has_exact_time}} · {{exact_time_compact}}{{/has_exact_time}}
```

---

# 7. Filled examples

These demonstrate interpolation. They are fixtures, not copy to paste across unrelated records.

## 7A. Long-term transit input

```yaml
editorial_headline: Saturn square your Venus
timing_display: March 23–November 1
recurring_lived_scene: You may notice the connection cool down right when you need reassurance, especially around a shared obligation that cannot stay vague
repeating_pattern: You may withdraw instead of asking directly whether you are wanted, or judge the relationship only by what someone does when affection feels scarce
pressure_meaning: Warmth and caution keep meeting each other, and the bond may need steadier actions before trust can relax
has_practical_action: true
practical_action: Ask for what you need before you pull away, then let the next action show what the connection can support
has_pass_context: true
pass_context: Because this is a longer, repeating process, use each return as a checkpoint rather than a final verdict.
transiting_point: Saturn
aspect_verb: squares
natal_point: Venus
has_natal_sign: true
natal_sign: Capricorn
has_natal_house: true
natal_house_ordinal: 8th
orb_display: 0°
```

Rendered with template 4E:

```text
Saturn square your Venus

March 23–November 1 · Long-term

You may notice the connection cool down right when you need reassurance, especially around a shared obligation that cannot stay vague.

You may withdraw instead of asking directly whether you are wanted, or judge the relationship only by what someone does when affection feels scarce. Warmth and caution keep meeting each other, and the bond may need steadier actions before trust can relax.

Ask for what you need before you pull away, then let the next action show what the connection can support.

Because this is a longer, repeating process, use each return as a checkpoint rather than a final verdict.

The astro: Transiting Saturn squares your natal Venus in Capricorn in the 8th house. Orb: 0°.
```

## 7B. Personalized planetary horoscope input

```yaml
body: Sun
sign: Cancer
house_ordinal: 2nd
start_date_display: June 21, 2026
end_date_display: July 22, 2026
scene_claim: Money matters can become emotional when a number starts standing in for safety, worth, or permission
same_subject_development: a purchase, price, or financial boundary may show you where feeling secure and appearing secure have become confused
reflective_question_one: Are you asking the budget to calm a fear it cannot resolve
has_reflective_question_two: true
reflective_question_two: What would enough look like if it did not have to impress anyone
compassionate_bridge: Your feelings do not need to be perfectly logical to contain useful information
practical_action: Name the need underneath one money decision before acting on it
```

Rendered with template 3B:

```text
Sun in Cancer

June 21, 2026 – July 22, 2026

Money matters can become emotional when a number starts standing in for safety, worth, or permission. While the Sun moves through Cancer and your 2nd house, a purchase, price, or financial boundary may show you where feeling secure and appearing secure have become confused. Are you asking the budget to calm a fear it cannot resolve? What would enough look like if it did not have to impress anyone?

Your feelings do not need to be perfectly logical to contain useful information. Name the need underneath one money decision before acting on it.
```

---

# 8. Prohibited output seams

Reject rendered prose containing these generic joins unless an editor explicitly approved the exact sentence for the exact record:

```text
{{planet}} moves through {{sign}} circumstances
{{planet}} brings {{keywords}}
{{topic_list}} meets {{condition_list}}
This pattern is active now
Watch for {{planet}} patterns
Choose the next concrete response
the planet names the topic
the sign describes the condition
```

Also reject:

- unresolved `{{` or `}}`;
- two consecutive sentences sourced independently from planet and house keyword records;
- a house keyword list presented as a lived scene;
- duplicated hero, overview, long-term, and footer copy;
- a technical footer embedded inside the narrative paragraph;
- sect copy without reliable birth time and horizon calculation;
- any personalized transit prose without an eligible exact pair source.

## Final renderer acceptance test

```text
1. Does the output resolve to exactly one product surface?
2. Are all facts validated and displayed once?
3. Did the narrowest eligible reviewed combination source supply the lived situation?
4. Does every supporting source constrain that same situation?
5. Can the narrative be summarized as one coherent lived moment rather than a category list?
6. Were optional blocks suppressed when repetitive or unsupported?
7. Are all Mustache tokens resolved?
8. Is the technical astrology separated into its assigned footer when required?
9. Does the compact version differ from the expanded version?
10. If the exact source is absent, did the system return SOURCE_GAP?
```
