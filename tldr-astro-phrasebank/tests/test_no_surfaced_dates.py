#!/usr/bin/env python3
"""Gate: no baked calendar dates in serveable reader-facing phrasebank text."""
import json
import os
import re
import sys

PKG = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATE_RE = re.compile(
    r"\b(?:19|20)\d{2}\b|"
    r"\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:t|tember)?|Oct(?:ober)?|Nov(?:ember)?|"
    r"Dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b|"
    r"\b\d{1,2}/\d{1,2}/\d{2,4}\b|"
    r"\b\d{4}-\d{2}-\d{2}\b"
)

TEXT_KEYS = {
    "advice",
    "astro",
    "body",
    "collective_reading",
    "collective_shift",
    "example",
    "expanded_narrative",
    "experience",
    "guidance",
    "home_scene",
    "house_integration",
    "meaning",
    "natal_sign_story",
    "note",
    "pull_quote",
    "quote",
    "reading",
    "text",
}

META_KEYS = {
    "_meta",
    "content_key",
    "dateRange",
    "event",
    "id",
    "previousCycleDateLabel",
    "provenance",
    "sectionRef",
    "source",
    "sourceFile",
    "source_keys",
    "sources",
    "title",
    "topic",
    "trace",
    "updatedAt",
    "url",
}


def blocked(ctx):
    status = str(ctx.get("status", ""))
    tier = str(ctx.get("tier", ""))
    serving = str(ctx.get("serving", ""))
    return (
        status in {"DRAFT", "REFERENCE_ONLY"}
        or "DRAFT" in tier
        or "REFERENCE_ONLY" in serving
        or "do not serve" in serving.lower()
    )


def walk(value, path, ctx, failures):
    if isinstance(value, dict):
        next_ctx = dict(ctx)
        for key in ("status", "tier", "serving"):
            if key in value:
                next_ctx[key] = value.get(key)
        for key, child in value.items():
            walk(child, path + [key], next_ctx, failures)
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            walk(child, path + [str(index)], ctx, failures)
        return
    if not isinstance(value, str) or not DATE_RE.search(value):
        return
    if blocked(ctx) or any(part in META_KEYS for part in path):
        return
    if not any(part in TEXT_KEYS for part in path):
        return
    failures.append((".".join(path), value[:220].replace("\n", " ")))


def main():
    failures = []
    phrasebank_dir = os.path.join(PKG, "phrasebank")
    for name in sorted(os.listdir(phrasebank_dir)):
        if not name.endswith(".json"):
            continue
        path = os.path.join(phrasebank_dir, name)
        with open(path) as fh:
            data = json.load(fh)
        file_failures = []
        walk(data, [], {}, file_failures)
        for field, sample in file_failures:
            failures.append((name, field, sample))

    if failures:
        print("FAIL: surfaced date-like strings found in serveable phrasebank text")
        for name, field, sample in failures[:50]:
            print(f"  {name} :: {field} :: {sample}")
        if len(failures) > 50:
            print(f"  ... {len(failures) - 50} more")
        sys.exit(1)

    print("NO SURFACED DATES: serveable reader-facing phrasebank text is clean.")


if __name__ == "__main__":
    main()
