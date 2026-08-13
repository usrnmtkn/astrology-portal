#!/usr/bin/env python3
"""Atomically validate and optionally apply an LL V13 WP-1 owner verdict batch."""

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
DEFAULT_WORKBOOK = REPO_ROOT / "tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-01-OWNER-REVIEW.xlsx"
DEFAULT_MANIFEST = REPO_ROOT / "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"
SOURCE_ROWS = REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
APPROVED_OVERLAY = REPO_ROOT / "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/wp1-owner-approved-locked.json"
CANONICAL_LOCKED = REPO_ROOT / "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json"
PUBLIC_LOCKED = REPO_ROOT / "apps/web/public/content/knowledge-matrix-v13/v13-direct-language-owner-approved/knowledge-matrix-v13-owner-approved-locked.json"
RUNTIME_MANIFEST = REPO_ROOT / "packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json"
FRIEND_CANDIDATES = REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-ll-v13-wp1-derived-candidates-v1.json"
VALID_VERDICTS = {"approve", "edit", "cut"}
EXPECTED_HEADERS = [
    "#", "Sheet", "Family", "Row key", "Current copy", "Judge annotation (V13 clarity rubric)",
    "QA flagged passages", "QA judged passages", "QA flag rate", "Owner verdict", "Owner edit", "Metadata SHA-256",
]


class ImportValidationError(ValueError):
    """A governed input failed closed validation."""


@dataclass(frozen=True)
class SheetData:
    cells: dict[str, str]
    formulas: frozenset[str]


def sha256(value: bytes | str) -> str:
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode("utf-8")).hexdigest()


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def stable_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def relationship_target(base: str, target: str) -> str:
    return target.lstrip("/") if target.startswith("/") else str(PurePosixPath(base).parent.joinpath(target))


def read_xlsx_sheets(path: Path) -> dict[str, SheetData]:
    if not path.is_file():
        raise ImportValidationError(f"Workbook not found: {path}")
    try:
        with zipfile.ZipFile(path) as archive:
            workbook_xml = ET.fromstring(archive.read("xl/workbook.xml"))
            rels_xml = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
            rel_targets = {rel.attrib["Id"]: relationship_target("xl/workbook.xml", rel.attrib["Target"]) for rel in rels_xml}
            shared_strings: list[str] = []
            if "xl/sharedStrings.xml" in archive.namelist():
                root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
                shared_strings = ["".join(node.itertext()) for node in root]
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
                    if any(child.tag.endswith("}f") for child in cell):
                        formulas.add(ref)
                    cell_type = cell.attrib.get("t")
                    if cell_type == "inlineStr":
                        inline = next((node for node in cell if node.tag.endswith("}is")), None)
                        value = "" if inline is None else "".join(inline.itertext())
                    else:
                        node = next((node for node in cell if node.tag.endswith("}v")), None)
                        value = "" if node is None or node.text is None else node.text
                        if cell_type == "s" and value:
                            value = shared_strings[int(value)]
                    cells[ref] = value
                sheets[name] = SheetData(cells, frozenset(formulas))
            return sheets
    except (ET.ParseError, KeyError, ValueError, zipfile.BadZipFile) as exc:
        raise ImportValidationError(f"Invalid XLSX workbook: {path}") from exc


def cell(sheet: SheetData, column: str, row: int) -> str:
    return sheet.cells.get(f"{column}{row}", "")


def numeric_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else str(value)
    return str(value)


