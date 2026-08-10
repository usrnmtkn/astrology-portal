# PERSONAL & HEALTH deep-dive generation prompt (canonical)

**Status: OWNER APPROVED, 2026-08-09. `owner_approved`. Version `personal-health-deepdive-generation-prompt-v1`. Active for `personal_health` fulfillment by owner instruction to implement this prompt. Any later change requires a new version and fresh owner approval.**

**Product name locked: PERSONAL & HEALTH. Reference implementation: `artifacts/marie-satori-personal-health-2026-owner-v1.md` (owner-authored final, 2026-08-09; owner_authored_final voice evidence for this surface). Companion rulings that govern this prompt: `TLDR-YEAR-AHEAD-GENERATION-LOGIC-OWNER.md` (27-point GENERATION STANDARD), `TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md` (lived-prose standard, loaded verbatim into every draft call).**

---

## 1. What this product is

PERSONAL & HEALTH is a separate paid deep-dive purchased in addition to the General report. It covers the reader's year in body, capacity, daily rhythm, privacy, home-as-it-affects-daily-life, recovery, spiritual practice, and the roles they are growing out of — the parts of a year that happen mostly out of other people's view.

It is never an excerpt or filter of the General report. Factor selection re-runs against the COMPLETE calculated bundle, prioritized by this document's tiers. A factor excluded from the General report can lead this one; a factor central to the General report can be absent here.

A quiet chart yields a shorter report. Trust over page count. Do not manufacture material to justify the price.

## 2. Factor-inspection tiers

Inspect every factor in the bundle against these tiers; then gate. Inspection is mandatory, inclusion is earned.

```text
DIRECT PERSONAL / HEALTH TIER
- major transits to the natal Sun;
- major transits to the Ascendant and Ascendant ruler;
- major transits to the natal Moon when they materially affect daily rhythm, care, work, or health;
- 1st-house activations and ruler;
- 6th-house activations and ruler;
- 12th-house activations and ruler;
- annual profection and Lord of the Year when relevant to personal identity, privacy, daily life, or health;
- Solar Return overlays materially touching the 1st, 6th, or 12th houses, their rulers, Sun, Moon, or Ascendant;
- eclipses materially contacting those houses, rulers, Sun, Moon, or Ascendant.

CONDITION-CHANGER TIER
- 4th-house/home/family factors only when they change living conditions, caregiving, privacy, accessibility, commute, maintenance, or what the ordinary week requires;
- 3rd-house/Mercury factors when communication, errands, appointments, paperwork, or local travel change the schedule;
- 10th-house/MC factors only when public or professional developments change hours, commute, travel, physical demands, appointments, or recovery;
- work factors when they alter hours or daily demands;
- travel factors when they alter timing or recovery;
- money only when it changes access to help, transportation, housing, treatment/routine logistics, or the daily schedule.

Do not promote Home & Family, Work & Money, Learning, or relationship material
into Personal & Health merely because those domains appear in the chart.
They enter only through a demonstrated Personal & Health consequence.
```

Slow-planet non-assumptions, per the 27-point standard's planet logic: Uranus to personal points is changed conditions, not automatic rebellion (the change may be chosen or imposed by circumstance — health, caregiving, location, finances, time); Neptune is imagination, meaning, permeability, uncertainty — never automatically confusion, addiction, or depression; Saturn is structure, limit, sequence, durability — never automatically hardship or illness; Pluto is leverage, pressure, consequence — never automatically crisis.

## 3. The health-writing ceiling (hard rules)

This is the domain where the specificity ceiling matters most.

- Use only the earned health vocabulary: sleep, meals, appointments, movement, medication/routine when supported, workload, recovery, caregiving, physical capacity, daily schedule.
- Never invent symptoms, diagnoses, medical events, medical crises, or psychological causes for physical states. Never predict illness, decline, injury, or recovery outcomes.
- The reference's ceiling sentence is the model: "This is not enough astrology to predict a medical event. It is enough to notice where the schedule starts interfering with the care you already know you need." Health astrology in this report reads the *schedule around care*, not the body's future.
- Do not assume able-bodied status, and do not assume disability. Write so that changed capacity, chronic conditions, aging, caregiving, and simple preference are all live readings of the same sentence ("You may go to the event and need somewhere to sit").
- Do not moralize health. No praise for productivity, no framing rest as reward, no framing capacity change as failure. A reduced schedule is a fact about a week, not a verdict about a person.
- Banned here in addition to the global bans: "listen to your body", "protect your energy", "honor your needs", "prioritize self-care", "self-care" as a noun phrase, "wellness journey", "healing journey", "holding space". Advice, when given, names the next practical move inside the circumstance (the appointment stops being the flexible part; the trip keeps its next morning open; somebody else takes the driving).

## 4. Privacy, withdrawal, spirituality, detachment

These domains are first-class in this report when earned (12th house, 9th house, Neptune, Pisces, Jupiter, their rulers, repeated annual factors — per the 27-point standard §10–11):

