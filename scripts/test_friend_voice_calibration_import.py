#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import tempfile
import unittest
from pathlib import Path

import import_friend_voice_calibration as importer


class FriendVoiceCalibrationImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.response_template = importer.DEFAULT_RESPONSE.read_text(encoding="utf-8")

    def response(self, directory: Path, ruling: str, verdicts: list[str], first_edit: str | None = None) -> Path:
        text = re.sub(
            r"(?m)^(\*\*Person-contract ruling \(reader observer address allowed / pure third person\):\*\*)[^\n]*$",
            rf"\1 {ruling}",
            self.response_template,
        )
        iterator = iter(verdicts)
        text = re.sub(r"(?m)^(\*\*Owner verdict:\*\*)[^\n]*$", lambda match: f"{match.group(1)} {next(iterator)}", text)
        if first_edit is not None:
            text = text.replace("> \n", f"> {first_edit}\n", 1)
        path = directory / "response.md"
        path.write_text(text, encoding="utf-8")
        return path

    def policy(self, directory: Path, ruling: str, status: str = "owner-ruled") -> Path:
        path = directory / "policy.json"
        path.write_text(json.dumps({"schemaVersion": 1, "status": status, "ruling": ruling}), encoding="utf-8")
        return path

    def test_blank_owner_response_fails_closed(self) -> None:
        with self.assertRaisesRegex(importer.ImportValidationError, "ruling is still blank"):
            importer.build_outputs(
                draft_path=importer.DEFAULT_DRAFT,
                response_path=importer.DEFAULT_RESPONSE,
                policy_path=importer.DEFAULT_POLICY,
                owner_review_date="2026-08-14",
            )

    def test_complete_approvals_build_exact_natal_friend_corpus(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            response = self.response(root, "reader observer address allowed", ["approve"] * 13)
            policy = self.policy(root, "reader observer address allowed")
            corpus, record = importer.build_outputs(
                draft_path=importer.DEFAULT_DRAFT,
                response_path=response,
                policy_path=policy,
                owner_review_date="2026-08-14",
            )
            self.assertEqual(corpus["surface"], "natal-friend")
            self.assertEqual(len(corpus["rows"]), 13)
            self.assertTrue(all(row["approvalLevel"] == "exact_owner_approved" for row in corpus["rows"]))
            self.assertTrue(all(len(row["payloadSha256"]) == 64 for row in corpus["rows"]))
            self.assertEqual(record["verdictCounts"], {"approve": 13, "cut": 0, "edit": 0})

    def test_owner_edit_is_adopted_verbatim(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            exact = "Name brings the marked-up document to the table and names the decision plainly."
            response = self.response(root, "pure third person", ["edit", *(["approve"] * 12)], first_edit=exact)
            policy = self.policy(root, "pure third person")
            corpus, _ = importer.build_outputs(
                draft_path=importer.DEFAULT_DRAFT,
                response_path=response,
                policy_path=policy,
                owner_review_date="2026-08-14",
            )
            self.assertEqual(corpus["rows"][0]["copy"], exact)

    def test_policy_mismatch_and_partial_verdicts_refuse(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            response = self.response(root, "reader observer address allowed", ["approve"] * 13)
            policy = self.policy(root, "pure third person")
            with self.assertRaisesRegex(importer.ImportValidationError, "does not match"):
                importer.build_outputs(
                    draft_path=importer.DEFAULT_DRAFT,
                    response_path=response,
                    policy_path=policy,
                    owner_review_date="2026-08-14",
                )
            partial = self.response(root, "reader observer address allowed", ["approve"] * 12 + [""])
            with self.assertRaisesRegex(importer.ImportValidationError, "owner verdict"):
                importer.build_outputs(
                    draft_path=importer.DEFAULT_DRAFT,
                    response_path=partial,
                    policy_path=self.policy(root, "reader observer address allowed"),
                    owner_review_date="2026-08-14",
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
