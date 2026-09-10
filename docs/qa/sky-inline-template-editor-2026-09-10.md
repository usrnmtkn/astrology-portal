# Daily Sky inline template editing

The white connecting words are editable text regions in the composed sentence. Planet and sign values are protected sibling nodes; complete summary passages remain links to their source editors. Empty literal regions allow adding words between variables. Editing does not publish: Review and save wording passes the exact edited template into the existing draft/publish workflow.

Opening templates now expose name, sign, degree, and summary separately. Legacy placement-link slots expand without changing their surrounding wording. The reader combines each name/sign/degree run into its original single placement article link. Validation prevents replacing facts with fixed text or separating the linked placement fields. The original facts-only fallback and all 24 complete owner-authored summaries remain unchanged.

Paragraph/event layout controls remain available in a disclosure. Each sentence template can be edited inline, with protected variable fields. The full assembled reader preview remains available alongside the existing Sun and Moon source map.

Validation:
- All 144 sign pairs and focused summary, composition, migration, and event assembly checks passed.
- 14 fresh-build Studio browser flows passed, including desktop/mobile, light/dark, source publishing, draft/retirement handling, and inline editing through save, reload, and reader rendering.
- After simplifying reader link assembly, both affected end-to-end flows passed again on fresh builds.
- Admin and web builds/typechecks passed. CSS/token audits and diff whitespace checks passed.
- Existing heading typography comparisons remain passing in four viewport/theme combinations.
- CI-environment bundle: reader startup 467,675 gzip bytes; aggregate JavaScript 2,964,215. Allocated 1 kB to each corresponding cap for split fact fields and their compatibility/validation. Other budgets are unchanged; the Admin total remains below 322 kB.

No production content was written, no approved prose was changed, and this change is not deployed. Browser API persistence tests use isolated fixtures.
