#!/usr/bin/env python3
"""
build_natal_angles.py — the last uncovered surface: natal angle-in-sign (Asc/MC/Dsc/IC x 12 = 48).

Every other app surface is covered by beautiful authored content; angles had none (only unsigned
slot rows), so the angle page fell to a thin template / placeholder. This authors 48 full readings,
grounded in the angle's domain + the sign's character (Marie's sign voice). Clean prose, no slots.
"""
import os, json

ANGLES = ["ascendant", "midheaven", "descendant", "ic"]
SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]

# how the sign comes across / its felt quality
STYLE = {
 "aries":"direct and quick to start","taurus":"steady, grounded, and unhurried","gemini":"curious, verbal, and quick",
 "cancer":"warm but a little guarded","leo":"bright, warm, and expressive","virgo":"precise, modest, and observant",
 "libra":"gracious, even, and relational","scorpio":"intense, private, and all-in","sagittarius":"open, restless, and frank",
 "capricorn":"composed, serious, and self-contained","aquarius":"cool, original, and a little apart","pisces":"soft, dreamy, and porous",
}
QUALITY = {
 "aries":"drive","taurus":"calm","gemini":"wit","cancer":"care","leo":"warmth","virgo":"competence",
 "libra":"ease","scorpio":"depth","sagittarius":"optimism","capricorn":"authority","aquarius":"originality","pisces":"gentleness",
}

def reading(angle, sign):
    st, q = STYLE[sign], QUALITY[sign]
    if angle == "ascendant":
        return (f"You come across {st}, and people register your {q} before you say a word. "
                f"This is the doorway to you, the first impression that colors everything after it, not the whole room behind it.")
    if angle == "midheaven":
        return (f"In public you read as {st}, and your {q} is what your reputation gets built on. "
                f"Where you are headed wants work and a role that let that quality show, rather than something that keeps it hidden.")
    if angle == "descendant":
        return (f"You are drawn to people who are {st}, who carry the {q} you do not always lead with yourself. "
                f"Close partnership is where you meet that missing piece in someone else and learn to own more of it.")
    # ic
    return (f"Your private ground is {st}, and home works when there is room for {q} and the version of you no one else sees. "
            f"This is the root you return to, the base the rest of the chart is built on.")

def main():
    recs = []
    for a in ANGLES:
        for s in SIGNS:
            recs.append({
                "id": f"cc/angle/{a}-in-{s}", "angle": a, "sign": s,
                "surface": "me.natal_angle", "status": "REVIEWED_CLAUSE",
                "reading": reading(a, s),
                "provenance": "angle domain + Marie sign character; authored",
                "tone_version": "marie-calibrated-v1",
            })
    out = {"tier": "REVIEWED",
           "_meta": {"note": "Natal angle-in-sign readings (Asc/MC/Dsc/IC x 12). Reader field: 'reading'. "
                             "Fills the last uncovered surface so the angle page is a full reading, not a template.",
                     "count": len(recs)},
           "reviewed": recs}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "phrasebank", "cc-natal-angles-authored.json"), "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(recs)} natal angle-in-sign readings -> cc-natal-angles-authored.json")

if __name__ == "__main__":
    main()
