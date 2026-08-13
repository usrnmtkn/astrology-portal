#!/usr/bin/env python3
"""Build a governed LL V13 WP-1 owner workbook after editorial validation."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from artifact_tool_v2 import SpreadsheetFile, Workbook

from ll_v13_wp1_editorial import EDITORIAL_HEADERS, EDITORIAL_SCHEMA, validate_editorial_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("outputs", nargs="*", type=Path)
    parser.add_argument("--batch-id", default="WP1-B01")
    parser.add_argument(
        "--editorial-json",
        type=Path,
        help="Complete V2 editorial packet. Required for WP1-B02 through WP1-B06.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    manifest_path = repo_root / "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    matches = [item for item in manifest["batches"] if item["batchId"] == args.batch_id]
    if len(matches) != 1:
        raise RuntimeError(f"Unknown or duplicate batch ID: {args.batch_id}")
    batch = matches[0]

    editorial_rows = None
    if args.editorial_json:
        packet = json.loads(args.editorial_json.read_text())
        if packet.get("schemaVersion") != EDITORIAL_SCHEMA or packet.get("batchId") != batch["batchId"]:
            raise RuntimeError("Editorial packet schema or batch ID drifted.")
        editorial_rows = validate_editorial_rows(batch["rows"], packet.get("rows", []))
    elif batch["batchId"] != "WP1-B01":
        raise RuntimeError(
            f"{batch['batchId']} cannot be generated before a complete V2 editorial pass clears the deterministic gates."
        )

    row_count = len(batch["rows"])
    candidate_sheet = f"Candidates{row_count}"
    workbook = Workbook.create()
    readme = workbook.worksheets.add("README")
    summary = workbook.worksheets.add("BatchSummary")
    review = workbook.worksheets.add(candidate_sheet)

    approve_instruction = (
        "Adopt Revised copy verbatim for LIGHT_EDIT/REWRITE; adopt Current copy byte-identically for AS_IS. SOURCE_GAP cannot be approved."
        if editorial_rows is not None
        else "Adopt Current copy byte-identically."
    )
    readme_values = [
        [f"LL Matrix V13 — WP-1 {batch['batchId']} Owner Review"],
        ["Purpose", f"Review {row_count} still-unapproved LL V13 rows. Nothing in this workbook serves until a complete, hash-valid owner verdict import succeeds."],
        ["Owner action", "For every row, choose approve, edit, or cut in Owner verdict. For edit, enter the final wording verbatim in Owner edit. Leave Owner edit blank for approve/cut."],
        ["Approve", approve_instruction],
        ["Edit", "Adopt Owner edit verbatim as a new owner-approved lineage row."],
        ["Cut", "Do not ingest this row."],
        ["Editorial status", "Editorial dispositions and revised copy are drafts, not approval. The owner verdict remains the only approval action."],
        ["Editorial standard", "tldr-astro-phrasebank/TLDR-BATCH-EDITORIAL-STANDARD-V2.md"],
        ["Atomic import", f"All {row_count} verdicts are required. Missing rows, extra rows, formulas, invalid verdicts, copy drift, key drift, or metadata-hash drift reject the entire import with no state changes."],
        ["Judge annotation", "A deterministic precheck under the V13 clarity rubric. It is advisory and never substitutes for the owner verdict."],
        ["Serving policy", "Unapproved rows never serve. Approved imports use exact-key replacement, the duplicate-contentKey gate, and regenerated derived artifacts."],
        ["Friend policy", "Newly approved self rows feed only review-gated Friend candidates. They never auto-serve or promote the writer."],
        ["QA metric", "QA flags potentially retired are distinct EDIT/CUT passages matched by rendered facts. Counts overlap across placement batches and are not additive."],
        ["Packet schema", manifest["schemaVersion"]],
        ["Source export SHA-256", manifest["source"]["exportSha256"]],
        ["Source workbook SHA-256", manifest["source"]["workbookSha256"]],
        ["Semantic QA results SHA-256", manifest["semanticQaEvidence"]["resultsSha256"]],
    ]
    readme.get_range(f"A1:B{len(readme_values)}").values = readme_values
    readme.merge_cells("A1:B1")

    summary_headers = ["Batch", "Description", "Sheets", "Families", "Rows", "Judged passages", "QA flags potentially retired", "Flag rate"]
    summary_rows = []
    for item in manifest["batches"]:
        rate = item["flagRate"]
        summary_rows.append([
            item["batchId"], item["label"], ", ".join(item["sheets"]), ", ".join(item["families"]),
            item["rowCount"], item["judgedPassages"], item["qaFlagsRetiredWhenApproved"], rate if rate is not None else "No current QA coverage",
        ])
    summary.get_range(f"A1:H{len(summary_rows) + 1}").values = [summary_headers, *summary_rows]

    headers = [
        "#", "Sheet", "Family", "Row key", "Current copy", "Judge annotation (V13 clarity rubric)",
        "QA flagged passages", "QA judged passages", "QA flag rate", "Owner verdict", "Owner edit", "Metadata SHA-256",
    ]
    if editorial_rows is not None:
        headers.extend(EDITORIAL_HEADERS)
    review_rows = []
    for index, row in enumerate(batch["rows"], start=1):
        rate = row["qa"]["flagRate"]
        values = [
            index, row["sheet"], row["family"], row["rowKey"], row["currentCopy"], row["judgeAnnotation"],
            row["qa"]["flaggedPassages"], row["qa"]["judgedPassages"], rate if rate is not None else "",
            "", "", row["metadataSha256"],
        ]
        if editorial_rows is not None:
            editorial = editorial_rows[index - 1]
            values.extend([editorial["disposition"], editorial["revisedCopy"], editorial["editorialNote"]])
        review_rows.append(values)
    last_column = "O" if editorial_rows is not None else "L"
    review.get_range(f"A1:{last_column}{len(review_rows) + 1}").values = [headers, *review_rows]

    navy = "#16324F"
    pale_blue = "#EAF2F8"
    pale_yellow = "#FFF2CC"
    pale_green = "#E2F0D9"
    gray = "#D9E2F3"
    white = "#FFFFFF"
    border = {"preset": "all", "style": "thin", "color": "#CBD5E1"}

    for sheet in [readme, summary, review]:
        sheet.show_grid_lines = False

    readme.get_range("A1:B1").format = {"fill": navy, "font": {"bold": True, "color": white, "size": 16}, "rowHeight": 30}
    readme.get_range(f"A2:A{len(readme_values)}").format = {"fill": gray, "font": {"bold": True, "color": navy}, "verticalAlignment": "top"}
    readme.get_range(f"A2:B{len(readme_values)}").format.borders = border
    readme.get_range(f"A2:B{len(readme_values)}").format.wrap_text = True
    readme.get_range(f"A1:A{len(readme_values)}").format.column_width = 26
    readme.get_range(f"B1:B{len(readme_values)}").format.column_width = 105
    readme.get_range(f"A2:B{len(readme_values)}").format.autofit_rows()
    readme.freeze_panes.freeze_rows(1)

    summary.get_range("A1:H1").format = {"fill": navy, "font": {"bold": True, "color": white}, "wrapText": True}
    summary.get_range(f"A2:H{len(summary_rows) + 1}").format.borders = border
    summary.get_range(f"A2:H{len(summary_rows) + 1}").format.wrap_text = True
    summary.get_range("A1:A7").format.column_width = 14
    summary.get_range("B1:B7").format.column_width = 44
    summary.get_range("C1:D7").format.column_width = 32
    summary.get_range("E1:H7").format.column_width = 19
    summary.get_range("H2:H7").format.number_format = "0.00%"
    summary.freeze_panes.freeze_rows(1)

    last_row = len(review_rows) + 1
    review.get_range(f"A1:{last_column}1").format = {"fill": navy, "font": {"bold": True, "color": white}, "wrapText": True, "verticalAlignment": "center"}
    review.get_range(f"A2:{last_column}{last_row}").format.borders = border
    for row_number in range(2, last_row + 1):
        if row_number % 2 == 0:
            review.get_range(f"A{row_number}:{last_column}{row_number}").format.fill = pale_blue
    review.get_range(f"J2:K{last_row}").format.fill = pale_yellow
    review.get_range(f"L2:L{last_row}").format.fill = pale_green
    if editorial_rows is not None:
        review.get_range(f"M2:M{last_row}").format.fill = "#FCE4D6"
        review.get_range(f"N2:O{last_row}").format.fill = "#FFF8E1"
    review.get_range(f"D2:{last_column}{last_row}").format.wrap_text = True
    review.get_range(f"A2:{last_column}{last_row}").format.vertical_alignment = "top"
    review.get_range(f"I2:I{last_row}").format.number_format = "0.00%"
    widths = {"A": 6, "B": 22, "C": 24, "D": 38, "E": 92, "F": 58, "G": 16, "H": 16, "I": 14, "J": 17, "K": 92, "L": 68}
    if editorial_rows is not None:
        widths.update({"M": 18, "N": 90, "O": 50})
    for column, width in widths.items():
        review.get_range(f"{column}1:{column}{last_row}").format.column_width = width
    review.get_range(f"J2:J{last_row}").data_validation = {"rule": {"type": "list", "values": ["approve", "edit", "cut"]}}
    review.freeze_panes.freeze_rows(1)
    review.freeze_panes.freeze_columns(4)

    batch_number = int(batch["batchId"].removeprefix("WP1-B"))
    outputs = args.outputs or [repo_root / f"tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-{batch_number:02d}-OWNER-REVIEW.xlsx"]
    blob = SpreadsheetFile.export_xlsx(workbook)
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        blob.save(str(output))
        print(output)

    preview = workbook.render({"sheet_name": candidate_sheet, "range": f"A1:{last_column}8", "scale": 0.8})
    preview_path = repo_root / f"outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/ll-v13-{batch['batchId'].lower()}-preview.png"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(str(preview_path))
    print(preview_path)
    print(workbook.inspect({"kind": "table", "range": f"{candidate_sheet}!A1:{last_column}8", "include": "values,formulas", "table_max_rows": 8, "table_max_cols": len(headers)}).ndjson)
    print(workbook.inspect({"kind": "match", "search_term": "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", "options": {"use_regex": True, "max_results": 50}, "summary": "formula error scan"}).ndjson)


if __name__ == "__main__":
    main()
