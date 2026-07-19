#!/usr/bin/env python3
"""
build_compatibility_writeups.py — Co-Star-style long-form compatibility write-ups.

For each compatibility planet and sign pair, composes a flowing write-up:
  function  → "Mercury is how each of you thinks, talks, and needs to be understood."
  your_line → "Your Mercury is in Pisces, meaning <her book description, verbatim>."
  their_line→ "Their Mercury is in Aquarius, meaning <same description, pronoun-shifted>."
  synthesis → relationship-type dynamic + a practical adjustment.
  match     → a short harmony label.

Sources:
  - sources/book-as-above-extract.json  (planet_in_sign: her verbatim per-sign descriptions)
  - sources/compatibility-compare-contrast.json  (function, nouns, watch/try, sign elements)

Emits phrasebank/cc-compatibility-writeups.json. The app can render the scannable
Shared/Different/Watch/Try card AND this long-form write-up (a "go deeper" view).
Tier: your_line = CONFIRMED verbatim (framed); their_line = voiced-original-grounded
(pronoun-shifted from her verbatim). Status DRAFT pending sign-off.
"""
import json, os, re, itertools

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# voiced descriptions = Marie's sharper reviewed article voice (natal_sign_story),
# per editorial voice-pass — replaces the book's flatter textbook register.
DESC = json.load(open(os.path.join(PKG, "sources", "compat-voiced-descriptions.json")))["descriptions"]
CC = json.load(open(os.path.join(PKG, "sources", "compatibility-compare-contrast.json")))
DEST = os.path.join(PKG, "phrasebank", "cc-compatibility-writeups.json")

SIGNS = CC["signs"]
ORDER = list(SIGNS.keys())
PLANETS = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]
GLYPH = {"sun":"☉","moon":"☽","mercury":"☿","venus":"♀","mars":"♂","jupiter":"♃","saturn":"♄"}
MOON_CARDS = os.path.join(PKG, "MOON-COMPATIBILITY-CARDS.md")
MOON_LIBRARY = os.path.join(PKG, "sources", "moon-compatibility-library.json")
VENUS_LIBRARY = os.path.join(PKG, "sources", "venus-compatibility-library.json")

MATCH = {"same_sign":"Two of a kind", "same_element":"Naturally in sync", "complementary":"Easy chemistry",
         "opposition":"Opposites that complete", "friction":"Takes work", "mixed":"Mixed signals"}

def sign_distance(a, b):
    d = abs(ORDER.index(a) - ORDER.index(b)) % 12
    return min(d, 12 - d)

def relationship(a, b):
    if a == b: return "same_sign"
    ea, eb = SIGNS[a]["element"], SIGNS[b]["element"]
    if sign_distance(a, b) == 6: return "opposition"
    if ea == eb: return "same_element"
    if {ea, eb} in ({"fire","air"}, {"earth","water"}): return "complementary"
    if {ea, eb} in ({"fire","water"}, {"earth","air"}): return "friction"
    return "mixed"

# ordered whole-word replacements: 2nd person -> 3rd person (for the "their" line)
_REPL = [(r"\byou're\b","they're"),(r"\bYou're\b","They're"),
         (r"\byourself\b","themselves"),(r"\bYourself\b","Themselves"),
         (r"\byours\b","theirs"),(r"\bYours\b","Theirs"),
         (r"\byour\b","their"),(r"\bYour\b","Their"),
         (r"\byou\b","they"),(r"\bYou\b","They")]
def to_third(s):
    for pat, rep in _REPL:
        s = re.sub(pat, rep, s)
    return s

def first_sentence(fn):
    return fn

def synthesis(planet, a, b):
    rel = relationship(a, b)
    p = CC["planets"][planet]
    return f"{p['watch'][rel]} {p['try'][rel]}"

