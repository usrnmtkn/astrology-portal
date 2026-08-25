#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRelativePath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/ritual-and-the-moon-lunation-horoscopes-v1.json";
const manifestRelativePath = "packages/astro-knowledge/review/lunation-card-assembly-v1/source/recovered-lunation-copy-corrections-v1.json";
const sourcePath = path.join(repoRoot, sourceRelativePath);
const manifestPath = path.join(repoRoot, manifestRelativePath);
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const approvalStatement = "I approve the 22 corrected lunation passages in recovered-lunation-copy-corrections-v1.json for live serving.";
const ownerConfirmationSource = {
  channel: "Codex task owner message",
  taskId: "019fd6db-eb3c-7ae1-92c1-a9d00a46269a",
  date: "2026-08-24",
};

const corrections = {
  "new-moon/taurus/aries": [
    ["Honoring your values, reworking your finances, and exploring your senses and sensuality is most important to you now.", "Honoring your values, reworking your finances, and exploring your senses and sensuality are most important to you now.", "subject-verb agreement"],
    ["This new moon can signal a time to find a mentor or advisor. Someone to help you save time and effort while staying motivated and learning from their experience.", "This new moon can signal a time to find a mentor or advisor, someone to help you save time and effort while staying motivated and learning from their experience.", "sentence fragment"],
    ["Your intention for the Taurus new moon is, “even", "Your intention for the Taurus new moon is: “Even", "intention punctuation and capitalization"],
  ],
  "new-moon/taurus/taurus": [
    ["The Taurus new moon wants you to be your own source of recognition and control; instead of letting others dictate your worth and value.", "The Taurus new moon wants you to be your own source of recognition and control instead of letting others dictate your worth and value.", "incorrect semicolon"],
    ["this is the time to strategize on how to face and solve any challenges", "this is the time to strategize how to face and solve any challenges", "incorrect preposition"],
  ],
  "new-moon/taurus/gemini": [
    ["there may be a habitual pattern that’s creating resistance within you, avoiding slowing down and getting the rest you need", "there may be a habitual pattern that’s creating resistance within you and keeping you from slowing down and getting the rest you need", "broken modifier"],
    ["rebuilding one of the structures in your life: such as", "rebuilding one of the structures in your life, such as", "incorrect colon"],
    ["morning the loss of a loved one", "mourning the loss of a loved one", "typo"],
    ["retirement, layoff or other change", "retirement, layoff, or other change", "missing series comma"],
    ["You could also be feeling a sense of relief after expending energy into an area of your life; and once the shock abates now that you release what couldn’t be fixed.", "You could also feel a sense of relief after expending so much energy in an area of your life, once the shock abates and you release what couldn’t be fixed.", "broken sentence"],
    ["You could also feel a sense of relief after expending so much energy in an area of your life, once the shock abates and you release what couldn’t be fixed.", "After expending so much energy in an area of your life, you could feel relief once the shock abates and you release what couldn’t be fixed.", "cold-read sentence repair"],
    ["Learning to let go can be hard; especially", "Learning to let go can be hard, especially", "incorrect semicolon"],
    ["you did the best you could do; with what you had", "you did the best you could do with what you had", "incorrect semicolon"],
    ["And, when it comes down to what was out of your control", "When it comes to what was out of your control", "sentence opening"],
    ["consumed by the what-ifs, frees up energy", "consumed by the what-ifs frees up energy", "subject-verb punctuation"],
    ["The new moon in the 12 house", "The new moon in the 12th house", "missing ordinal"],
    ["lost months/years", "lost months or years", "slash artifact"],
    ["something that recently ended or ended", "something that recently ended", "duplicated wording"],
    ["a life built on truth, your greater and true happiness", "a life built on truth and your true happiness", "broken parallel structure"],
  ],
  "new-moon/taurus/cancer": [
    ["share your same values", "share your values", "redundant wording"],
    ["This is good to help you explore new sides of yourself and get exposed to new ideas and visions.", "This can help you explore new sides of yourself and be exposed to new ideas and visions.", "broken construction"],
    ["Whatever you put your intention towards", "Whatever you put your intention toward", "incorrect preposition"],
    ["If you are an artist: writer, musician, artist, actor, etc., this is a time to set the intention to have yourself, and your work is seen.", "If you are a writer, musician, actor, or another kind of artist, this is a time to set the intention to have yourself and your work seen.", "duplicated noun and broken construction"],
    ["being seen, and discovered", "being seen and discovered", "unnecessary comma"],
  ],
  "new-moon/taurus/leo": [
    ["status, responsibility or direction", "status, responsibility, or direction", "missing series comma"],
    ["Usually, Devils symbolize struggle with a moral problem - lust or love, so it's important to identify and steer clear of any romantic obsessions or fantasies at work which could sabotage your financial freedom. ", "", "tarot-strip extraction artifact"],
    ["misleading you of your fulfillment", "misleading you about what will fulfill you", "broken idiom"],
    ["this Aries new moon", "this Taurus new moon", "incorrect lunation sign"],
    ["You may realize a shift in your values and beliefs or realize that you have taken on the views of others", "You may realize that your values and beliefs have shifted or that you have taken on the views of others", "duplicated verb"],
  ],
  "new-moon/taurus/virgo": [
    ["Other cultures, and traveling helps give you perspective", "Other cultures and travel help give you perspective", "subject-verb agreement"],
    ["Keep your mind open to new perspectives and new worlds begin to open up.", "Keep your mind open to new perspectives, and new worlds begin to open up.", "missing clause comma"],
    ["Learn new cultures", "Learn about new cultures", "missing preposition"],
    ["Which new opportunities and paths did you open up to, and what did these new experiences teach you?", "What new opportunities and paths are you opening up to, and what can these new experiences teach you?", "inconsistent tense"],
    ["deep into Spiritual studies", "deep in spiritual studies", "preposition and capitalization"],
    ["unlock the mysteries to live an enchanted life", "unlock mysteries and live an enchanted life", "broken infinitive"],
    ["Seeing things in the bigger picture isn’t always your strong point", "Seeing the bigger picture isn’t always your strong point", "broken idiom"],
    ["new information and understandings help you gain perspective", "new information and understanding help you gain perspective", "number agreement"],
    ["Your intention for this New Moon is, “How", "Your intention for this New Moon is: “How", "intention punctuation"],
  ],
  "new-moon/taurus/libra": [
    ["transformation, Symbolism, Shared Resources, and Other People's Money", "transformation, symbolism, shared resources, and other people's money", "inconsistent capitalization"],
    ["Areas of Intimacy and shared resources", "Areas of intimacy and shared resources", "inconsistent capitalization"],
    ["What you thought gave you security, may not be so anymore", "What you thought gave you security may not be so anymore", "subject-verb punctuation"],
    ["may remind you of this whether it’s birthed", "may remind you of this, whether it’s birthed", "missing clause comma"],
    ["are now arising asking for changes", "are now arising and asking for changes", "missing conjunction"],
    ["This energy can manifest as a sudden desire for a necessary change in lifestyle; perhaps you realize your current lifestyle is not sustainable; or blocks you from reaching your personal life goals.", "This energy can manifest as a sudden desire for a necessary lifestyle change. You may realize your current lifestyle is not sustainable or is blocking you from reaching your personal goals.", "broken sentence and incorrect semicolons"],
    ["may remind you of this, whether it’s birthed out of a deep connection, or a lesson of disempowerment", "may remind you of this, whether it’s birthed out of a deep connection or a lesson of disempowerment", "unnecessary comma"],
  ],
  "new-moon/taurus/scorpio": [
    ["Sometimes it's easier to be more compassionate to those in your intimate relationship than yourself.", "Sometimes it's easier to show compassion to someone in an intimate relationship than to yourself.", "broken comparison"],
  ],
  "new-moon/taurus/sagittarius": [
    ["as new information challenges and evolves stuck patterns", "as new information challenges and changes stuck patterns", "incorrect verb"],
    ["Anything arising right now it to help you", "Anything arising right now is here to help you", "missing words"],
    ["giving to much", "giving too much", "typo"],
    ["Virgo and the Hermit observe. ", "", "tarot-strip extraction artifact"],
    ["With patience, contemplation, and observation you can", "With patience, contemplation, and observation, you can", "missing introductory comma"],
    ["Your new moon intentions, “I am", "Your new moon intention is, “I am", "broken intention introduction"],
    ["as new information challenges and changes stuck patterns", "as new information challenges stuck patterns and helps you change them", "cold-read verb repair"],
    ["Your new moon intention is, “I am", "Your new moon intention is: “I am", "intention punctuation"],
  ],
  "new-moon/taurus/capricorn": [
    ["Love, pleasure, relationships, children's creativity, and self-expression", "Love, pleasure, relationships, children, creativity, and self-expression", "merged list items"],
    ["Your new moon intention, “my humor", "Your new moon intention is, “my humor", "broken intention introduction"],
    ["allow and encourage more passions to flow", "allow and encourage more passion to flow", "number agreement"],
    ["The lion is a metaphor for the primal energies of the emotional body, the flames referencing its burning passions.", "The lion is a metaphor for the primal energies of the emotional body, with the flames representing its burning passions.", "broken modifier"],
    ["Your new moon intention is, “my humor", "Your new moon intention is: “My humor", "intention punctuation and capitalization"],
  ],
  "new-moon/taurus/aquarius": [
    ["The new moon the 4th house", "The new moon in the 4th house", "missing preposition"],
    ["how you want to set roots", "how you want to put down roots", "broken idiom"],
    ["work-life balance; making it easier", "work-life balance, making it easier", "incorrect semicolon"],
    ["time in your career, without pulling", "time in your career without pulling", "unnecessary comma"],
    ["Your Taurus new moon intentions are", "Your Taurus new moon intention is", "number agreement"],
    ["Think about what makes you feel secure and safe, without getting stuck in stagnancy.", "Think about what makes you feel secure and safe without getting stuck in stagnancy.", "unnecessary comma"],
    ["rethink how you want to put down roots or take steps to nurture your roots deeper", "rethink how you want to put down roots or take steps to deepen the roots you already have", "broken idiom"],
    ["Your Taurus new moon intention is, “everything", "Your Taurus new moon intention is: “Everything", "intention punctuation and capitalization"],
  ],
  "new-moon/taurus/pisces": [
    ["more active, and demanding", "more active and demanding", "unnecessary comma"],
    ["You may feel inspired to create more structure in your community; by identifying a need; that, if corrected could bring more flow and harmony within your local community.", "You may feel inspired to create more structure in your community by identifying a need that, if addressed, could bring more flow and harmony to your local community.", "broken sentence and incorrect semicolons"],
    ["Whether it's to take on a new project, open a local business, spark a creative idea, or just find someone to talk to who offers you a sense of belonging.", "This may mean taking on a new project, opening a local business, sparking a creative idea, or simply finding someone to talk to who offers you a sense of belonging.", "sentence fragment"],
    ["This could be organizing raising funds, legal counsel, organizing a board to oversee or physically provide labor and resources to organize construction for a needed community building", "This could mean raising funds, offering legal counsel, organizing a board, or providing labor and resources for the construction of a needed community building", "broken list construction"],
    ["momentum growing - creating", "momentum growing, creating", "punctuation"],
    ["Your Taurus new moon intention is, “my word", "Your Taurus new moon intention is: “My word", "intention punctuation and capitalization"],
  ],
  "new-moon/cancer/scorpio": [
    ["Teaching, sharing, communicating, and learning is the best use", "Teaching, sharing, communicating, and learning are the best uses", "subject-verb agreement"],
    ["Whether it's through volunteering with a local program, taking part in sustainability initiatives, or donating to a cause that speaks to you - by giving of yourself, you open yourself up to new possibilities and become part of a collective spirit.", "Whether it's through volunteering with a local program, taking part in sustainability initiatives, or donating to a cause that speaks to you, giving of yourself opens you to new possibilities and makes you part of a collective spirit.", "broken whether clause"],
    ["Your intention for this New Moon is “to allow", "Your intention for this New Moon is: “To allow", "intention punctuation and capitalization"],
  ],
  "new-moon/leo/scorpio": [
    ["whatever you put your energy into, aligns", "whatever you put your energy into aligns", "subject-verb punctuation"],
    ["You may haven't defined", "You may not have defined", "broken verb phrase"],
    ["misleading you of your fulfillment", "misleading you about what will fulfill you", "broken idiom"],
    ["in your current work, or forging a path", "in your current work or forging a path", "unnecessary comma"],
  ],
  "new-moon/libra/scorpio": [
    ["Cancer, Luna is your ruler. ", "", "incorrect sign and ruler reference"],
    ["You may receive downloads of information from past lifetimes or ancestral lineage, the trauma that needs to be healed and cleared.", "You may receive downloads of information from past lifetimes or your ancestral lineage about trauma that needs to be healed and cleared.", "broken sentence"],
    ["Use your creative outlet and faith in something higher than yourself to be the path towards healing.", "Let your creative outlet and faith in something higher than yourself become a path toward healing.", "broken construction"],
    ["connect with your divine wisdom, and also to use that wisdom", "connect with your divine wisdom and use that wisdom", "broken parallel structure"],
    ["Try not to make any solid decisions because not all is what it seems with Pisces.", "Try not to make any solid decisions because not everything is as it seems with Pisces.", "broken idiom"],
    ["connect with your divine wisdom and use that wisdom", "connect with your divine wisdom, using that wisdom", "repeated construction"],
    ["Your New Moon intention is, “To allow", "Your New Moon intention is: “To allow", "intention punctuation"],
  ],
  "new-moon/capricorn/scorpio": [
    ["your 3rd house of early education, how to process information, and communicate with your community", "your 3rd house of early education, how you process information, and how you communicate with your community", "broken parallel structure"],
    ["Consider ways to share your passions and interests with others through creative and writing projects.", "Consider ways to share your passions and interests with others through creative projects and writing.", "broken list construction"],
    ["Your intention for this new moon is to improve your communication skills and to trust in the power of authentic expression to deepen your connections with others. ", "", "duplicated intention statement"],
  ],
  "full-moon/taurus/scorpio": [
    ["And to create space for a heart-centered home. While your ego", "This is also a time to enjoy fulfilling relationships with close friends and family and create space for a heart-centered home. While your ego", "orphan left by tarot-strip extraction"],
    ["this full moon encourages you to be open to others. Allowing others to help you with your challenges.", "this full moon encourages you to be open to others and allow them to help you with your challenges.", "sentence fragment"],
    ["With the Scorpio sun and Taurus full moon evoke", "The Scorpio Sun and Taurus Full Moon evoke", "broken sentence"],
    ["break free from limiting beliefs to embrace", "break free from limiting beliefs and embrace", "incorrect infinitive"],
    ["creating a non-for-profit", "creating a nonprofit", "incorrect term"],
    ["the people you cultivated relationships with", "the people you have cultivated relationships with", "missing auxiliary verb"],
    ["Perhaps not by words, but by their actions, especially if these actions require you to fall back into old habits and patterns, you’re putting effort into breaking.", "Perhaps not through their words but through their actions, especially if those actions require you to fall back into old habits and patterns you’re working to break.", "broken sentence"],
    ["Everyone doesn’t need to change at the same pace as you do", "Not everyone needs to change at the same pace as you do", "incorrect negation"],
    ["is committed in their ways", "is committed to their ways", "incorrect preposition"],
    ["The relationship will likely grow apart; you will move further", "You will likely grow apart and move further", "incorrect subject"],
    ["If not, can you both navigate", "Can you both navigate", "unclear referent"],
    ["emotions that were hidden that you are hiding from others or even from yourself", "emotions you have hidden from others or even from yourself", "duplicated wording"],
    ["Perhaps not through their words but through their actions, especially if those actions require you to fall back into old habits and patterns you’re working to break.", "Their lack of support may show up through their actions, especially if those actions require you to fall back into old habits and patterns you’re working to break.", "sentence fragment and broken construction"],
    ["is committed to their ways", "is set in their ways", "incorrect idiom"],
  ],
  "full-moon/cancer/scorpio": [
    ["You might be taking your creative works, expanding past your local community, and reaching an international one now.", "You might be taking your creative work beyond your local community and reaching an international one now.", "broken construction"],
    ["The Cancer full moon in the 9th house chart guides you", "The Cancer full moon in the 9th house guides you", "extraneous word"],
    ["formal schooling or learning from other mentors, teachers, or from a significant relationship", "formal schooling or learning from mentors, teachers, or a significant relationship", "broken parallel structure"],
    ["When the full moon is in the 8th house", "When the full moon is in the 9th house", "incorrect house reference"],
    ["asking questions like, \"what is life? What did", "asking questions like, \"What is life? What did", "sentence capitalization"],
  ],
  "full-moon/leo/scorpio": [
    ["question what direction you head in", "question which direction you are heading", "broken idiom"],
    ["Your intention for this Leo full moon is, “My integrity", "Your intention for this Leo full moon is: “My integrity", "incorrect punctuation"],
    ["question which direction you are heading and if your current situation", "question which direction you are heading and whether your current situation", "parallel structure"],
  ],
  "full-moon/libra/scorpio": [
    ["after you've gotten lost in the busyness of life, or numbing yourself by keeping busy", "after you've gotten lost in the busyness of life or numbed yourself by keeping busy", "broken parallel structure"],
  ],
  "full-moon/capricorn/scorpio": [
    ["how to express yourselves", "how you express yourself", "pronoun and construction"],
    ["This full moon shifts your focus to the power of your words and honors your words and verbal commitments.", "This full moon shifts your focus to the power of your words and asks you to honor your verbal commitments.", "incorrect subject and repetition"],
    ["If you gave your comment and no longer can or desire to fulfill the verbal promise", "If you gave your commitment and can no longer or do not want to fulfill that verbal promise", "typo and broken verb phrase"],
    ["your 3rd house of communication, early education, your understanding of how you express yourself, and your unique language to communicate with your community, siblings, and neighbors", "your 3rd house of communication and early education, including how you express yourself and communicate in your own way with your community, siblings, and neighbors", "broken parallel structure"],
    ["If you gave your commitment and can no longer or do not want to fulfill that verbal promise, Capricorn’s ruling planet, Saturn, pushes you to have mature conversations to break the agreement.", "If you made a commitment you can no longer fulfill or no longer want to honor, Capricorn’s ruling planet, Saturn, pushes you to have a mature conversation and end the agreement.", "cold-read sentence repair"],
  ],
  "full-moon/aquarius/virgo": [
    ["a new self-care regimen that supports creating daily routines", "a new self-care regimen that supports daily routines", "duplicated construction"],
    ["drink ​​chamomile tea", "drink chamomile tea", "invisible character artifact"],
    ["giving away too much of yourself and energy", "giving away too much of yourself and your energy", "missing determiner"],
    ["overextending yourself for a desire to belong", "overextending yourself out of a desire to belong", "incorrect preposition"],
    ["This full moon brings us an important reminder", "This full moon brings you an important reminder", "register mismatch"],
    ["Evolutionary, the development of group relationships leads to increased survival.", "From an evolutionary perspective, group relationships increased the chance of survival.", "broken adverbial construction"],
    ["This full moon, take a moment", "During this full moon, take a moment", "broken introductory phrase"],
    ["Your full moon intention, \"Slow down", "Your full moon intention is: \"Slow down", "broken intention introduction"],
    ["The Aquarius full moon illuminates your 6th House of Health and Being of Service.", "The Aquarius full moon illuminates your 6th house of health and being of service.", "inconsistent capitalization"],
  ],
};

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const previousManifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : null;
const previousByKey = new Map((previousManifest?.entries ?? []).map((entry) => [entry.contentKey, entry]));
const entryByTuple = new Map(source.entries.map((entry) => [
  `${entry.lunationKind}/${entry.lunationSign}/${entry.risingSign}`,
  entry,
]));
const manifestEntries = [];

