#!/usr/bin/env python3

from __future__ import annotations

import copy
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import import_friend_natal_owner_verdicts as importer


class FriendNatalOwnerVerdictImporterTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.audit = importer.load_json(importer.DEFAULT_AUDIT)
        cls.items, _ = importer.validate_governed_sources(cls.audit, require_pending_candidates=False)
        cls.parsed = importer.read_xlsx_sheets(importer.DEFAULT_WORKBOOK)

    def populated_sheets(self) -> dict[str, importer.SheetData]:
        sheets = {
            name: importer.SheetData(cells=dict(sheet.cells), formulas=frozenset(sheet.formulas))
            for name, sheet in self.parsed.items()
        }
        candidate_cells = sheets["Candidates43"].cells
        for row in range(2, 45):
            candidate_cells[f"I{row}"] = "approve"
            candidate_cells[f"J{row}"] = ""
        candidate_cells["I3"] = "EDIT"
        candidate_cells["J3"] = "  The owner's wording stays byte-exact here.  "
        candidate_cells["I4"] = "cut"
        for row, ruling in enumerate((
            "Keep element-pattern reader-addressed for now.",
            "Defer the broader batch.",
            "No additional reader-addressed family is authorized.",
        ), start=2):
            sheets["OwnerDecisions"].cells[f"D{row}"] = ruling
        return sheets

    def test_current_packet_has_all_43_samples_and_full_hashes(self) -> None:
        candidates = self.parsed["Candidates43"]
        for index, item in enumerate(self.items, start=2):
            self.assertEqual(candidates.cells[f"C{index}"], item["key"])
            self.assertEqual(candidates.cells[f"H{index}"], importer.expected_sample_cell(item))
            self.assertEqual(candidates.cells[f"K{index}"], item["canonicalMetadataSha256"])
            self.assertEqual(len(candidates.cells[f"K{index}"]), 64)

    def test_complete_import_maps_approve_edit_and_cut_atomically(self) -> None:
        verdicts, decisions = importer.validate_workbook_data(self.populated_sheets(), self.items)
        self.assertEqual(len(verdicts), 43)
        self.assertEqual(len(decisions), 3)
        self.assertEqual(verdicts[0]["disposition"], "adopt-proposed-copy")
        self.assertEqual(verdicts[0]["adoptedCopy"], self.items[0]["proposedFriendCopy"])
        self.assertEqual(verdicts[1]["disposition"], "adopt-owner-wording-verbatim")
        self.assertEqual(verdicts[1]["adoptedCopy"], "  The owner's wording stays byte-exact here.  ")
        self.assertEqual(verdicts[2]["disposition"], "discard-candidate")
        self.assertIsNone(verdicts[2]["adoptedCopy"])
        self.assertTrue(all(row["candidateReviewStatusAtImport"] == "needs_review" for row in verdicts))
        self.assertTrue(all(row["candidateSourceMutationPerformed"] is False for row in verdicts))

    def test_partial_or_malformed_inputs_fail_closed(self) -> None:
        cases: list[tuple[str, callable]] = []

        partial = self.populated_sheets()
        partial["Candidates43"].cells["I44"] = ""
        cases.append(("partial verdicts", lambda: importer.validate_workbook_data(partial, self.items)))

        missing_decision = self.populated_sheets()
        missing_decision["OwnerDecisions"].cells["D4"] = ""
        cases.append(("missing ruling", lambda: importer.validate_workbook_data(missing_decision, self.items)))

        hash_drift = self.populated_sheets()
        hash_drift["Candidates43"].cells["K9"] = "0" * 64
        cases.append(("metadata drift", lambda: importer.validate_workbook_data(hash_drift, self.items)))

        formula = self.populated_sheets()
        formula["Candidates43"] = importer.SheetData(
            cells=formula["Candidates43"].cells,
            formulas=frozenset({*formula["Candidates43"].formulas, "I2"}),
        )
        cases.append(("formula verdict", lambda: importer.validate_workbook_data(formula, self.items)))

        for label, operation in cases:
            with self.subTest(label=label):
                with self.assertRaises(importer.ImportValidationError):
                    operation()

    def test_sample_less_audit_is_refused(self) -> None:
        drifted = copy.deepcopy(self.audit)
        item = drifted["candidateReviewItems"][8]
        item["renderedComposedSample"] = None
        item["renderedComposedSampleKey"] = None
        item["renderedComposedSampleSha256"] = None
        item["stableRenderContract"] = None
        with self.assertRaisesRegex(importer.ImportValidationError, "missing stable sample key/hash"):
            importer.validate_governed_sources(drifted)

    def test_import_replay_refuses_after_candidate_states_are_applied(self) -> None:
        result = subprocess.run(
            [
                sys.executable,
                str(Path(importer.__file__).resolve()),
                "--workbook",
                str(importer.DEFAULT_WORKBOOK),
                "--owner-review-date",
                "2026-08-11",
                "--check-only",
            ],
            cwd=importer.REPO_ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("REFUSED", result.stderr)
        self.assertIn("before import", result.stderr)

    def test_existing_output_is_never_overwritten(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "existing.json"
            output.write_text("preserve me\n", encoding="utf-8")
            with self.assertRaises(importer.ImportValidationError):
                importer.atomic_write_new(output, "replacement\n")
            self.assertEqual(output.read_text(encoding="utf-8"), "preserve me\n")


if __name__ == "__main__":
    unittest.main(verbosity=2)
