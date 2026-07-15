#!/usr/bin/env python3
"""
build_horoscope_templates.py — PERSONALIZED horoscope surface templates.

Covers the app surfaces that were missing template contracts: Home daily horoscope,
weekly horoscope (collective arc + by-rising), personalized lunation horoscopes
(Full Moon by rising with the house AXIS, New Moon by sun sign), and monthly by-sun.

Structures reverse-engineered from Marie's own published cards (satori-writing folder +
mariesatori.com). Register is second-person ('you') — correct for personalized surfaces,
distinct from the collective we/us Sky layer. Each template ships a worked example; where
the example is verbatim from a published card it is tagged CONFIRMED.

Sentence-level engine = phrasebank/cc-marie-site-templates.json (families + templates).
Emits phrasebank/cc-horoscope-surface-templates.json.
"""
import json, os

# ---- shared reference maps -------------------------------------------------
HOUSE_AREA = {
 1:"identity and how you show up", 2:"values, money, and self-worth",
 3:"communication, learning, and local community", 4:"home, family, and emotional foundation",
 5:"creativity, self-expression, and joy", 6:"daily work, health, and service",
 7:"relationships and partnerships", 8:"intimacy, transformation, and shared resources",
 9:"beliefs, higher learning, and expansion", 10:"career and public reputation",
 11:"friendships, groups, and future vision", 12:"rest, spirituality, and what to release",
}
HOUSE_AXIS = {
 "1/7":"self versus partnership", "2/8":"personal resources versus shared wealth",
 "3/9":"local mind versus higher meaning", "4/10":"private life versus public role",
 "5/11":"creative self-expression versus community", "6/12":"daily work versus rest",
}

BANNED = ["alignment","authentic self","masks","abstract healing language","keyword stacks",
          "most X-not-Y constructions","attributed quotes from other writers"]
PRINCIPLE = ("Name the ordinary behavior first (overworking, staying quiet, managing "
             "someone's mood, editing a message, refusing help), then let the transit "
             "explain why it is becoming impossible to keep doing.")

