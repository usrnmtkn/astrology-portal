#!/usr/bin/env python3
"""Regression tests for the fail-closed LL V13 WP-1 verdict importer."""

from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORTER_PATH = REPO_ROOT / "scripts/import_ll_v13_wp1_owner_verdicts.py"
ORIGINAL_WORKBOOK = REPO_ROOT / "tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-01-OWNER-REVIEW.xlsx"
EDITORIAL_WORKBOOK = REPO_ROOT / "packages/astro-knowledge/review/TLDR-LL-V13-WP1-BATCH-01-EDITORIAL-REVISION-V2.xlsx"
MANIFEST = REPO_ROOT / "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"

spec = importlib.util.spec_from_file_location("wp1_importer", IMPORTER_PATH)
assert spec and spec.loader
importer = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = importer
spec.loader.exec_module(importer)


def populate(
    source: Path,
    target: Path,
    verdicts: dict[int, str] | None = None,
    edits: dict[int, str] | None = None,
    overrides: dict[str, str] | None = None,
) -> None:
    verdicts = verdicts or {}
    edits = edits or {}
    overrides = overrides or {}
    with zipfile.ZipFile(source) as incoming, zipfile.ZipFile(target, "w") as outgoing:
        for info in incoming.infolist():
            payload = incoming.read(info.filename)
            if info.filename == "xl/worksheets/sheet3.xml":
                root = ET.fromstring(payload)
                namespace = root.tag.split("}")[0].lstrip("{")
                ET.register_namespace("", namespace)
                by_ref = {node.attrib.get("r"): node for node in root.iter() if node.tag.endswith("}c")}

                def write_cell(ref: str, value: str) -> None:
                    node = by_ref[ref]
                    for child in list(node):
                        node.remove(child)
                    node.attrib["t"] = "inlineStr"
                    inline = ET.SubElement(node, f"{{{namespace}}}is")
                    text = ET.SubElement(inline, f"{{{namespace}}}t")
                    text.text = value

                for candidate in range(1, 133):
                    write_cell(f"J{candidate + 1}", verdicts.get(candidate, "cut"))
                    write_cell(f"K{candidate + 1}", edits.get(candidate, ""))
                for ref, value in overrides.items():
                    write_cell(ref, value)
                payload = ET.tostring(root, encoding="utf-8", xml_declaration=True)
            outgoing.writestr(info, payload)


