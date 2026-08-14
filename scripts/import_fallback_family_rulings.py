#!/usr/bin/env python3
"""Atomically import the owner's 18-family approval rulings for 179 fallback rows.

The importer never infers approval from review_status. It validates the ruled
family set, the ruling template, every governed row hash, and the post-#230
approval baseline before producing any mutation.
"""

from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RULINGS = REPO_ROOT / "packages/astro-knowledge/review/TLDR-APPROVAL-RULING-NEEDED-179-ROWS.md"
DEFAULT_SOURCE = REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"
DEFAULT_RECONCILIATION = REPO_ROOT / "packages/astro-knowledge/review/fallback-approval-metadata-reconciliation-2026-08-13.json"
DEFAULT_MANIFEST = REPO_ROOT / "packages/astro-knowledge/review/fallback-family-ruling-179-manifest-v1.json"
DEFAULT_OUTPUT = REPO_ROOT / "packages/astro-knowledge/review/fallback-family-ruling-import-2026-08-14.json"
RULING_RECORD_PATH = "packages/astro-knowledge/review/TLDR-APPROVAL-RULING-NEEDED-179-ROWS.md"
IMPORT_ID = "fallback-family-ruling-import-2026-08-14"
VALID_RULINGS = {"approved", "not approved"}
READER_FIELDS = (
    "headline", "body", "body_you", "body_they", "body_sky", "fact_line",
    "aspect_insert", "primary_hook", "opening_heading", "opening",
    "tension_heading", "tension", "development_heading", "development",
    "close_heading", "close", "try_this", "aspect_units", "moon_entry_aspect_units",
)


class ImportValidationError(ValueError):
    """The governed ruling packet failed closed validation."""


@dataclass(frozen=True)
class FamilySpec:
    family: str
    count: int
    special: str | None = None


FAMILIES = (
    FamilySpec("fallback-hook/placement-sentence", 24),
    FamilySpec("fallback-hook/transit-house-event-wants", 24),
    FamilySpec("fallback-hook/daily-headline", 18, "copy-batch-a"),
    FamilySpec("fallback-hook/daily-body", 18, "copy-batch-a"),
    FamilySpec("fallback-hook/lunation-release", 12),
    FamilySpec("fallback-hook/lunation-higher-path", 12),
    FamilySpec("fallback-hook/house-glossary", 12),
    FamilySpec("fallback-hook/career-sign-essence", 12),
    FamilySpec("fallback-hook/sky-placement-retro-frame", 9),
    FamilySpec("fallback-hook/career-planet-tenth", 7),
    FamilySpec("fallback-hook/aspect-pattern", 6),
    FamilySpec("fallback-hook/aspect-pattern-activation", 6),
    FamilySpec("fallback-hook/synastry-aspect-type", 5),
    FamilySpec("fallback-hook/career-hemisphere", 4),
    FamilySpec("fallback-hook/career-node-mode", 3),
    FamilySpec("fallback-hook/aspect-pattern-apex", 3),
    FamilySpec("fallback-hook/transit-house-event-frame", 2),
    FamilySpec("fallback-hook/transit-house-retro-overlay", 2),
)


