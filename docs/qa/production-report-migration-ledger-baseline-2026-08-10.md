# Production report migration ledger baseline — 2026-08-10

Project: `hdmdufozrgrajkfhydit` (`TLDR Astro`)

The report migrations below were applied directly to Production in one verified
transaction. A separate history-only transaction then inserted their exact
versions and names into `supabase_migrations.schema_migrations`. The history
transaction first required the report tables and call-accounting RPCs to exist;
it made no application-schema changes.

| Version | Name |
| --- | --- |
| `20260808120000` | `report_mode_year_ahead_surface` |
| `20260808121000` | `user_reports` |
| `20260809120000` | `report_horizon_types` |
| `20260809130000` | `report_domains` |
| `20260809140000` | `love_connection_report_domain` |
| `20260809150000` | `report_fulfillment` |
| `20260809160000` | `personal_health_report_domain` |
| `20260810120000` | `comp_report_entitlements` |
| `20260810130000` | `report_call_accounting` |

Post-commit verification returned all nine exact `(version, name)` pairs. The
ledger rows use `statements = null`, matching a migration-history repair rather
than a second execution of the migration bodies.

