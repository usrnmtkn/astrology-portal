#!/usr/bin/env python3
"""
build_marie_site_templates.py — the curated Marie voice layer from mariesatori.com.

Author-filtered exact website sentences (CONFIRMED, serve-verbatim) each paired with a
reusable template form (REVIEWED_TEMPLATE), plus the six recurring template families and
the core writing principle. Older language the author has moved away from was excluded
by the author (alignment, authentic self, masks, abstract healing, keyword stacks, most
X-not-Y). Attributed quotes from other writers were excluded.

These feed the PERSONALIZED horoscope surfaces (Home daily/weekly/monthly, personalized
transits) — the register is second-person. Emits phrasebank/cc-marie-site-templates.json.
Filename omits 'reviewed' so tone_pass / seam-lint passes skip the CONFIRMED lines.
"""
import json, os

PRINCIPLE = (
 "Name an ordinary behavior first (overworking, staying quiet, managing someone's mood, "
 "editing a message, refusing help, keeping a failing system running). The astrology "
 "becomes powerful when it explains why that behavior is becoming impossible to continue."
)

FAMILIES = [
 {"id":"family/strength-gone-too-far","name":"The strength that has gone too far",
  "pattern":"Your {strength} helped you {survive/succeed/connect}, but it is now costing you {lived consequence}."},
 {"id":"family/behavior-and-hidden-reason","name":"The behavior and the hidden reason",
  "pattern":"You have been {specific behavior} because {fear or need}. Now {concrete consequence} is becoming harder to ignore."},
 {"id":"family/body-reveals-cost","name":"The body reveals the cost",
  "pattern":"Your body may be carrying {symptom or exhaustion} while you continue {appeasing, working, managing, or avoiding}."},
 {"id":"family/two-conflicting-needs","name":"The two conflicting needs",
  "pattern":"One side of you wants {desire}. The other is afraid of {specific cost attached to receiving it}."},
 {"id":"family/disruption-as-information","name":"The disruption as information",
  "pattern":"The {delay, conflict, ending, or disruption} reveals where {existing arrangement} was already failing."},
 {"id":"family/practical-close","name":"The practical close",
  "pattern":"Choose one {conversation/task/habit/boundary}. Make it specific enough to act on before {timing marker}."},
]