def validate_manifest(manifest: dict[str, Any], batch_id: str) -> dict[str, Any]:
    if manifest.get("schemaVersion") != "ll-matrix-v13-wp1-review-batches-v1":
        raise ImportValidationError("Unsupported WP-1 manifest schema.")
    if manifest.get("source", {}).get("unapprovedRows") != 713:
        raise ImportValidationError("The manifest must account for exactly 713 unapproved rows.")
    if manifest.get("governance", {}).get("partialImportsAllowed") is not False:
        raise ImportValidationError("The manifest does not enforce atomic imports.")
    source_metadata = manifest.get("source", {})
    source_path = REPO_ROOT / source_metadata.get("exportPath", "")
    workbook_path = REPO_ROOT / source_metadata.get("workbookPath", "")
    if not source_path.is_file() or sha256(source_path.read_bytes()) != source_metadata.get("exportSha256"):
        raise ImportValidationError("The 1,014-row LL V13 source export hash drifted.")
    if not workbook_path.is_file() or sha256(workbook_path.read_bytes()) != source_metadata.get("workbookSha256"):
        raise ImportValidationError("The canonical LL V13 workbook hash drifted.")
    source_rows = load_json(source_path).get("rows", [])
    source_by_id = {(row.get("sheet"), row.get("key")): row for row in source_rows}
    batches = manifest.get("batches", [])
    packet_rows = [row for packet in batches for row in packet.get("rows", [])]
    if len(packet_rows) != 713 or len({(row.get("sheet"), row.get("rowKey")) for row in packet_rows}) != 713:
        raise ImportValidationError("The batch manifest must partition all 713 source rows exactly once.")
    if len({row.get("contentKey") for row in packet_rows}) != 713:
        raise ImportValidationError("The batch manifest contains duplicate runtime content keys.")
    for row in packet_rows:
        source_row = source_by_id.get((row.get("sheet"), row.get("rowKey")))
        if not source_row or source_row.get("ownerApproved") is True or source_row.get("copy") != row.get("currentCopy"):
            raise ImportValidationError(f"Manifest source row drifted: {row.get('sheet')}/{row.get('rowKey')}")
        metadata = {
            "sheet": row["sheet"], "workbookRow": row["workbookRow"], "rowKey": row["rowKey"],
            "contentKey": row["contentKey"], "family": row["family"], "copySha256": sha256(row["currentCopy"]),
            "sourceWorkbookSha256": source_metadata["workbookSha256"], "sourceExportSha256": source_metadata["exportSha256"],
        }
        if sha256(stable_json(metadata)) != row.get("metadataSha256"):
            raise ImportValidationError(f"Manifest metadata SHA-256 drifted: {row['sheet']}/{row['rowKey']}")
    matches = [batch for batch in batches if batch.get("batchId") == batch_id]
    if len(matches) != 1:
        raise ImportValidationError(f"Manifest batch not found exactly once: {batch_id}")
    batch = matches[0]
    rows = batch.get("rows")
    if not isinstance(rows, list) or len(rows) != batch.get("rowCount") or len({row.get("rowKey") for row in rows}) != len(rows):
        raise ImportValidationError(f"{batch_id}: invalid row packet.")
    return batch


def validate_workbook(workbook: Path, batch: dict[str, Any]) -> list[dict[str, Any]]:
    sheets = read_xlsx_sheets(workbook)
    if "Candidates132" not in sheets:
        raise ImportValidationError("Workbook is missing Candidates132.")
    review = sheets["Candidates132"]
    headers = [cell(review, chr(ord("A") + index), 1) for index in range(12)]
    if headers != EXPECTED_HEADERS:
        raise ImportValidationError("Candidates132 headers drifted from the governed contract.")
    controlled_formula_refs = {f"{column}{row}" for row in range(2, len(batch["rows"]) + 2) for column in ("J", "K")}
    formulas = sorted(controlled_formula_refs.intersection(review.formulas))
    if formulas:
        raise ImportValidationError(f"Formula cells are refused in owner inputs: {', '.join(formulas)}")
    verdicts: list[dict[str, Any]] = []
    seen: set[str] = set()
    for index, item in enumerate(batch["rows"], start=1):
        row = index + 1
        expected = [
            str(index), item["sheet"], item["family"], item["rowKey"], item["currentCopy"], item["judgeAnnotation"],
            str(item["qa"]["flaggedPassages"]), str(item["qa"]["judgedPassages"]),
            "" if item["qa"]["flagRate"] is None else numeric_text(item["qa"]["flagRate"]), item["metadataSha256"],
        ]
        actual = [cell(review, column, row) for column in ("A", "B", "C", "D", "E", "F", "G", "H", "I", "L")]
        # Spreadsheet serialization may round a displayed floating-point rate; all authority fields remain exact.
        exact_indexes = [0, 1, 2, 3, 4, 5, 6, 7, 9]
        field_names = ["#", "Sheet", "Family", "Row key", "Current copy", "Judge annotation", "QA flagged passages", "QA judged passages", "QA flag rate", "Metadata SHA-256"]
        mismatches = [field_names[position] for position in exact_indexes if actual[position] != expected[position]]
        if mismatches:
            raise ImportValidationError(f"Candidates132 row {row} drifted in: {', '.join(mismatches)}")
        key = actual[3]
        if key in seen:
            raise ImportValidationError(f"Duplicate workbook row key: {key}")
        seen.add(key)
        verdict = cell(review, "J", row).strip().lower()
        edit = cell(review, "K", row)
        if verdict not in VALID_VERDICTS:
            raise ImportValidationError(f"Candidates132!J{row} must be approve, edit, or cut.")
        if verdict == "edit" and not edit.strip():
            raise ImportValidationError(f"Candidates132!K{row} requires the owner's verbatim edit.")
        if verdict != "edit" and edit != "":
            raise ImportValidationError(f"Candidates132!K{row} must be blank unless verdict is edit.")
        adopted = item["currentCopy"] if verdict == "approve" else edit if verdict == "edit" else None
        verdicts.append({
            "number": index, "sheet": item["sheet"], "family": item["family"], "rowKey": key,
            "workbookRow": item["workbookRow"], "ownerReviewWorkbookRow": row,
            "contentKey": item["contentKey"], "metadataSha256": item["metadataSha256"],
            "verdict": verdict, "disposition": {"approve": "adopt-current-copy-byte-identically", "edit": "adopt-owner-wording-verbatim", "cut": "discard-row"}[verdict],
            "adoptedCopy": adopted,
        })
    return verdicts


