#!/usr/bin/env python3
"""Build the governed WP-1 Batch 1 owner-review workbook with artifact-tool."""

import json
import sys
from pathlib import Path

from artifact_tool_v2 import SpreadsheetFile, Workbook


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]
    manifest_path = repo_root / "packages/astro-knowledge/review/ll-matrix-v13-wp1-review-batch-manifest.json"
    manifest = json.loads(manifest_path.read_text())
    batch = manifest["batches"][0]
    if batch["batchId"] != "WP1-B01" or batch["rowCount"] != 132:
        raise RuntimeError("The fixed first review batch must be WP1-B01 with 132 rows.")

    workbook = Workbook.create()
    readme = workbook.worksheets.add("README")
    summary = workbook.worksheets.add("BatchSummary")
    review = workbook.worksheets.add("Candidates132")

    readme_values = [
        ["LL Matrix V13 — WP-1 Batch 1 Owner Review"],
        ["Purpose", "Review the first 132 still-unapproved LL V13 rows. Nothing in this workbook serves until a complete, hash-valid owner verdict import succeeds."],
        ["Owner action", "For every row, choose approve, edit, or cut in Owner verdict. For edit, enter the final wording verbatim in Owner edit. Leave Owner edit blank for approve/cut."],
        ["Approve", "Adopt Current copy byte-identically."],
        ["Edit", "Adopt Owner edit verbatim as a new owner-approved lineage row."],
        ["Cut", "Do not ingest this row."],
        ["Atomic import", "All 132 verdicts are required. Missing rows, extra rows, formula-based verdict/edit cells, invalid verdicts, copy drift, key drift, or metadata-hash drift reject the entire import with no state changes."],
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
    review_rows = []
    for index, row in enumerate(batch["rows"], start=1):
        rate = row["qa"]["flagRate"]
        review_rows.append([
            index, row["sheet"], row["family"], row["rowKey"], row["currentCopy"], row["judgeAnnotation"],
            row["qa"]["flaggedPassages"], row["qa"]["judgedPassages"], rate if rate is not None else "",
            "", "", row["metadataSha256"],
        ])
    review.get_range(f"A1:L{len(review_rows) + 1}").values = [headers, *review_rows]

    navy = "#16324F"
    teal = "#0F766E"
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
    review.get_range("A1:L1").format = {"fill": navy, "font": {"bold": True, "color": white}, "wrapText": True, "verticalAlignment": "center"}
    review.get_range(f"A2:L{last_row}").format.borders = border
    for row_number in range(2, last_row + 1):
        if row_number % 2 == 0:
            review.get_range(f"A{row_number}:L{row_number}").format.fill = pale_blue
    review.get_range(f"J2:K{last_row}").format.fill = pale_yellow
    review.get_range(f"L2:L{last_row}").format.fill = pale_green
    review.get_range(f"D2:L{last_row}").format.wrap_text = True
    review.get_range(f"A2:C{last_row}").format.vertical_alignment = "top"
    review.get_range(f"D2:L{last_row}").format.vertical_alignment = "top"
    review.get_range(f"I2:I{last_row}").format.number_format = "0.00%"
    widths = {"A": 6, "B": 22, "C": 24, "D": 38, "E": 92, "F": 58, "G": 16, "H": 16, "I": 14, "J": 17, "K": 92, "L": 68}
    for column, width in widths.items():
        review.get_range(f"{column}1:{column}{last_row}").format.column_width = width
    review.get_range(f"J2:J{last_row}").data_validation = {"rule": {"type": "list", "values": ["approve", "edit", "cut"]}}
    review.freeze_panes.freeze_rows(1)
    review.freeze_panes.freeze_columns(4)

    outputs = [Path(argument) for argument in sys.argv[1:]]
    if not outputs:
        outputs = [repo_root / "tldr-astro-phrasebank/TLDR-LL-V13-WP1-BATCH-01-OWNER-REVIEW.xlsx"]
    blob = SpreadsheetFile.export_xlsx(workbook)
    for output in outputs:
        output.parent.mkdir(parents=True, exist_ok=True)
        blob.save(str(output))
        print(output)

    preview = workbook.render({"sheet_name": "Candidates132", "range": "A1:L8", "scale": 0.8})
    preview_path = repo_root / "outputs/019fedfe-d553-75e3-be16-8abaa96cdf44/ll-v13-wp1-batch-01-preview.png"
    preview_path.parent.mkdir(parents=True, exist_ok=True)
    preview.save(str(preview_path))
    print(preview_path)
    print(workbook.inspect({"kind": "table", "range": "Candidates132!A1:L8", "include": "values,formulas", "table_max_rows": 8, "table_max_cols": 12}).ndjson)
    print(workbook.inspect({"kind": "match", "search_term": "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", "options": {"use_regex": True, "max_results": 50}, "summary": "formula error scan"}).ndjson)


if __name__ == "__main__":
    main()
