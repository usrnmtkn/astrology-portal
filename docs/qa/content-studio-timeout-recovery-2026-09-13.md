# Content Studio timeout recovery — 2026-09-13

A production editor could return HTTP 408 after a save request even when the database completed the write close to the response deadline. Retrying the PATCH blindly would be unsafe because the first write may already exist.

The editor now handles ambiguous timeout/interruption errors by issuing a read-only verification for the same content key. If the saved draft contains the submitted fields, the save resolves successfully. If verification cannot confirm the write, the original error remains and no second write is issued.

When the separate live-serving status request is unavailable, Content Studio now shows the row's known saved editorial state (Draft, Ready, Live, Archived, Error, or Retired) instead of replacing known state with Unavailable. The badge tooltip makes clear that reader-serving status could not be verified.

A deploy-time regression contract protects both behaviors.
