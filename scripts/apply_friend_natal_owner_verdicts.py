#!/usr/bin/env python3
"""Apply an already-validated Friend Natal verdict record to candidate-only files.

This script never edits canonical fallback source rows or generated artifacts.
It validates the complete 43-row set before replacing either candidate document.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import tempfile
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORT_RECORD = REPO_ROOT / "packages/astro-knowledge/review/friend-natal-owner-verdict-import-2026-08-11.json"
APPLICATION_RECORD = REPO_ROOT / "packages/astro-knowledge/review/friend-natal-owner-verdict-application-2026-08-11.json"
CANDIDATE_SOURCES = (
    REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-vocabulary-they-candidates-v1.json",
    REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-row-level-candidates-v1.json",
)
APPROVED_KEYS = {
    "fallback-vocab/planet-function/moon",
    "fallback-vocab/planet-function/venus",
}


class VerdictApplicationError(ValueError):
    pass


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def all_rows(document: dict[str, Any]) -> list[dict[str, Any]]:
    return [*(document.get("vocabularyRows") or []), *(document.get("hookRows") or [])]


def json_text(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def planned_documents() -> tuple[list[tuple[Path, dict[str, Any]]], dict[str, Any]]:
    imported = load_json(IMPORT_RECORD)
    verdicts = imported.get("candidateVerdicts")
    decisions = imported.get("ownerDecisions")
    if imported.get("verdictCounts") != {"approve": 2, "cut": 41, "edit": 0}:
        raise VerdictApplicationError("Import record must contain exactly 2 approve, 41 cut, and 0 edit verdicts.")
    if not isinstance(verdicts, list) or len(verdicts) != 43 or not isinstance(decisions, list) or len(decisions) != 3:
        raise VerdictApplicationError("Import record must contain all 43 verdicts and all 3 OwnerDecisions.")
    verdict_by_key = {item.get("key"): item for item in verdicts}
    if len(verdict_by_key) != 43:
        raise VerdictApplicationError("Import verdict keys must be unique.")
    approved_keys = {item["key"] for item in verdicts if item.get("verdict") == "approve"}
    if approved_keys != APPROVED_KEYS:
        raise VerdictApplicationError("The approved-key set drifted from the owner verdict.")

    documents: list[tuple[Path, dict[str, Any]]] = []
    source_rows: dict[str, dict[str, Any]] = {}
    for path in CANDIDATE_SOURCES:
        document = load_json(path)
        for row in all_rows(document):
            key = row.get("contentKey")
            if key in source_rows:
                raise VerdictApplicationError(f"Duplicate candidate key: {key}")
            source_rows[key] = row
        documents.append((path, document))
    if set(source_rows) != set(verdict_by_key):
        raise VerdictApplicationError("Candidate files and import record do not contain the same 43 keys.")

    transitions: list[dict[str, Any]] = []
    for path, document in documents:
        for row in all_rows(document):
            key = row["contentKey"]
            verdict = verdict_by_key[key]
            if row.get("review_status") != "needs_review" or row.get("ownerApproved") is not False:
                raise VerdictApplicationError(f"{key}: candidate is not in its pre-application fail-closed state.")
            field = next((name for name in ("body_they", "body", "body_you") if row.get(name) == verdict.get("adoptedCopy")), None)
            if verdict["verdict"] == "approve" and field is None:
                raise VerdictApplicationError(f"{key}: approved copy does not match the candidate source byte-for-byte.")

            approved = verdict["verdict"] == "approve"
            row["review_status"] = "owner_approved_candidate" if approved else "discarded"
            row["candidateState"] = "owner-approved" if approved else "discarded"
            row["ownerApproved"] = approved
            row["ownerVerdict"] = verdict["verdict"]
            row["ownerReviewedOn"] = imported["ownerReviewDate"]
            row["ownerVerdictRecord"] = str(IMPORT_RECORD.relative_to(REPO_ROOT))
            row["promotionAuthorized"] = False
            transitions.append({
                "key": key,
                "from": "needs_review",
                "to": row["review_status"],
                "verdict": verdict["verdict"],
            })

        document["review_status"] = "owner_verdicts_applied"
        document["ownerApproved"] = False
        document["promotionAuthorized"] = False
        document["ownerVerdictRecord"] = str(IMPORT_RECORD.relative_to(REPO_ROOT))

    rendered_documents = [(path, json_text(document)) for path, document in documents]
    application = {
        "schemaVersion": 1,
        "record": "friend-natal-owner-verdict-application-v1",
        "appliedOn": imported["ownerReviewDate"],
        "sourceImport": str(IMPORT_RECORD.relative_to(REPO_ROOT)),
        "sourceImportSha256": hashlib.sha256(IMPORT_RECORD.read_bytes()).hexdigest(),
        "verdictCounts": imported["verdictCounts"],
        "approvedCandidateKeys": sorted(APPROVED_KEYS),
        "discardedCandidateKeys": sorted(item["key"] for item in verdicts if item["verdict"] == "cut"),
        "ownerDecisions": decisions,
        "candidateStateTransitions": sorted(transitions, key=lambda item: item["key"]),
        "candidateDocuments": [
            {"path": str(path.relative_to(REPO_ROOT)), "sha256After": sha256_text(text)}
            for path, text in rendered_documents
        ],
        "pass2": {
            "splitApproachAuthorized": True,
            "status": "active_review_gated",
            "broaderDefectBatchStatus": "queued_after_pass_2",
            "elementPatternStatus": "reader_addressed_untouched",
            "readerAddressedBaselineFamilies": "resolved_keep_reader_addressed",
        },
        "invariants": {
            "canonicalServingRowsChanged": False,
            "autoPublish": False,
            "writerPromotionAuthorized": False,
            "promotionAuthorizedCandidateCount": 0,
        },
    }
    return [(path, document) for path, document in documents], application


def atomic_replace_many(documents: list[tuple[Path, dict[str, Any]]], application: dict[str, Any]) -> None:
    if APPLICATION_RECORD.exists():
        raise VerdictApplicationError(f"Application record already exists: {APPLICATION_RECORD}")
    staged: list[tuple[Path, Path]] = []
    try:
        for path, value in [*documents, (APPLICATION_RECORD, application)]:
            path.parent.mkdir(parents=True, exist_ok=True)
            descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
            temporary = Path(temporary_name)
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                stream.write(json_text(value))
                stream.flush()
                os.fsync(stream.fileno())
            staged.append((temporary, path))
        for temporary, path in staged:
            os.replace(temporary, path)
    finally:
        for temporary, _ in staged:
            if temporary.exists():
                temporary.unlink()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Apply the complete governed state transition.")
    args = parser.parse_args()
    documents, application = planned_documents()
    if not args.apply:
        print("friend natal verdict application preflight: ok (2 approve, 41 cut, 3 OwnerDecisions)")
        return 0
    atomic_replace_many(documents, application)
    print("friend natal verdict application: applied (2 owner-approved candidates, 41 discarded; no serving changes)")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except VerdictApplicationError as error:
        print(f"friend natal verdict application: REFUSED: {error}", file=__import__("sys").stderr)
        raise SystemExit(1)
