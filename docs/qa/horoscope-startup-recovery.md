# Horoscope startup recovery

Scope: daily, weekly and seasonal single-stage requests. Monthly retains its
separate synthesis/prose lifecycle. Source: owner-requested recovery repair in
[the horoscope task](thread:01a0ce6e-69e0-7100-bdba-ad413d5c7804), October 3, 2026.

The observed interruption had a saved `starting` operation with neither a request
hash nor a response ID. That locates the interruption before the completed
request checkpoint, but the original exception was not retained. It does not
establish a provider rejection, depleted credit balance or token exhaustion.

## Acceptance

| Behavior | Verification |
| --- | --- |
| Complete request preparation precedes a single conditional reservation | Actual-handler regression inspects all reservation writes and rejects an incomplete identity. |
| Failed reservation never calls the provider | Inject storage failure; compare exact saved row and call count. |
| Lost provider confirmation does not block other signs or silently retry the uncertain sign | Store the complete operation in `heldRequests`; actual handler refuses duplicate generation and completes another sign. Browser runs a batch through interruption and the remaining sign. |
| Explicit release is required before a new paid attempt for a held sign | API acknowledgment and browser cancel/accept paths; release itself makes zero provider calls. Existing plan approval still applies. |
| Old pre-dispatch reservations cannot wait forever | After 310 seconds, progress checking archives `not_dispatched` and clears only the expired operation. An old row version cannot dispatch. |
| A crashed dispatch remains protected | Expired operation with request hash but no response ID moves to held requests; no automatic replay. |
| Response-ID save failure can recover the same result | Retry the conditional storage save once with the known ID, then retrieve it without another generation. |
| Reload retains complete drafts and unresolved request identities | Actual-handler and mobile/dark plus desktop/light browser checks. |
| New interruptions retain sanitized diagnostics | Persist stage, status, error category and timestamp; never provider error text, credentials or prompts. Preparation/reservation failures are logged with the same safe fields. |

The 310-second deadline exceeds the API's 300-second maximum lifetime. Recovery
writes use optimistic concurrency. A late invocation cannot overwrite the new
row or dispatch against an expired row version. Known dispatch exceptions can
be held immediately because that invocation is ending. Unknown provider outcomes
remain unknown; this change does not claim to recover unidentifiable responses
or refund possible charges.

Fixture commands:

```
node --import tsx scripts/test-horoscope-generation.mts
npm run test:content-studio-api
npx playwright test -c playwright.horoscope-reader.config.ts tests/visual/horoscope-recovery.spec.ts
npm run qa:css-audit
```

Run from an isolated checkout with its own dependencies. Browser builds must be
fresh and all API/provider/storage writes routed to fixtures. Record exact-head
CI, production deployment and read-only live-state checks in the release PR.
Passing fixtures proves recovery behavior, not provider uptime or authorship.
No paid generation or owner-content mutation is required for this verification.
