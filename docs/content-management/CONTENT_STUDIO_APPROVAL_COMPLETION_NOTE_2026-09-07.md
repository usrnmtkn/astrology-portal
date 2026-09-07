# Content Studio approval completion invariant

A saved Content Studio revision is non-serving until the owner/admin publishes it. Once the live target successfully receives the exact approved revision, the matching revision row must stop appearing as pending approval in the same database transaction.

This invariant exists because the admin API publishes the live target and then performs a second idempotent cleanup PATCH on the revision row. Database-side completion prevents a network or concurrency failure between those two requests from leaving the app in a split state where readers have the new copy but Content Studio still says the revision needs approval.

The completion trigger fails closed: it retires only a DRAFT/reference row with `owner-review-required`, an explicit `targetRowId` matching the LIVE/serving row, and exact equality between the revision and the published target. Package revisions compare every path declared by the target package's `studio_editable_fields`; Sky article revisions compare the compiled `skyArticleEdition` object.

The trigger deliberately leaves `updated_at` unchanged so the API's normal second cleanup PATCH remains compatible with optimistic concurrency and can complete successfully even after the database has already made the state safe.
