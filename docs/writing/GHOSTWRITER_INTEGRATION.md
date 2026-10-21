# Content Studio Ghostwriter guidance

The owner requested applying the installed Ghostwriter skill to Content Studio
AI writing on October 20, 2026 in
[this task](thread:01a15c03-cf10-71e3-b5e9-798c9f87bd3b).

`src/astro-writing/ghostwritingSkill.cjs` contains a versioned adaptation of
Ghostwriter and its anti-ai-writing foundation from
[`cdeistopened/skill-stack`](https://github.com/cdeistopened/skill-stack/tree/6b2dfeb94b719bc458ec4a4487dea1d5ff76d841/.claude/skills/ghostwriter).
Its source revision and complete instruction-file hashes are recorded in the
module; the upstream MIT license is retained beside it. Runtime requests use
this packaged text without requiring a local Codex skill folder or MCPMarket
connection.

The guidance emphasizes complete source understanding, the author's actual
prose, astrological interpretation, connected reasoning and an editing pass
within the existing writing call. Current owner corrections, selected passages,
saved profiles, surface-specific register, length and output contracts remain
authoritative. Generic persuasion frameworks, desire categories, hooks and
quotable lines are optional. Necessary uncertainty, protected text and source
meaning are preserved.

New shared writer/reviser requests receive the guidance at the provider
boundary. Injected draft and revision requests include it when prepared, so it
is part of their existing instruction/request hashes. Horoscope and lunar plan
hashes include the guidance, requiring fresh plan review after it changes.
Daily Calendar preparation also binds it into the reserved request hash.
Stored OpenAI, Gemini
and Claude requests retain their exact previously reserved instructions;
deployment does not alter, replay or upgrade an in-flight request. The two
legacy Claude Content Studio paths receive it as their system guidance.
Planners and reviewers keep their existing roles and policies.

This adds no model stage, automatic rewrite, saved-profile mutation, reader-copy
edit or publication authority. Private author passages and the new approved
sky example are not copied into this repository by this integration. They
continue to require the existing governed/private evidence path.

`tests/astro-writing/ghostwriting-skill.test.mjs` checks actual provider payloads,
role isolation, stored-request preservation and revision boundaries. The Studio
article and horoscope handler regressions additionally inspect the dispatched
writing instructions. These fixture checks establish instruction delivery and
safety boundaries, not literary quality or owner approval of future prose.