for (const [tuple, edits] of Object.entries(corrections)) {
  const entry = entryByTuple.get(tuple);
  if (!entry) throw new Error(`Missing recovered lunation entry: ${tuple}`);
  if (!entry.recoveredFrom) throw new Error(`Correction target is not a recovered entry: ${tuple}`);
  const previous = previousByKey.get(entry.contentKey);
  const previousHashMatches = Boolean(previous && sha256(entry.body) === previous.correctedBodySha256);
  const originalBodySha256 = previous?.originalBodySha256 ?? sha256(entry.body);
  for (const [from, to, reason, expectedCount = 1] of edits) {
    const fromCount = entry.body.split(from).length - 1;
    const toCount = to ? entry.body.split(to).length - 1 : 0;
    const previouslyApplied = previousHashMatches && previous?.corrections?.some((correction) => (
      correction.from === from
      && correction.to === to
      && correction.reason === reason
    ));
    if (fromCount === expectedCount) {
      entry.body = entry.body.split(from).join(to);
    } else if (!(fromCount === 0 && ((to && toCount >= expectedCount) || previouslyApplied))) {
      throw new Error(`${tuple}: expected ${expectedCount} occurrence(s) of correction source, found ${fromCount}: ${from}`);
    }
  }
  entry.chars = entry.body.length;
  entry.recoveredFrom = {
    ...entry.recoveredFrom,
    note: "Recovered from the owner-authored import manuscript after the original dedicated cell extraction omitted this entry; owner-directed mechanical corrections applied on 2026-08-24.",
    correctionRecord: manifestRelativePath,
  };
  manifestEntries.push({
    contentKey: entry.contentKey,
    tuple,
    originalBodySha256,
    correctedBodySha256: sha256(entry.body),
    correctionCount: edits.reduce((sum, edit) => sum + (edit[3] ?? 1), 0),
    corrections: edits.map(([from, to, reason, count = 1]) => ({ from, to, reason, count })),
  });
}

