#!/usr/bin/env python3
"""Validate and ingest the first owner-approved natal Friend calibration corpus."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DRAFT = REPO_ROOT / "packages/astro-knowledge/review/TLDR-FRIEND-VOICE-CALIBRATION-DRAFT-V1.md"
DEFAULT_RESPONSE = REPO_ROOT / "packages/astro-knowledge/review/TLDR-FRIEND-VOICE-CALIBRATION-OWNER-RESPONSE-V1.md"
DEFAULT_POLICY = REPO_ROOT / "packages/astro-knowledge/review/friend-voice-person-contract-policy-v1.json"
DEFAULT_CORPUS = REPO_ROOT / "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/natal-friend-calibration/natal-friend-calibration-owner-approved-v1.json"
DEFAULT_RECORD = REPO_ROOT / "packages/astro-knowledge/review/friend-voice-calibration-owner-import-v1.json"
DRAFT_RECORD_PATH = "packages/astro-knowledge/review/TLDR-FRIEND-VOICE-CALIBRATION-DRAFT-V1.md"
RESPONSE_RECORD_PATH = "packages/astro-knowledge/review/TLDR-FRIEND-VOICE-CALIBRATION-OWNER-RESPONSE-V1.md"
EXPECTED_DRAFT_SHA256 = "c96dc29a5ca2a219b8b2b9e3cbc97cf9bdeaeb7648bf77f396cfe007f719c0e3"
VALID_VERDICTS = {"approve", "edit", "cut"}
VALID_PERSON_RULINGS = {"reader observer address allowed", "pure third person"}


class ImportValidationError(ValueError):
    """The calibration packet failed closed."""


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def parse_drafts(text: str) -> list[dict[str, str]]:
    section_re = re.compile(r"(?m)^## (\d+)\. `([^`]+)`\s*$")
    matches = list(section_re.finditer(text))
    if len(matches) != 13:
        raise ImportValidationError(f"Expected 13 calibration drafts; found {len(matches)}.")
    rows = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else text.find("\n---\n", match.end())
        if end < 0:
            end = len(text)
        section = text[match.end():end]
        mechanism = re.search(r"(?m)^\*\*Mechanism:\*\*\s*(.+)$", section)
        friend = re.search(r"(?ms)^\*\*Friend draft:\*\*\s*(.+?)\s*$", section)
        if not mechanism or not friend:
            raise ImportValidationError(f"{match.group(2)}: missing mechanism or Friend draft.")
        rows.append({
            "number": str(index + 1),
            "key": match.group(2),
            "mechanism": mechanism.group(1).strip(),
            "draft": friend.group(1).strip(),
        })
    if len({row["key"] for row in rows}) != 13:
        raise ImportValidationError("Calibration draft keys must be unique.")
    return rows


def normalized_response_template(text: str) -> str:
    normalized = re.sub(
        r"(?m)^(\*\*Person-contract ruling \(reader observer address allowed / pure third person\):\*\*)[^\n]*$",
        r"\1 __RULING__",
        text,
    )
    normalized, verdict_count = re.subn(r"(?m)^(\*\*Owner verdict:\*\*)[^\n]*$", r"\1 __VERDICT__", normalized)
    normalized, edit_count = re.subn(r"(?m)^(>)[^\n]*$", r"\1 __EDIT__", normalized)
    if verdict_count != 13 or edit_count != 13:
        raise ImportValidationError("Owner response template must contain 13 verdict and 13 edit fields.")
    return normalized


def _clean(value: str) -> str:
    return value.strip().strip("_ `*\t").strip().lower()


def parse_response(text: str, draft_rows: list[dict[str, str]], expected_template_sha256: str) -> tuple[str, list[dict[str, Any]]]:
    if sha256_text(normalized_response_template(text)) != expected_template_sha256:
        raise ImportValidationError("Owner response changed outside the governed ruling, verdict, and edit fields.")
    ruling_match = re.search(
        r"(?m)^\*\*Person-contract ruling \(reader observer address allowed / pure third person\):\*\*([^\n]*)$",
        text,
    )
    ruling = _clean(ruling_match.group(1) if ruling_match else "")
    if ruling not in VALID_PERSON_RULINGS:
        raise ImportValidationError("The reader-observer versus pure-third-person owner ruling is still blank or ambiguous.")
    section_re = re.compile(r"(?m)^## `([^`]+)`\s*$")
    matches = list(section_re.finditer(text))
    if len(matches) != 13:
        raise ImportValidationError(f"Expected 13 owner response sections; found {len(matches)}.")
    draft_by_key = {row["key"]: row for row in draft_rows}
    decisions = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        section = text[match.end():end]
        key = match.group(1)
        if key not in draft_by_key:
            raise ImportValidationError(f"Unexpected owner response key: {key}")
        verdict_match = re.search(r"(?m)^\*\*Owner verdict:\*\*([^\n]*)$", section)
        verdict = _clean(verdict_match.group(1) if verdict_match else "")
        if verdict not in VALID_VERDICTS:
            raise ImportValidationError(f"{key}: owner verdict must be exactly approve, edit, or cut.")
        edit_lines = re.findall(r"(?m)^>\s?(.*)$", section)
        owner_edit = "\n".join(edit_lines).strip()
        if verdict == "edit" and not owner_edit:
            raise ImportValidationError(f"{key}: edit requires the complete owner passage.")
        if verdict != "edit" and owner_edit:
            raise ImportValidationError(f"{key}: owner edit must be blank unless verdict is edit.")
        adopted = draft_by_key[key]["draft"] if verdict == "approve" else owner_edit if verdict == "edit" else None
        decisions.append({"key": key, "verdict": verdict, "adoptedCopy": adopted})
    if [item["key"] for item in decisions] != [item["key"] for item in draft_rows]:
        raise ImportValidationError("Owner response keys or order drifted from the 13-row draft.")
    return ruling, decisions


def validate_policy(path: Path, ruling: str) -> dict[str, Any]:
    policy = json.loads(path.read_text(encoding="utf-8"))
    if policy.get("status") != "owner-ruled" or policy.get("ruling") not in VALID_PERSON_RULINGS:
        raise ImportValidationError("Friend person-contract policy remains pending owner ruling; calibration ingestion is blocked.")
    if policy["ruling"] != ruling:
        raise ImportValidationError("Owner response person-contract ruling does not match the governed policy record.")
    return policy


def build_outputs(*, draft_path: Path, response_path: Path, policy_path: Path, owner_review_date: str) -> tuple[dict[str, Any], dict[str, Any]]:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", owner_review_date):
        raise ImportValidationError("--owner-review-date must use YYYY-MM-DD.")
    draft_text = draft_path.read_text(encoding="utf-8")
    if sha256_text(draft_text) != EXPECTED_DRAFT_SHA256:
        raise ImportValidationError("Calibration draft SHA-256 drifted; Friend draft copy must remain byte-identical.")
    draft_rows = parse_drafts(draft_text)
    response_text = response_path.read_text(encoding="utf-8")
    template_sha = sha256_text(normalized_response_template(DEFAULT_RESPONSE.read_text(encoding="utf-8")))
    ruling, decisions = parse_response(response_text, draft_rows, template_sha)
    policy = validate_policy(policy_path, ruling)
    draft_by_key = {row["key"]: row for row in draft_rows}
    response_sha = sha256_text(response_text)
    adopted = []
    for decision in decisions:
        if decision["adoptedCopy"] is None:
            continue
        draft = draft_by_key[decision["key"]]
        parts = decision["key"].split("|")
        if len(parts) != 3:
            raise ImportValidationError(f"{decision['key']}: expected an aspect key.")
        copy_text = decision["adoptedCopy"]
        adopted.append({
            "key": decision["key"],
            "planetA": parts[0].replace("_", "-"),
            "aspect": parts[1].replace("_", "-"),
            "planetB": parts[2].replace("_", "-"),
            "mechanism": draft["mechanism"],
            "copy": copy_text,
            "approvalLevel": "exact_owner_approved",
            "ownerApproved": True,
            "approvedAt": owner_review_date,
            "recordPath": RESPONSE_RECORD_PATH,
            "recordSha256": response_sha,
            "payloadSha256": sha256_text(copy_text),
            "personContract": ruling,
        })
    if len(adopted) < 4:
        raise ImportValidationError(f"At least four owner-approved Friend passages are required; found {len(adopted)}.")
    corpus = {
        "schemaVersion": 1,
        "id": "natal-friend-calibration-owner-approved-v1",
        "surface": "natal-friend",
        "authorityClass": "exact_owner_approved",
        "sourceDraft": {"path": DRAFT_RECORD_PATH, "sha256": EXPECTED_DRAFT_SHA256},
        "ownerResponse": {"path": RESPONSE_RECORD_PATH, "sha256": response_sha},
        "personContract": policy,
        "rows": adopted,
    }
    record = {
        "schemaVersion": 1,
        "id": "friend-voice-calibration-owner-import-v1",
        "ownerReviewDate": owner_review_date,
        "draft": corpus["sourceDraft"],
        "response": corpus["ownerResponse"],
        "personContract": policy,
        "validation": {"draftRows": 13, "atomicVerdicts": 13, "partialImportAllowed": False, "minimumEvidenceRows": 4},
        "verdictCounts": {verdict: sum(item["verdict"] == verdict for item in decisions) for verdict in sorted(VALID_VERDICTS)},
        "indexedRows": len(adopted),
        "surface": "natal-friend",
        "stateChanges": {"servingCopyChanged": False, "autoPublish": False, "writerPromotion": False},
    }
    return corpus, record


def write_new_pair(corpus_path: Path, record_path: Path, corpus: dict[str, Any], record: dict[str, Any]) -> None:
    if corpus_path.exists() or record_path.exists():
        raise ImportValidationError("Calibration corpus or import record already exists; refusing to overwrite.")
    corpus_path.parent.mkdir(parents=True, exist_ok=True)
    record_path.parent.mkdir(parents=True, exist_ok=True)
    temps: list[Path] = []
    try:
        staged = []
        for target, value in ((corpus_path, corpus), (record_path, record)):
            fd, raw = tempfile.mkstemp(prefix=f".{target.name}.", suffix=".tmp", dir=target.parent)
            temp = Path(raw); temps.append(temp)
            with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
                handle.write(json.dumps(value, ensure_ascii=False, indent=2) + "\n")
                handle.flush(); os.fsync(handle.fileno())
            staged.append((temp, target))
        for temp, target in staged:
            os.replace(temp, target); temps.remove(temp)
    finally:
        for temp in temps:
            temp.unlink(missing_ok=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--draft", type=Path, default=DEFAULT_DRAFT)
    parser.add_argument("--response", type=Path, default=DEFAULT_RESPONSE)
    parser.add_argument("--policy", type=Path, default=DEFAULT_POLICY)
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--record", type=Path, default=DEFAULT_RECORD)
    parser.add_argument("--owner-review-date", default="2026-08-14")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check-only", action="store_true")
    mode.add_argument("--write", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        corpus, record = build_outputs(
            draft_path=args.draft.resolve(), response_path=args.response.resolve(),
            policy_path=args.policy.resolve(), owner_review_date=args.owner_review_date,
        )
        if args.write:
            write_new_pair(args.corpus.resolve(), args.record.resolve(), corpus, record)
            print(f"Friend calibration import: ok ({len(corpus['rows'])} natal-friend passages)")
        else:
            print(f"Friend calibration check: ok ({len(corpus['rows'])} natal-friend passages)")
        return 0
    except (ImportValidationError, OSError, json.JSONDecodeError) as exc:
        print(f"Friend calibration import: REFUSED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