def compose(planet, a, b):
    desc = DESC.get(planet, {})
    da, db = desc.get(a), desc.get(b)
    if not da or not db:
        return None
    fn = CC["planets"][planet]["function"]
    Pl = planet.title()
    same = (a == b)
    if same:
        # collapse the identical description into one shared paragraph (no repeat).
        # The app should ALSO differentiate by house at render time (each person's
        # same-sign planet usually falls in a different house).
        your_line = f"You both have {Pl} in {a.title()}, meaning {da[0].lower()+da[1:]}"
        their_line = ""
    else:
        your_line = f"Your {Pl} is in {a.title()}, meaning {da[0].lower()+da[1:]}"
        their_line = f"Their {Pl} is in {b.title()}, meaning {to_third(db[0].lower()+db[1:])}"
    return {
        "glyph": GLYPH[planet],
        "match": MATCH[relationship(a, b)],
        "function": fn,
        "your_line": your_line,
        "their_line": their_line,
        "same_sign": same,
        # Houses require birth times we can't count on, so compatibility runs on
        # signs only — no house naming or house-based branch.
        "same_sign_line": CC["planets"][planet].get("same_sign", "") if same else "",
        # No standalone quote block. Quotes were only ever meant to be woven into
        # the prose where they fit, not surfaced as random attributed pull-quotes.
        "same_sign_quote": None,
        "verdict": CC["planets"][planet].get("verdict", {}).get(relationship(a, b), ""),
        "synthesis": synthesis(planet, a, b),
        "relationship": relationship(a, b),
        "tier": "descriptions = REVIEWED authored voice (natal_sign_story); their_line pronoun-shifted; synthesis/match voiced-original",
        "status": "DRAFT",
    }

def split_sentences(text):
    return re.split(r"(?<=[.!?])\s+", text.strip())

def ensure_sentence(text):
    text = text.strip()
    return text if re.search(r"[.!?]$", text) else f"{text}."

def swap_moon_signs(text, you_sign, friend_sign):
    you_title = you_sign.title()
    friend_title = friend_sign.title()
    replacements = [
        (f"Your Moon in {you_title}", "__YOUR_MOON__"),
        (f"your Moon in {you_title}", "__YOUR_MOON_LOWER__"),
        (f"{{friend}}'s Moon in {friend_title}", "__FRIEND_MOON__"),
        (f"{{friend}}'s moon in {friend_title}", "__FRIEND_MOON_LOWER__"),
    ]
    for old, new in replacements:
        text = text.replace(old, new)
    return (text
        .replace("__YOUR_MOON__", f"Your Moon in {friend_title}")
        .replace("__YOUR_MOON_LOWER__", f"your Moon in {friend_title}")
        .replace("__FRIEND_MOON__", f"{{friend}}'s Moon in {you_title}")
        .replace("__FRIEND_MOON_LOWER__", f"{{friend}}'s Moon in {you_title}"))

def swap_reader_friend(text):
    replacements = [
        (r"\byou each\b", "__EACH__"),
        (r"\byou'd\b", "__YOUD__"),
        (r"\byou both\b", "__BOTH__"),
        (r"\bboth of you\b", "__BOTH_OF_YOU__"),
        (r"\byou're\b", "__FRIEND_BE__"),
        (r"\bYou're\b", "__FRIEND_BE_CAP__"),
        (r"\byou've\b", "__FRIEND_HAVE__"),
        (r"\bYou've\b", "__FRIEND_HAVE_CAP__"),
        (r"\byour\b", "__FRIEND_POS__"),
        (r"\bYour\b", "__FRIEND_POS_CAP__"),
        (r"\byou\b", "__FRIEND__"),
        (r"\bYou\b", "__FRIEND_CAP__"),
        (r"\{friend\}'s", "__YOUR_POS__"),
        (r"\{friend\}", "__YOU__"),
    ]
    for pattern, placeholder in replacements:
        text = re.sub(pattern, placeholder, text)
    return (text
        .replace("__FRIEND_BE__", "{friend} is")
        .replace("__FRIEND_BE_CAP__", "{friend} is")
        .replace("__FRIEND_HAVE__", "{friend} has")
        .replace("__FRIEND_HAVE_CAP__", "{friend} has")
        .replace("__FRIEND_POS__", "{friend}'s")
        .replace("__FRIEND_POS_CAP__", "{friend}'s")
        .replace("__FRIEND__", "{friend}")
        .replace("__FRIEND_CAP__", "{friend}")
        .replace("__YOUR_POS__", "your")
        .replace("__YOU__", "you")
        .replace("__BOTH__", "you both")
        .replace("__BOTH_OF_YOU__", "both of you")
        .replace("__EACH__", "you each")
        .replace("__YOUD__", "you'd"))

