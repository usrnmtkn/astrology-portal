#!/usr/bin/env python3
"""
build_vocab.py — saved vocab rows in the app's generated_interpretations shape.

Namespaces + section shapes per the repo's runtime consumers:
  fallback-vocab/planet-topic/{planet}  -> sections.topic.{you,friend,natal,sky} + body   (vocab-v1)
  fallback-vocab/sign-style/{sign}      -> sections.style.{phrase,short} + body            (vocab-v1)
  fallback-vocab/sign-need/{sign}       -> sections.need.{phrase,natal,sky} + body          (vocab-v1)
  vocab/natal-card-tagline/{point}      -> sections.tagline.natal + body                    (tagline-v1)
  vocab/relationship-context/{type}     -> body (+ sections.context)                        (vocab-v1)
  vocab/{house-career,element-career,house-cusp-element,mc-element,mode-career,
         north-node-mode,hemisphere,planet-in-10th,saturn-mastery}
                                        -> body (+ sections.career.summary)                  (vocab-v1)

Marie voice; no em dashes; no banned register. Tier REVIEWED -> imports DRAFT, awaiting sign-off.
Career vocab (careerArchetype.ts): section keys unknown, so each row ships a universal body plus a
placeholder sections.career.summary. Codex confirms the exact section keys against the consumer.
"""
import os, json

PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn","uranus","neptune","pluto"]
SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"]

PLANET_TOPIC = {
 "sun":("your identity, purpose, and where you shine","who each person is at the center","your core self and direction","identity, vitality, and purpose"),
 "moon":("your feelings, needs, and what comforts you","the emotional tone between people","your emotional needs and instincts","mood, needs, and emotional weather"),
 "mercury":("how you think, talk, and learn","how people communicate and trade ideas","your mind and how you communicate","thinking, talking, and information"),
 "venus":("what you love, value, and find beautiful","affection, attraction, and shared values","how you love and what you value","love, money, and pleasure"),
 "mars":("your drive, desire, and how you assert yourself","passion, energy, and conflict between people","your drive and how you go after things","drive, action, and friction"),
 "jupiter":("how you grow, hope, and reach for more","growth, generosity, and shared optimism","your sense of possibility and faith","growth, opportunity, and excess"),
 "saturn":("your discipline, limits, and responsibilities","commitment, structure, and what people owe each other","your discipline and where you feel tested","responsibility, limits, and hard work"),
 "uranus":("your need for freedom and change","independence, surprise, and disruption between people","your originality and need to be free","change, disruption, and awakening"),
 "neptune":("your imagination, ideals, and dreams","idealism, compassion, and blurred lines between people","your imagination and what you long for","imagination, ideals, and fog"),
 "pluto":("your depth, power, and what you transform","intensity, power, and deep change between people","your depth and where you are transformed","power, intensity, and deep change"),
}
SIGN_STYLE = {
 "aries":("with directness, courage, and a fast start","bold and direct"),
 "taurus":("steadily, sensually, and at its own pace","steady and grounded"),
 "gemini":("curiously, cleverly, and through talk","curious and quick"),
 "cancer":("tenderly, protectively, and by feel","caring and sensitive"),
 "leo":("warmly, proudly, and with heart","warm and expressive"),
 "virgo":("carefully, practically, and with an eye for detail","precise and helpful"),
 "libra":("gracefully, fairly, and with an eye on others","balanced and relational"),
 "scorpio":("intensely, privately, and all the way","deep and intense"),
 "sagittarius":("openly, adventurously, and with big vision","adventurous and honest"),
 "capricorn":("seriously, patiently, and with the long game in mind","disciplined and ambitious"),
 "aquarius":("independently, inventively, and on its own terms","original and independent"),
 "pisces":("imaginatively, gently, and with feeling","dreamy and compassionate"),
}
SIGN_NEED = {
 "aries":("to act, lead, and be first","freedom to initiate and be yourself","room to take action"),
 "taurus":("stability, comfort, and something to rely on","security and steady pleasures","calm and stability"),
 "gemini":("variety, conversation, and mental stimulation","stimulation and connection","new input and exchange"),
 "cancer":("safety, closeness, and to feel cared for","emotional security and belonging","comfort and closeness"),
 "leo":("recognition, warmth, and room to express","to be seen and appreciated","warmth and creative expression"),
 "virgo":("order, usefulness, and things done well","to be useful and to improve","order and something to refine"),
 "libra":("harmony, fairness, and companionship","balance and partnership","peace and connection"),
 "scorpio":("depth, honesty, and trust","intimacy and emotional truth","depth and honesty"),
 "sagittarius":("freedom, meaning, and room to explore","freedom and a sense of meaning","space and possibility"),
 "capricorn":("structure, respect, and something to build","achievement and a solid foundation","structure and progress"),
 "aquarius":("freedom, ideas, and space to be different","independence and community","freedom and fresh thinking"),
 "pisces":("rest, imagination, and emotional connection","peace and a gentle, creative outlet","rest and gentleness"),
}
TAGLINE = {
 "sun":"who you are and where you shine","moon":"what you need to feel safe","ascendant":"how you meet the world",
 "mercury":"how you think and speak","venus":"how you love and what you value","mars":"how you go after what you want",
 "jupiter":"where you grow and reach","saturn":"where you build and prove yourself","uranus":"where you break the mold",
 "neptune":"where you dream and dissolve","pluto":"where you are transformed","north_node":"where you are growing toward",
 "south_node":"what comes easily and what to release","chiron":"your old hurt and hard-won wisdom",
 "midheaven":"where you are headed in public","descendant":"what you seek in others","ic":"your roots and private ground",
}
REL_CONTEXT = {
 "romantic":"A romantic bond, where the themes tend to show up around closeness, commitment, sex, money, living arrangements, and shared plans.",
 "friendship":"A friendship, where the themes tend to show up around contact, loyalty, inclusion, support, and making room for each other across changing lives.",
 "family":"A family relationship, where the themes tend to show up around roles, caregiving, home, obligation, old history, and what is expected of whom.",
 "coworkers":"A working relationship, where the themes tend to show up around goals, deadlines, authority, ownership, money, credit, and who has the final say.",
 "creative":"A creative collaboration, where the themes tend to show up around a shared vision, revisions, timing, creative control, credit, and whether the work gets finished.",
 "exes":"A past relationship, where the themes tend to show up around remaining contact, unfinished logistics, shared ties, and what the connection means now that its original form has ended.",
 "complicated":"An undefined connection, where the themes tend to show up around closeness without a clear direction, unspoken expectations, and commitments that exceed the stated label.",
}

