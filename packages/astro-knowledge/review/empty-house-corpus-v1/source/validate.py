#!/usr/bin/env python3
"""Deterministic validator for the empty-houses corpus.

Usage: python3 validate.py [corpus_dir]
Runs the regex/computed checks from judge-rubric.json (LLM checks excluded).
Exit code 0 = all pass (warnings allowed), 1 = errors found.
"""
import json, re, sys, pathlib
from collections import defaultdict

d = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else pathlib.Path(__file__).parent
rubric = json.loads((d / "judge-rubric.json").read_text(encoding="utf-8"))
C = rubric["corpus"]
HOUSES, SIGNS = C["houses"], C["signs"]
patterns = {t: re.compile(v["key_pattern"]) for t, v in C["entry_types"].items()}
checks = {c["id"]: c for c in rubric["checks"]}

errors, warnings = [], []
entries = {}  # key -> (type, text, file)

def etype(key):
    for t in ("ruler", "sign", "base", "principle"):
        if patterns[t].match(key):
            return t
    return None

for name in C["files"]:
    p = d / name
    if not p.exists():
        errors.append((name, "file-missing", "corpus file not found"))
        continue
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        if "\t" not in line:
            errors.append((f"{name}:{i}", "single-line", "no tab separator"))
            continue
        key, text = line.split("\t", 1)
        t = etype(key)
        if t is None:
            errors.append((f"{name}:{i}", "key-format", f"bad key: {key}"))
            continue
        if key in entries:
            errors.append((key, "key-format", "duplicate key"))
        if "\t" in text:
            errors.append((key, "single-line", "extra tab inside entry"))
        entries[key] = (t, text, name)

# counts
counts = defaultdict(int)
for t, _, _ in entries.values():
    counts[t] += 1
for t, expected in C["expected_counts"].items():
    if counts[t] != expected:
        errors.append((t, "coverage", f"expected {expected} {t} entries, found {counts[t]}"))

forbidden_art = [re.compile(p) for p in checks["no-artifacts"]["params"]["forbidden_patterns"]]
banned = [re.compile(p, re.I) for p in checks["banned-words"]["params"]["forbidden_patterns"]]
second_person = re.compile(checks["second-person"]["params"]["required_pattern"], re.I)
pivot = re.compile(checks["pivot-present"]["params"]["required_pattern"])
sign_open_bad = [re.compile(p) for p in checks["sign-opener-style"]["params"]["forbidden_patterns"]]
bands = checks["length-band"]["params"]["bands"]
np = checks["ngram-duplication"]["params"]
strip_prefix = re.compile(np["strip_prefix_pattern"], re.I)

for key, (t, text, name) in entries.items():
    for rx in forbidden_art:
        if rx.search(text):
            errors.append((key, "no-artifacts", f"matches {rx.pattern!r}"))
    if t != "principle":
        for rx in banned:
            if rx.search(text):
                errors.append((key, "banned-words", f"matches {rx.pattern!r}"))
        if not second_person.search(text):
            errors.append((key, "second-person", "no 'you/your'"))
    if t in ("sign", "ruler") and not pivot.search(text):
        sink = errors if checks["pivot-present"]["severity"] == "error" else warnings
        sink.append((key, "pivot-present", "no 'but'/'though' pivot (advisory; LLM structure check is authoritative)"))
    if t == "sign":
        for rx in sign_open_bad:
            if rx.search(text):
                errors.append((key, "sign-opener-style", f"opener matches {rx.pattern!r}"))
    if t == "ruler":
        m = re.match(r"^empty-(\w+)\|ruler-in-(\w+)$", key)
        house, target = m.group(1), m.group(2)
        if house == target:
            expected = f"When the ruler of an empty {house} house sits in the {house} house"
        else:
            expected = f"When the ruler of an empty {house} house lands in the {target}"
        if not text.startswith(expected):
            errors.append((key, "ruler-opener-direction", f"opener must start: {expected!r}"))
    lo, hi = bands[t]
    n = len(text.split())
    if not (lo <= n <= hi):
        errors.append((key, "length-band", f"{n} words, band {lo}-{hi}"))

# n-gram duplication (skip principles; strip ruler opener template)
def tokens(text):
    return re.sub(r"[^a-z0-9 ]", " ", strip_prefix.sub("", text.lower())).split()

for n, sev in ((np["error_n"], "error"), (np["warn_n"], "warn")):
    seen = defaultdict(set)
    for key, (t, text, _) in entries.items():
        if t == "principle":
            continue
        toks = tokens(text)
        for j in range(len(toks) - n + 1):
            seen[" ".join(toks[j:j + n])].add(key)
    reported = set()
    allow = np.get("allow_phrases", [])
    for gram, keys in seen.items():
        if len(keys) > 1:
            if any(a in gram for a in allow):
                continue
            pair = tuple(sorted(keys))
            if pair in reported:
                continue
            reported.add(pair)
            item = (" / ".join(pair), "ngram-duplication", f"shared {n}-gram: '{gram}...'")
            (errors if sev == "error" else warnings).append(item)
    if sev == "error" and reported:
        break  # don't double-report at warn level

for key, cid, detail in errors:
    print(f"ERROR  [{cid}] {key}: {detail}")
for key, cid, detail in warnings:
    print(f"WARN   [{cid}] {key}: {detail}")
print(f"\n{len(entries)} entries checked: {len(errors)} errors, {len(warnings)} warnings")
sys.exit(1 if errors else 0)
