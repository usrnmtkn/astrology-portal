#!/usr/bin/env python3
"""
build_placement_scaffold.py — the long-form NATAL placement scaffold (template 5K).

The placement detail page should read as rich PRIMARY content (like the aspect pages), not the thin
two-kernel emergency floor. 5K stacks:
  core (natal_sign_story + house_integration)  ->  dignity  ->  natal-retrograde  ->  ruler-bridge
  ->  aspect lead-ins
The core kernels already exist. This authors the missing paragraph banks as clean full sentences,
each servable verbatim:
  cc-dignity-paragraphs.json      (planet x dignity-state)   -> dignity_paragraph
  cc-ruler-bridge.json            (per sign, dispositor)     -> ruler_bridge_paragraph
  cc-natal-retrograde-paragraphs  (per planet)               -> retrograde_paragraph
  cc-sect-paragraphs.json         (planet x in/out of sect)  -> sect_paragraph
  cc-aspect-leadins.json          (supportive / challenging) -> aspects paragraph lead-ins
"""
import os, json

PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")
P = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"]
FUNC = {
 "sun":"your identity, vitality, and where you are meant to shine",
 "moon":"your feelings, needs, and sense of safety",
 "mercury":"how you think, speak, and connect ideas",
 "venus":"how you love, and what you find beautiful and worth having",
 "mars":"your drive, will, and how you go after what you want",
 "jupiter":"how you grow, believe, and reach for more",
 "saturn":"your discipline, limits, and where you build real mastery",
 "uranus":"your need for freedom and where you break the mold",
 "neptune":"your imagination, ideals, and what you long for",
 "pluto":"your depth, power, and capacity to transform",
}
RULER = {"aries":"Mars","taurus":"Venus","gemini":"Mercury","cancer":"the Moon","leo":"the Sun",
 "virgo":"Mercury","libra":"Venus","scorpio":"Pluto","sagittarius":"Jupiter","capricorn":"Saturn",
 "aquarius":"Uranus","pisces":"Neptune"}
THEME = {"aries":"drive and initiative","taurus":"security and worth","gemini":"ideas and connection",
 "cancer":"care and belonging","leo":"expression and heart","virgo":"craft and improvement",
 "libra":"partnership and balance","scorpio":"depth and power","sagittarius":"meaning and freedom",
 "capricorn":"ambition and structure","aquarius":"originality and the collective","pisces":"imagination and compassion"}
STATES = ["domicile","exaltation","detriment","fall","peregrine"]

def dignity(pl, st):
    f, N = FUNC[pl], pl.capitalize()
    return {
     "domicile":  f"{N} is in its home sign here, so it works at full strength: {f} comes naturally and with confidence.",
     "exaltation":f"{N} is exalted here, honored and near its best, so {f} shows up amplified, sometimes larger than life.",
     "detriment": f"{N} is in detriment here, opposite the sign it rules, so it works against the grain: {f} takes conscious effort and reaches its aim through less familiar means.",
     "fall":      f"{N} is in fall here, its least supported placement, so {f} can feel undervalued or hard to reach, and the growth is in trusting it anyway.",
     "peregrine": f"{N} has no special dignity here, so {f} takes its tone from the sign and from its aspects rather than from strength of its own.",
    }[st]

def ruler_bridge(sign):
    return (f"{sign.capitalize()} answers to {RULER[sign]}, so this placement ultimately reports to wherever "
            f"{RULER[sign]} sits in your chart. That house and sign is where its {THEME[sign]} finds its real direction.")

def natal_retro(pl):
    return (f"{pl.capitalize()} was retrograde when you were born, so its energy runs inward first: {FUNC[pl]} gets "
            f"processed privately, on your own timeline, and often matures later than it does for other people.")

def sect(pl, insect):
    N = pl.capitalize()
    if insect: return f"{N} is in sect here, in its preferred half of the chart, so it operates in a steadier, more constructive key."
    return f"{N} is out of sect here, so its harder edges show more readily and it asks for more conscious handling."

LEADIN = {
 "supportive":"The easier contacts to this placement give it support to lean on:",
 "challenging":"The harder contacts to this placement are where it gets tested and, over time, built:",
}

def row(key, body, extra=None):
    r = {"content_key": key, "surface": "modifier", "mode": "feed", "status": "DRAFT",
         "event_type": "vocab", "headline": "", "summary": "", "body": body,
         "sections": {}, "facts": {}, "knowledge_ids": [],
         "source_snapshot": {"contentType": "vocab", "category": "placement-scaffold", **(extra or {})},
         "prompt_version": "placement-scaffold-v1", "block_type": None, "reviewer_notes": "", "tier": "REVIEWED"}
    return r

def dump(name, recs, note):
    json.dump({"tier": "REVIEWED", "_meta": {"note": note, "count": len(recs)}, "reviewed": recs},
              open(os.path.join(PB, name), "w"), indent=1, ensure_ascii=False)

def main():
    dig = [row(f"cc/dignity/{pl}/{st}", dignity(pl, st), {"scope": {"planet": pl, "state": st}}) for pl in P for st in STATES]
    rb  = [row(f"cc/ruler-bridge/{s}", ruler_bridge(s), {"scope": {"sign": s}}) for s in RULER]
    sct = [row(f"cc/sect/{pl}/{'in' if i else 'out'}", sect(pl, i), {"scope": {"planet": pl, "in_sect": i}}) for pl in P for i in (True, False)]
    lead = [row(f"cc/aspect-leadin/{k}", v, {"scope": {"valence": k}}) for k, v in LEADIN.items()]
    dump("cc-dignity-paragraphs.json", dig, "Dignity paragraph per planet x state (5K dignity_paragraph).")
    dump("cc-ruler-bridge.json", rb, "Dispositor / ruler-bridge paragraph per sign (5K ruler_bridge_paragraph).")
    dump("cc-sect-paragraphs.json", sct, "Sect paragraph per planet in/out of sect (5K sect_paragraph).")
    dump("cc-aspect-leadins.json", lead, "Aspect-section lead-ins (5K supportive/challenging aspects paragraph).")
    # NOTE: retrograde slot (5K par.4) reuses the EXISTING cc-natal-retrograde-authored.json (.text) —
    # not re-authored here, to avoid duplicating already-authored per-planet retrograde readings.
    print(f"dignity {len(dig)} | ruler-bridge {len(rb)} | sect {len(sct)} | leadins {len(lead)} "
          f"| retro: reuse cc-natal-retrograde-authored")

if __name__ == "__main__":
    main()
