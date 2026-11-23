# Preserve approved designs

Use this instruction for functional fixes, content changes and refactors that
must retain the existing product design. It is also linked from `AGENTS.md`.

## Copyable instruction

```text
Preserve the approved design while completing this task.

Before editing, identify the canonical page pattern, shared components and
tokens, then list every route and content-source variant that uses them.
Make the functional change within that pattern. Keep the established section
order, labels, grouping, typography, spacing, surfaces and responsive behavior.
Content source and review state must not select a different visual design.

A design change needs my explicit direction for that change. Reuse any design
approval already given for this task. Keep unrelated designs intact. Preserve
design tests and reference expectations; change them only for the approved
design change, with its source recorded. A passing test cannot grant approval.

Before reporting completion, run the CSS/token audit and affected rendered
journeys from a fresh build. Inspect desktop/mobile and light/dark, including
exact and fallback sources and applicable loading, empty and error states.
Verify the intended labels, order, hierarchy, typography, spacing, overflow and
card geometry. Compare to the approved reference, not only to other new pages.
For natal planetary placements, also run npm run qa:natal-design.

Report the checked routes, evidence and remaining gaps. Call the change live
only after the main deployment and affected production acceptance pass.
```

## Natal placement check

```sh
npm run qa:natal-design
```

The command runs the existing CSS/token/design-system audit and eight fresh-built
browser cases: four existing article-typography contracts and four all-planet
design cases. The latter visit all ten natal planets, at 390px or 1440px in
light or dark. It checks Gifts / Challenges, consistent house headings,
semantic hierarchy, card placement and width, and fixed typography, padding,
radius and surface expectations from the existing article design. It reloads
Sun and Uranus and retains screenshots. An empty aspect category remains omitted.
The existing typography contracts retain their font, card, narrative, eyebrow,
navigation, reload and overflow assertions, with the approved natal house H2 and
Gifts/Challenges H2 followed by H3 member titles. Other surfaces keep their own
heading hierarchy. Include existing selector and typography consumers when
changing markup; new regression cases alone do not cover those contracts.

This catches both one-planet drift and uniform changes to the checked design
roles. It has no reference-update option. For an intentional design revision,
record the owner's exact scope, inspect the new reference, and update only its
affected expectations through normal review.

The command is scoped to natal placement pages and shared CSS rules. Other
surfaces still need their affected browser journeys under `docs/qa/affected-ci.md`;
this command is not evidence that every page in the site has been reviewed.
Keep the repository's required CI and production acceptance gates.