- Spirituality manifests as practice: prayer, meditation, astrology, ritual, spiritual study, private reading, retreat, noticeable dreams, questioning an old belief, wanting more time alone. Never predict awakening, psychic ability, or crisis of faith.
- Detachment is not pathology. It can look like answering more slowly, reduced interest in visibility, pulling back from a group, feeling finished with being known for a role while still being able to do it. Always name what the person may feel detached *from*.
- Privacy is written as time and access: whose plans become the reader's schedule, what an empty calendar square is for, what does not need to be explained while it is still being decided.

## 5. Voice and prose

The lived-prose standard (`TLDR-REPORT-LIVED-PROSE-STANDARD-OWNER.md`) governs every sentence and is loaded verbatim with this prompt. Its regeneration procedure (ASTROLOGY / LIVED FACT / CAUSE / CONSEQUENCE / CONTRADICTION / DO NOT ASSUME) is the required pre-draft extraction for every paragraph and never appears in output.

Additionally, all shared invariants apply: possibility language with the hedged-frame scenario-block exception; specificity ceiling (specific about event type, uncertain about exact event); life-status neutrality (no assumed employment, partnership, children, home ownership, financial security); chart-earned topics only with the coverage gate; no astrologer persona; no em dashes; no "whether"; density caps (one primary manifestation menu per major factor; runs of 3–5 possibilities in one sentence or up to 4 short sentences); lexical budget on signature nouns; multi-pass transits advance (introduce → review → keep/resolve/hand off), never regenerate the first-pass menu; natural paragraph rhythm (no isolated one-liner cascades); advice optional; no manufactured closers.

Main prose tells the reader what the astrology means in the week; italic attribution lines carry the technical astrology (dates, degrees, houses, aspects, passes, rulers). Prose is not required to repeat what attribution carries.

## 6. Architecture

```text
YOUR YEAR IN PERSONAL & HEALTH
display period: birthday to birthday (documented display-period convention;
interpretation runs on the exact Solar Return window)

YYYY overview                      (seasonal preview in consequence language)
What YYYY is about personally      (profection/SR synthesis; Lord of Year)
[Thematic section when earned]     (e.g. Privacy, time, and access)
WINTER YYYY                        (+ Key dates)
SPRING YYYY: <consequence title>   (+ Key dates)
SUMMER YYYY: <consequence title>   (+ Key dates)
AUTUMN YYYY: <consequence title>   (+ Key dates)
[Health and capacity]              (when earned; the ceiling section)
YYYY IN REVIEW                     (that calendar year only)
WINTER YYYY+1: <consequence title> (+ Key dates)
```

Thematic sections exist only when the chart repeats the theme (the reference earns "Privacy, time, and access" from the 12th-house profection and earns "Health and capacity" from the 6th-house Moon under a Jupiter square). Season titles state the season's consequence in plain language, not astrology.

Key-date format: `DATE · TITLE · one sentence · attribution`. No category tags (the whole report is the category). Saturn-return material only in an actual Saturn-return year. YYYY IN REVIEW summarizes that calendar year only; next-year events stay in the next-year section.

## 7. Manifestation sets

Every included factor resolves through its manifestation-set record (DOMAIN, POSSIBLE LIVED MANIFESTATIONS, DO NOT ASSUME) before prose. Personal & Health prioritizes the manifestations that reach the calendar, the commute, the appointment, the staircase, the morning after travel — the ordinary places the lived-prose standard names. The 27-point standard's per-house menus (4th, 6th, 12th, 1st) apply.

## 8. Verification data: Marie 2026 factor shortlist (inspect-then-gate)

For the reference chart (Marie Satori, 2026 window), correct tier processing must include: the 12th-house Taurus profection with Venus Lord of Year (direct: identity/privacy/daily life); Uranus square natal Sun Apr 14 from the 12th (direct); Saturn sextile natal Ascendant May 19 / Oct 6 Rx / Feb 10 (direct, three passes, structural arc of the report); Jupiter square 6th-house natal Moon Aug 27 (direct, central health factor); Mar 3 total lunar eclipse on natal Saturn in the 4th (condition-changer: enters only through what home changes in the week); Jul 4 Jupiter return in the 3rd and the Aug 12 / Aug 28 eclipses (condition-changers: schedule and communication load); Feb 6, 2027 solar eclipse on the natal MC (condition-changer: enters only through hours, commute, travel, physical demands, recovery); Saturn and Neptune trines to natal Jupiter Feb 22 / Feb 26 (direct via 12th-house-year private work and practice). Correct gating must EXCLUDE: dating and relationship development material, money-as-income material, and career ambition material except through demonstrated schedule/capacity consequences. The reference report is the calculation and selection contract.

## 9. Governance

Generated wording is not owner-authored wording. All output lands `needs_review` in development contexts and passes the full fulfillment gate chain (validators → fact-lock → judge v3) in production. Only explicit exact owner approval promotes wording into the calibration corpus. The writer never changes calculated facts, never redefines governed aspect meanings, and stops rewriting once astrology, logic, specificity, natural language, and voice are correct.
