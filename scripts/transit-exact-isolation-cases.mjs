import assert from "node:assert/strict";
import { isEligibleTransitReturn } from "../apps/web/src/content/fallbackArchitectureV3/resolver/transitReturns.mjs";

export function verifyTransitExactIsolation(factory) {
  const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];
  const points = [...planets, "ascendant", "midheaven", "descendant", "imum-coeli"];
  const aspects = ["conjunction", "opposition", "square", "trine", "sextile"];
  const row = (contentKey, marker, review_status = "approved") => ({
    contentKey, content_role: "full_copy", review_status,
    body_you: `${marker} You: {{aspectWord}} until {{untilDate}}.`,
    body_they: `${marker} {{Name}}: {{aspectWord}} until {{untilDate}}.`
  });
  const renderer = (cards, blockedContentKeys = []) => factory({ authoredCards: cards }, { templates: [] }, { hookRows: [], vocabularyRows: [] }, { blockedContentKeys });
  let cases = 0;
  for (const transiting of planets) for (const natal of points) {
    const base = `authored/transit-aspect/${transiting}/${natal}`;
    const exactRows = aspects.map(aspect => row(`${base}/${aspect}`, `Exact ${aspect}.`));
    const sharedRows = ["soft", "hard", "any", "conjunction"].flatMap(group => [
      row(`${base}/${group}/pass-2`, `Shared ${group} pass.`),
      row(`${base}/${group}/variant-3`, `Shared ${group} variant.`)
    ]).filter(candidate => !candidate.contentKey.includes("/conjunction/"));
    const cards = [...sharedRows, ...exactRows];
    const before = structuredClone(cards);
    const initial = renderer(cards);
    for (const aspect of aspects) {
      if (natal === "lilith" && !["conjunction", "opposition"].includes(aspect) || isEligibleTransitReturn(transiting, natal, aspect)) continue;
      const exactKey = `${base}/${aspect}`;
      const changed = renderer(cards.map(candidate => candidate.contentKey === exactKey ? row(exactKey, `Changed ${aspect}.`) : candidate));
      for (const voice of ["you", "Audit Friend"]) for (const context of [{}, { variant: 3 }, { pass: 2 }, { variant: 3, pass: 2 }]) {
        const facts = { transiting, natal, aspect, voice, sign: "capricorn", window: "until October 4", ...context };
        const original = initial.renderTransitAspect(facts);
        const updated = changed.renderTransitAspect(facts);
        assert.equal(original.contentKey, exactKey, JSON.stringify(facts));
        assert.equal(updated.contentKey, exactKey);
        assert.match(updated.body, new RegExp(`Changed ${aspect}\\.`));
        assert.ok(updated.body.includes(voice === "you" ? "You:" : "Audit Friend:"));
        assert.ok(!updated.body.includes("{{"));
        for (const otherAspect of aspects.filter(value => value !== aspect)) {
          if (natal === "lilith" && !["conjunction", "opposition"].includes(otherAspect) || isEligibleTransitReturn(transiting, natal, otherAspect)) continue;
          const otherFacts = { ...facts, aspect: otherAspect };
          assert.deepEqual(changed.renderTransitAspect(otherFacts), initial.renderTransitAspect(otherFacts), "Editing one exact aspect must not change another");
        }
        cases++;
      }
      const variantKey = `${exactKey}/variant-3`;
      assert.equal(renderer([...cards, row(variantKey, "Exact variant.")]).renderTransitAspect({ transiting, natal, aspect, variant: 3, pass: 2 }).contentKey, variantKey);
      assert.throws(() => renderer(cards, [exactKey]).renderTransitAspect({ transiting, natal, aspect, variant: 3, pass: 2 }), /SOURCE_GAP/);
    }
    assert.deepEqual(cards, before, "Previewing and editing test copies must not mutate source inputs");
  }
  const exact = "authored/transit-aspect/sun/sun/sextile";
  const shared = "authored/transit-aspect/sun/sun/soft/variant-3";
  assert.equal(renderer([row(exact, "Draft.", "needs_review"), row(shared, "Shared.")]).renderTransitAspect({ transiting: "sun", natal: "sun", aspect: "sextile", variant: 3 }).contentKey, shared);
  const situation = "authored/transit-aspect/sun/moon/square/aries/1/7";
  const contact = "authored/transit-aspect/sun/moon/square";
  assert.equal(renderer([row(situation, "Situation."), row(contact, "Contact.")]).renderTransitAspect({ transiting: "sun", natal: "moon", aspect: "square", sign: "aries", transitHouse: 1, natalHouse: 7 }).contentKey, situation);
  assert.equal(renderer([row(contact, "Contact.")]).renderTransitAspect({ transiting: "sun", natal: "moon", aspect: "square", sign: "aries", transitHouse: 1, natalHouse: 7 }).contentKey, contact);
  return cases;
}