def canonical(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def sha256_text(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def row_without_approval(row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key != "approval"}


def reader_payload(row: dict[str, Any]) -> dict[str, Any]:
    return {field: row[field] for field in READER_FIELDS if field in row}


def normalized_template(text: str) -> str:
    normalized, count = re.subn(
        r"(?m)^(\*\*Your ruling:\*\*)[^\n]*$",
        r"\1 __RULING__",
        text,
    )
    if count != len(FAMILIES):
        raise ImportValidationError(f"Expected {len(FAMILIES)} ruling fields; found {count}.")
    return normalized


def parse_rulings(text: str) -> list[dict[str, Any]]:
    heading_re = re.compile(r"(?m)^## `([^`]+)` — (\d+) rows\s*$")
    matches = list(heading_re.finditer(text))
    if len(matches) != len(FAMILIES):
        raise ImportValidationError(f"Expected {len(FAMILIES)} ruled families; found {len(matches)}.")
    parsed: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        section = text[match.end():end]
        ruling_match = re.search(r"(?m)^\*\*Your ruling:\*\*([^\n]*)$", section)
        if not ruling_match:
            raise ImportValidationError(f"{match.group(1)}: missing ruling field.")
        raw = ruling_match.group(1).strip()
        cleaned = raw.strip("_ `*\t").strip().lower()
        if cleaned not in VALID_RULINGS:
            label = "blank" if not cleaned else repr(raw)
            raise ImportValidationError(f"{match.group(1)}: ruling must be exactly approved or not approved; found {label}.")
        parsed.append({"family": match.group(1), "declaredCount": int(match.group(2)), "ruling": cleaned, "rawRuling": raw})
    expected = [(spec.family, spec.count) for spec in FAMILIES]
    actual = [(item["family"], item["declaredCount"]) for item in parsed]
    if actual != expected:
        raise ImportValidationError("Family order or declared row counts drifted from the governed 179-row contract.")
    return parsed


def governed_rows(source: dict[str, Any], reconciliation: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    rows = source.get("hookRows") or []
    rows_by_key = {row.get("contentKey"): row for row in rows}
    if len(rows_by_key) != len(rows):
        raise ImportValidationError("Canonical fallback source contains duplicate contentKey values.")
    ungated_keys = set()
    for keys in (reconciliation.get("ungatedByReason") or {}).values():
        ungated_keys.update(keys)

    selected: dict[str, list[dict[str, Any]]] = {}
    for spec in FAMILIES:
        prefix = f"{spec.family}/"
        if spec.special == "copy-batch-a":
            family_rows = [
                row for row in rows
                if str(row.get("contentKey", "")).startswith(prefix)
                and str(row.get("note") or row.get("notes") or "").startswith("Copy Batch A:")
            ]
        else:
            family_rows = [
                rows_by_key[key] for key in sorted(ungated_keys)
                if key.startswith(prefix) and key in rows_by_key
            ]
        family_rows.sort(key=lambda row: row["contentKey"])
        if len(family_rows) != spec.count:
            raise ImportValidationError(f"{spec.family}: expected {spec.count} governed rows; found {len(family_rows)}.")
        selected[spec.family] = family_rows
    all_keys = [row["contentKey"] for family_rows in selected.values() for row in family_rows]
    if len(all_keys) != 179 or len(set(all_keys)) != 179:
        raise ImportValidationError("Governed family selection must resolve to exactly 179 unique rows.")
    return selected


def build_manifest(source_path: Path, reconciliation_path: Path, rulings_path: Path) -> dict[str, Any]:
    source = load_json(source_path)
    reconciliation = load_json(reconciliation_path)
    selections = governed_rows(source, reconciliation)
    ruling_text = rulings_path.read_text(encoding="utf-8")
    rows = []
    for spec in FAMILIES:
        for row in selections[spec.family]:
            rows.append({
                "family": spec.family,
                "contentKey": row["contentKey"],
                "rowWithoutApprovalSha256": sha256_text(canonical(row_without_approval(row))),
                "readerPayloadSha256": sha256_text(canonical(reader_payload(row))),
                "approvalLevelAtManifest": (row.get("approval") or {}).get("approvalLevel"),
            })
    levels = {level: sum(item["approvalLevelAtManifest"] == level for item in rows) for level in (None, "exact_owner_approved")}
    if levels != {None: 145, "exact_owner_approved": 34}:
        raise ImportValidationError(f"Unexpected 179-row approval baseline: {levels}.")
    return {
        "schemaVersion": 1,
        "id": "fallback-family-ruling-179-manifest-v1",
        "sourcePath": str(source_path.relative_to(REPO_ROOT)),
        "reconciliationRecord": str(reconciliation_path.relative_to(REPO_ROOT)),
        "rulingTemplatePath": str(rulings_path.relative_to(REPO_ROOT)),
        "rulingTemplateSha256": sha256_text(normalized_template(ruling_text)),
        "counts": {"families": 18, "rows": 179, "currentlyUngated": 145, "alreadyExactOwnerApproved": 34},
        "rows": rows,
    }


def validate_manifest(manifest: dict[str, Any], source_path: Path, reconciliation_path: Path, rulings_path: Path) -> tuple[dict[str, Any], dict[str, list[dict[str, Any]]]]:
    source = load_json(source_path)
    reconciliation = load_json(reconciliation_path)
    selections = governed_rows(source, reconciliation)
    if manifest.get("schemaVersion") != 1 or manifest.get("counts", {}).get("rows") != 179:
        raise ImportValidationError("Invalid governed 179-row manifest schema.")
    if sha256_text(normalized_template(rulings_path.read_text(encoding="utf-8"))) != manifest.get("rulingTemplateSha256"):
        raise ImportValidationError("Ruling file changed outside the 18 owner-ruling fields.")
    manifest_by_key = {item.get("contentKey"): item for item in manifest.get("rows") or []}
    if len(manifest_by_key) != 179:
        raise ImportValidationError("Manifest must contain exactly 179 unique row keys.")
    for family, rows in selections.items():
        for row in rows:
            item = manifest_by_key.get(row["contentKey"])
            if not item or item.get("family") != family:
                raise ImportValidationError(f"{row['contentKey']}: manifest family/key mismatch.")
            if sha256_text(canonical(row_without_approval(row))) != item.get("rowWithoutApprovalSha256"):
                raise ImportValidationError(f"{row['contentKey']}: source row hash drifted.")
            if sha256_text(canonical(reader_payload(row))) != item.get("readerPayloadSha256"):
                raise ImportValidationError(f"{row['contentKey']}: reader payload hash drifted.")
            current_level = (row.get("approval") or {}).get("approvalLevel")
            if current_level != item.get("approvalLevelAtManifest"):
                raise ImportValidationError(f"{row['contentKey']}: approval baseline drifted.")
    return source, selections


def prepare_import(*, source_path: Path, reconciliation_path: Path, rulings_path: Path, manifest_path: Path, owner_review_date: str) -> tuple[dict[str, Any], dict[str, Any]]:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", owner_review_date):
        raise ImportValidationError("--owner-review-date must use YYYY-MM-DD.")
    manifest = load_json(manifest_path)
    source, selections = validate_manifest(manifest, source_path, reconciliation_path, rulings_path)
    ruling_text = rulings_path.read_text(encoding="utf-8")
    rulings = parse_rulings(ruling_text)
    ruling_by_family = {item["family"]: item for item in rulings}
    result_source = copy.deepcopy(source)
    result_by_key = {row["contentKey"]: row for row in result_source.get("hookRows") or []}
    source_reader_hash = sha256_text(canonical([[row["contentKey"], reader_payload(row)] for row in source.get("hookRows") or []]))
    actions = []
    for spec in FAMILIES:
        ruling = ruling_by_family[spec.family]["ruling"]
        for original in selections[spec.family]:
            row = result_by_key[original["contentKey"]]
            level = (row.get("approval") or {}).get("approvalLevel")
            if ruling == "not approved" and level == "exact_owner_approved":
                raise ImportValidationError(f"{spec.family}: not approved conflicts with {row['contentKey']}, which already has exact owner approval; explicit revocation is required.")
            if ruling == "approved" and level is None:
                payload_hash = sha256_text(canonical(reader_payload(row)))
                row["approval"] = {
                    "approvalLevel": "owner_signoff_untraced",
                    "approvedAt": owner_review_date,
                    "evidence": f"Owner family ruling {owner_review_date}: approved",
                    "recordPath": RULING_RECORD_PATH,
                    "rulingFileSha256": sha256_text(ruling_text),
                    "readerPayloadSha256": payload_hash,
                    "migratedBy": IMPORT_ID,
                }
                action = "set-owner-signoff-untraced"
            elif ruling == "approved" and level == "exact_owner_approved":
                action = "preserve-exact-owner-approved"
            else:
                action = "remain-ungated"
            actions.append({"family": spec.family, "contentKey": row["contentKey"], "ruling": ruling, "action": action})
    result_reader_hash = sha256_text(canonical([[row["contentKey"], reader_payload(row)] for row in result_source.get("hookRows") or []]))
    if result_reader_hash != source_reader_hash:
        raise ImportValidationError("Family-ruling import changed reader-facing copy.")
    record = {
        "schemaVersion": 1,
        "id": IMPORT_ID,
        "ownerReviewDate": owner_review_date,
        "sourceRuling": {"path": RULING_RECORD_PATH, "sha256": sha256_text(ruling_text)},
        "manifest": {"path": str(manifest_path.relative_to(REPO_ROOT)), "sha256": sha256_text(manifest_path.read_text(encoding="utf-8"))},
        "validation": {"families": 18, "rows": 179, "partialImportAllowed": False, "ambiguousRulingsAllowed": False, "rowHashesMatched": True},
        "familyRulings": rulings,
        "actions": actions,
        "counts": {
            "setOwnerSignoffUntraced": sum(item["action"] == "set-owner-signoff-untraced" for item in actions),
            "preservedExactOwnerApproved": sum(item["action"] == "preserve-exact-owner-approved" for item in actions),
            "remainUngated": sum(item["action"] == "remain-ungated" for item in actions),
        },
        "invariants": {"readerPayloadSha256Before": source_reader_hash, "readerPayloadSha256After": result_reader_hash, "copyChanged": False},
    }
    return result_source, record


def write_transaction(source_path: Path, output_path: Path, source: dict[str, Any], record: dict[str, Any]) -> None:
    if output_path.exists():
        raise ImportValidationError(f"Output record already exists; refusing to overwrite: {output_path}")
    source_bytes = source_path.read_bytes()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    source_temp: Path | None = None
    record_temp: Path | None = None
    backup_temp: Path | None = None
    try:
        source_fd, source_name = tempfile.mkstemp(prefix=f".{source_path.name}.", suffix=".tmp", dir=source_path.parent)
        source_temp = Path(source_name)
        with os.fdopen(source_fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(source, ensure_ascii=False, indent=1) + "\n")
            handle.flush(); os.fsync(handle.fileno())
        record_fd, record_name = tempfile.mkstemp(prefix=f".{output_path.name}.", suffix=".tmp", dir=output_path.parent)
        record_temp = Path(record_name)
        with os.fdopen(record_fd, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(json.dumps(record, ensure_ascii=False, indent=2) + "\n")
            handle.flush(); os.fsync(handle.fileno())
        backup_fd, backup_name = tempfile.mkstemp(prefix=f".{source_path.name}.", suffix=".rollback", dir=source_path.parent)
        backup_temp = Path(backup_name)
        with os.fdopen(backup_fd, "wb") as handle:
            handle.write(source_bytes); handle.flush(); os.fsync(handle.fileno())
        os.replace(source_temp, source_path); source_temp = None
        try:
            os.replace(record_temp, output_path); record_temp = None
        except OSError:
            os.replace(backup_temp, source_path); backup_temp = None
            raise
        backup_temp.unlink(missing_ok=True); backup_temp = None
    finally:
        for path in (source_temp, record_temp, backup_temp):
            if path is not None:
                path.unlink(missing_ok=True)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rulings", type=Path, default=DEFAULT_RULINGS)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--reconciliation", type=Path, default=DEFAULT_RECONCILIATION)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--owner-review-date", default="2026-08-14")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--build-manifest", action="store_true")
    mode.add_argument("--check-only", action="store_true")
    mode.add_argument("--write", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    try:
        if args.build_manifest:
            if args.manifest.exists():
                raise ImportValidationError(f"Manifest already exists; refusing to overwrite: {args.manifest}")
            manifest = build_manifest(args.source.resolve(), args.reconciliation.resolve(), args.rulings.resolve())
            args.manifest.parent.mkdir(parents=True, exist_ok=True)
            args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"fallback family ruling manifest: ok ({manifest['counts']['rows']} rows)")
            return 0
        source, record = prepare_import(
            source_path=args.source.resolve(), reconciliation_path=args.reconciliation.resolve(),
            rulings_path=args.rulings.resolve(), manifest_path=args.manifest.resolve(),
            owner_review_date=args.owner_review_date,
        )
        if args.write:
            write_transaction(args.source.resolve(), args.out.resolve(), source, record)
            print(f"fallback family ruling import: ok ({record['counts']}; {args.out.resolve()})")
        else:
            print(f"fallback family ruling check: ok ({record['counts']})")
        return 0
    except (ImportValidationError, OSError, json.JSONDecodeError) as exc:
        print(f"fallback family ruling import: REFUSED: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
