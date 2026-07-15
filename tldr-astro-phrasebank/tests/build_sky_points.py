#!/usr/bin/env python3
"""
build_sky_points.py — sky-placement readings for the POINTS the Sky page lists but that have no
collective content: Chiron, Lilith (Black Moon), North Node, South Node, each x 12 signs = 48.
Without these the point pages show "This interpretation is still being prepared." Grounded in each
point's collective meaning + the sign's theme. Reader field: 'collective_reading'.
"""
import os, json

SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]
THEME = {
 "aries":"action, courage, and starting fresh","taurus":"the body, security, and what lasts",
 "gemini":"ideas, talk, and connection","cancer":"home, feeling, and belonging",
 "leo":"expression, heart, and being seen","virgo":"craft, health, and getting it right",
 "libra":"fairness, beauty, and relationship","scorpio":"depth, power, and what stays hidden",
 "sagittarius":"meaning, freedom, and the big picture","capricorn":"structure, ambition, and the long game",
 "aquarius":"the collective, invention, and breaking the mold","pisces":"compassion, imagination, and dissolving edges",
}
POINTS = {
 "chiron":     lambda t: (f"Chiron in {{s}} marks where a shared wound around {t} sits close to the surface for a whole generation, "
                          f"and where tending it, in ourselves and in each other, becomes the quiet work. The hurt and the medicine live in the same place."),
 "lilith":     lambda t: (f"Lilith in {{s}} is where the wild, refused, or shamed side of {t} asks to be reclaimed. "
                          f"For a while the collective stops apologizing for what it was told to hide here, and takes the power back."),
 "north-node": lambda t: (f"The North Node in {{s}} points the whole collective toward growth through {t}. "
                          f"It is the unfamiliar direction we are being pulled to develop, even when it feels like a stretch."),
 "south-node": lambda t: (f"The South Node in {{s}} is the {t} pattern we are collectively ready to release, the comfortable and overused ground. "
                          f"Familiar and easy, but a place to let go rather than lean on harder."),
}
LABEL = {"chiron":"Chiron","lilith":"Lilith","north-node":"North Node","south-node":"South Node"}

def main():
    recs = []
    for point, tmpl in POINTS.items():
        for s in SIGNS:
            recs.append({
                "id": f"cc/sky-point/{point}-in-{s}", "point": point, "sign": s,
                "surface": "sky.point_placement", "status": "REVIEWED_CLAUSE",
                "collective_reading": tmpl(THEME[s]).replace("{s}", s.capitalize()),
                "provenance": "point collective meaning + sign theme; authored",
                "tone_version": "marie-calibrated-v1",
            })
    out = {"tier": "REVIEWED",
           "_meta": {"note": "Sky-placement readings for points (Chiron/Lilith/North Node/South Node x 12 signs). "
                             "Reader field: 'collective_reading'. Fills the Sky point pages that showed "
                             "'still being prepared'. Planets keep cc-planet-in-sign-reviewed.collective_shift.",
                     "count": len(recs)},
           "reviewed": recs}
    json.dump(out, open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                        "phrasebank", "cc-sky-points-authored.json"), "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(recs)} sky-point readings -> cc-sky-points-authored.json")

if __name__ == "__main__":
    main()
