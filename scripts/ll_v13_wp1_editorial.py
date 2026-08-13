#!/usr/bin/env python3
"""Shared LL V13 WP-1 editorial-pass contract and deterministic gates."""

from __future__ import annotations

import re
from typing import Any


EDITORIAL_SCHEMA = "ll-v13-wp1-editorial-draft-v2"
EDITORIAL_HEADERS = [
    "Editorial disposition (V2 pass)",
    "Revised copy (V2 editorial, NOT owner approved)",
    "Editorial note",
]
VALID_EDITORIAL_DISPOSITIONS = {"AS_IS", "LIGHT_EDIT", "REWRITE", "SOURCE_GAP"}


class EditorialValidationError(ValueError):
    """An editorial packet failed the authored-quality contract."""


def opening_three_words(copy: str) -> str:
    words = re.findall(r"[A-Za-z0-9']+", copy.lower())
    return " ".join(words[:3])


def scan_copy(copy: str) -> list[str]:
    """Return deterministic V2 guard violations for an owner-facing draft."""
    findings: list[str] = []
    checks = [
        ("em-dash", re.compile("—")),
        ("whether", re.compile(r"\bwhether\b", re.IGNORECASE)),
        (
            "real-intensifier",
            re.compile(
                r"\b(?:make|makes|made|becomes?|gets?|feels?) (?:it )?real\b|"
                r"\bthe real (?:work|progress|lesson|gift|question)\b|\breally\b",
                re.IGNORECASE,
            ),
        ),
        (
            "permission-ending",
            re.compile(
                r"(?:\byou (?:are allowed to|have permission to|do not (?:need|have) to|don't (?:need|have) to|get to)\b|"
                r"\bgive yourself permission\b|\blet yourself\b|\bit is okay to\b)[^.?!]*[.?!]?\s*$",
                re.IGNORECASE,
            ),
        ),
        (
            "clinical-language",
            re.compile(
                r"\b(?:nervous system|emotional maturity|emotional deprivation|inner support|regulate you)\b",
                re.IGNORECASE,
            ),
        ),
        (
            "summary-scaffold",
            re.compile(
                r"\b(?:the gift is|the advantage is|the lesson is|growth becomes|the deeper path|deeper path)\b",
                re.IGNORECASE,
            ),
        ),
        (
            "invented-biography",
            re.compile(
                r"\b(?:childhood|parent(?:al|s)?|mother|father|trauma|attachment (?:history|style|wound))\b",
                re.IGNORECASE,
            ),
        ),
    ]
    for name, pattern in checks:
        if pattern.search(copy):
            findings.append(name)
    return findings


def validate_editorial_rows(batch_rows: list[dict[str, Any]], editorial_rows: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Validate a complete, exact-key editorial pass and return normalized rows."""
    if len(editorial_rows) != len(batch_rows):
        raise EditorialValidationError(
            f"Editorial packet must contain exactly {len(batch_rows)} rows, found {len(editorial_rows)}."
        )
    expected_keys = [row["rowKey"] for row in batch_rows]
    actual_keys = [str(row.get("rowKey", "")) for row in editorial_rows]
    if actual_keys != expected_keys:
        raise EditorialValidationError("Editorial packet keys or order drifted from the governed batch.")

    normalized: list[dict[str, str]] = []
    for index, (batch_row, editorial_row) in enumerate(zip(batch_rows, editorial_rows), start=1):
        disposition = str(editorial_row.get("disposition", "")).strip().upper()
        revised_copy = str(editorial_row.get("revisedCopy", ""))
        note = str(editorial_row.get("editorialNote", ""))
        if disposition not in VALID_EDITORIAL_DISPOSITIONS:
            raise EditorialValidationError(f"Editorial row {index} has invalid disposition: {disposition or '<blank>'}.")
        if disposition == "AS_IS" and revised_copy != "":
            raise EditorialValidationError(f"Editorial row {index} is AS_IS but carries revised copy.")
        if disposition in {"LIGHT_EDIT", "REWRITE"} and not revised_copy.strip():
            raise EditorialValidationError(f"Editorial row {index} is {disposition} but has no revised copy.")
        if disposition == "SOURCE_GAP" and revised_copy != "":
            raise EditorialValidationError(f"Editorial row {index} is SOURCE_GAP but carries revised copy.")
        if not note.strip():
            raise EditorialValidationError(f"Editorial row {index} is missing an editorial note.")
        effective_copy = batch_row["currentCopy"] if disposition == "AS_IS" else revised_copy
        if disposition != "SOURCE_GAP":
            findings = scan_copy(effective_copy)
            if findings:
                raise EditorialValidationError(
                    f"Editorial row {index} ({batch_row['rowKey']}) failed deterministic gates: {', '.join(findings)}."
                )
        normalized.append(
            {
                "rowKey": batch_row["rowKey"],
                "disposition": disposition,
                "revisedCopy": revised_copy,
                "editorialNote": note,
            }
        )

    prior_opening = ""
    prior_index = 0
    for index, (batch_row, editorial_row) in enumerate(zip(batch_rows, normalized), start=1):
        if editorial_row["disposition"] == "SOURCE_GAP":
            prior_opening = ""
            prior_index = 0
            continue
        effective_copy = batch_row["currentCopy"] if editorial_row["disposition"] == "AS_IS" else editorial_row["revisedCopy"]
        opening = opening_three_words(effective_copy)
        if opening and opening == prior_opening:
            raise EditorialValidationError(
                f"Editorial rows {prior_index} and {index} repeat the opening construction {opening!r}."
            )
        prior_opening = opening
        prior_index = index
    return normalized
