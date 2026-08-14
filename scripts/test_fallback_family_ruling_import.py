#!/usr/bin/env python3

from __future__ import annotations

import copy
import json
import re
import tempfile
import unittest
from pathlib import Path

import import_fallback_family_rulings as importer


class FallbackFamilyRulingImporterTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.template = importer.DEFAULT_RULINGS.read_text(encoding="utf-8")

    def ruled_file(self, directory: Path, rulings: list[str]) -> Path:
        iterator = iter(rulings)
        text = re.sub(
            r"(?m)^(\*\*Your ruling:\*\*)[^\n]*$",
            lambda match: f"{match.group(1)} {next(iterator)}",
            self.template,
        )
        path = directory / "rulings.md"
        path.write_text(text, encoding="utf-8")
        return path

    def test_blank_packet_refuses_partial_import(self) -> None:
        with self.assertRaisesRegex(importer.ImportValidationError, "ruling must be exactly"):
            importer.parse_rulings(self.template)

    def test_complete_approved_packet_maps_145_and_preserves_34_exact(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            rulings = self.ruled_file(Path(directory), ["approved"] * 18)
            _, record = importer.prepare_import(
                source_path=importer.DEFAULT_SOURCE,
                reconciliation_path=importer.DEFAULT_RECONCILIATION,
                rulings_path=rulings,
                manifest_path=importer.DEFAULT_MANIFEST,
                owner_review_date="2026-08-14",
            )
            self.assertEqual(record["counts"], {
                "setOwnerSignoffUntraced": 145,
                "preservedExactOwnerApproved": 34,
                "remainUngated": 0,
            })
            self.assertFalse(record["invariants"]["copyChanged"])

    def test_not_approved_cannot_silently_revoke_exact_rows(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            rulings = self.ruled_file(Path(directory), ["not approved"] * 18)
            with self.assertRaisesRegex(importer.ImportValidationError, "explicit revocation is required"):
                importer.prepare_import(
                    source_path=importer.DEFAULT_SOURCE,
                    reconciliation_path=importer.DEFAULT_RECONCILIATION,
                    rulings_path=rulings,
                    manifest_path=importer.DEFAULT_MANIFEST,
                    owner_review_date="2026-08-14",
                )

    def test_row_hash_drift_fails_closed(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            directory_path = Path(directory)
            source = importer.load_json(importer.DEFAULT_SOURCE)
            source["hookRows"][0]["body"] = f"{source['hookRows'][0].get('body', '')} drift"
            source_path = directory_path / "source.json"
            source_path.write_text(json.dumps(source), encoding="utf-8")
            rulings = self.ruled_file(directory_path, ["approved"] * 18)
            # The first canonical row may be outside the governed 179; force drift on a governed row.
            governed = importer.load_json(importer.DEFAULT_MANIFEST)["rows"][0]["contentKey"]
            source = importer.load_json(importer.DEFAULT_SOURCE)
            governed_row = next(row for row in source["hookRows"] if row["contentKey"] == governed)
            governed_row["notes"] = f"{governed_row.get('notes', '')} drift"
            source_path.write_text(json.dumps(source), encoding="utf-8")
            with self.assertRaisesRegex(importer.ImportValidationError, "source row hash drifted"):
                importer.prepare_import(
                    source_path=source_path,
                    reconciliation_path=importer.DEFAULT_RECONCILIATION,
                    rulings_path=rulings,
                    manifest_path=importer.DEFAULT_MANIFEST,
                    owner_review_date="2026-08-14",
                )

    def test_ruling_template_drift_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            rulings = self.ruled_file(Path(directory), ["approved"] * 18)
            rulings.write_text(rulings.read_text(encoding="utf-8") + "\nUnreviewed extra instruction.\n", encoding="utf-8")
            with self.assertRaisesRegex(importer.ImportValidationError, "changed outside"):
                importer.prepare_import(
                    source_path=importer.DEFAULT_SOURCE,
                    reconciliation_path=importer.DEFAULT_RECONCILIATION,
                    rulings_path=rulings,
                    manifest_path=importer.DEFAULT_MANIFEST,
                    owner_review_date="2026-08-14",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
