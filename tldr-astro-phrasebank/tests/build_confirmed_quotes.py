#!/usr/bin/env python3
"""
build_confirmed_quotes.py — extract Marie's own lines into a structured CONFIRMED corpus.

Pulls every pull-quote / essay-quote / quote from marie-source-phrases.json (her own
words) into phrasebank/marie-confirmed-quotes.json, tier CONFIRMED (serve-verbatim).
This is the pool attach_pullquotes.py draws from.

Source path via MS_PATH env (default: the staged sources copy).
"""
import json, os

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MS = os.environ.get("MS_PATH", "/tmp/src/marie-source-phrases.json")
ms = json.load(open(MS))

GROUPS = {"pull-quote": "pull_quote", "essay-quote": "essay_quote", "quote": "aphorism"}
records = []
for prefix, kind in GROUPS.items():
    for k in ms:
        if k.startswith("ms/" + prefix + "/"):
            text = str(ms[k]).strip()
            if not text:
                continue
            records.append({
                "id": "cc/quote/marie/" + k.split("/")[-1] + "-" + prefix,
                "text": text, "kind": kind, "tier": "CONFIRMED",
                "source": "@mariesatori / mariesatori.com (marie-source-phrases.json)",
                "serving": "may serve verbatim; never seam- or register-linted (author's own voice)",
            })

out = {"_meta": {"title": "Marie Satori CONFIRMED lines (pull-quotes, essay-quotes, aphorisms)",
        "count": len(records), "tier": "CONFIRMED",
        "note": "The author's own words. Top voice authority. attach_pullquotes.py maps these to "
                "thematically-matching records as optional serve-verbatim closers; the rest are "
                "MANUAL_ONLY (editor picks)."},
       "quotes": records}
dest = os.path.join(PKG, "phrasebank", "marie-confirmed-quotes.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"extracted {len(records)} CONFIRMED Marie lines -> {dest}")
