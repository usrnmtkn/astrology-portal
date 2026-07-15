#!/usr/bin/env python3
"""
build_ruling_planet_advice.py — Marie's authored "ruling-planet advice" bank.

24 pieces (2 batches x 12 signs), keyed by ruling planet + sign. These are the
author's own words -> tier CONFIRMED (serve-verbatim). Voice note: this bank
deliberately uses full forms (no contractions), so it is NOT tone-passed and NOT
seam/register-linted. Filename intentionally omits 'reviewed' so the transform
passes (tone_pass, attach_pullquotes, harness) skip it.

Serves: a ruling-planet advice surface (rising sign -> its ruler -> advice), or the
practical-agency beat on any surface keyed by sign/ruler.
"""
import json, os

RULER = {"aries":"mars","taurus":"venus","gemini":"mercury","cancer":"moon","leo":"sun",
         "virgo":"mercury","libra":"venus","scorpio":"pluto","sagittarius":"jupiter",
         "capricorn":"saturn","aquarius":"uranus","pisces":"neptune"}

BATCH1 = {
"aries":"The day will fill itself if you let it. Other people's requests arrive, small problems become urgent, and suddenly it is evening without anything important moving forward. Decide what you are doing before the noise begins. Give your own life the first hour.",
"taurus":"A promotion, a new apartment, a better title, or another impressive achievement can give you a good week. Then the excitement wears off and you are alone with the same dissatisfaction. If every milestone leaves you immediately searching for the next one, the problem may be somewhere your résumé cannot reach.",
"gemini":"A strong opinion can harden quickly when it earns you attention. Soon you are defending something you barely believe because changing your mind would feel embarrassing. Keep enough distance from your own conclusions to notice when the facts have moved.",
"cancer":"A hard period can become so familiar that feeling better makes you uneasy. You may miss the music you listened to, the people who understood you then, or the excuse to expect very little from life. You can remember what those years taught you without continuing to live inside them.",
"leo":"When something succeeds, it is easy to remember every decision you made and forget the timing, help, luck, and access that carried it forward. Your effort mattered. So did the people who answered, opened a door, covered a shift, or gave you another chance. Knowing what helped you get here makes you a better leader once you arrive.",
"virgo":"A system can save time until maintaining it becomes another job. You color-code the calendar, rebuild the tracker, adjust the routine, and spend the afternoon preparing to begin. Use the structure that helps you move. Retire the parts that only make you feel temporarily in control.",
"libra":"Some relationships survive because one person keeps leaving the door cracked. You answer the late message, agree to one more conversation, and call it kindness even though every contact unsettles your life again. If leaving was necessary, finish leaving.",
"scorpio":"You can feel when a room has turned strange. The conversation becomes mean, the questions get invasive, or your body starts looking for the nearest exit before your mind has explained why. You do not need to remain there long enough to collect evidence. Go.",
"sagittarius":"You can spend years waiting for the opportunity, person, or sudden break that will finally make movement possible. Meanwhile, the smaller exits keep appearing: one application, one phone call, one uncomfortable decision, one day of work. Take the next available step. A way out is often built while you are already moving.",
"capricorn":"Shortcuts become especially persuasive when the real work is repetitive. That is when people start buying tools they do not need, changing direction again, or talking about the work more than they do it. Return to the part that requires practice. Skill still grows the old-fashioned way.",
"aquarius":"Every new idea arrives with a crowd insisting that it changes everything. A week later, the crowd has moved on and everyone pretends they were never impressed. You can watch the excitement without reorganizing your life around it. Let an idea survive its first round of applause before you follow it anywhere.",
"pisces":"Some days you answer the messages, make the food, finish the shift, and feel almost nothing while doing it. That does not make the day meaningless. Keeping your life going during a low period is work, even when nobody sees anything dramatic happen.",
}
BATCH2 = {
"aries":"Hesitation becomes dangerous when it keeps you halfway inside a decision. You agree and then resist, leave and then return, speak and then take it back. Decide whether the move is yours. If it is, put your full weight behind it.",
"taurus":"Being able to endure something can keep you there long after it begins harming you. You absorb the extra work, the constant tension, and the physical exhaustion because you know you can get through another week. Your capacity is valuable. Stop spending all of it proving how much you can survive.",
"gemini":"Some ideas become less clear the longer you stare at them. You keep rewriting the sentence, reopening the document, or trying to force a decision from a mind that has already gone tired. Leave it alone for a while. A thought can continue developing after you stop chasing it.",
"cancer":"When you expect to be hurt, ordinary closeness can start feeling intrusive. A question sounds like criticism. Concern feels like pressure. Someone reaches for you and meets the defenses built for a person who is no longer there. Check who is actually standing in front of you before you shut the door.",
"leo":"Confidence rarely needs a long introduction. You can see it in the person who knows their material, answers the question, and does not scramble when somebody remains unimpressed. Let the work speak before you start raising your voice on its behalf.",
"virgo":"Cynicism can make you feel intelligent while slowly making the world smaller. You become skilled at finding the flaw, predicting the disappointment, and explaining why enthusiasm is naive. Look up once in a while. There are still things worth being astonished by.",
"libra":"Some rooms require so much social calculation that you forget what you actually think. You monitor the tone, flatter the right person, laugh at the right moment, and leave exhausted from saying almost nothing. Spend less time where honesty carries a penalty.",
"scorpio":"You do not have to explain every private change while it is happening. Some realizations need time away from other people's questions, opinions, and concern. Let the decision become yours before you invite an audience into it.",
"sagittarius":"Thinking about how large the world is can make your own life feel very small. Then something happens: you catch a train, meet a stranger, take the wrong road, or see a place you never knew existed. You do not need to understand the whole journey to enter it. Go far enough to let life surprise you.",
"capricorn":"A serious commitment eventually reaches the part nobody applauds. The work becomes repetitive, inconvenient, and harder to explain to people who expected quick results. This is where your choice acquires weight. Keep showing up after the excitement leaves.",
"aquarius":"Leaving a restrictive system creates an immediate sense of freedom. Then the practical questions arrive: how you will support yourself, make decisions, handle conflict, and keep the new arrangement from recreating the old one. Build a life sturdy enough to hold the independence you wanted.",
"pisces":"It is easy to disappear into thought when the physical world feels demanding. Hours pass, meals get skipped, messages go unanswered, and the day becomes difficult to reenter. Give yourself something solid to return to: water, food, a shower, a walk, another person's voice. Come back before the distance starts feeling normal.",
}

records = []
for batch, table in ((1, BATCH1), (2, BATCH2)):
    for sign, text in table.items():
        records.append({
            "id": f"cc/ruling-planet-advice/{sign}-{batch}",
            "sign": sign, "ruler": RULER[sign], "batch": batch,
            "text": text, "tier": "CONFIRMED",
            "surface": "ruling_planet_advice",
            "source": "Marie Satori (authored)",
            "serving": "may serve verbatim; author's voice, deliberately full-form (no contractions); never tone-passed or linted",
        })

out = {"_meta": {"title": "Marie ruling-planet advice (CONFIRMED, serve-verbatim)",
        "count": len(records), "batches": 2, "signs": 12, "tier": "CONFIRMED",
        "keyed_by": "ruling planet + sign (rising sign -> its ruler -> advice)",
        "voice_note": "deliberate full forms; excluded from tone_pass and seam/register lints"},
       "tier": "CONFIRMED",
       "advice": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-ruling-planet-advice.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} CONFIRMED ruling-planet-advice pieces (2 batches x 12 signs) -> {dest}")
