#!/usr/bin/env python3
"""
build_ms_article_quotes.py — CONFIRMED verbatim lines from Marie's published articles
(satori-writing folder). These are her own words in her personal horoscope register
("you"), captured for the PERSONALIZED surfaces (Home daily / planetary horoscope) and
as attributable provenance behind the collective Sky articles that were voiced from them.

Tier CONFIRMED: serve-verbatim, never tone-passed or seam/register-linted. Because the
register is second-person, these are NOT auto-attached to the collective we/us Sky layer;
they live in the personalized library. Filename omits 'reviewed' so transform passes skip.
"""
import json, os

Q = [
 ("ms/quote/eclipse/observe",
  "You are not meant to push harder right now, just sit back and observe.",
  "Pisces Total Lunar Eclipse 2025", "eclipse, retrograde-heavy sky, integration"),
 ("ms/quote/eclipse/dam",
  "It hits like floodwater that's been pressing against a dam for months.",
  "Pisces Total Lunar Eclipse 2025", "eclipse buildup / release"),
 ("ms/quote/newmoon/funeral",
  "That New Moon was a funeral: not tragic, but raw, inevitable, and necessary.",
  "Pisces Total Lunar Eclipse 2025", "endings, closing New Moon of a cycle"),
 ("ms/quote/eclipse/life-let-go",
  "Which dream were you keeping on life support? What needed to end that you kept postponing, until life did the letting go for you?",
  "Pisces Total Lunar Eclipse 2025", "release, overdue endings"),
 ("ms/quote/saturn-aries/water-to-move",
  "In Pisces, Saturn asked you to sit in the water, to grieve, to surrender. Now it's time to move.",
  "Saturn enters Aries 2025", "Saturn Pisces -> Aries threshold"),
 ("ms/quote/saturn-aries/freedom-limits",
  "Freedom doesn't come from avoiding limits, it comes from choosing which ones matter.",
  "Saturn enters Aries 2025", "Saturn in Aries, discipline and initiative"),
 ("ms/quote/saturn-aries/fire-back",
  "The fire is back. And it's asking what you're going to do with it.",
  "Saturn enters Aries 2025", "Saturn in Aries, initiation"),
 ("ms/quote/saturn-aries/patience-to-build",
  "What if evolution requires the patience to build?",
  "Saturn enters Aries 2025", "Saturn in Aries vs move-fast-break-things"),
 ("ms/quote/uranus-gemini/living-experiment",
  "Growth isn't a straight line; it's a living experiment.",
  "Uranus Rx in Gemini", "Uranus, change, adaptation"),
 ("ms/quote/uranus-gemini/signals",
  "Those disruptions weren't random. They were signals.",
  "Uranus Rx in Gemini", "Uranus disruption as early preview"),
 ("ms/quote/venus-virgo/dishes",
  "This isn't the Venus that sweeps you off your feet. This is the Venus that notices you've been overwhelmed and does the dishes without being asked.",
  "Venus in Virgo 2025", "Venus in Virgo, love as practical care"),
 ("ms/quote/venus-virgo/daily-practice",
  "Love as a daily practice of care, attention, and sacred service.",
  "Venus in Virgo 2025", "Venus in Virgo, service as love"),
 ("ms/quote/jupiter-cancer/amplifies",
  "Jupiter doesn't just bless. Jupiter amplifies.",
  "What Jupiter in Cancer Means for Your Sign", "Jupiter magnifies whatever is already there"),
 ("ms/quote/jupiter-cancer/wells-wombs",
  "This is the Jupiter of wells, wombs, kitchens, and kin.",
  "What Jupiter in Cancer Means for Your Sign", "Jupiter in Cancer, home and lineage"),
 ("ms/quote/venus-cancer/remembers",
  "This is the kind of love that remembers your favorite song, how you take your coffee, and what helps you feel safe when everything feels uncertain.",
  "Venus in Cancer 2025", "Venus in Cancer, protective comfort love"),
]

records = [{
    "id": qid, "text": text, "tier": "CONFIRMED",
    "source": f"Marie Satori — {article} (mariesatori.com)",
    "register": "personalized second-person ('you')",
    "serving": "may serve verbatim on personalized horoscope surfaces; provenance for collective Sky voicing; never tone-passed or linted",
    "themes": themes,
} for (qid, text, article, themes) in Q]

out = {"_meta": {"title": "Marie Satori published-article quotes (CONFIRMED, serve-verbatim)",
        "count": len(records), "tier": "CONFIRMED", "source_folder": "satori-writing",
        "register_note": "second-person; personalized surfaces only, not the collective we/us Sky layer",
        "voice_note": "excluded from tone_pass and seam/register lints"},
       "quotes": records}
dest = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                    "phrasebank", "ms-satori-articles-confirmed.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
print(f"wrote {len(records)} CONFIRMED article quotes -> {dest}")

if __name__ == "__main__":
    pass