def clean_swapped_copy(text):
    fixes = [
        (r"\{friend\} feel\b", "{friend} feels"),
        (r"\{friend\} need\b", "{friend} needs"),
        (r"\{friend\} retreat\b", "{friend} retreats"),
        (r"\{friend\} go\b", "{friend} goes"),
        (r"\{friend\} hold\b", "{friend} holds"),
        (r"\{friend\} act\b", "{friend} acts"),
        (r"\{friend\} react\b", "{friend} reacts"),
        (r"\{friend\} calm\b", "{friend} calms"),
        (r"\{friend\} handle\b", "{friend} handles"),
        (r"\{friend\} process\b", "{friend} processes"),
        (r"\{friend\} talk\b", "{friend} talks"),
        (r"\{friend\} keep\b", "{friend} keeps"),
        (r"\{friend\} want\b", "{friend} wants"),
        (r"\{friend\} get\b", "{friend} gets"),
        (r"\{friend\} make\b", "{friend} makes"),
        (r"\{friend\} plant\b", "{friend} plants"),
        (r"\{friend\} bolt\b", "{friend} bolts"),
        (r"\{friend\} plants \{friend\}'s feet\b", "{friend} plants their feet"),
        (r"\{friend\} keeps each other's\b", "you keep each other's"),
        (r"\bboth of \{friend\}\b", "both of you"),
        (r"\{friend\} bring\b", "{friend} brings"),
        (r"\{friend\} step\b", "{friend} steps"),
        (r"\byou needs\b", "you need"),
        (r"\byou goes\b", "you go"),
        (r"\byou wants\b", "you want"),
        (r"\byou bolts\b", "you bolt"),
        (r"\byou retreats\b", "you retreat"),
        (r"\byou holds\b", "you hold"),
        (r"\{friend\} both\b", "you both"),
    ]
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text)
    return text

def clean_reader_copy(text):
    fixes = [
        (r"\bYou wants\b", "You want"),
        (r"\bYou handles\b", "You handle"),
        (r"\bYou feels\b", "You feel"),
        (r"\bYou keeps\b", "You keep"),
        (r"\bYou needs\b", "You need"),
    ]
    for pattern, replacement in fixes:
        text = re.sub(pattern, replacement, text)
    return text

def friend_clause_to_reader(text):
    return ensure_sentence(clean_reader_copy(text.strip()
        .replace("{friend}'s", "Your")
        .replace("{friend}", "You")))

def reader_clause_to_friend(text):
    text = text.strip()
    replacements = [
        (r"^You need\b", "{friend} needs"),
        (r"^You act\b", "{friend} acts"),
        (r"^You react\b", "{friend} reacts"),
        (r"^You burn\b", "{friend} burns"),
        (r"^You say\b", "{friend} says"),
        (r"^You calm\b", "{friend} calms"),
        (r"^You root\b", "{friend} roots"),
        (r"^You keep\b", "{friend} keeps"),
        (r"^You want\b", "{friend} wants"),
        (r"^You warm\b", "{friend} warms"),
        (r"^You bring\b", "{friend} brings"),
        (r"^You process\b", "{friend} processes"),
        (r"^You talk\b", "{friend} talks"),
        (r"^You feel\b", "{friend} feels"),
        (r"^You handle\b", "{friend} handles"),
        (r"^You fix\b", "{friend} fixes"),
        (r"^You smooth\b", "{friend} smooths"),
        (r"^You go\b", "{friend} goes"),
        (r"^You hold\b", "{friend} holds"),
        (r"^You loosen\b", "{friend} loosens"),
        (r"^You run\b", "{friend} runs"),
        (r"^You step\b", "{friend} steps"),
        (r"^You can\b", "{friend} can"),
        (r"^You get\b", "{friend} gets"),
        (r"^You reach\b", "{friend} reaches"),
        (r"^Your\b", "{friend}'s"),
    ]
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)
    return ensure_sentence(clean_swapped_copy(text))