# ---- surface templates -----------------------------------------------------
TEMPLATES = [
{
 "id":"tpl/home/daily-horoscope",
 "surface":"home.daily_horoscope",
 "templateId":"home.daily-horoscope.v1",
 "cadence":"daily", "register":"second-person ('you've been ... today')",
 "keyed_by":"reader sun/rising + the day's fastest exact transit",
 "length_words":[40,80],
 "slots":["recentBehaviorOrFeeling","todaysDriver","oneSpecificClose"],
 "composition":"One short paragraph: name what you've been doing or feeling lately, "
               "then the day's transit as the reason it is surfacing now, then one "
               "specific, doable close. No house jargon in the body.",
 "source":["derived from Marie site voice + family/practical-close"],
 "example":{"tier":"REVIEWED_EXAMPLE",
   "text":"You've been answering every message the second it arrives, treating fast as "
          "the same thing as responsible. Today's Moon-Mercury square makes that habit "
          "feel loud and slightly frantic. Pick the one reply that actually matters, "
          "send it well, and let the rest wait until you've eaten lunch.",
   "note":"built from the site templates; swap in the reader's real transit at render"}},
{
 "id":"tpl/home/weekly-collective",
 "surface":"home.weekly_horoscope.collective",
 "templateId":"home.weekly-collective.v1",
 "cadence":"weekly", "register":"second-person + collective 'this week'",
 "keyed_by":"the week's dominant transits + any lunation",
 "length_words":[110,200],
 "slots":["weeksArc","theWeeksLesson","dayMarkers","collectiveClose"],
 "composition":"Open with the week's arc ('This week carries you from X into Y'). Then "
               "the week's lesson: name an ordinary behavior and the turn it is reaching. "
               "Add 1-3 dated day-markers for the key exact aspects. Close with one "
               "collective, actionable line.",
 "source":["This Week's Astrology: August 30 – September 7 (structure)"],
 "example":{"tier":"CONFIRMED","source":"Marie Satori — This Week's Astrology: August 30 – September 7",
   "url":"https://mariesatori.com/blogs/astrology/this-weeks-astrology-august-30-september-7-2025",
   "text":"This week teaches that perfection was never the goal: integration was. You've "
          "been using your systems to outrun a feeling. Thursday, September 4 tests what "
          "you started as Mars quincunx the True Node asks for an adjustment. Your body "
          "has been keeping score while you've been keeping peace."}},
{
 "id":"tpl/home/weekly-by-rising",
 "surface":"home.weekly_horoscope.by_rising",
 "templateId":"home.weekly-by-rising.v1",
 "cadence":"weekly", "register":"second-person, by rising sign",
 "keyed_by":"house the week's key transit activates for each rising sign",
 "length_words":[45,90],
 "slots":["houseActivated","ordinaryBehaviorInThatArea","theTurn","practicalClose"],
 "composition":"Per rising sign: name which house the week's key transit lights up and "
               "its life area, then the ordinary behavior showing up there, then the turn, "
               "then one practical close. Rendered as one paragraph.",
 "source":["This Week's Astrology (ARIES/ARIES RISING ... structure)"],
 "example":{"tier":"CONFIRMED","source":"Marie Satori — This Week's Astrology: August 30 – September 7",
   "url":"https://mariesatori.com/blogs/astrology/this-weeks-astrology-august-30-september-7-2025",
   "text":"ARIES / ARIES RISING The Virgo season has been asking you to examine your daily "
          "routines and habits, pushing you to notice where the systems meant to help have "
          "started running you instead."}},
{
 "id":"tpl/lunation/full-moon-by-rising",
 "surface":"me.lunation_horoscope.full_moon",
 "templateId":"me.lunation.full-moon-by-rising.v1",
 "cadence":"per full moon", "register":"second-person, by rising sign",
 "keyed_by":"house the Full Moon falls in for each rising sign (always names the axis)",
 "length_words":[90,160],
 "slots":["houseAxisClaim","validateBothTruths","ordinaryBehaviorAndBody","transitDriver","releaseClose"],
 "composition":"ALWAYS open by naming the house and its axis ('The Full Moon lands in "
               "your Nth house, highlighting the N/opposite axis of A versus B'). Then "
               "validate the real situation (both things can be true). Then name the "
               "ordinary behavior and what the body is registering. Then the transit "
               "driver. Close on a proportionate release. A Full Moon is a Sun-Moon "
               "opposition, so the axis is not optional.",
 "house_axis_map":HOUSE_AXIS,
 "source":["Taurus Full Moon 2025 by-rising cards"],
 "example":{"tier":"CONFIRMED","source":"Marie Satori — Taurus Full Moon (Aries Rising)",
   "url":"https://mariesatori.com/blogs/astrology/full-moon-in-taurus",
   "text":"The Full Moon lands in your 2nd house, highlighting the 2nd/8th house axis of "
          "personal resources versus shared wealth. If you lost income, that's genuinely "
          "destabilizing. You need money to live. And also: your worth isn't determined "
          "by your earning capacity. Both things are true. Mars opposing Uranus suggests "
          "your ideas about self-sufficiency might be keeping you stuck. There might be "
          "resources available that you haven't considered yet."}},
{
 "id":"tpl/lunation/new-moon-by-sun",
 "surface":"me.lunation_horoscope.new_moon",
 "templateId":"me.lunation.new-moon-by-sun.v1",
 "cadence":"per new moon", "register":"second-person, by sun sign",
 "keyed_by":"house the New Moon falls in for each sun sign",
 "length_words":[80,150],
 "slots":["lifeAreaClaim","ordinaryBehavior","originOrHiddenReason","practicalCloseOrScript"],
 "composition":"Open by naming the life area the New Moon focuses on for this sign. Name "
               "the ordinary behavior ('you've been doing too much / accepting less'). "
               "Give the origin or hidden reason ('you learned early that...'). Close "
               "practically, often with a scripted phrase to try. A New Moon is a seed, "
               "so the close sets an intention rather than declaring an outcome.",
 "house_area_map":HOUSE_AREA,
 "source":["Libra New Moon by-sign cards"],
 "example":{"tier":"CONFIRMED","source":"Marie Satori — Libra New Moon (Taurus)",
   "url":"https://mariesatori.com/blogs/astrology/libra-new-moon-2025",
   "text":"This New Moon focuses on your daily life, health routines, and how you help "
          "others. You might be seeing where trying to be perfect and always saying yes "
          "to people has hurt your well-being. You probably feel guilty every time you "
          "consider saying no. This month, practice this phrase: \"Let me check my "
          "schedule and get back to you.\" This buys you time to think about whether you "
          "can genuinely help without resenting it later."}},
{
 "id":"tpl/home/monthly-by-sun",
 "surface":"home.monthly_horoscope",
 "templateId":"home.monthly-by-sun.v1",
 "cadence":"monthly", "register":"second-person, by sun sign",
 "keyed_by":"month's ingresses + lunations mapped to each sun sign's houses",
 "length_words":[90,170],
 "slots":["monthsFocus","ordinaryBehavior","theTurn","practicalClose"],
 "composition":"Name the month's focus for the sign, the ordinary behavior in play, the "
               "turn it is reaching, and one practical close. Maintenance framing over "
               "dramatic prediction.",
 "source":["Monthly Horoscopes: June 2025"],
 "example":{"tier":"REVIEWED_EXAMPLE",
   "text":"This month asks you to treat a steady relationship as something that needs "
          "upkeep, not proof. You've been assuming that because things are fine, they'll "
          "stay fine on their own. Stability requires maintenance. Put one honest "
          "conversation on the calendar before the month ends.",
   "note":"built from site line 'Stability requires maintenance' + family/practical-close"}},
]

out = {"_meta": {"title": "Personalized horoscope surface templates (daily / weekly / lunation / monthly)",
        "count": len(TEMPLATES), "register": "second-person ('you'); personalized surfaces only",
        "sentence_engine": "phrasebank/cc-marie-site-templates.json",
        "banned_language": BANNED, "principle": PRINCIPLE,
        "note": "Full Moon templates always name the house axis (Sun-Moon opposition); "
                "New Moon templates seed an intention. Examples tagged CONFIRMED are verbatim "
                "from published cards; REVIEWED_EXAMPLE ones are built from the site templates."},
       "house_area_map": HOUSE_AREA, "house_axis_map": HOUSE_AXIS,
       "templates": TEMPLATES}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "phrasebank", "cc-horoscope-surface-templates.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(TEMPLATES)} horoscope surface templates -> {dest}")
