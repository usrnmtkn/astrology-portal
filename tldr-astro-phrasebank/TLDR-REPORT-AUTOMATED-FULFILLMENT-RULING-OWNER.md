# Automated report fulfillment ruling

**Status:** `owner_approved`
**Version:** `owner-approved-v1`
**Approved:** 2026-08-09
**Scope:** Purchased personalized reports only. Shared app content remains under the exact-wording owner approval regime.

> Purchased personalized reports are fulfilled automatically. I approve the generation system — the version-pinned canonical prompts, validators, fact-lock, judge rubric, and audit protocol — rather than each output. A report that passes all gates is delivered without my review. My exact-wording approval regime continues to govern all shared app content, the calibration corpus, and every change to the prompts, validators, rubric, and audit protocol themselves.

Deployment records this approval with `REPORT_AUTOMATION_OWNER_RULING_VERSION=owner-approved-v1`. This credential alone does not enable delivery; `REPORT_AUTO_PUBLISH=true` is also required.
