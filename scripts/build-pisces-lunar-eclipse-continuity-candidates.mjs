import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reviewDir = path.join(root, "packages/astro-knowledge/review/lunation-card-assembly-v1");
const sourcePath = path.join(reviewDir, "source/ritual-and-the-moon-lunation-horoscopes-v1.json");
const outputPath = path.join(reviewDir, "source/pisces-lunar-eclipse-continuity-candidates-v1.json");
const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const replacementsByHouse = {
  1: [
    [
      "This Pisces full moon encourages you to regain balance with your body; your recovery depends on maintaining a balance between effort and flow.",
      "Regain balance with your body; your recovery depends on maintaining a balance between effort and flow."
    ],
    [
      "This Pisces full moon reminds you that your dreams must be reclaimed and safeguarded.",
      "Your dreams must be reclaimed and safeguarded."
    ],
    [
      "This Pisces full moon is an opportunity to be guided for the next six months, to step into your creative power, and honor what makes you a muse.",
      "Over the next six months, step into your creative power and honor what makes you a muse."
    ]
  ],
  2: [
    [
      "The Pisces full moon in the second house is a time to reflect on your income and security.",
      "Reflect on your income and security."
    ],
    [
      "As the full moon unfolds, it shifts your perspective on the parts of your work that make you feel alive.",
      "Notice the parts of your work that make you feel alive."
    ],
    [
      "This full moon may also signal a time when you make a sizeable investment in your dreams: paying for marriage, a downpayment on a house, or paying to further your education are some examples.",
      "You may also make a sizeable investment in your dreams: paying for marriage, a downpayment on a house, or paying to further your education are some examples."
    ]
  ],
  3: [
    [
      "This full moon unlocks deeper insights and personal awareness.",
      "You may uncover deeper insights and personal awareness."
    ],
    [
      "This full moon is a signal to take a break and process all the information and knowledge you've gathered in the last six months since the Pisces new moon.",
      "Take a break and process all the information and knowledge you've gathered in the last six months since the Pisces new moon."
    ]
  ],
  5: [
    [
      "This celestial event is the perfect opportunity to channel your inner artist and explore your creative side.",
      "Channel your inner artist and explore your creative side."
    ],
    [
      "The full moon in the fifth house is a time for self-expression.",
      "Make time for self-expression."
    ]
  ],
  6: [
    [
      "The Pisces full moon is here to remind you that you don't have to overexert yourself in order to be successful. This mystical moon reminds you that success does not require overexertion and that you must honor your physical, emotional, and spiritual needs to preserve your vitality.",
      "You don't have to overexert yourself to be successful. Honor your physical, emotional, and spiritual needs to preserve your vitality."
    ],
    [
      "If you feel overwhelmed, drained, or burned out, the Pisces full moon calls upon you to take back control of your well-being.",
      "If you feel overwhelmed, drained, or burned out, take back control of your well-being."
    ],
    [
      "This full moon is an opportunity to celebrate small victories and try new things.",
      "Celebrate small victories and try new things."
    ],
    [
      "This mystical Pisces full moon calls upon you to build a more purposeful and healthy life, filled with love and compassion for yourself.",
      "Build a more purposeful and healthy life, filled with love and compassion for yourself."
    ]
  ],
  7: [
    [
      "The Pisces full moon reminds you of the power of commitment and unions. The full moon in the seventh house is a time to celebrate your relationships and their capacity to shape your life.",
      "Celebrate your relationships and their capacity to shape your life."
    ],
    [
      "The full moon is the perfect time to repair and reconnect with those in your life.",
      "Repair and reconnect with those in your life."
    ]
  ],
  8: [
    [
      "The full moon in the 8th house shines a light on what people have done to support you. And allows you to give back to those who have helped you along your journey.",
      "Look at what people have done to support you, and consider how you can give back to those who have helped you."
    ],
    [
      "Embrace the gifts of the Pisces full moon. It's a reminder that it's okay to feel grief and sadness.",
      "It's okay to feel grief and sadness."
    ],
    [
      "The Pisces full moon wants you to dive into the depths of your emotions.",
      "Dive into the depths of your emotions."
    ],
    [
      "This full moon is the perfect time to reflect on the past and let go of any emotions holding you back.",
      "Reflect on the past and let go of any emotions holding you back."
    ],
    [
      "This full moon is here to remind us that it's okay to keep going, even when things don't go as planned.",
      "It's okay to keep going, even when things don't go as planned."
    ],
    [
      "This full moon helps you gain strength over a lack of mindset.",
      ""
    ]
  ],
  9: [
    [
      "This full moon shifts your perspective from the micro to the macro. The full moon is a time for reflection, growth, and expansion.",
      ""
    ],
    [
      "This full moon may bring an unexpected moment of truth.",
      "You may face an unexpected moment of truth."
    ]
  ],
  10: [
    [
      "This full moon reminds you to stay true to yourself and your agenda.",
      "Stay true to yourself and your agenda."
    ],
    [
      "The Sun in Virgo and Pisces full moon asks that you take inventory and establish the barriers necessary to care for your fundamental needs.",
      "The Sun in Virgo asks you to take inventory and establish the barriers necessary to care for your fundamental needs."
    ],
    [
      "Full moons are often times of release, and this one is no different. ",
      ""
    ],
    [
      "The Pisces full moon is a beautiful reminder that your dreams are powerful.",
      "Your dreams are powerful."
    ]
  ],
  11: [
    [
      "This Pisces full moon inspires you to dream bigger and take steps to make your dreams a reality.",
      "Dream bigger and take steps to make your dreams a reality."
    ],
    [
      "This full moon sends an electric shock. ",
      ""
    ],
    [
      "But this full moon, you can look carefully at your desires and fears.",
      "Look carefully at your desires and fears."
    ]
  ],
  12: [
    [
      "The Pisces full moon signals a time of endings. It's not just about letting go of the past but also learning from it.",
      "Endings are not just about letting go of the past but also learning from it."
    ],
    [
      "The Pisces full moon is the perfect time to let go of all the noise of the physical world, and expectations and surrender to the power of self-reflection.",
      "Let go of the noise of the physical world and other people's expectations, and surrender to the power of self-reflection."
    ],
    [
      "When you surrender to the Pisces full moon energy, you can gain access to a part of yourself that you previously was unaware of.",
      "Self-reflection can reveal a part of yourself you were previously unaware of."
    ],
    [
      "The Pisces full moon allows you to be still within the oneness of the cosmos and remember that you are more than just a physical being.",
      "Be still within the oneness of the cosmos and remember that you are more than just a physical being."
    ],
    [
      "This full moon also connects you deeper to the collective emotional turmoil of mankind, plants, animals, and periods beyond the present.",
      "You may also feel more connected to the collective emotional turmoil of mankind, plants, animals, and periods beyond the present."
    ],
    [
      "The energy of the Pisces full moon can be overwhelming. It is difficult to describe how overwhelmed this energy can make you feel at times.",
      "Your sensitivity can feel overwhelming at times."
    ],
    [
      "As your sensitivity increases during the Pisces full moon, you may feel that you have to confront the world's suffering and make sense of it.",
      "As your sensitivity increases, you may feel that you have to confront the world's suffering and make sense of it."
    ],
    [
      "This full moon holds a challenging energy. ",
      ""
    ],
    [
      "In the meantime, this full moon reminds you that you still have so much to learn.",
      "You still have so much to learn."
    ]
  ]
};

