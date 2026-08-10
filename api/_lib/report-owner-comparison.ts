import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { ReportDomain } from "./report-types.ts";

export type ReportComparisonFunction = "opening" | "development" | "complication" | "turn" | "close";

export type ReportOwnerComparisonPassage = {
  evidenceId: string;
  function: ReportComparisonFunction;
  provenance: {
    sourcePath: string;
    sourceType: "owner_authored_final";
    sourceSha256: string;
  };
  text: string;
};

type PassageDefinition = {
  evidenceId: string;
  sourcePath: string;
  startMarker: string;
  endMarker: string;
  paragraphIndex: number;
  function: ReportComparisonFunction;
  sourceSha256: string;
};

const definitions: Record<ReportDomain, PassageDefinition[]> = {
  general: [
    {
      evidenceId: "general_autumn_opening",
      sourcePath: "artifacts/marie-satori-year-ahead-2026-FINAL.md",
      startMarker: "## AUTUMN 2026:",
      endMarker: "## 2026 IN REVIEW",
      paragraphIndex: 1,
      function: "opening",
      sourceSha256: "7154a4a247c0dc865d7f3b157b24528c13143b57f6b7828c722360f127c8a704"
    },
    {
      evidenceId: "general_summer_complication",
      sourcePath: "artifacts/marie-satori-year-ahead-2026-FINAL.md",
      startMarker: "## SUMMER 2026:",
      endMarker: "## AUTUMN 2026:",
      paragraphIndex: 7,
      function: "complication",
      sourceSha256: "037b808515afb66795dd2de5b4a4e2fc4a65d61a7e7fdc969b598dd4a68eca15"
    }
  ],
  work_money: [
    {
      evidenceId: "work_spring_development",
      sourcePath: "artifacts/marie-satori-work-money-2026-owner-v1.md",
      startMarker: "## SPRING 2026:",
      endMarker: "## SUMMER 2026:",
      paragraphIndex: 3,
      function: "development",
      sourceSha256: "ae43f4caf3bd1b815499a66a492db4302b9ad6d40fc2ebe152f4c63d952921f1"
    },
    {
      evidenceId: "work_summer_complication",
      sourcePath: "artifacts/marie-satori-work-money-2026-owner-v1.md",
      startMarker: "## SUMMER 2026:",
      endMarker: "## AUTUMN 2026:",
      paragraphIndex: 6,
      function: "complication",
      sourceSha256: "2354d99335dcde8758c8add2c823c1d4bd31362078922580e809ee67863f06e5"
    }
  ],
  love_connection: [
    {
      evidenceId: "love_spring_turn",
      sourcePath: "artifacts/marie-satori-love-connection-2026-owner-v1.md",
      startMarker: "## SPRING 2026:",
      endMarker: "## SUMMER 2026:",
      paragraphIndex: 5,
      function: "turn",
      sourceSha256: "e8565333002340cfd4b87d4c19bccfad2a2a88a5eb7cf24021d753987cf17587"
    },
    {
      evidenceId: "love_winter_close",
      sourcePath: "artifacts/marie-satori-love-connection-2026-owner-v1.md",
      startMarker: "## WINTER 2026",
      endMarker: "## SPRING 2026:",
      paragraphIndex: 7,
      function: "close",
      sourceSha256: "103cb298557d43de07064c72bad9a5d14452276e3b32960b5249ce8175a0829b"
    }
  ],
  personal_health: [
    {
      evidenceId: "personal_spring_development",
      sourcePath: "artifacts/marie-satori-personal-health-2026-owner-v1.md",
      startMarker: "## SPRING 2026:",
      endMarker: "## SUMMER 2026:",
      paragraphIndex: 4,
      function: "development",
      sourceSha256: "b7cbbdab47d934d9f74b455c2fcee8939bf2049f9bd4844a6c4b21c95b7d1269"
    },
    {
      evidenceId: "personal_spring_close",
      sourcePath: "artifacts/marie-satori-personal-health-2026-owner-v1.md",
      startMarker: "## SPRING 2026:",
      endMarker: "## SUMMER 2026:",
      paragraphIndex: 9,
      function: "close",
      sourceSha256: "3d3f7cf3b008002db202d7c331a73deec726d14a984b70cce888d0c477d35bf3"
    },
    {
      evidenceId: "personal_autumn_complication",
      sourcePath: "artifacts/marie-satori-personal-health-2026-owner-v1.md",
      startMarker: "## AUTUMN 2026:",
      endMarker: "## Health and capacity",
      paragraphIndex: 3,
      function: "complication",
      sourceSha256: "f74754b2f3430bca3e34f68356741266766c9c2441bc4130353ec7b54d29e976"
    }
  ]
};

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractPassage(definition: PassageDefinition) {
  const source = fs.readFileSync(path.join(process.cwd(), definition.sourcePath), "utf8");
  const start = source.indexOf(definition.startMarker);
  const end = source.indexOf(definition.endMarker, start + definition.startMarker.length);
  if (start < 0 || end <= start) throw new Error(`Owner comparison range is missing for ${definition.evidenceId}.`);
  const text = source.slice(start, end).trim().split(/\n\s*\n/u)[definition.paragraphIndex];
  if (!text || sha256(text) !== definition.sourceSha256) {
    throw new Error(`Owner comparison evidence drifted for ${definition.evidenceId}.`);
  }
  return text;
}

export function reportOwnerComparisonSet(reportDomain: ReportDomain): ReportOwnerComparisonPassage[] {
  const passages = definitions[reportDomain].map((definition) => ({
    evidenceId: definition.evidenceId,
    function: definition.function,
    provenance: {
      sourcePath: definition.sourcePath,
      sourceType: "owner_authored_final" as const,
      sourceSha256: definition.sourceSha256
    },
    text: extractPassage(definition)
  }));
  if (passages.length < 2 || passages.length > 3) {
    throw new Error(`V3 requires two or three owner comparison passages for ${reportDomain}.`);
  }
  return passages;
}

export const REPORT_LABELED_NEGATIVE_EXAMPLES = [
  {
    evidenceId: "labeled-negative-flat-recovery",
    label: "negative calibration evidence only",
    text: "A long day may still be completely possible and need more recovery afterward."
  },
  {
    evidenceId: "labeled-negative-concrete-noun-list",
    label: "negative calibration evidence only",
    text: "Work, appointments, travel, caregiving, and recovery may all affect your capacity this month."
  }
] as const;