# --- career vocab (careerArchetype.ts). Section keys unknown; ships body + sections.career.summary;
#     Codex confirms exact section keys against the consumer. ---
HOUSE_CAREER = {
 "house_1":"leading, starting things, and being the face of the work","house_2":"building resources, managing money, and creating value",
 "house_3":"communication, writing, teaching, and local networks","house_4":"home-based work, real estate, family business, and foundations",
 "house_5":"creativity, performance, entertainment, and working with children","house_6":"service, health, craft, and the daily work itself",
 "house_7":"partnership, negotiation, client work, and one-to-one dealings","house_8":"shared resources, research, transformation, and other people's money",
 "house_9":"teaching, publishing, travel, law, and the big picture","house_10":"public reputation, leadership, and long-term ambition",
 "house_11":"networks, causes, technology, and group goals","house_12":"behind-the-scenes work, care, art, and the unseen",
}
ELEMENT_CAREER = {
 "fire":"energy, initiative, and work that lets you lead and inspire","earth":"practicality, building, and work with tangible, lasting results",
 "air":"ideas, communication, and work that connects people and information","water":"feeling, care, and work that draws on intuition and depth",
}
HOUSE_CUSP_ELEMENT = {
 "fire":"a public direction built on initiative, visibility, and drive","earth":"a public direction built on competence, steadiness, and results",
 "air":"a public direction built on ideas, communication, and connection","water":"a public direction built on care, intuition, and emotional attunement",
}
MC_ELEMENT = {
 "fire":"a calling that wants action, leadership, and a visible impact","earth":"a calling that wants to build something solid and lasting",
 "air":"a calling that wants to think, communicate, and connect","water":"a calling that wants to care, create, and work from feeling",
}
MODE_CAREER = {
 "cardinal":"starting things, leading, and launching new efforts","fixed":"sustaining, building depth, and seeing things through","mutable":"adapting, connecting, and working across changing situations",
}
NORTH_NODE_MODE = {
 "cardinal":"learning to initiate and lead rather than wait","fixed":"learning to commit and see things through rather than scatter","mutable":"learning to stay flexible and open rather than rigid",
}
HEMISPHERE = {
 "eastern":"a self-directed path, where you tend to make your own opportunities","western":"a path shaped through others, partnerships, and responding to the world",
 "northern":"a more private, inward path, built from the personal outward","southern":"a more public, outward path, oriented toward the world and reputation",
}
PLANET_IN_10TH = {
 "sun":"a calling tied to identity, leadership, and being seen","moon":"a calling tied to care, the public mood, or work that nurtures",
 "mercury":"a calling tied to communication, writing, teaching, or ideas","venus":"a calling tied to beauty, relationships, art, or money",
 "mars":"a calling tied to drive, competition, physical work, or initiative","jupiter":"a calling tied to teaching, growth, travel, or big ventures",
 "saturn":"a calling tied to authority, structure, mastery, and long climbs","uranus":"a calling tied to innovation, technology, or unconventional paths",
 "neptune":"a calling tied to art, care, spirituality, or the imagination","pluto":"a calling tied to power, research, transformation, or high stakes",
}
SATURN_MASTERY = "Saturn shows where slow, disciplined effort turns into real mastery and authority over time. It is the area where you are meant to earn your standing rather than be handed it."