def build_record(workbook: Path, workbook_bytes: bytes, manifest_path: Path, batch: dict[str, Any], verdicts: list[dict[str, Any]], owner_review_date: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "record": "ll-matrix-v13-wp1-owner-verdict-import-v1",
        "batchId": batch["batchId"],
        "ownerReviewDate": owner_review_date,
        "sourceWorkbook": {"fileName": workbook.name, "sha256": sha256(workbook_bytes), "ownerInputRange": f"Candidates132!J2:K{len(verdicts) + 1}"},
        "batchManifest": {"path": str(manifest_path.relative_to(REPO_ROOT)), "sha256": sha256(manifest_path.read_bytes())},
        "validation": {"candidateCount": len(verdicts), "allRowsHashMatched": True, "allControlledFieldsMatched": True, "partialImportAllowed": False},
        "verdictCounts": {name: sum(item["verdict"] == name for item in verdicts) for name in sorted(VALID_VERDICTS)},
        "verdicts": verdicts,
        "governance": {"unapprovedRowsServe": False, "friendDerivationsReviewGated": True, "autoPublish": False, "writerPromotion": False},
    }


def runtime_family(family: str) -> str:
    family_map = {
        "natal-aspect-exact": "natal-aspect-lived", "natal-aspect-generic": "natal-aspect-generic-lived",
        "placement-sign-exact": "placement-sign-lived", "placement-house-exact": "placement-house-lived",
        "planet-generic": "planet-lived", "sign-generic": "sign-lived", "house-generic": "house-lived",
        "node-sign": "placement-sign-lived", "node-house": "placement-house-lived", "lunar-phase": "natal-moon-phase-lived", "part-of-fortune": "planet-lived",
    }
    return family_map[family]


def source_row_for(item: dict[str, Any], record_path: Path, owner_review_date: str) -> dict[str, Any]:
    body = item["adoptedCopy"]
    return {
        "contentKey": item["contentKey"], "content_role": "full_copy", "grammar_frame": "complete_sentence", "body": body,
        "reader_only": True, "render_policy": "reader-only-exact-lived-v1", "review_status": "approved",
        "source_keys": [str(record_path.relative_to(REPO_ROOT)), str(APPROVED_OVERLAY.relative_to(REPO_ROOT))],
        "approval": {"approvalLevel": "exact_owner_approved", "recordPath": str(record_path.relative_to(REPO_ROOT)), "payloadSha256": sha256(compact_json({"body": body})), "approvedAt": owner_review_date},
        "source_release": f"ll-matrix-v13-{item['batchId'].lower()}-owner-approved", "runtime_family": runtime_family(item["family"]),
        "runtime_key": item["rowKey"], "source_sheet": item["sheet"], "governance": "owner-approved-v13-wp1",
        "owner_approved": True, "precedence": "owner-approved V13 WP-1 exact key supersedes earlier LL copy on the same runtime key", "distribution_lane": "serving",
    }


