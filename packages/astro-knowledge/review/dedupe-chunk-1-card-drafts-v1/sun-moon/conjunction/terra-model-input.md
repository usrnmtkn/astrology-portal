You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: Sun -> Moon, conjunction
DIRECTION: {{holder1}} is the Sun holder. {{holder2}} is the Moon holder. The Sun holder acts on the Moon holder's feelings, needs, and sense of emotional safety.
GOVERNED SOURCE BOUNDARY:
plainTranslation: Wants and needs run as one instinct. The Sun person's drive and the Moon person's feelings fold together - you get each other at a level that's hard to explain. Strong foundational glue. Failure mode: coasting on the ease and never building anything with it. Use the natural understanding to make something; don't treat it as the whole relationship.
summaryDeep: Their identity sits right on your feelings, so who they are shapes your mood almost automatically. It can feel like being deeply understood, and it can also mean their day sets yours. Keep your own emotional weather; let them warm it, not run it.
APPROVED HUMAN-MOMENT INPUT: What {{holder1}} wants and what {{holder2}} needs usually align without thinking. The trap is assuming that alignment is automatic, missing the moments when their priorities actually split.
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
[
  {
    "sourceArticleId": "summer-solstice",
    "originalLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support.",
    "suppliedLine": "When you’ve had to stay alert just to feel safe, it becomes difficult to trust your own needs, rest when you need to, or ask for support."
  },
  {
    "sourceArticleId": "2025-overview",
    "originalLine": "It asks you to strip away the masks, the performances, the need to prove yourself.",
    "suppliedLine": "It asks you to strip away the masks, the performances, the need to prove yourself."
  },
  {
    "sourceArticleId": "sagittarius-full-moon-2025",
    "originalLine": "You don’t need to prove you’re worthy.",
    "suppliedLine": "You don’t need to prove you’re worthy."
  }
]
HARVEST MODE: matched

DRAFT (DO NOT REWRITE)
{
  "body_you": "What you want often matches what {{holder2}} needs before either of you says much. When you act on a plan, {{holder2}} often feels settled by it, and their ease encourages you to keep going. The cost is that you can both assume this match will handle everything, then miss when your priorities split or stop building on what you share. {{holder2}} can feel deeply understood by you without having to explain every feeling.",
  "body_they": "What {{holder1}} wants often matches what you need before either of you says much. When {{holder1}} acts on a plan, you often feel settled by it, and your ease encourages them to keep going. The cost is that you can both assume this match will handle everything, then miss when your priorities split or stop building on what you share. You can feel deeply understood by {{holder1}} without having to explain every feeling.",
  "warmthSource": null,
  "labels": []
}

DETERMINISTIC CHECKS
{
  "target": "sun-moon-conjunction",
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