def reverse_moon_card(card, you_sign, friend_sign):
    body = clean_swapped_copy(swap_reader_friend(swap_moon_signs(card.get("body", ""), you_sign, friend_sign))) if card.get("body") else ""

    return {
        **card,
        "match": "Moon-to-Moon",
        "function": ensure_sentence(swap_moon_signs(card["function"], you_sign, friend_sign)),
        "your_line": friend_clause_to_reader(card["their_line"]),
        "their_line": reader_clause_to_friend(card["your_line"]),
        "same_sign": False,
        "same_sign_line": "",
        "verdict": clean_swapped_copy(swap_reader_friend(card["verdict"])),
        "synthesis": clean_swapped_copy(swap_reader_friend(card["verdict"])),
        "relationship": relationship(friend_sign, you_sign),
        "body": body,
        "format": card.get("format", "single-paragraph"),
        "tier": "authored Moon-to-Moon compatibility write-up; sign-only; reversed from authored reader-to-friend pair",
    }

def parse_moon_compatibility_cards():
    if os.path.exists(MOON_LIBRARY):
        source = json.load(open(MOON_LIBRARY, encoding="utf-8"))
        entries = {}

        for row in source:
            you_sign = row["reader_moon"].lower()
            friend_sign = row["other_moon"].lower()
            body = "\n\n".join(
                re.sub(r"[ \t]+", " ", paragraph.strip())
                for paragraph in row["text"].strip().split("\n\n")
                if paragraph.strip()
            )
            paragraphs = body.split("\n\n")

            if len(paragraphs) != 4:
                raise ValueError(f"Moon compatibility library row must have exactly 4 paragraphs: {you_sign}+{friend_sign}")

            function, your_line, other_line, verdict = paragraphs
            same = you_sign == friend_sign
            their_line = "" if same else other_line
            same_sign_line = other_line if same else ""

            entries.setdefault(you_sign, {})[friend_sign] = {
                "glyph": GLYPH["moon"],
                "match": "Moon-to-Moon",
                "function": function,
                "your_line": your_line,
                "their_line": their_line,
                "same_sign": same,
                "same_sign_line": same_sign_line,
                "same_sign_quote": None,
                "verdict": verdict,
                "synthesis": verdict,
                "relationship": relationship(you_sign, friend_sign),
                "body": body,
                "format": row.get("format", "multi-paragraph"),
                "moon_relation": row.get("relation"),
                "source": row.get("source"),
                "tier": "authored Moon-to-Moon compatibility library; sign-only; 144 resolved records",
                "status": "DRAFT",
            }

        return entries

    if not os.path.exists(MOON_CARDS):
        return {}

    source = open(MOON_CARDS, encoding="utf-8").read()
    pattern = re.compile(
        r"^\*\*([A-Za-z]+) \+ ([A-Za-z]+)\*\* — (.+)$",
        re.MULTILINE
    )
    entries = {}

    for match in pattern.finditer(source):
        you_sign = match.group(1).lower()
        friend_sign = match.group(2).lower()
        body = match.group(3).strip()
        sentences = split_sentences(body)

        if len(sentences) != 3:
            raise ValueError(f"Moon compatibility card must have exactly 3 sentences: {you_sign}+{friend_sign}")

        function, placement_sentence, verdict = sentences
        same = you_sign == friend_sign
        your_line = placement_sentence
        their_line = ""
        same_sign_line = ""

        if same:
            shared_marker = ", and so does {friend}."

            if placement_sentence.endswith(shared_marker):
                your_line = ensure_sentence(placement_sentence[:-len(shared_marker)])
                same_sign_line = "So does {friend}."
            else:
                same_sign_line = placement_sentence
        else:
            parts = placement_sentence.split("; ", 1)
            if len(parts) != 2:
                raise ValueError(f"Moon compatibility card needs a semicolon-separated placement sentence: {you_sign}+{friend_sign}")
            your_line, their_line = parts
            your_line = ensure_sentence(your_line)
            their_line = ensure_sentence(their_line)

        entries.setdefault(you_sign, {})[friend_sign] = {
            "glyph": GLYPH["moon"],
            "match": "Moon-to-Moon",
            "function": function,
            "your_line": your_line,
            "their_line": their_line,
            "same_sign": same,
            "same_sign_line": same_sign_line,
            "same_sign_quote": None,
            "verdict": verdict,
            "synthesis": verdict,
            "relationship": relationship(you_sign, friend_sign),
            "body": body,
            "format": "single-paragraph",
            "tier": "authored Moon-to-Moon compatibility write-up; sign-only; directional reader-to-friend copy",
            "status": "DRAFT",
        }

    for you_sign, friend_cards in list(entries.items()):
        for friend_sign, card in list(friend_cards.items()):
            if you_sign == friend_sign:
                continue
            if entries.get(friend_sign, {}).get(you_sign):
                continue
            entries.setdefault(friend_sign, {})[you_sign] = reverse_moon_card(card, you_sign, friend_sign)

    return entries

