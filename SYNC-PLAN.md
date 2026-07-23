# Manual Chart Sync Plan

- [ ] Add syncStatus ("synced" | "pending" | "failed" | "conflict") + created_at / updated_at / last_synced_at to the manual chart type and local storage shape.
- [ ] Chart save path: write local first, then Supabase immediately when a session exists; on remote failure mark local record pending, never throw, never drop.
- [ ] Chart load path: render local cache immediately, merge Supabase rows in the background; delete a local row only after a confirmed remote save or confirmed duplicate.
- [ ] Flush function: upload all pending/failed local charts when a session is available; latest updated_at wins on conflict.
- [ ] Friends page hook: run flush on mount, window focus, visibilitychange, online, and auth session arrival.
- [ ] UI status: reuse the existing chart card pattern to show Saving... / Saved / Saved locally, no layout changes.
- [ ] Contract test: chart survives a failed remote write; local cache renders before remote resolves.
- [ ] Run friends retention + performance contracts and the web build.