def main() -> None:
    manifest = importer.load_json(MANIFEST)
    batch = importer.validate_manifest(manifest, "WP1-B01")
    original_sheet = importer.read_xlsx_sheets(ORIGINAL_WORKBOOK)[importer.candidate_sheet_name(batch)]
    revision_sheet = importer.read_xlsx_sheets(EDITORIAL_WORKBOOK)[importer.candidate_sheet_name(batch)]
    preserved_refs = {
        f"{column}{row}"
        for row in range(1, 134)
        for column in ("A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L")
    }
    assert all(original_sheet.cells.get(ref, "") == revision_sheet.cells.get(ref, "") for ref in preserved_refs)
    assert original_sheet.formulas.intersection(preserved_refs) == revision_sheet.formulas.intersection(preserved_refs)
    assert all(importer.cell(original_sheet, "L", row) == importer.cell(revision_sheet, "L", row) for row in range(2, 134))
    try:
        importer.validate_workbook(EDITORIAL_WORKBOOK, batch)
        raise AssertionError("Blank owner inputs must fail closed.")
    except importer.ImportValidationError as exc:
        assert "must be approve, edit, or cut" in str(exc)

    editorial_sheet = importer.read_xlsx_sheets(EDITORIAL_WORKBOOK)[importer.candidate_sheet_name(batch)]
    editorial_rows = importer.validate_editorial_packet(editorial_sheet, batch)
    assert editorial_rows is not None
    assert sum(row["disposition"] == "AS_IS" for row in editorial_rows) == 47
    assert sum(row["disposition"] == "LIGHT_EDIT" for row in editorial_rows) == 10
    assert sum(row["disposition"] == "REWRITE" for row in editorial_rows) == 75
    assert sum(bool(row["revisedCopy"]) for row in editorial_rows) == 85

    gated_rows = [dict(row) for row in editorial_rows]
    gated_rows[0]["revisedCopy"] = "A clean opening becomes a blocked ending — this must fail."
    try:
        importer.validate_editorial_rows(batch["rows"], gated_rows)
        raise AssertionError("The em-dash editorial gate must fail closed.")
    except importer.EditorialValidationError as exc:
        assert "em-dash" in str(exc)

    repeated = [
        {"rowKey": batch["rows"][0]["rowKey"], "disposition": "REWRITE", "revisedCopy": "People notice the first pattern. It has a consequence.", "editorialNote": "Test."},
        {"rowKey": batch["rows"][1]["rowKey"], "disposition": "REWRITE", "revisedCopy": "People notice the second pattern. It lands differently.", "editorialNote": "Test."},
    ]
    try:
        importer.validate_editorial_rows(batch["rows"][:2], repeated)
        raise AssertionError("Repeated neighboring openings must fail closed.")
    except importer.EditorialValidationError as exc:
        assert "repeat the opening construction" in str(exc)

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        populated = root / "populated.xlsx"
        populate(EDITORIAL_WORKBOOK, populated, {1: "approve"})
        verdicts = importer.validate_workbook(populated, batch)
        assert len(verdicts) == 132
        assert verdicts[0]["verdict"] == "approve"
        assert verdicts[0]["adoptedCopy"] == editorial_rows[0]["revisedCopy"]
        assert verdicts[0]["adoptedCopy"] != batch["rows"][0]["currentCopy"]
        assert verdicts[0]["disposition"] == "adopt-editorial-revision-verbatim"
        assert sum(item["verdict"] == "cut" for item in verdicts) == 131

        as_is_populated = root / "as-is-populated.xlsx"
        populate(EDITORIAL_WORKBOOK, as_is_populated, {3: "approve"})
        as_is_verdicts = importer.validate_workbook(as_is_populated, batch)
        assert as_is_verdicts[2]["adoptedCopy"] == batch["rows"][2]["currentCopy"]
        assert as_is_verdicts[2]["disposition"] == "adopt-current-copy-byte-identically"

        owner_edit = root / "owner-edit.xlsx"
        populate(EDITORIAL_WORKBOOK, owner_edit, {1: "edit"}, {1: "Owner wording stays verbatim."})
        owner_edit_verdicts = importer.validate_workbook(owner_edit, batch)
        assert owner_edit_verdicts[0]["adoptedCopy"] == "Owner wording stays verbatim."

        inconsistent = root / "inconsistent.xlsx"
        populate(EDITORIAL_WORKBOOK, inconsistent, {1: "approve"}, overrides={"M2": ""})
        try:
            importer.validate_workbook(inconsistent, batch)
            raise AssertionError("Approve with revised copy and missing disposition must fail closed.")
        except importer.ImportValidationError as exc:
            assert "invalid disposition" in str(exc)

        legacy = root / "legacy.xlsx"
        populate(ORIGINAL_WORKBOOK, legacy, {1: "approve"})
        legacy_verdicts = importer.validate_workbook(legacy, batch)
        assert legacy_verdicts[0]["adoptedCopy"] == batch["rows"][0]["currentCopy"]
        record = importer.build_record(populated, populated.read_bytes(), MANIFEST, batch, verdicts, "2026-08-13")

        importer.SOURCE_ROWS = root / "source.json"
        importer.APPROVED_OVERLAY = root / "overlay.json"
        importer.CANONICAL_LOCKED = root / "canonical-locked.json"
        importer.PUBLIC_LOCKED = root / "public-locked.json"
        importer.RUNTIME_MANIFEST = root / "runtime-manifest.json"
        importer.FRIEND_CANDIDATES = root / "friend.json"
        importer.REPO_ROOT = root
        importer.SOURCE_ROWS.write_bytes((REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json").read_bytes())
        importer.APPROVED_OVERLAY.write_bytes((REPO_ROOT / "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/wp1-owner-approved-locked.json").read_bytes())
        original_locked = (REPO_ROOT / "packages/astro-knowledge/voice/tldr-astro/marie-satori-writer/ll-matrix-v13/knowledge-matrix-v13-owner-approved-locked.json").read_bytes()
        importer.CANONICAL_LOCKED.write_bytes(original_locked)
        importer.PUBLIC_LOCKED.write_bytes(original_locked)
        importer.RUNTIME_MANIFEST.write_bytes((REPO_ROOT / "packages/astro-knowledge/review/ll-matrix-v13-runtime-manifest.json").read_bytes())
        importer.FRIEND_CANDIDATES.write_bytes((REPO_ROOT / "apps/web/src/content/fallbackArchitectureV3/source-rows/friend-natal-ll-v13-wp1-derived-candidates-v1.json").read_bytes())
        record_path = root / "record.json"
        record_path.write_text(json.dumps(record) + "\n")
        importer.apply_import(record, record_path)

        source = importer.load_json(importer.SOURCE_ROWS)
        all_rows = [*(source.get("vocabularyRows") or []), *(source.get("hookRows") or [])]
        keys = [row["contentKey"] for row in all_rows]
        assert len(keys) == len(set(keys)), "Apply must leave zero duplicate contentKey values."
        expected = batch["rows"][0]
        imported = next(row for row in source["hookRows"] if row["contentKey"] == expected["contentKey"])
        assert imported["body"] == editorial_rows[0]["revisedCopy"]
        overlay = importer.load_json(importer.APPROVED_OVERLAY)
        assert len(overlay["rows"]) == 1 and overlay["rows"][0]["copy"] == editorial_rows[0]["revisedCopy"]
        canonical_locked = importer.load_json(importer.CANONICAL_LOCKED)
        assert canonical_locked == importer.load_json(importer.PUBLIC_LOCKED)
        assert canonical_locked["counts"]["ownerApprovedRows"] == 302
        assert next(row for row in canonical_locked["rows"] if row["contentKey"] == expected["contentKey"])["copy"] == editorial_rows[0]["revisedCopy"]
        runtime_manifest = importer.load_json(importer.RUNTIME_MANIFEST)
        assert runtime_manifest["ownerApprovedRows"] == 302 and runtime_manifest["excludedUnapprovedRows"] == 712
        assert runtime_manifest["lockedRowsSha256"] == importer.sha256(importer.CANONICAL_LOCKED.read_bytes())
        assert importer.load_json(importer.FRIEND_CANDIDATES)["rows"] == [], "Aspect rows are not placement derivation inputs."

        placement = next(row for packet in manifest["batches"] for row in packet["rows"] if row["family"] in {"placement-sign-exact", "placement-house-exact"})
        queued = importer.friend_candidate({
            "batchId": "WP1-B04", "family": placement["family"], "contentKey": placement["contentKey"],
            "rowKey": placement["rowKey"], "adoptedCopy": placement["currentCopy"],
        }, "2026-08-13")
        assert queued and queued["review_status"] == "needs_review" and queued["servingAuthorized"] is False
        assert queued["stableRenderContract"]["mustFailClosedUntilAuthored"] is True

    print("LL V13 WP-1 verdict importer gate passed: V2 editorial shape, revised/AS_IS/edit adoption, inconsistent-disposition refusal, 132-row atomic validation, duplicate-key gate, and Friend review boundary verified.")


if __name__ == "__main__":
    main()
