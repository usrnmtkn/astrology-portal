# Sky Calendar sign-aware semantic layer v2

This review package corrects the semantic architecture in the owner-supplied
`sky-calendar-all-live-aspects-SIGN-AWARE-AUTHORING.xlsx` workbook without
changing reader copy or serving behavior.

The corrected workbook uses the existing owner-approved 174-component registry
as its only semantic authority:

- 144 planet-sign units
- 5 aspect mechanisms
- 9 modality units
- 16 element units

The older workbook tabs `Pair Meaning`, `Aspect Behavior`, `Planet Sign Layer`,
and `Sign-Aware Composer` are marked superseded. They used a second semantic
schema, omitted Chiron and the modality/element layers, and quoted assembled
component sentences into authoring briefs.

The governed composer is now version `sky-calendar-two-part-composer-v2.3.0`.
Its register gate permits `you` or `your` only in the Forecast's concrete
`whatCanMove` guidance beat. It continues to reject second person in Details
and standing-pattern language on the collective Calendar surface.

Serving authorization remains false. The changed composer must complete a new
owner-reviewed pilot before any composed output may serve.

Run:

```text
node scripts/test-sky-calendar-sign-aware-semantic-layer.mjs
```

The test pins the workbook bytes, approved component-set hash, composer version
and source hash, inactive serving state, counts, and register policy.
