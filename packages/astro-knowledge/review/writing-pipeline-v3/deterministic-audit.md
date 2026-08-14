# Writing pipeline v3 deterministic audit

This audit runs the new checks against owner-approved evidence before any new advisory is
allowed to gate writing. Findings on approved text are potential false positives, not edit
instructions.

- Approved examples: 11386
- Owner-corpus source files used for vocabulary: 48
- Owner-corpus vocabulary tokens: 7328
- Entries with at least one new finding: 8594
- Potential false-positive entry rate: 75.48%
- Twelve-entry batch groups with repetition/concentration findings: 518
- Total twelve-entry batch groups tested: 966
- Approved entries containing at least one negation pivot: 181
- Total negation pivots counted in approved entries: 186

## Findings by category

- anchor_construction_repetition: 14
- negation_pivot_cap: 5
- negation_pivot_page_cap: 5
- negation_pivot_set_cap: 5
- opening_syntax_repetition: 391
- scene_noun_frequency: 286
- spine_scaffold_grammar: 9
- spine_scaffold_repetition: 4
- synonym_redundancy: 6
- vocabulary_outside_corpus: 8592

### Potential false-positive rates by approved entry

- register_consistency: 0/11386 (0.00%)
- placeholder_integrity: 0/11386 (0.00%)
- owner_line_integrity: 0/11386 (0.00%)
- negation_pivot_cap: 5/11386 (0.04%)
- synonym_redundancy: 6/11386 (0.05%)
- vocabulary_outside_corpus: 8592/11386 (75.46%)
- spine_scaffold_grammar: 9/11386 (0.08%)

### Potential false-positive rates by approved twelve-entry group

- scene_noun_frequency: 225/966 (23.29%)
- opening_syntax_repetition: 350/966 (36.23%)
- anchor_construction_repetition: 14/966 (1.45%)
- negation_pivot_page_cap: 4/966 (0.41%)
- negation_pivot_set_cap: 5/966 (0.52%)
- spine_scaffold_repetition: 4/966 (0.41%)

## Enforcement

Register, placeholder integrity, protected-line integrity, and the owner-ruled negation-pivot
caps remain blocking mechanical contracts for new copy. Spine scaffold findings require owner
review because a machine cannot decide whether a particular line earned its place; repeated
scaffolds across a set are reported as machinery. Synonym redundancy, scene-noun concentration,
opening/anchor repetition, and vocabulary outside the corpus remain advisory. Vocabulary outside
the corpus is always advisory; an uncommon word may be exactly right.

See `deterministic-audit.json` for samples and batch details.