# (exact sentence, reusable template, article title, url-slug, family-id or "")
LINES = [
 ("Your value isn't up for negotiation, even in relationships where you love the other person.",
  "Your {need/value/boundary} is not up for negotiation, even in {relationship where enforcing it is difficult}.",
  "Full Moon in Taurus","full-moon-in-taurus",""),
 ("You've pushed past your own limits to keep things running, but exhaustion isn't a badge of honor.",
  "You've pushed past {limit} to keep {responsibility} running, but {visible consequence} is catching up with you.",
  "Chiron Retrograde in Aries","chiron-retrograde-in-aries","family/strength-gone-too-far"),
 ("One side of you wants to be seen. The other side is scared of what visibility might cost.",
  "One side of you wants {desire}. The other is afraid of {specific cost of receiving it}.",
  "Aquarius Full Moon","aquarius-full-moon-2025","family/two-conflicting-needs"),
 ("We have learned to voice the small preferences while hiding the big truths.",
  "You may voice {safe preference} while continuing to hide {truth that could change the relationship}.",
  "Relationship Year","relationship-year-libra-2025-to-venus-rx-2026","family/behavior-and-hidden-reason"),
 ("What is witnessed here will shape what comes next.",
  "What becomes clear {during this event} will shape {next phase, decision, or relationship chapter}.",
  "Venus Retrograde","venus-retrograde-2025",""),
 ("Ask yourself what could grow if you stopped managing other people's chaos.",
  "Ask yourself what could {grow/change/be completed} if you stopped managing {problem that belongs to others}.",
  "Leo New Moon","leo-new-moon-2025",""),
 ("Your wellness routine has become another way to fail.",
  "Your {system intended to help} may have become another way to {judge, exhaust, or punish yourself}.",
  "Virgo New Moon","virgo-new-moon-august-23rd-2025","family/strength-gone-too-far"),
 ("The chaos you've been trying to prevent might have been the breakthrough you needed.",
  "The {change/disruption/conversation} you have been trying to prevent may be what finally changes {stuck situation}.",
  "This Week's Astrology: August 30 – September 7","this-weeks-astrology-august-30-september-7-2025","family/disruption-as-information"),
 ("Your body has been keeping score while you've been keeping peace.",
  "Your body has been carrying {physical consequence} while you have been {appeasing, accommodating, or remaining silent}.",
  "This Week's Astrology: August 30 – September 7","this-weeks-astrology-august-30-september-7-2025","family/body-reveals-cost"),
 ("Even your self-care has deliverables.",
  "Even your {rest/creativity/healing/spiritual practice} has become something you expect yourself to complete correctly.",
  "Pisces Full Moon Eclipse","full-moon-eclipse-in-pisces-2025","family/strength-gone-too-far"),
 ("It is revealing where your productivity has become a prison and how your responsibility to others has made you irresponsible to yourself.",
  "{Event} reveals where your {strength} has begun controlling your life and what it has caused you to neglect.",
  "Uranus Retrograde in Gemini","uranu-retrograde-in-gemini","family/strength-gone-too-far"),
 ("Silence is not protection.",
  "{Coping behavior} is not protecting you from {consequence it only postpones}.",
  "Pisces New Moon","pisces-new-moon-2025",""),
 ("Stability requires maintenance.",
  "{Relationship/stability/trust/health} requires maintenance, especially when {pressure or changing condition}.",
  "Monthly Horoscopes: June 2025","monthly-overview-june-2025",""),
 ("When Uranus moves through Taurus, money doesn't work the same way anymore.",
  "When {planet} moves through {sign/house}, {affected life area} does not work the same way anymore.",
  "Uranus Direct in Taurus","uranus-direct-in-taurus-2025",""),
 ("This is when your words become your commitments.",
  "This is when your {words/ideas/desires/plans} become {commitments, decisions, or consequences}.",
  "Saturn Enters Aries","saturn-enters-aries",""),
 ("Your daily life is your spell. Build it to nourish, not drain.",
  "Your {daily behavior} creates {longer-term condition}. Build it to support {need}, rather than continually draining it.",
  "Jupiter in Cancer","jupiter-in-cancer-horoscopes-by-sign-2025","family/practical-close"),
 ("These thought patterns have been protecting you from disappointment, but they're also protecting you from good things.",
  "This {belief/defense/habit} protects you from {feared outcome} while also keeping you from {wanted experience}.",
  "Full Moon in Aries","full-moon-in-aries","family/two-conflicting-needs"),
 ("You're being asked to match your words with your actions, your values with your commitments.",
  "Match your {stated belief} with {observable action}, and your {value} with {commitment that proves it}.",
  "Gemini Season","gemini-season-2025",""),
 ("If you've been running yourself ragged, the eclipse will intervene.",
  "If you have been ignoring {limit/problem}, {event or consequence} may force the pause you have avoided.",
  "Pisces Season","pisces-season-2025",""),
 ("Whether it arrives as a revelation, a confrontation, or a sudden break in the script, it forces clarity.",
  "Whether it arrives through {possibility one}, {possibility two}, or {possibility three}, {event} makes {truth} harder to avoid.",
  "Leo Full Moon","leo-full-moon-2025",""),
 ("The harder you pushed, the less things moved.",
  "The harder you pushed {person, decision, project, or timeline}, the less {movement or cooperation} you received.",
  "Mars Direct in Cancer","mars-direct-in-cancer",""),
 ("You don't have to keep balancing things that were never yours to juggle.",
  "You do not have to keep managing {conflict, responsibility, or emotions} that never belonged to you.",
  "Astrological Overview: August 3–9","august-3rd-9th-2025",""),
 # additional exact lines lifted from the by-sign lunation cards (screenshots):
 ("Your worth isn't determined by your earning capacity.",
  "Your {worth/value} is not determined by {external measure}.",
  "Taurus Full Moon (Aries Rising)","full-moon-in-taurus",""),
 ("Your body carries information you might not have words for yet.",
  "Your body carries {information/signal} you might not have words for yet.",
  "Taurus Full Moon (Taurus Rising)","full-moon-in-taurus","family/body-reveals-cost"),
 ("Your body knows the difference between sustainable effort and survival mode.",
  "Your body knows the difference between {sustainable version} and {survival version}.",
  "Taurus Full Moon (Gemini Rising)","full-moon-in-taurus","family/body-reveals-cost"),
 ("Let the silence hold what words can't.",
  "Let {the pause/silence/stillness} hold what {words/fixing/explaining} can't.",
  "Libra New Moon (Aquarius)","libra-new-moon-2025",""),
 ("This buys you time to think about whether you can genuinely help without resenting it later.",
  "That buys you time to decide whether you can genuinely {help/commit/say yes} without resenting it later.",
  "Libra New Moon (Taurus)","libra-new-moon-2025","family/practical-close"),
]

records = []
for i, (exact, tmpl, article, slug, fam) in enumerate(LINES, 1):
    records.append({
        "id": f"ms/site-line/{slug}/{i:02d}",
        "exact": {"text": exact, "tier": "CONFIRMED",
                  "source": f"Marie Satori — {article}",
                  "url": f"https://mariesatori.com/blogs/astrology/{slug}"},
        "template": {"form": tmpl, "tier": "REVIEWED_TEMPLATE"},
        "family": fam or None,
        "register": "personalized second-person",
        "surface_hint": ["home.daily_horoscope", "home.weekly_horoscope",
                         "home.monthly_horoscope", "me.personalized_transit"],
    })

out = {"_meta": {"title": "Marie site lines + reusable templates (curated voice layer)",
        "count": len(records), "families": len(FAMILIES),
        "line_tier": "CONFIRMED (serve-verbatim)", "template_tier": "REVIEWED_TEMPLATE",
        "register": "personalized second-person; NOT the collective we/us Sky layer",
        "excluded_by_author": ["alignment","authentic self","masks","abstract healing",
                               "keyword stacks","most X-not-Y","attributed quotes from other writers"],
        "voice_note": "CONFIRMED lines excluded from tone_pass and seam/register lints"},
       "principle": PRINCIPLE, "families": FAMILIES, "records": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "phrasebank", "cc-marie-site-templates.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} site line+template pairs + {len(FAMILIES)} families -> {dest}")
