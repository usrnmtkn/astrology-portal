# Repository integration test requirements

The scripts in this archive validate the handoff itself. Codex must add repository-level tests that exercise actual resolvers and reader components.

For each focused fixture, record and assert:

- route/surface;
- immutable fact input;
- template family and version;
- primary and supporting source keys with tiers;
- record ID;
- compact and expanded field objects;
- target component for every field;
- initial and hydrated provenance;
- final visible strings after rendering.

Add exact guards for:

- sentence-level duplication across hero, TLDR, Overview, duration/pass, and footer;
- one technical footer;
- date placement;
- compact/expanded inequality;
- source whitelist and instruction-source firewall;
- `REFERENCE_SCAFFOLD` rejection;
- exact-pair-first selection;
- `SOURCE_GAP` behavior;
- collective versus personalized planetary-horoscope resolution;
- Moon phase versus Moon sign resolution;
- eligible day/night sect and unknown-time suppression;
- admin-preview/reader parity;
- initial/hydrated parity.

Tests must inspect final rendered output, not only intermediate record objects.