def row(key, sections, body, pv="vocab-v1"):
    return {"content_key": key, "surface": "modifier", "mode": "feed", "status": "DRAFT",
            "event_type": "vocab", "headline": "", "summary": "", "body": body,
            "sections": sections, "facts": {}, "knowledge_ids": [],
            "source_snapshot": {"contentType": "vocab"}, "prompt_version": pv,
            "block_type": None, "reviewer_notes": "", "tier": "REVIEWED"}

def main():
    recs = []
    for p in PLANETS:
        you, fr, nat, sky = PLANET_TOPIC[p]
        recs.append(row(f"fallback-vocab/planet-topic/{p}",
                        {"topic": {"you": you, "friend": fr, "natal": nat, "sky": sky}},
                        f"{p.capitalize()} governs {you}."))
    for s in SIGNS:
        phrase, short = SIGN_STYLE[s]
        recs.append(row(f"fallback-vocab/sign-style/{s}",
                        {"style": {"phrase": phrase, "short": short}},
                        f"{s.capitalize()} does things {phrase}."))
    for s in SIGNS:
        phrase, nat, sky = SIGN_NEED[s]
        recs.append(row(f"fallback-vocab/sign-need/{s}",
                        {"need": {"phrase": phrase, "natal": nat, "sky": sky}},
                        f"{s.capitalize()} needs {phrase}."))
    for pt, line in TAGLINE.items():
        recs.append(row(f"vocab/natal-card-tagline/{pt}", {"tagline": {"natal": line}}, line, pv="tagline-v1"))
    for t, body in REL_CONTEXT.items():
        recs.append(row(f"vocab/relationship-context/{t}", {"context": {"summary": body}}, body))

    # --- career vocab family (careerArchetype.ts) ---
    for h, theme in HOUSE_CAREER.items():
        n = h.split("_")[1]
        recs.append(row(f"vocab/house-career/{h}", {"career": {"summary": theme}},
                        f"The {n}th house points career toward {theme}."))
    for e, theme in ELEMENT_CAREER.items():
        recs.append(row(f"vocab/element-career/{e}", {"career": {"summary": theme}},
                        f"A strong {e} emphasis points career toward {theme}."))
    for e, theme in HOUSE_CUSP_ELEMENT.items():
        recs.append(row(f"vocab/house-cusp-element/{e}", {"career": {"summary": theme}},
                        f"With {e} on the career cusp, expect {theme}."))
    for e, theme in MC_ELEMENT.items():
        recs.append(row(f"vocab/mc-element/{e}", {"career": {"summary": theme}},
                        f"A {e} Midheaven points to {theme}."))
    for m, theme in MODE_CAREER.items():
        recs.append(row(f"vocab/mode-career/{m}", {"career": {"summary": theme}},
                        f"A strong {m} emphasis suits work that involves {theme}."))
    for m, theme in NORTH_NODE_MODE.items():
        recs.append(row(f"vocab/north-node-mode/{m}", {"career": {"summary": theme}},
                        f"With the North Node in a {m} sign, growth comes through {theme}."))
    for hemi, theme in HEMISPHERE.items():
        recs.append(row(f"vocab/hemisphere/{hemi}", {"career": {"summary": theme}},
                        f"A {hemi} emphasis suggests {theme}."))
    for p, theme in PLANET_IN_10TH.items():
        recs.append(row(f"vocab/planet-in-10th/{p}", {"career": {"summary": theme}},
                        f"{p.capitalize()} at your career point suggests {theme}."))
    recs.append(row("vocab/saturn-mastery/saturn", {"career": {"summary": SATURN_MASTERY}}, SATURN_MASTERY))

    out = {"tier": "REVIEWED",
           "_meta": {"surface": "vocab",
                     "note": "Saved vocab rows: planet-topic, sign-style, sign-need (fallback-vocab, vocab-v1); "
                             "natal-card-tagline (tagline-v1); relationship-context (vocab-v1); career family "
                             "(house-career, element-career, house-cusp-element, mc-element, mode-career, "
                             "north-node-mode, hemisphere, planet-in-10th, saturn-mastery; body + sections.career.summary). "
                             "Codex confirms exact surface/block_type and career section keys against consumers.",
                     "count": len(recs)},
           "reviewed": recs}
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank", "cc-vocab.json")
    json.dump(out, open(path, "w"), indent=1, ensure_ascii=False)
    print(f"wrote {len(recs)} vocab rows -> cc-vocab.json")

if __name__ == "__main__":
    main()
