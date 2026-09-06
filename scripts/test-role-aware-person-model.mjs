#!/usr/bin/env node

import assert from "node:assert/strict";
import {
  AmbiguousPersonReferenceError,
  ROLE_AWARE_PERSON_FIXTURES,
  createRoleAwareFragmentRenderer,
  inflectPresentVerb,
  renderRoleTaggedFragment
} from "../apps/web/src/services/roleAwarePerson.ts";

const viewer = { name: "you", isReader: true };
const nikkiThey = { name: "Nikki", pronouns: "they" };
const nikkiShe = { name: "Nikki", pronouns: "she" };
const alexHe = { name: "Alex", pronouns: "he" };
const agreementFixture = ROLE_AWARE_PERSON_FIXTURES[0].fragment;

assert.equal(
  renderRoleTaggedFragment(agreementFixture, { surface: "self", chartSubject: viewer, viewer }),
  "You tend to need time alone. You have time to think."
);
assert.equal(
  renderRoleTaggedFragment(agreementFixture, { surface: "friend", chartSubject: nikkiThey, viewer }),
  "Nikki tends to need time alone. They have time to think."
);
assert.equal(
  renderRoleTaggedFragment(agreementFixture, { surface: "friend", chartSubject: nikkiShe, viewer }),
  "Nikki tends to need time alone. She has time to think."
);

const passageRenderer = createRoleAwareFragmentRenderer({
  surface: "friend",
  chartSubject: nikkiThey,
  viewer,
  otherPerson: alexHe
});
assert.equal(
  passageRenderer.render(ROLE_AWARE_PERSON_FIXTURES[1].fragment),
  "You may notice when Nikki's answer changes."
);
assert.equal(
  passageRenderer.render(ROLE_AWARE_PERSON_FIXTURES[2].fragment),
  "They ask first, and Alex answers."
);

assert.equal(inflectPresentVerb("tend", "singular"), "tends");
assert.equal(inflectPresentVerb("tend", "plural"), "tend");
assert.equal(inflectPresentVerb("carry", "singular"), "carries");
assert.equal(inflectPresentVerb("watch", "singular"), "watches");
assert.equal(inflectPresentVerb("have", "singular"), "has");
assert.equal(inflectPresentVerb("be", "plural"), "are");

for (const [id, template] of [
  ["ambiguous-pronoun", "You need time alone."],
  ["ambiguous-contraction-you", "You're allowed to leave."],
  ["ambiguous-contraction-they", "They're allowed to leave."],
  ["ambiguous-first-person", "I need time alone."]
]) {
  assert.throws(
    () => renderRoleTaggedFragment({
      id: `fixture/${id}`,
      scope: "shared_fragment",
      roles: [],
      template
    }, { surface: "friend", chartSubject: nikkiThey, viewer }),
    AmbiguousPersonReferenceError
  );
}
assert.throws(
  () => renderRoleTaggedFragment({
    id: "fixture/missing-other-person",
    scope: "shared_fragment",
    roles: ["otherPerson"],
    template: "{{otherPerson.subjectCapitalized}} {{otherPerson.verb:answer}}."
  }, { surface: "friend", chartSubject: nikkiThey, viewer }),
  AmbiguousPersonReferenceError
);
assert.throws(
  () => renderRoleTaggedFragment({
    id: "fixture/verb-before-reference",
    scope: "shared_fragment",
    roles: ["chartSubject"],
    template: "{{chartSubject.verb:tend}} is not a valid opening for {{chartSubject.object}}."
  }, { surface: "friend", chartSubject: nikkiThey, viewer }),
  AmbiguousPersonReferenceError
);

for (const fixture of ROLE_AWARE_PERSON_FIXTURES) {
  for (const chartSubject of [nikkiThey, nikkiShe]) {
    const rendered = renderRoleTaggedFragment(fixture.fragment, {
      surface: "friend",
      chartSubject,
      viewer,
      otherPerson: alexHe
    });
    assert.ok(rendered.trim(), `${fixture.id}: failed friend rendering for ${chartSubject.pronouns}.`);
  }
  const selfRendered = renderRoleTaggedFragment(fixture.fragment, {
    surface: "self",
    chartSubject: viewer,
    viewer,
    otherPerson: alexHe
  });
  assert.ok(selfRendered.trim(), `${fixture.id}: failed self rendering.`);
}

console.log("Role-aware person model passed: role identity, name-first policy, pronoun preference, singular/plural verb agreement, viewer preservation, other-person handling, contraction detection, and ambiguity fail-closed behavior.");
