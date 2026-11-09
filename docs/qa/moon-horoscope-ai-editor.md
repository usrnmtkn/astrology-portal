# Dated Moon horoscope AI editor

The Moon editor generates the empty signs in a saved private writing draft. It
uses the existing governed template-slot writer and configured provider, with
one body field per missing sign. Existing readings and all headings stay exact.
The editable sign heading appears above the reading. Save draft supports partial
manual sets; publishing still requires all twelve valid saved readings and the
owner's explicit approval.

Facts come from a server-recalculated New/Full Moon event and the established
whole-sign house mapping. The request uses phase/sign and house doctrine as
meaning references, plus the complete saved lunar and Sun-season writing with
source versions and hashes. Current corrections and eligible complete voice
examples still enter the shared writer. Generic article memory is excluded so
it cannot impose an ingress structure. Daily, Weekly, Monthly, Seasonal and
Personal Transit prompts, models and saved profiles are unchanged.

The authenticated `sky-article-template-slots` handler accepts `moonHoroscopes`
with a saved reference row ID, exact version and `generate`, `status` or `release`
action. It accepts no client-supplied facts or replacement readings. A conditional
write claims the request before dispatch. Completion conditionally saves all
returned fields to that private recovery row, never to a serving row. Concurrent
edits or an explicit release prevent a late response from replacing writing.
Transport/storage failures retain the claim. Check generation loads the saved
outcome without dispatch; release requires acknowledgment that an uncertain
request may still be charged. No automatic paid retry occurs.

Verification uses synthetic storage and intercepted provider responses:

- `scripts/test-moon-horoscope-writing.mts`: actual authenticated handler, both
  provider formats, New/Full events, doctrine-role scope, saved-reference
  delivery, invalid/stale inputs, missing references before billing, missing-only
  output, exact owner text, durable claim and explicit uncertain-outcome release.
- `tests/visual/moon-horoscope-ai.spec.ts`: generate twelve, edit headings/body,
  switch signs, private draft and reload, explicit publish and reader admission,
  plus recovery from a lost completion response without another provider call.
- `tests/visual/dated-moon-horoscopes.spec.ts`: existing manual/import, revision,
  conflict, archive/restore and exact-copy flows, with heading-before-body checks.

Both browser files run in `playwright.lunation-studio.config.ts`. Local fixture
success does not establish paid generation quality or owner-authenticated live
acceptance. Record final-head gates and deployment evidence on the release PR.
