#!/usr/bin/env python3
"""
build_audit_replacements.py — fold the full-corpus audit replacement lines into
the CONFIRMED corpus so attach_pullquotes.py can draw from them.

Reads sources/marie-audit-replacements.json (verbatim Marie lines from the
54-article audit, with theme/flavor/scope/source metadata) and appends them to
phrasebank/marie-confirmed-quotes.json as tier CONFIRMED records. The `scope`
field is preserved so the attach step keeps sign-scoped lines OUT of the
universal transit pool.

Run AFTER build_confirmed_quotes.py, BEFORE attach_pullquotes.py.
"""
import json, os, re

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(PKG, "sources", "marie-audit-replacements.json")
DEST = os.path.join(PKG, "phrasebank", "marie-confirmed-quotes.json")

audit = json.load(open(SRC))
corpus = json.load(open(DEST))
existing = {q["text"] for q in corpus["quotes"]}
DATE_RE = re.compile(
    r"\b(?:19|20)\d{2}\b|"
    r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b|"
    r"\b\d{1,2}/\d{1,2}/\d{2,4}\b|"
    r"\b\d{4}-\d{2}-\d{2}\b"
)

added = 0
for ln in audit["lines"]:
    if ln["text"] in existing:
        continue
    date_bound = bool(DATE_RE.search(ln["text"]))
    corpus["quotes"].append({
        "id": ln["id"],
        "text": ln["text"],
        "kind": "audit_replacement",
        "tier": "CONFIRMED",
        "source": "Marie Satori (\"" + ln.get("source", "public article") + "\") — full-corpus audit",
        "scope": ln.get("scope", "universal"),
        "themes": ln.get("themes", []),
        "flavor": ln.get("flavor", ""),
        "status": "REFERENCE_ONLY" if date_bound else "SERVE_VERBATIM",
        "serving": ("REFERENCE_ONLY; do not serve automatically; contains article-specific timing"
                    if date_bound else
                    "may serve verbatim; author's own words; editorial sign-off recorded 2026-07-15"),
    })
    added += 1

corpus["_meta"]["count"] = len(corpus["quotes"])
corpus["_meta"]["audit_added"] = added
json.dump(corpus, open(DEST, "w"), indent=2, ensure_ascii=False)
print(f"folded {added} audit replacement lines into CONFIRMED corpus "
      f"({len(corpus['quotes'])} total confirmed lines).")
