# Manual Chart Sync Plan

- [x] Add syncStatus ("synced" | "pending" | "failed" | "conflict") + created_at / updated_at / last_synced_at to the manual chart type and local storage shape.
- [x] Chart save path: write local first, then Supabase immediately when a session exists; on remote failure mark local record pending, never throw, never drop.
  - Location: `apps/web/src/services/manualCharts.ts`
- [ ] Chart load path: render local cache immediately, merge Supabase rows in the background; delete a local row only after a confirmed remote save or confirmed duplicate.
  - Location: `apps/web/src/services/manualCharts.ts`
- [ ] Flush function: upload all pending/failed local charts when a session is available; latest updated_at wins on conflict.
  - Location: `apps/web/src/services/manualCharts.ts`
- [ ] Friends page hook: run flush on mount, window focus, visibilitychange, online, and auth session arrival.
  - Location: new `apps/web/src/hooks/useChartSyncFlush.ts`; one `App.tsx` insertion after `rg -n` and an <=80-line read.
- [ ] UI status: reuse the existing chart card pattern to show Saving... / Saved / Saved locally, no layout changes.
  - Location: `apps/web/src/features/friends/FriendChartsList.tsx`; `apps/web/src/features/friends/FriendChartModal.tsx`
- [ ] Contract test: chart survives a failed remote write; local cache renders before remote resolves.
  - Location: `scripts/test-friends-chart-performance-contract.mjs`
- [ ] Run friends retention + performance contracts and the web build.