const entriesByHouse = new Map(source.entries
  .filter((entry) => entry.lunationSign === "pisces" && entry.lunationKind === "full-moon")
  .map((entry) => [entry.house, entry]));

const candidates = [];
for (const [houseText, replacements] of Object.entries(replacementsByHouse)) {
  const house = Number(houseText);
  const entry = entriesByHouse.get(house);
  if (!entry) throw new Error(`Missing Pisces Full Moon source for house ${house}`);
  for (const [text, replacement] of replacements) {
    const start = entry.body.indexOf(text);
    if (start < 0) throw new Error(`Missing continuity source text for house ${house}: ${text}`);
    if (entry.body.indexOf(text, start + 1) >= 0) throw new Error(`Ambiguous continuity source text for house ${house}: ${text}`);
    candidates.push({
      contentKey: entry.contentKey,
      house,
      start,
      end: start + text.length,
      sha256: hash(text),
      text,
      replacement,
      changeReason: "Remove a redundant lunation reminder after the eclipse opening has identified the event.",
      reviewStatus: "needs_owner_exact_review",
      ownerApproved: false,
      promotionAuthorized: false
    });
  }
}

const output = {
  schema: "pisces-lunar-eclipse-continuity-candidates/v1",
  status: "needs_owner_exact_review",
  serving: false,
  rule: "Review-only, eclipse-specific sentence edits. The regular Pisces Full Moon source remains unchanged. No runtime pattern deletion is authorized.",
  source: path.relative(root, sourcePath),
  sourceSha256: hash(fs.readFileSync(sourcePath, "utf8")),
  affectedHouseCount: Object.keys(replacementsByHouse).length,
  candidateCount: candidates.length,
  candidates
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, outputPath)} with ${candidates.length} review-held edits.`);
