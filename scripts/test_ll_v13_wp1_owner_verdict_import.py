#!/usr/bin/env python3
"""Regression tests for the fail-closed LL V13 WP-1 verdict importer."""

from __future__ import annotations

import importlib.util
import json
import re
import sys
import tempfile
import zipfile
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
IMPORTER_PATH = REPO_ROOT / "scripts/import_ll_v13_wp1_owner_verdicts.py"
WORKBOOK = REPO_ROOT / "tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-01-OWNER-REVIEW.xlsx"
MANIFEST = REPO_ROOT / "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"

spec = importlib.util.spec_from_file_location("wp1_importer", IMPORTER_PATH)
assert spec and spec.loader
importer = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = importer
spec.loader.exec_module(importer)


def populate(source: Path, target: Path, first_verdict: str = "cut") -> None:
    with zipfile.ZipFile(source) as incoming, zipfile.ZipFile(target, "w") as outgoing:
        for info in incoming.infolist():
            payload = incoming.read(info.filename)
            if info.filename == "xl/worksheets/sheet3.xml":
                text = payload.decode("utf-8")
                for row in range(2, 134):
                    verdict = first_verdict if row == 2 else "cut"
                    pattern = rf'<x:c r="J{row}"([^>]*)\s*/>'
                    def replacement(match: re.Match[str]) -> str:
                        attributes = re.sub(r'\s+t="[^"]*"', "", match.group(1))
                        return f'<x:c r="J{row}"{attributes} t="inlineStr"><x:is><x:t>{verdict}</x:t></x:is></x:c>'
                    text, count = re.subn(pattern, replacement, text, count=1)
                    assert count == 1, f"missing J{row}"
                payload = text.encode("utf-8")
            outgoing.writestr(info, payload)


def main() -> None:
    manifest = importer.load_json(MANIFEST)
    batch = importer.validate_manifest(manifest, "WP1-B01")
    try:
        importer.validate_workbook(WORKBOOK, batch)
        raise AssertionError("Blank owner inputs must fail closed.")
    except importer.ImportValidationError as exc:
        assert "must be approve, edit, or cut" in str(exc)

    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        populated = root / "populated.xlsx"
        populate(WORKBOOK, populated, "approve")
        verdicts = importer.validate_workbook(populated, batch)
        assert len(verdicts) == 132
        assert verdicts[0]["verdict"] == "approve"
        assert sum(item["verdict"] == "cut" for item in verdicts) == 131
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
        assert imported["body"] == expected["currentCopy"]
        overlay = importer.load_json(importer.APPROVED_OVERLAY)
        assert len(overlay["rows"]) == 1 and overlay["rows"][0]["copy"] == expected["currentCopy"]
        canonical_locked = importer.load_json(importer.CANONICAL_LOCKED)
        assert canonical_locked == importer.load_json(importer.PUBLIC_LOCKED)
        assert canonical_locked["counts"]["ownerApprovedRows"] == 302
        assert next(row for row in canonical_locked["rows"] if row["contentKey"] == expected["contentKey"])["copy"] == expected["currentCopy"]
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

    print("LL V13 WP-1 verdict importer gate passed: 132-row atomic validation, blank-input refusal, exact-copy apply, duplicate-key gate, and Friend review boundary verified.")


if __name__ == "__main__":
    main()
