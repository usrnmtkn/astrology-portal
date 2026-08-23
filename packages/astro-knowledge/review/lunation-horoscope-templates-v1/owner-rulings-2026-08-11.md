# Lunation horoscope template owner rulings

Date: 2026-08-11

## Recorded owner statements

> yes - ordinary new moons mention the lunar arc

> full moon closes should match the theme of the full moon

> 3 - i do not know what this is

After clarification, the owner ruled:

> the solar-eclipse should be what the event itself is

## Machine interpretation

- `plain_new_moon_arc`: resolved. Ordinary New Moon horoscopes name the lunar-cycle arc,
  never an unsupported six-month arc.
- `full_moon_close_temperature`: resolved. The close follows the specific Full Moon's
  theme rather than using a universal benediction or universally sharp close.
- `solar_eclipse_desire_test`: resolved. The desire test is excluded. The solar-eclipse
  horoscope describes the event itself rather than recasting it as a test of the reader's
  desire.

No generation, serving, or runtime approval is recorded by these rulings.

## Matching New Moon anchor addendum

Date: 2026-08-23

The owner directed that every ordinary Full Moon write-up include this anchor:

> Six months ago, consciously or not, this lunar cycle began with the New Moon in X.

The owner then directed that the verified matching New Moon date be included, with its year
shown only when the six-month cycle crosses a calendar year, and asked for the rule and
compiler to be updated.

Machine interpretation:

- `matchingNewMoon` is required for every `full-moon` packet.
- Its sign must match the Full Moon sign and its exact time must precede the Full Moon.
- The governed sentence is: "Six months ago, consciously or not, this lunar cycle began
  with the New Moon in {{matchingNewMoonSign}} on {{matchingNewMoonDate}}."
- `matchingNewMoonDate` renders as `MMMM d` in the same calendar year and `MMMM d, yyyy`
  when the New Moon year differs from the Full Moon year.
- This is a writing-rule and compiler update. It does not authorize generation, serving, or
  runtime use of the non-serving lunation template contract.