def friend_candidate(item: dict[str, Any], owner_review_date: str) -> dict[str, Any] | None:
    if item["family"] not in {"placement-sign-exact", "placement-house-exact"}:
        return None
    target = item["contentKey"].replace("fallback-hook/placement-sign-lived/", "fallback-hook/placement-sentence/").replace("fallback-hook/placement-house-lived/", "fallback-hook/placement-house-sentence/")
    return {
        "candidateId": f"friend-derived:{item['batchId']}:{item['rowKey']}", "contentKey": target,
        "sourceContentKey": item["contentKey"], "sourceCopySha256": sha256(item["adoptedCopy"]), "sourceApprovedAt": owner_review_date,
        "derivationState": "queued_for_friend_authored_derivation", "renderedComposedSample": None,
        "stableRenderContract": {"surface": "friend", "person": "third-person-singular-they", "sourceKey": item["contentKey"], "mustFailClosedUntilAuthored": True},
        "review_status": "needs_review", "ownerApproved": False, "servingAuthorized": False, "promotionAuthorized": False,
    }


def atomic_replace_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def formatted_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def apply_import(record: dict[str, Any], record_path: Path) -> None:
    approved = [{**item, "batchId": record["batchId"]} for item in record["verdicts"] if item["verdict"] in {"approve", "edit"}]
    source = load_json(SOURCE_ROWS)
    all_existing = [*(source.get("vocabularyRows") or []), *(source.get("hookRows") or [])]
    keys = [row.get("contentKey") for row in all_existing]
    if len(keys) != len(set(keys)):
        raise ImportValidationError("Canonical source fails the duplicate-contentKey gate before import.")
    approved_keys = {item["contentKey"] for item in approved}
    preserved = [row for row in source["hookRows"] if row.get("contentKey") not in approved_keys]
    before_fingerprint = sha256(compact_json([row for row in source["hookRows"] if row.get("contentKey") not in approved_keys]))
    serving_rows = [source_row_for(item, record_path, record["ownerReviewDate"]) for item in approved]
    source["hookRows"] = [*preserved, *serving_rows]
    after_fingerprint = sha256(compact_json(preserved))
    if before_fingerprint != after_fingerprint:
        raise ImportValidationError("Approved-copy invariant failed outside the imported exact keys.")
    final_keys = [row.get("contentKey") for row in [*(source.get("vocabularyRows") or []), *source["hookRows"]]]
    if len(final_keys) != len(set(final_keys)):
        raise ImportValidationError("Canonical source fails the duplicate-contentKey gate after import.")

    overlay = load_json(APPROVED_OVERLAY)
    prior_overlay = [row for row in overlay["rows"] if row.get("contentKey") not in approved_keys]
    overlay_rows = [{
        "batchId": record["batchId"], "sheet": item["sheet"], "workbookRow": item["workbookRow"], "ownerReviewWorkbookRow": item["ownerReviewWorkbookRow"],
        "key": item["rowKey"], "contentKey": item["contentKey"], "runtimeFamily": runtime_family(item["family"]),
        "copy": item["adoptedCopy"], "ownerApproved": True, "approvedAt": record["ownerReviewDate"], "governance": "owner-approved-v13-wp1",
        "authorship": "owner_authored", "payloadSha256": sha256(compact_json({"body": item["adoptedCopy"]})), "metadataSha256": item["metadataSha256"],
        "workbookProvenance": {"path": record["sourceWorkbook"]["fileName"], "sheet": "Candidates132", "row": item["ownerReviewWorkbookRow"]},
    } for item in approved]
    overlay["rows"] = [*prior_overlay, *overlay_rows]
    overlay["counts"] = {"ownerApprovedRows": len(overlay["rows"]), "byBatch": {batch: sum(row["batchId"] == batch for row in overlay["rows"]) for batch in sorted({row["batchId"] for row in overlay["rows"]})}}

    candidates = load_json(FRIEND_CANDIDATES)
    new_candidates = [candidate for item in approved if (candidate := friend_candidate(item, record["ownerReviewDate"]))]
    new_keys = {candidate["contentKey"] for candidate in new_candidates}
    candidates["rows"] = [row for row in candidates["rows"] if row.get("contentKey") not in new_keys] + new_candidates

    canonical_locked = load_json(CANONICAL_LOCKED)
    base_rows = [row for row in canonical_locked["rows"] if not row.get("batchId")]
    combined_rows = [*base_rows, *overlay["rows"]]
    if len({row["contentKey"] for row in combined_rows}) != len(combined_rows):
        raise ImportValidationError("Combined runtime locked store contains duplicate content keys.")
    canonical_locked["rows"] = combined_rows
    canonical_locked["counts"]["ownerApprovedRows"] = len(combined_rows)
    canonical_locked["counts"]["excludedUnapprovedRows"] = 1014 - len(combined_rows)
    canonical_locked["counts"]["bySheet"] = {sheet: sum(row["sheet"] == sheet for row in combined_rows) for sheet in ("PlacementMeanings", "AspectMeanings", "NodesPhasesFortune")}
    canonical_locked["counts"]["byGovernance"] = {governance: sum(row["governance"] == governance for row in combined_rows) for governance in sorted({row["governance"] for row in combined_rows})}
    canonical_locked["counts"]["byRuntimeFamily"] = {family: sum(row["runtimeFamily"] == family for row in combined_rows) for family in sorted({row["runtimeFamily"] for row in combined_rows})}
    if "owner-approved-v13-wp1" not in canonical_locked["governance"]["allowedLabels"]:
        canonical_locked["governance"]["allowedLabels"].append("owner-approved-v13-wp1")

    runtime_manifest = load_json(RUNTIME_MANIFEST)
    canonical_bytes = formatted_json_bytes(canonical_locked)
    runtime_manifest["lockedRowsSha256"] = sha256(canonical_bytes)
    runtime_manifest["ownerApprovedRows"] = len(combined_rows)
    runtime_manifest["excludedUnapprovedRows"] = 1014 - len(combined_rows)
    runtime_manifest["approvedSheetCounts"] = canonical_locked["counts"]["bySheet"]
    runtime_manifest["governanceCounts"] = {governance: sum(row["governance"] == governance for row in combined_rows) for governance in sorted({row["governance"] for row in combined_rows})}
    runtime_manifest["runtimeFamilyCounts"] = canonical_locked["counts"]["byRuntimeFamily"]
    runtime_manifest["uniqueServingContentKeys"] = len(combined_rows)
    runtime_manifest["rows"] = [{
        "workbookKey": row["key"], "sourceSheet": row["sheet"], "workbookRow": row.get("workbookRow"),
        "contentKey": row["contentKey"], "governance": row["governance"], "payloadSha256": row["payloadSha256"],
        **({"batchId": row["batchId"]} if row.get("batchId") else {}),
    } for row in combined_rows]
    serving_approved = {"approved", "approved_reuse", "reviewed"}
    runtime_manifest["invariants"]["existingApprovedRowsSha256"] = sha256(compact_json([
        row for row in source["hookRows"] if row.get("contentKey") not in {locked["contentKey"] for locked in combined_rows} and row.get("review_status") in serving_approved
    ]))
    runtime_manifest["invariants"]["approvedPayloadSha256"] = sha256(compact_json([
        {"sheet": row["sheet"], "key": row["key"], "copy": row["copy"], "governance": row["governance"]} for row in combined_rows
    ]))

    atomic_replace_json(SOURCE_ROWS, source)
    atomic_replace_json(APPROVED_OVERLAY, overlay)
    atomic_replace_json(CANONICAL_LOCKED, canonical_locked)
    atomic_replace_json(PUBLIC_LOCKED, canonical_locked)
    atomic_replace_json(RUNTIME_MANIFEST, runtime_manifest)
    atomic_replace_json(FRIEND_CANDIDATES, candidates)


