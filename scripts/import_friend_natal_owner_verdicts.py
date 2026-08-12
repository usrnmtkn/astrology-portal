#!/usr/bin/env python3
"""Validate and import the governed Friend Natal owner-verdict workbook.

This importer emits a review record only. It never mutates candidate source rows,
serving rows, review states, or generated fallback artifacts.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = REPO_ROOT / "tldr-astro-phrasebank/TLDR-FRIEND-NATAL-CANDIDATES-REVIEW-V1.xlsx"
DEFAULT_AUDIT = REPO_ROOT / "packages/astro-knowledge/review/friend-natal-voice-audit-v1.json"
CANONICAL_SOURCE = REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
CANDIDATE_SOURCES = (
    REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-vocabulary-they-candidates-v1.json",
    REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-row-level-candidates-v1.json",
)
OWNER_RULING = "tldr-astro-phrasebank/TLDR-FRIEND-NATAL-VOICE-RULING-OWNER.md"
BLOCKING_RECORD = "packages/astro-knowledge/review/friend-natal-candidates-owner-review-2026-08-11.md"
AUDIT_RECORD = "packages/astro-knowledge/review/friend-natal-voice-audit-v1.json"
EXPECTED_HEADERS = [
    "#",
    "Family",
    "Key",
    "Triage",
    "Original friend copy",
    "Proposed friend copy",
    "Reason",
    "Composed sample",
    "Your verdict (approve / edit / cut)",
    "Your edit",
    "Metadata SHA-256",
]
EXPECTED_OWNER_DECISIONS = [
    "element-pattern person contract",
    "Broader friend-register rewrite batch",
    "Remaining 769-baseline families",
]
COPY_FIELDS = {"body", "body_you", "body_they"}
VALID_VERDICTS = {"approve", "edit", "cut"}
CELL_REF = re.compile(r"^([A-Z]+)([0-9]+)$")


class ImportValidationError(ValueError):
    """The workbook or its governed inputs failed closed validation."""


@dataclass(frozen=True)
class SheetData:
    cells: dict[str, str]
    formulas: frozenset[str]


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def js_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _column_number(letters: str) -> int:
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - ord("A") + 1
    return value


def _relationship_target(base: str, target: str) -> str:
    if target.startswith("/"):
        return target.lstrip("/")
    return str(PurePosixPath(base).parent.joinpath(target))


def read_xlsx_sheets(path: Path) -> dict[str, SheetData]:
    """Read cell text from an OOXML workbook using only the Python stdlib."""
    if not path.is_file():
        raise ImportValidationError(f"Workbook not found: {path}")
    try:
        with zipfile.ZipFile(path) as archive:
            workbook_xml = ET.fromstring(archive.read("xl/workbook.xml"))
            rels_xml = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            rel_targets = {
                rel.attrib["Id"]: _relationship_target("xl/workbook.xml", rel.attrib["Target"])
                for rel in rels_xml
            }
            shared_strings: list[str] = []
            if "xl/sharedStrings.xml" in archive.namelist():
                shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
                shared_strings = ["".join(node.itertext()) for node in shared_root]

            sheets: dict[str, SheetData] = {}
            for sheet in workbook_xml.iter():
                if not sheet.tag.endswith("}sheet"):
                    continue
                name = sheet.attrib["name"]
                rel_id = next((value for key, value in sheet.attrib.items() if key.endswith("}id")), None)
                if not rel_id or rel_id not in rel_targets:
                    raise ImportValidationError(f"Unable to resolve worksheet {name!r}.")
                root = ET.fromstring(archive.read(rel_targets[rel_id]))
                cells: dict[str, str] = {}
                formulas: set[str] = set()
                for cell in root.iter():
                    if not cell.tag.endswith("}c"):
                        continue
                    ref = cell.attrib.get("r")
                    if not ref:
                        continue
                    formula = next((node for node in cell if node.tag.endswith("}f")), None)
                    if formula is not None:
                        formulas.add(ref)
                    cell_type = cell.attrib.get("t")
                    if cell_type == "inlineStr":
                        inline = next((node for node in cell if node.tag.endswith("}is")), None)
                        value = "" if inline is None else "".join(inline.itertext())
                    else:
                        value_node = next((node for node in cell if node.tag.endswith("}v")), None)
                        value = "" if value_node is None or value_node.text is None else value_node.text
                        if cell_type == "s" and value:
                            try:
                                value = shared_strings[int(value)]
                            except (IndexError, ValueError) as exc:
                                raise ImportValidationError(f"Invalid shared-string index in {name}!{ref}.") from exc
                    cells[ref] = value
                sheets[name] = SheetData(cells=cells, formulas=frozenset(formulas))
            return sheets
    except (KeyError, ET.ParseError, zipfile.BadZipFile) as exc:
        raise ImportValidationError(f"Invalid XLSX workbook: {path}") from exc


def _cell(sheet: SheetData, column: str, row: int) -> str:
    return sheet.cells.get(f"{column}{row}", "")


def _require_no_formulas(sheet: SheetData, sheet_name: str, refs: list[str]) -> None:
    formulas = sorted(set(refs).intersection(sheet.formulas))
    if formulas:
        raise ImportValidationError(f"Formula cells are not accepted in governed inputs: {sheet_name}!{', '.join(formulas)}")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _all_rows(document: dict[str, Any]) -> list[dict[str, Any]]:
    return [*(document.get("vocabularyRows") or []), *(document.get("hookRows") or [])]


def validate_governed_sources(
    audit: dict[str, Any],
    *,
    require_pending_candidates: bool = True,
) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]]]:
    items = audit.get("candidateReviewItems")
    if audit.get("schemaVersion", 0) < 2 or not isinstance(items, list) or len(items) != 43:
        raise ImportValidationError("The audit must be schema v2+ with exactly 43 candidateReviewItems.")
    keys = [item.get("key") for item in items]
    if len(set(keys)) != 43 or any(not isinstance(key, str) for key in keys):
        raise ImportValidationError("The audit candidate keys must be 43 unique strings.")

    for item in items:
        body = item.get("renderedComposedSample")
        sample_key = item.get("renderedComposedSampleKey")
        sample_hash = item.get("renderedComposedSampleSha256")
        if not sample_key or not re.fullmatch(r"[0-9a-f]{64}", str(sample_hash or "")):
            raise ImportValidationError(f"{item['key']}: missing stable sample key/hash.")
        if body is not None:
            calculated = hashlib.sha256(body.encode("utf-8")).hexdigest()
        else:
            contract = item.get("stableRenderContract")
            if not isinstance(contract, dict) or contract.get("renderKey") != sample_key:
                raise ImportValidationError(f"{item['key']}: invalid stable render contract.")
            calculated = hashlib.sha256(js_json(contract).encode("utf-8")).hexdigest()
        if calculated != sample_hash:
            raise ImportValidationError(f"{item['key']}: rendered sample hash drifted.")

    canonical_rows = _all_rows(load_json(CANONICAL_SOURCE))
    canonical_by_key = {row.get("contentKey"): row for row in canonical_rows}
    if len(canonical_by_key) != len(canonical_rows):
        raise ImportValidationError("Canonical source contains duplicate content keys.")

    candidate_rows: list[dict[str, Any]] = []
    for path in CANDIDATE_SOURCES:
        candidate_rows.extend(_all_rows(load_json(path)))
    candidate_by_key = {row.get("contentKey"): row for row in candidate_rows}
    if len(candidate_by_key) != len(candidate_rows):
        raise ImportValidationError("Candidate sources contain duplicate content keys.")
    if set(candidate_by_key) != set(keys):
        raise ImportValidationError("Candidate source keys do not exactly match the 43-row audit.")

    for item in items:
        key = item["key"]
        candidate = candidate_by_key[key]
        canonical = canonical_by_key.get(key)
        if canonical is None:
            raise ImportValidationError(f"{key}: canonical source row is missing.")
        field = item.get("field")
        if field not in COPY_FIELDS or candidate.get(field) != item.get("proposedFriendCopy"):
            raise ImportValidationError(f"{key}: candidate copy drifted from the audit.")
        if require_pending_candidates and candidate.get("review_status") != "needs_review":
            raise ImportValidationError(f"{key}: candidate review_status must remain needs_review before import.")
        if not require_pending_candidates and candidate.get("review_status") not in {
            "needs_review", "owner_approved_candidate", "discarded"
        }:
            raise ImportValidationError(f"{key}: candidate review_status is not a governed candidate state.")
        if candidate.get("promotionAuthorized") is not False:
            raise ImportValidationError(f"{key}: candidate governance flags are not fail closed.")
        if require_pending_candidates and candidate.get("ownerApproved") is not False:
            raise ImportValidationError(f"{key}: candidate claimed approval before import.")
        metadata = {name: value for name, value in canonical.items() if name not in COPY_FIELDS}
        metadata_hash = hashlib.sha256(js_json(metadata).encode("utf-8")).hexdigest()
        if metadata_hash != item.get("canonicalMetadataSha256"):
            raise ImportValidationError(f"{key}: canonicalMetadataSha256 drifted.")
    return items, candidate_by_key


def expected_sample_cell(item: dict[str, Any]) -> str:
    body = item.get("renderedComposedSample")
    if body is not None:
        return body
    contract = item["stableRenderContract"]
    return "\n".join((
        "STABLE RENDER CONTRACT",
        f"key: {item['renderedComposedSampleKey']}",
        f"SHA-256: {item['renderedComposedSampleSha256']}",
        f"rendered value: {contract['renderedValue']}",
    ))


def validate_workbook_data(
    sheets: dict[str, SheetData],
    items: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    missing_sheets = {"Candidates43", "OwnerDecisions"}.difference(sheets)
    if missing_sheets:
        raise ImportValidationError(f"Workbook is missing sheets: {', '.join(sorted(missing_sheets))}")
    candidates = sheets["Candidates43"]
    owner_decisions = sheets["OwnerDecisions"]
    headers = [_cell(candidates, chr(ord("A") + index), 1) for index in range(11)]
    if headers != EXPECTED_HEADERS:
        raise ImportValidationError("Candidates43 headers do not match the governed workbook contract.")
    _require_no_formulas(
        candidates,
        "Candidates43",
        [f"{column}{row}" for row in range(2, 45) for column in ("I", "J")],
    )
    _require_no_formulas(owner_decisions, "OwnerDecisions", [f"D{row}" for row in range(2, 5)])

    verdicts: list[dict[str, Any]] = []
    seen_keys: set[str] = set()
    for index, item in enumerate(items, start=1):
        row = index + 1
        number = _cell(candidates, "A", row)
        key = _cell(candidates, "C", row)
        controlled = {
            "number": number,
            "family": _cell(candidates, "B", row),
            "key": key,
            "triage": _cell(candidates, "D", row),
            "original": _cell(candidates, "E", row),
            "proposed": _cell(candidates, "F", row),
            "sample": _cell(candidates, "H", row),
            "metadata": _cell(candidates, "K", row),
        }
        expected = {
            "number": str(index),
            "family": item["family"],
            "key": item["key"],
            "triage": item["triage"],
            "original": item.get("originalFriendCopy") or "",
            "proposed": item["proposedFriendCopy"],
            "sample": expected_sample_cell(item),
            "metadata": item["canonicalMetadataSha256"],
        }
        mismatches = [name for name in controlled if controlled[name] != expected[name]]
        if mismatches:
            raise ImportValidationError(f"Candidates43 row {row} drifted in: {', '.join(mismatches)}")
        if key in seen_keys:
            raise ImportValidationError(f"Duplicate candidate key in workbook: {key}")
        seen_keys.add(key)

        verdict = _cell(candidates, "I", row).strip().lower()
        owner_edit = _cell(candidates, "J", row)
        if verdict not in VALID_VERDICTS:
            raise ImportValidationError(f"Candidates43!I{row} must be approve, edit, or cut.")
        if verdict == "edit" and not owner_edit.strip():
            raise ImportValidationError(f"Candidates43!J{row} must contain the owner's verbatim edit.")
        if verdict != "edit" and owner_edit != "":
            raise ImportValidationError(f"Candidates43!J{row} must be blank unless the verdict is edit.")
        adopted_copy = item["proposedFriendCopy"] if verdict == "approve" else owner_edit if verdict == "edit" else None
        disposition = {
            "approve": "adopt-proposed-copy",
            "edit": "adopt-owner-wording-verbatim",
            "cut": "discard-candidate",
        }[verdict]
        verdicts.append({
            "number": index,
            "family": item["family"],
            "key": key,
            "canonicalMetadataSha256": item["canonicalMetadataSha256"],
            "sampleKind": item["sampleKind"],
            "renderedComposedSampleKey": item["renderedComposedSampleKey"],
            "renderedComposedSampleSha256": item["renderedComposedSampleSha256"],
            "verdict": verdict,
            "disposition": disposition,
            "adoptedCopy": adopted_copy,
            "candidateReviewStatusAtImport": "needs_review",
            "candidateSourceMutationPerformed": False,
        })

    decisions: list[dict[str, Any]] = []
    for index, expected_label in enumerate(EXPECTED_OWNER_DECISIONS, start=1):
        row = index + 1
        if _cell(owner_decisions, "A", row) != str(index) or _cell(owner_decisions, "B", row) != expected_label:
            raise ImportValidationError(f"OwnerDecisions row {row} does not match the governed decision key.")
        ruling = _cell(owner_decisions, "D", row)
        if not ruling.strip():
            raise ImportValidationError(f"OwnerDecisions!D{row} must contain the owner's ruling.")
        decisions.append({"number": index, "decisionNeeded": expected_label, "ruling": ruling})
    return verdicts, decisions


def build_record(
    workbook_path: Path,
    workbook_bytes: bytes,
    owner_review_date: str,
    verdicts: list[dict[str, Any]],
    decisions: list[dict[str, Any]],
) -> dict[str, Any]:
    counts = {verdict: sum(item["verdict"] == verdict for item in verdicts) for verdict in sorted(VALID_VERDICTS)}
    return {
        "schemaVersion": 1,
        "record": "friend-natal-owner-verdict-import-v1",
        "ownerReviewDate": owner_review_date,
        "governance": {
            "ownerRuling": OWNER_RULING,
            "blockingRecord": BLOCKING_RECORD,
            "audit": AUDIT_RECORD,
        },
        "sourceWorkbook": {
            "fileName": workbook_path.name,
            "sha256": sha256_bytes(workbook_bytes),
            "candidateRange": "Candidates43!I2:J44",
            "ownerDecisionRange": "OwnerDecisions!D2:D4",
        },
        "validation": {
            "candidateCount": len(verdicts),
            "ownerDecisionCount": len(decisions),
            "allRowsSampleBacked": True,
            "candidateKeysAndCanonicalMetadataHashesMatched": True,
            "partialImportAllowed": False,
        },
        "verdictCounts": counts,
        "candidateVerdicts": verdicts,
        "ownerDecisions": decisions,
        "stateChanges": {
            "candidateSourcesMutated": False,
            "candidateReviewStatesChanged": False,
            "servingRowsChanged": False,
            "autoPublish": False,
            "writerPromotionAuthorized": False,
        },
        "pass2": {
            "splitApproachAuthorizedByThisImport": False,
            "separateExplicitAuthorizationRequired": True,
        },
    }


def atomic_write_new(path: Path, text: str) -> None:
    if path.exists():
        raise ImportValidationError(f"Output already exists; refusing to overwrite: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path: Path | None = None
    try:
        fd, raw_path = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
        temp_path = Path(raw_path)
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_path, path)
        temp_path = None
    finally:
        if temp_path is not None:
            temp_path.unlink(missing_ok=True)


def import_workbook(workbook_path: Path, audit_path: Path, owner_review_date: str) -> dict[str, Any]:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", owner_review_date):
        raise ImportValidationError("--owner-review-date must use YYYY-MM-DD.")
    audit = load_json(audit_path)
    items, _ = validate_governed_sources(audit)
    workbook_bytes = workbook_path.read_bytes()
    sheets = read_xlsx_sheets(workbook_path)
    verdicts, decisions = validate_workbook_data(sheets, items)
    return build_record(workbook_path, workbook_bytes, owner_review_date, verdicts, decisions)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT)
    parser.add_argument("--owner-review-date", required=True, help="Owner decision date in YYYY-MM-DD form.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--out", type=Path, help="New owner-verdict record path; existing files are never overwritten.")
    group.add_argument("--check-only", action="store_true", help="Validate the populated workbook without writing a record.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        record = import_workbook(args.workbook.resolve(), args.audit.resolve(), args.owner_review_date)
        if args.out:
            output_path = args.out.resolve()
            atomic_write_new(output_path, json.dumps(record, ensure_ascii=False, indent=2) + "\n")
            print(f"friend natal owner verdict import: ok ({len(record['candidateVerdicts'])} atomic verdicts; {output_path})")
        else:
            print(f"friend natal owner verdict check: ok ({len(record['candidateVerdicts'])} atomic verdicts)")
        return 0
    except (ImportValidationError, OSError, json.JSONDecodeError) as exc:
        print(f"friend natal owner verdict import: REFUSED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