def normalize_name_token(text):
    return text.replace("{{other_name}}’s", "{friend}'s").replace("{{other_name}}'s", "{friend}'s").replace("{{other_name}}", "{friend}")

def parse_authored_library_card_writeup(writeup, row_id):
    paragraphs = [normalize_name_token(part.strip()) for part in writeup.split("\n\n") if part.strip()]
    if len(paragraphs) != 4:
        raise ValueError(f"Authored compatibility card must have exactly 4 paragraphs: {row_id}")
    return paragraphs

def parse_venus_compatibility_cards():
    if not os.path.exists(VENUS_LIBRARY):
        return {}

    source = json.load(open(VENUS_LIBRARY, encoding="utf-8"))
    entries = {}
    comparisons = source.get("comparisons", [])

    for row in comparisons:
        if row.get("planet") != "venus":
            continue
        you_sign = row["reader_sign"]
        friend_sign = row["other_sign"]
        function, your_line, their_or_same_line, verdict = parse_authored_library_card_writeup(row["writeup"], row["id"])
        same = bool(row.get("same_sign"))

        entries.setdefault(you_sign, {})[friend_sign] = {
            "glyph": GLYPH["venus"],
            "match": "Venus-to-Venus",
            "function": function,
            "your_line": your_line,
            "their_line": "" if same else their_or_same_line,
            "same_sign": same,
            "same_sign_line": their_or_same_line if same else "",
            "same_sign_quote": None,
            "verdict": verdict,
            "synthesis": verdict,
            "relationship": relationship(you_sign, friend_sign),
            "tier": "authored Venus-to-Venus compatibility write-up; sign-only; directional reader-to-friend copy",
            "status": "DRAFT",
        }

    return entries

cards = {}
missing = []
for planet in PLANETS:
    if planet == "moon":
        moon_cards = parse_moon_compatibility_cards()
        if sum(len(row) for row in moon_cards.values()) != len(ORDER) ** 2:
            missing.append(("moon", "authored-source", "144 directional pairs"))
        cards[planet] = moon_cards
        continue
    if planet == "venus":
        venus_cards = parse_venus_compatibility_cards()
        if sum(len(row) for row in venus_cards.values()) != len(ORDER) ** 2:
            missing.append(("venus", "authored-source", "144 directional pairs"))
        cards[planet] = venus_cards
        continue

    cards[planet] = {}
    for a, b in itertools.product(ORDER, repeat=2):
        c = compose(planet, a, b)
        if c is None:
            missing.append((planet, a, b)); continue
        cards[planet].setdefault(a, {})[b] = c

out = {"_meta": {"title": "Compatibility long-form write-ups (Co-Star style)",
        "model": "function + your_line + their_line/same_sign_line + verdict; Moon and Venus are source-only authored compatibility libraries",
        "planets": PLANETS, "status": "DRAFT — pending editorial sign-off",
        "note": CC["_meta"]["provenance"]},
       "cards": cards}
json.dump(out, open(DEST, "w"), indent=2, ensure_ascii=False)
n = sum(len(v)*len(next(iter(v.values()))) for v in cards.values() if v)
print(f"built {n} long-form compatibility write-ups for {PLANETS} -> {DEST}")
if missing:
    print("  missing book descriptions for:", missing[:6], "..." if len(missing)>6 else "")

if __name__ == "__main__" and os.environ.get("DEMO"):
    c = cards["mercury"]["pisces"]["aquarius"]
    print(f"\n--- Mercury · You: Pisces · Them: Aquarius  [{c['match']}] ---")
    print(c["function"]); print(c["your_line"]); print(c["their_line"]); print(c["synthesis"])
