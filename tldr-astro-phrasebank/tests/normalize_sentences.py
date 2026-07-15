#!/usr/bin/env python3
"""
normalize_sentences.py — make every served reader field a STANDALONE sentence.

Some authored fields (esp. house_integration) were written as continuation clauses ("your ideas
shape your public work…") to follow a lead-in. Now that the app serves them verbatim as section
bodies, they must be complete sentences: capitalized first letter + terminal punctuation. This
rewrites those fields in place (idempotent) and is a safe mechanical grammar fix — no wording changes.
"""
import os, json

PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")

# file -> reader fields to normalize
FIELDS = {
 "cc-planet-in-sign-reviewed":  ["natal_sign_story", "collective_shift"],
 "cc-planet-in-house-reviewed": ["house_integration", "home_scene"],
 "cc-natal-angles-authored":    ["reading"],
 "cc-sky-points-authored":      ["collective_reading"],
}

def norm(s):
    if not isinstance(s, str) or not s.strip():
        return s
    t = s.strip()
    t = t[0].upper() + t[1:]                       # capitalize first letter
    if t[-1] not in '.!?"’':                  # ensure terminal punctuation
        t += "."
    return t

def main():
    changed = 0
    for fn, fields in FIELDS.items():
        p = os.path.join(PB, fn + ".json")
        if not os.path.exists(p): continue
        data = json.load(open(p))
        for r in data.get("reviewed", []):
            for f in fields:
                if f in r and isinstance(r[f], str):
                    new = norm(r[f])
                    if new != r[f]:
                        r[f] = new; changed += 1
        json.dump(data, open(p, "w"), indent=1, ensure_ascii=False)
    print(f"normalized {changed} reader fields to standalone sentences")

if __name__ == "__main__":
    main()
