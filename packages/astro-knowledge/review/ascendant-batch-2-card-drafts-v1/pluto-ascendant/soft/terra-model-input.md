You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Pluto -> Ascendant, soft
DIRECTION: {{holder1}} is the Pluto holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Their intensity and pull toward depth and control work smoothly with how freely you present yourself and enter situations.
summaryDeep: Their intensity and pull toward depth and control work smoothly with how freely you present yourself and enter situations. It runs easily and asks little, quietly steadying the rest of the bond. Lean on how naturally this one lines up.
APPROVED HUMAN-MOMENT INPUT: {{holder2}} can show more of themselves around {{holder1}} without immediately feeling exposed. The connection grows deeper without {{holder2}} having to stay guarded.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "libra-new-moon",
    "originalLine": "The stars are bringing insights about your psychological patterns that can create healing and understanding, and your spiritual understanding of love is expanding beyond possession and control.",
    "suppliedLine": "The stars are bringing insights about your psychological patterns that can create healing and understanding, and your spiritual understanding of love is expanding beyond possession and control."
  },
  {
    "sourceArticleId": "cancer-full-moon-horoscopes-january-2025",
    "originalLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together.",
    "suppliedLine": "When everything feels divided, showing up for connection is a radical way to heal, rebuild, and remind one another that we are stronger together."
  },
  {
    "sourceArticleId": "cancer-new-moon-2025",
    "originalLine": "And as missiles fall on bunkers once built for protection, we're being shown, in real time, what happens when safety is rooted in secrecy and control.",
    "suppliedLine": "And as missiles fall on bunkers once built for protection, we're being shown, in real time, what happens when safety is rooted in secrecy and control."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "You pay close attention to how {{holder2}} presents themselves and enters situations. Because your interest feels natural to them, they show you more of themselves, and their openness makes you want to understand them more deeply. Your focus can feel controlling if you press for more than {{holder2}} has chosen to share. Still, {{holder2}} can be more open around you without immediately feeling exposed.",
  "body_they": "{{holder1}} pays close attention to how you present yourself and enter situations. Because their interest feels natural to you, you show them more of yourself, and your openness makes {{holder1}} want to understand you more deeply. Their focus can feel controlling if they press for more than you have chosen to share. Still, you can be more open around {{holder1}} without immediately feeling exposed.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "pluto-ascendant-soft",
  "passed": true,
  "exactOutputShape": {
    "passed": true
  },
  "sentenceCount_body_you": {
    "passed": true,
    "n": 4
  },
  "noDashes_body_you": {
    "passed": true
  },
  "asciiPunctuation_body_you": {
    "passed": true
  },
  "sentenceCount_body_they": {
    "passed": true,
    "n": 4
  },
  "noDashes_body_they": {
    "passed": true
  },
  "asciiPunctuation_body_they": {
    "passed": true
  },
  "rowDirection_body_you": {
    "passed": true
  },
  "rowDirection_body_they": {
    "passed": true
  },
  "exclusions_body_you": {
    "passed": true
  },
  "exclusions_body_they": {
    "passed": true
  },
  "warmthRecord": {
    "passed": true,
    "mode": "matched",
    "note": "matched packet, writer chose no warmth line; Terra scores the choice"
  }
}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}