def atomic_write_new(path: Path, value: Any) -> None:
    if path.exists():
        raise ImportValidationError(f"Output exists; refusing overwrite: {path}")
    atomic_replace_json(path, value)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--batch-id", default="WP1-B01")
    parser.add_argument("--owner-review-date", required=True)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--check-only", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.owner_review_date):
            raise ImportValidationError("--owner-review-date must use YYYY-MM-DD.")
        if args.apply and (args.check_only or not args.out):
            raise ImportValidationError("--apply requires --out and cannot be combined with --check-only.")
        manifest_path = args.manifest.resolve()
        manifest = load_json(manifest_path)
        batch = validate_manifest(manifest, args.batch_id)
        workbook = args.workbook.resolve()
        workbook_bytes = workbook.read_bytes()
        verdicts = validate_workbook(workbook, batch)
        record = build_record(workbook, workbook_bytes, manifest_path, batch, verdicts, args.owner_review_date)
        if args.out:
            output = args.out.resolve()
            atomic_write_new(output, record)
            if args.apply:
                apply_import(record, output)
        print(f"LL V13 WP-1 verdict import: ok ({len(verdicts)} atomic verdicts; apply={args.apply})")
        return 0
    except (ImportValidationError, OSError, json.JSONDecodeError) as exc:
        print(f"LL V13 WP-1 verdict import: REFUSED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
