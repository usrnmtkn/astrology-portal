# Ascendant batch 2 owner revisions

Status: **all six payloads are exact-owner-approved against the hashes below.** Original Sol drafts, provider responses, model inputs, and Terra verdicts remain untouched. No additional Sol or Terra calls were made. Exact-approval records are stored beside each owner-revision candidate. Serving through the draft PR still requires separate merge authorization.

Payload hashes use `sha256(JSON.stringify(payload))`. Each JSON block below is the exact payload covered by its hash.

## Neptune–Ascendant conjunction

Revision: `delete_final_sentence_both_variants`.

```json
{
  "body_you": "You see something special in {{holder2}}, and your hopes about them affect how freely they present themselves around you. If you show the most interest when they match the person you imagine, they may start adjusting how they act to keep that image intact and become less sure what feels natural.",
  "body_they": "{{holder1}} sees something special in you, and their hopes about you affect how freely you present yourself around them. If they show the most interest when you match the person they imagine, you may start adjusting how you act to keep that image intact and become less sure what feels natural.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `8ef56d0d1b532d87dd8041dffd1bd89b74a8f5d384770327bd81440335f49e38`

## Neptune–Ascendant hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You may admire a version of {{holder2}} that fits your hopes, and {{holder2}} may not be able to tell what you actually think of them. {{holder2}} may respond by becoming more careful around you and adjusting how they come across based on whether you seem pleased, which can leave them feeling unseen. They want to be seen not just for their dreams but for their willingness to feel everything so deeply.",
  "body_they": "{{holder1}} may admire a version of you that fits their hopes, and you may not be able to tell what they actually think of you. You may respond by becoming more careful around {{holder1}} and adjusting how you come across based on whether they seem pleased, which can leave you feeling unseen. You want to be seen not just for your dreams but for your willingness to feel everything so deeply.",
  "warmthSource": {
    "usedForm": {
      "body_you": "They want to be seen not just for their dreams but for their willingness to feel everything so deeply.",
      "body_they": "You want to be seen not just for your dreams but for your willingness to feel everything so deeply."
    },
    "sourceArticleId": "full-moon-eclipse-in-pisces-2025",
    "originalLine": "To be seen not just for our dreams but for our willingness to feel everything so deeply."
  },
  "labels": [
    "owner-corpus-derived"
  ]
}
```

Payload SHA-256: `b2c1c9702fc02a7244d0e2204f52692260359e00178bbc9ab95167c28d963ac6`

## Neptune–Ascendant soft

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You tend to interpret the way {{holder2}} comes across generously, even when you are not fully sure what they mean. {{holder2}} then monitors themselves less and acts more naturally around you. This ease can leave your assumptions about them untested.",
  "body_they": "{{holder1}} tends to interpret the way you come across generously, even when they are not fully sure what you mean. You then monitor yourself less and act more naturally around {{holder1}}. This ease can leave their assumptions about you untested.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `91f6efc2105acce579f55447477fd6912d445a9c6f566d1a7fa36644008d39fb`

## Pluto–Ascendant conjunction

Revision: `approve_as_drafted`.

```json
{
  "body_you": "You notice every shift in how {{holder2}} acts, and you may press them to reveal more or try to influence how they come across. Your close attention can feel intimate at first, but {{holder2}} may grow guarded when it starts to feel like constant scrutiny. They can end up feeling watched rather than known.",
  "body_they": "{{holder1}} notices every shift in how you act, and they may press you to reveal more or try to influence how you come across. Their close attention can feel intimate at first, but you may grow guarded when it starts to feel like constant scrutiny. You can end up feeling watched rather than known.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `bc47d7f3ab41bd529f608294f80764c4741c59ac063f5c9d5845e65d62348708`

## Pluto–Ascendant hard

Revision: `approve_as_drafted`.

```json
{
  "body_you": "Your intensity and need to know what {{holder2}} is really thinking can put pressure on how they act around you. Instead of reacting naturally, they may choose every word and expression carefully and keep more of themselves hidden. Their restraint can make you press them for a more honest response, which leaves them even more guarded.",
  "body_they": "{{holder1}}'s intensity and need to know what you are really thinking can put pressure on how you act around them. Instead of reacting naturally, you may choose every word and expression carefully and keep more of yourself hidden. Your restraint can make {{holder1}} press you for a more honest response, which leaves you even more guarded.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `893bb3b215f8859a08283211f81e280193097411fbb07a2ed6749a2464973cda`

## Pluto–Ascendant soft

Revision: `delete_final_two_sentences_both_variants`.

```json
{
  "body_you": "You pay close attention to how {{holder2}} presents themselves and enters situations. Because your interest feels natural to them, they show you more of themselves, and their openness makes you want to understand them more deeply.",
  "body_they": "{{holder1}} pays close attention to how you present yourself and enter situations. Because their interest feels natural to you, you show them more of yourself, and your openness makes {{holder1}} want to understand you more deeply.",
  "warmthSource": null,
  "labels": []
}
```

Payload SHA-256: `43c9d014c1ba2fe06cf332ecb9c215c9721ea81ed8b18071cbc9226637efb944`

## Approval boundary

All six deterministic owner-revision checks pass and the approval records bind these exact payloads to the owner-approved hashes. The candidate branch carries the authorized serving-row replacements, but nothing reaches `main` until the draft PR receives separate merge authorization.
