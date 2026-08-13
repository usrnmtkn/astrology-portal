// Generated from data/writing/natal-author-from-mechanism-calibration-v1.json.
// Do not edit by hand.
export const NATAL_MECHANISM_CALIBRATION = Object.freeze({
  "schemaVersion": "natal-author-from-mechanism-calibration-v1",
  "source": "tldr-astro-phrasebank/TLDR-AUTHOR-FROM-MECHANISM-RULING-OWNER.md",
  "positive": [
    {
      "id": "jupiter-opposite-mars-owner-benchmark",
      "rowKey": "jupiter|opposition|mars",
      "expected": "PASS",
      "copy": "You sign up for the course, book the trip, volunteer for the project, and only then look at the week you already had planned. Enthusiasm makes the next experience feel worth stretching for, especially when there is something to learn, prove, or see for yourself. The problem usually appears later, when the flight is at six, the presentation is still unfinished, and your body has been running on whatever you could eat between obligations. You can want the bigger life without making every opportunity fit into the same week."
    },
    {
      "id": "mercury-sextile-venus-owner-benchmark",
      "rowKey": "mercury|sextile|venus",
      "expected": "PASS",
      "copy": "You usually know how to say the difficult part without making somebody regret telling you. A grieving friend gets a text that does not demand an answer. A tense email gets rewritten once before you send it. When somebody is embarrassed, you can leave them a little dignity while still dealing with what happened. That same instinct can show up in writing, editing, design, art, or any work where the way something is communicated matters almost as much as the information itself."
    },
    {
      "id": "moon-sextile-venus-owner-benchmark",
      "rowKey": "moon|sextile|venus",
      "expected": "PASS",
      "copy": "You remember the coffee order, bring food when someone has had a terrible week, and notice when the room would feel better with the lamp on instead of the overhead light. Affection tends to come through small choices that make another person more comfortable. You may not think of any of this as caretaking. To the people who know you well, it is often how they know you care."
    }
  ],
  "negative": [
    {
      "id": "mercury-sextile-venus-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "photograph_test",
        "astrology_summary"
      ],
      "diagnosis": "Mercury sextile Venus is written like therapy language: empathy, suffering, grief, trauma, fertile potential, nurturing care, growth. There is no person doing anything."
    },
    {
      "id": "saturn-trine-venus-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "astrology_summary"
      ],
      "diagnosis": "Saturn trine Venus uses deep bonds, financial and emotional entanglements, intricate ties, engender loyalty. Nobody talks or lives like that."
    },
    {
      "id": "uranus-sextile-venus-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "astrology_summary"
      ],
      "diagnosis": "Uranus sextile Venus turns the whole placement into an investment metaphor instead of showing how affection or money actually behaves."
    },
    {
      "id": "jupiter-opposite-mars-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "zero_concrete_nouns",
        "astrology_summary"
      ],
      "diagnosis": "Jupiter opposite Mars gives us life's biggest questions, adventure, education, spirituality, losing the forest for the trees, nuance. Almost every noun is abstract."
    },
    {
      "id": "neptune-sextile-mars-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "interchangeable",
        "astrology_summary"
      ],
      "diagnosis": "Neptune sextile Mars gives us intuition, discoveries, leaps of faith, work ethic, superpower. It could describe hundreds of placements."
    },
    {
      "id": "pluto-trine-mars-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "archetype_soup",
        "translation_required"
      ],
      "diagnosis": "Pluto trine Mars is all astrology poetry: catharsis, underworld, death and rebirth, mysteries of life. The reader has to translate every sentence."
    },
    {
      "id": "moon-square-mars-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "trait_entry",
        "astrology_summary"
      ],
      "diagnosis": "Moon square Mars gives us knowledge, perspectives, rash judgments, defensive tendencies, objectivity. Again, analysis from outside the person."
    },
    {
      "id": "mc-conjunct-mars-rejected-mode",
      "expected": "REVISE",
      "defects": [
        "archetype_soup"
      ],
      "diagnosis": "MC conjunct Mars is archetype soup: warriors, athletes, striving, rocket fuel, chariot, blades. It is cleverer than it is useful."
    }
  ],
  "loopholeNegative": {
    "id": "jupiter-conjunction-south-node-photograph-laundering",
    "rowKey": "jupiter|conjunction|south_node",
    "expected": "REVISE",
    "photographTest": "PASS",
    "defects": [
      "astrology_summary",
      "whole_passage_sentence_role"
    ],
    "copy": "A teacher, trip, disappointment, or opportunity shows up and you recognize the question almost immediately. The details are different, but the same belief is back on the table. In this karmic framework, repetition carries a philosophical or spiritual lesson.",
    "diagnosis": "The opening clears the photograph-test minimum, but the final sentence is generic astrology-summary prose. One lived clause cannot make the whole passage pass."
  }
});
