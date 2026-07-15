#!/usr/bin/env python3
"""
build_sky_historical.py — governed historical-lookback records (separate record type).

Each record attaches to one collective-Sky detail event and supplies a reviewed,
nondeterministic historical paragraph. Two distinct source authorities are kept
separate: astrology-calculation sources (previous windows / ingress dates) vs.
historical-event sources (world conditions). An astrology source cannot support a
world claim and vice versa.

Only status "reviewed" with both integrity checks passed is eligible to render.
One DRAFT record is included to prove drafts never render even when the Admin
display switch is on. Emits phrasebank/sky-historical-lookback.json.
"""
import json, os

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

RECORDS = [
{
 "id": "reviewed/history/uranus-gemini/1941-1949",
 "status": "reviewed",
 "surface": "sky.collective.detail",
 "attachesToEvent": "uranus-gemini",
 "eventIdentity": {"eventType": "planet-in-sign", "bodies": ["uranus"], "sign": "gemini"},
 "currentWindow": {"start": "2026-05", "end": "2033-05"},
 "previousWindows": [{"start": "1941-08", "end": "1949-06", "calculationSourceId": "calculated/ephemeris/uranus-gemini-1941"}],
 "previousCycleDateLabel": "1941–1949",
 "historicalHeading": "Last time around",
 "matchSpecificity": "same-planet-same-sign",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "broad",
 "variant": "B",
 "clauses": {
   "historicalContext": "The previous Uranus-in-Gemini era unfolded while communication, transportation, and information systems were being reorganized on a global scale.",
   "recurringQuestion": "That history offers context for the present focus on networks, technology, and who controls the movement of information.",
   "importantDifference": "The circumstances are profoundly different now, and the current passage is not a replay.",
   "presentInvitation": "What returns is the question of how new channels can widen collective freedom without becoming more efficient tools of distortion or control."},
 "historicalSources": [{"id": "reviewed/history/comm-systems-1940s", "title": "Reorganization of global communication and information systems, 1940s",
    "publisher": "editorial-reviewed", "supports": ["historicalContext"]}],
 "astrologyCalculationSources": ["calculated/ephemeris/uranus-gemini-1941"],
 "confidence": "high", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
 "reviewedBy": "editorial", "reviewedAt": "2026-07-01T00:00:00Z",
},
{
 "id": "reviewed/history/jupiter-cancer/2013-2014",
 "status": "reviewed",
 "surface": "sky.collective.detail",
 "attachesToEvent": "jupiter-cancer",
 "eventIdentity": {"eventType": "planet-in-sign", "bodies": ["jupiter"], "sign": "cancer"},
 "currentWindow": {"start": "2025-06", "end": "2026-06"},
 "previousWindows": [{"start": "2013-06", "end": "2014-07", "calculationSourceId": "calculated/ephemeris/jupiter-cancer-2013"}],
 "previousCycleDateLabel": "2013–2014",
 "historicalHeading": "Last time around",
 "matchSpecificity": "same-planet-same-sign",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "broad",
 "variant": "C",
 "clauses": {
   "historicalContext": "Jupiter last traveled through Cancer in 2013–2014, when questions of housing, care, and material security were pushing well beyond the private household into public debate.",
   "recurringQuestion": "This return may bring belonging, and who gets to feel safe, back into collective conversation.",
   "importantDifference": "The world has changed since then, so this is not an invitation to expect the same events.",
   "presentInvitation": "It is a chance to notice which forms of support have become necessities, and which promises of safety no longer feel sufficient."},
 "historicalSources": [{"id": "reviewed/history/housing-care-2013", "title": "Public debate on housing and material security, 2013–2014",
    "publisher": "editorial-reviewed", "supports": ["historicalContext"]}],
 "astrologyCalculationSources": ["calculated/ephemeris/jupiter-cancer-2013"],
 "confidence": "medium", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
 "reviewedBy": "editorial", "reviewedAt": "2026-07-01T00:00:00Z",
},
{
 "id": "reviewed/history/saturn-aries/1996-1999",
 "status": "reviewed",
 "surface": "sky.collective.detail",
 "attachesToEvent": "saturn-aries",
 "eventIdentity": {"eventType": "planet-in-sign", "bodies": ["saturn"], "sign": "aries"},
 "currentWindow": {"start": "2025-05", "end": "2028-04"},
 "previousWindows": [{"start": "1996-04", "end": "1999-03", "calculationSourceId": "calculated/ephemeris/saturn-aries-1996"}],
 "previousCycleDateLabel": "1996–1999",
 "historicalHeading": "The previous cycle",
 "matchSpecificity": "same-planet-same-sign",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "broad",
 "variant": "A",
 "clauses": {
   "historicalContext": "Saturn last moved through Aries in 1996–1999, a stretch when questions of independence and standing on one's own carried unusual public weight.",
   "recurringQuestion": "That earlier passage gives us a longer timeline for watching how the collective learns to act for itself.",
   "importantDifference": "The circumstances are different now, so the comparison is context rather than prediction.",
   "presentInvitation": "What returns is the demand to build real self-reliance rather than merely declare it."},
 "historicalSources": [{"id": "reviewed/history/independence-1990s", "title": "Public discourse on self-reliance and initiative, late 1990s",
    "publisher": "editorial-reviewed", "supports": ["historicalContext"]}],
 "astrologyCalculationSources": ["calculated/ephemeris/saturn-aries-1996"],
 "confidence": "medium", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
 "reviewedBy": "editorial", "reviewedAt": "2026-07-02T00:00:00Z",
},
{
 "id": "reviewed/history/mercury-retrograde-cancer/2023",
 "status": "reviewed",
 "surface": "sky.collective.detail",
 "attachesToEvent": "mercury-retrograde-cancer",
 "eventIdentity": {"eventType": "retrograde", "bodies": ["mercury"], "sign": "cancer", "direction": "retrograde"},
 "currentWindow": {"start": "2026-08-02", "end": "2026-08-26"},
 "previousWindows": [{"start": "2023-06-29", "end": "2023-07-23", "calculationSourceId": "calculated/ephemeris/mercury-retro-cancer-2023"}],
 "previousCycleDateLabel": "June–July 2023",
 "historicalHeading": "Looking back",
 "matchSpecificity": "same-planet-same-sign-same-direction",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "moderate",
 "variant": "C",
 "clauses": {
   "historicalContext": "Mercury last retraced this part of Cancer in June–July 2023, a stretch that pulled collective attention back toward unfinished family conversations and the slow work of repair.",
   "recurringQuestion": "The pattern gives us an earlier comparable passage for how we handle what we left unsaid.",
   "importantDifference": "The details differ, and this return asks for revision, not a repeat of the same misunderstandings.",
   "presentInvitation": "The invitation is to reopen the right conversation on purpose rather than stumble back into the old one."},
 "historicalSources": [{"id": "reviewed/history/collective-repair-2023", "title": "Collective attention to family repair and communication, mid-2023",
    "publisher": "editorial-reviewed", "supports": ["historicalContext"]}],
 "astrologyCalculationSources": ["calculated/ephemeris/mercury-retro-cancer-2023"],
 "confidence": "medium", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
 "reviewedBy": "editorial", "reviewedAt": "2026-07-03T00:00:00Z",
},
{
 "id": "reviewed/history/eclipse-aries-libra/2023-2025",
 "status": "reviewed",
 "surface": "sky.collective.detail",
 "attachesToEvent": "lunar-eclipse-libra",
 "eventIdentity": {"eventType": "eclipse-cycle", "bodies": ["sun", "moon"], "sign": "libra", "aspect": "lunar-eclipse"},
 "currentWindow": {"start": "2027-03", "end": "2027-09"},
 "previousWindows": [{"start": "2023-04", "end": "2025-03", "calculationSourceId": "calculated/ephemeris/saros/eclipse-aries-libra-2023"}],
 "previousCycleDateLabel": "2023–2025",
 "historicalHeading": "An earlier chapter",
 "matchSpecificity": "same-eclipse-family",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "moderate",
 "variant": "C",
 "clauses": {
   "historicalContext": "The current eclipses on the Aries–Libra axis belong to the same family that last crossed this axis in 2023–2025, a period that repeatedly pushed questions of independence and partnership into the open.",
   "recurringQuestion": "The pattern gives us an earlier chapter for watching how the collective renegotiates the line between self and other.",
   "importantDifference": "The circumstances differ, and eclipses accelerate what is already in motion rather than deliver a fixed outcome.",
   "presentInvitation": "What returns is the question of where a balance needs renaming, not a script for how it must end."},
 "historicalSources": [{"id": "reviewed/history/self-and-other-2023", "title": "Public renegotiation of autonomy and partnership, 2023–2025",
    "publisher": "editorial-reviewed", "supports": ["historicalContext"]}],
 "astrologyCalculationSources": ["calculated/ephemeris/saros/eclipse-aries-libra-2023"],
 "confidence": "medium", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
 "reviewedBy": "editorial", "reviewedAt": "2026-07-04T00:00:00Z",
},
{
 # DRAFT: must never render, even with the Admin switch ON. Also the nodal/eclipse case.
 "id": "draft/history/nodal-axis-cancer-capricorn",
 "status": "draft",
 "surface": "sky.collective.detail",
 "attachesToEvent": "nodal-axis-cancer-capricorn",
 "eventIdentity": {"eventType": "nodal-cycle", "bodies": ["north-node", "south-node"], "aspect": "axis"},
 "currentWindow": {"start": "2026-01", "end": "2027-07"},
 "previousWindows": [{"start": "2007-06", "end": "2009-01", "calculationSourceId": "calculated/ephemeris/nodes-cancer-capricorn-2007"}],
 "previousCycleDateLabel": "2007–2009",
 "historicalHeading": "An earlier chapter",
 "matchSpecificity": "same-nodal-axis",
 "exactDegreeMatch": False, "directionMatch": True, "historicalAnalogyStrength": "broad",
 "variant": "A",
 "clauses": {
   "historicalContext": "The nodal axis last crossed Cancer and Capricorn in 2007–2009.",
   "importantDifference": "The comparison is context, not a script."},
 "historicalSources": [],
 "astrologyCalculationSources": ["calculated/ephemeris/nodes-cancer-capricorn-2007"],
 "confidence": "low", "causalClaimCheck": "passed", "repetitionClaimCheck": "passed",
},
]

out = {"_meta": {"title": "Sky historical-lookback records (separately governed)",
        "recordType": "SkyHistoricalLookbackRecord", "count": len(RECORDS),
        "eligibility_rule": "status=='reviewed' AND causalClaimCheck=='passed' AND repetitionClaimCheck=='passed'",
        "source_separation": "astrologyCalculationSources (windows) kept distinct from historicalSources (world claims)",
        "note": "Display is gated by Admin setting skyHistoricalLookbackEnabled; this file governs eligibility only."},
       "records": RECORDS}
dest = os.path.join(PKG, "phrasebank", "sky-historical-lookback.json")
json.dump(out, open(dest, "w"), indent=2, ensure_ascii=False)
elig = sum(1 for r in RECORDS if r["status"] == "reviewed")
print(f"wrote {len(RECORDS)} historical-lookback records ({elig} reviewed-eligible, "
      f"{len(RECORDS)-elig} draft) -> {dest}")
