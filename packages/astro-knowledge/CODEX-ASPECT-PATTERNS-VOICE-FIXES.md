# Voice audit of the v3.3 real renders - three value/renderer fixes (contract stays frozen)

The resolver, branches, and all three gates are correct. But the real-chart renders
read verbose and list-heavy - the AI-list texture. Every fix below is a TOKEN VALUE
or RENDERER-COMPOSITION change (both allowed post-freeze); none touches the templates,
tokens, or contract. The good news: the strongest lines prove the voice works - e.g.
"you love big, give big, and take real pride in the people you call yours" and "you
look calm on the outside while something restless paces around inside you." The job
is to stop burying those under scaffolding.

## Fix 1 (VALUE): role_gloss and house_area are long comma-lists; make them single concepts
The templates join multiples ("between {A} and {B}", "tie {A}, {B}, {C}, {D}"). When
each value is a 3-4 item list, the joins become unreadable.
- BEFORE (Yod opening): "an easy rhythm between love, pleasure, taste, and what you
  value and emotional needs, moods, and what makes you feel safe."
  AFTER: "an easy rhythm between what you value and what you need to feel safe."
- BEFORE (Grand Cross opening): "tie communication, learning, and everyday connections,
  work, health, and daily routine, belief, study, travel, and the bigger picture, and
  solitude, the unconscious, and the behind-the-scenes into one pattern"
  AFTER: "tie communication, daily work, belief, and the inner life into one pattern"
role_gloss must be the 2-4 word form the contract already specifies (one concept:
"what you value", "how you push"), not the planet's full meaning string. house_area
needs a SHORT single-topic label for these join contexts ("career and reputation",
not "career, reputation, and public role").

## Fix 2 (RENDERER): stop appending house/role tails onto the already-complete table clauses
The focal_demand / apex_pressure / repeating_question values from the tables are
complete sentences. The resolver is decorating them with extra house_area + role_gloss,
which breaks them.
- BEFORE: "Saturn in the 10th house adds consequences that are harder to smooth over
  for achievement and structure in career, reputation, and public role."
  AFTER: "Saturn in the 10th house of career and reputation adds consequences that are
  harder to smooth over."
- BEFORE: "...comes back later with the question of what is sustainable, what is owed,
  and what you can carry around career, reputation, and public role, with room for
  achievement and structure."
  AFTER: "...comes back later with the question of what is sustainable, what is owed,
  and what you can carry."
Serve the table clause verbatim. If a house anchor is wanted, put it once on the planet
("in the 10th house of career and reputation"), never as a trailing decoration on the
clause.

## Fix 3 (RENDERER): simplify the sign_house_pull composition; lead with the concrete line
The current formula is "moves through {long house_area} in a {three adjectives} way:
{concrete personal line}". The scaffold before the colon is boilerplate repeated 3-4x;
the concrete line after the colon is the good part.
- BEFORE: "Your Venus in the 3rd house moves through communication, learning, and
  everyday connections in a curious, restless, talkative way: you win people over with
  wit and easy conversation, and you can read what makes someone tick with surprising
  accuracy."
  AFTER: "Your Venus in the 3rd house wins people over with wit and easy conversation,
  and reads what makes someone tick with surprising accuracy."
Lead with the concrete behavior. Drop "moves through {area} in a {adjectives} way:".
Keep one short house anchor only if it adds meaning.

## Gate improvement (why the gold suite missed this)
gold_render.py used short synthetic fills ("money and worth"), so it never triggered
the list-collapse or over-decoration. Update its fixtures to PRODUCTION-LENGTH values
(multi-item house_area, full role_gloss, the real table clauses) and add checks that
fail on: three or more commas in a single joined subject; a table clause followed by
an appended "for/around/with room for {...}" tail; the literal scaffold "moves through
... in a ... way:". Then it will catch this class automatically next time.

## Not in scope
No template, token, or contract change. After fixes, re-run all three gates from a
clean dir and regenerate the 36-card audit for a fresh voice read.
