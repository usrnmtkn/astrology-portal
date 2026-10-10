# Content Studio QA repairs

## Acceptance criteria

- Coverage counts required perspective identities from their approval records.
  Intentional omissions do not create work; blank or deleted required rows still
  do, and duplicate rows cannot conceal missing identities. Missing authority
  assets fail closed and a subsequent request can recover.
- Article-to-memory browser coverage uses the current inventory and publication
  status contracts. It verifies autosave, complete before/after text, the review
  gate, saved LIVE state, explicit activation, scope changes with a reason, and
  exclusion in both themes and viewport sizes.
- Studio imports shared primitives and Calendar helpers from `src/shared`.
  Compatibility exports keep existing reader and server imports working, with
  explicit Node ESM extensions. The audit checks multiline imports, re-exports
  and dynamic imports and rejects dependencies on application pages or API
  handlers. Existing root writing contracts are recognized as shared code;
  comments are not imports.
- Reader and editor resolve one Markdown parser. Formatting semantics, paragraph
  spacing, nested and ordered lists, emphasis, variables, literal markup and
  save/publication remain covered. Bundle limits do not increase.

## Architecture scope

The shared extraction moves 33 implementations without changing their behavior
or source wording. Reader content, services, design-system styles and the lunar
journal index remain explicit temporary dependencies. The production web entry
still hosts the lazy Studio routes. A passing audit means the declared boundary
is respected; it does not mean those remaining bridges have been removed.

## Bundle measurement

Matched standalone Studio builds using the visual-smoke public configuration
measure 790,221 aggregate gzip bytes before parser consolidation and 778,178
afterward. The unchanged 790,250-byte limit leaves 12,072 bytes of headroom.
The initial entry remains approximately 229.3 kB gzip. Aggregate savings include
deferred code and do not establish a faster initial page load.

The reader already used Marked 18.0.13; Tiptap Markdown 3.31.3 independently
required Marked 17. The scoped override and exact reader pin share 18.0.13.
Marked 18 changes trailing blank-line tokens, so the actual Tiptap parser and
serializer receive a dedicated compatibility regression in the API gate.
See [Marked 18 release notes](https://github.com/markedjs/marked/releases/tag/v18.0.0)
and [Tiptap's dependency declaration](https://github.com/ueberdosis/tiptap/blob/v3.31.3/packages/markdown/package.json).

## Verification

Run the unfiltered `npm run test:content-studio-api`, `npm run qa:admin-boundary`,
both application builds/typechecks, both bundle and built-asset privacy checks,
and `npm run qa:css-audit`. Run the repaired browser flows and the affected
Calendar, formatting, authentication and recovery journeys from fresh previews.
The release record must identify the tested revision and distinguish fixtures
from authenticated read-only production checks. Owner content is not modified
and no paid generation is needed for these tests.

Do not build the knowledge package while another suite reads its generated
exports. Use separate installed worktrees for concurrent builds and API/browser
tests. A missing generated artifact during rebuilding is an invalid QA run,
not an application result.
