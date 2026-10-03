# Temporary reader content failures — 2026-10-03

Base: deployed main `fb89a940fd060eb12bc08b22fbfce635a7dcd897` (PR #1114).

Signed-in production QA of a direct Moon placement link reproduced intermittent public reader failures. Browser logs showed a failed published-transit request and an HTTP 503 from the shared reader endpoint. One fresh reload succeeded and the next failed. Read-only probes of the same published inventory returned all eight 200-key batches successfully, confirming the failure was intermittent.

The reader transport previously stopped after its first temporary failure. It now retries HTTP 502/503/504 and connection failures at most twice with bounded backoff. Every attempt shares the original page or caller deadline. Query validation, access errors and invalid content responses still fail immediately. Retries remain read-only and reread the publication state; they cannot republish, restore retired writing or return incomplete pages as success.

## Evidence

- Actual client plus actual reader handler with isolated storage: temporary 503 recovery, exact complete text, private-field exclusion, persistent-outage limit, connection recovery, non-retryable errors, cancellation, retirement during retry, and pagination without duplicated rows.
- Fresh production-entry browser build: nine passing desktop/mobile and light/dark cases for Sky/You/Friends personal content, automatic recovery, fresh reload, manual recovery after persistent failure, complete Moon passages, and retirement of an open article.
- Full `test:content-studio-api` and exact-head hosted API/visual gates are required before release. Final results and production verification are recorded in the PR.

Matched browser-fixture aggregate builds measure 3,521,711 bytes on the base and 3,521,763 after recovery (+52); standalone admin stays at 785,002 bytes. Reader boot measures 513,940 gzip bytes, 90 above the former limit. Allocate 250 reader-boot bytes, leaving 160 bytes; all other limits remain unchanged. No dependency, content record or authored passage changes.