source.provenance.gapRecovery.policy = "exact owner-authored manuscript recovery followed by owner-directed mechanical corrections on 2026-08-24";
source.provenance.gapRecovery.correctionRecord = manifestRelativePath;
source.provenance.gapRecovery.correctedEntries = manifestEntries.length;
source.provenance.gapRecovery.approval = {
  approvalLevel: "exact_owner_approved",
  approvalStatement,
  ownerConfirmationSource,
  servingAuthorized: true,
};

const manifest = {
  schema: "recovered-lunation-copy-corrections/v1",
  status: "owner-approved serving correction record",
  date: "2026-08-24",
  source: sourceRelativePath,
  scope: "Factual cross-reference errors, clear typos, broken grammar, and tarot-strip extraction artifacts in the 22 recovered lunation cells. Substantive book meaning, spiritual language, intentions, and house interpretation remain unchanged.",
  count: manifestEntries.length,
  approval: {
    approvalLevel: "exact_owner_approved",
    approvalStatement,
    ownerConfirmationSource,
    ownerApproved: true,
    promotionAuthorized: true,
    servingAuthorized: true,
  },
  entries: manifestEntries,
};

fs.writeFileSync(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
console.log(`Corrected ${manifestEntries.length} recovered lunation cells (${manifestEntries.reduce((sum, entry) => sum + entry.correctionCount, 0)} exact edits).`);
