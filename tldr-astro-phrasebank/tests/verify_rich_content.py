#!/usr/bin/env python3
"""
verify_rich_content.py — gate the READER-FACING content of every rich surface, per the served-fields
contract (cc-served-fields.json). Checks each reader field for: raw slot/brace leaks, real
instruction/provenance markers, and duplicate text across a record's own reader fields.
Internal fields are NOT scanned (they never render). Build gate: exit 1 on any issue.
"""
import json, os, re

PB = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "phrasebank")
CONTRACT = json.load(open(os.path.join(PB, "cc-served-fields.json")))
MARKERS = re.compile("|".join(re.escape(m) for m in CONTRACT["instruction_markers"]), re.I)

def reader_fields(spec):
    fs = list(spec.get("reader", []))
    for v in spec.get("reader_by_surface", {}).values(): fs += v
    return fs

def problems_for(text):
    p = []
    if "{{" in text or "}}" in text: p.append("SLOT-LEAK")
    if re.search(r"(?<![0-9])\{[^{}]+\}", text): p.append("BRACE-LEAK")
    if MARKERS.search(text): p.append("INSTRUCTION-LEAK")
    t = text.strip()
    if t:
        if t[0].islower(): p.append("NOT-SENTENCE(lowercase-start)")
        if t[-1] not in '.!?:"’': p.append("NOT-SENTENCE(no-end-punct)")  # ':' allowed for list lead-ins
    return p

def main():
    total_issues = total_fields = 0
    for name, spec in CONTRACT["contract"].items():
        p = os.path.join(PB, name + ".json")
        if not os.path.exists(p): continue
        recs = json.load(open(p)).get("reviewed", [])
        fields = reader_fields(spec)
        bad = []
        for r in recs:
            vals = {}
            for f in fields:
                v = r.get(f)
                if isinstance(v, str) and v.strip():
                    total_fields += 1
                    vals[f] = v.strip()
                    for prob in problems_for(v):
                        bad.append((r.get("id", "?"), f, prob, v[:70]))
            # duplicate text across this record's reader fields
            seen = list(vals.values())
            if len(seen) != len(set(seen)):
                bad.append((r.get("id", "?"), "*", "DUP-ACROSS-FIELDS", ""))
        if bad:
            total_issues += len(bad)
            print(f"{name}: {len(bad)} issues")
            for b in bad[:5]: print("   ", b)
    # confirm no NO_PROSE file was wired into the reader contract
    for nf in CONTRACT["no_prose_files"]:
        if nf in CONTRACT["contract"]:
            print(f"ERROR: no-prose file {nf} is in the reader contract"); total_issues += 1
    print(f"scanned {len(CONTRACT['contract'])} contract files, {total_fields} reader fields; issues: {total_issues}")
    if total_issues: raise SystemExit(1)
    print("ALL READER-FACING CONTENT CLEAN: no slot leaks, no instruction leaks, no duplicate sections.")

if __name__ == "__main__":
    main()
