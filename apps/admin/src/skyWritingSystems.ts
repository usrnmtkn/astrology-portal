// Editorial reference catalog, not a serving flag or a publication record.
// Update alongside docs/content-management/SKY_WRITING_SYSTEMS.md.
export const skyWritingSystems = {
  placement: {
    name: "Placement writing",
    purpose: "The full planet-in-sign page. Complete articles, sentence composition, and evergreen sections are alternative body sources on the same placement.",
    contract: "Placement composition · format 5",
    source: "sky-placement/article/{planet}/{sign}",
    documentation: "SKY_PLACEMENT_V5.md",
    history: [
      { label: "Ingress writing proposal · V5", status: "Implemented contract", detail: "September 10, 2026, 02:43 EDT. Named sentences and ordered modules. Each placement must still be enabled and published separately." },
      { label: "Ingress proposals · V3.1 and V4", status: "Superseded proposals", detail: "Earlier design references. The two V4 downloads are identical copies. Their filenames do not select a reader version." },
      { label: "Placement voice review · V6", status: "Historical review", detail: "August 2, 2026. A separate editorial review bundle, not a newer placement composition format." },
    ],
  },
  summary: {
    name: "Daily Sky summary",
    purpose: "The opening summary on Sky. Its sentence templates and Sun/Moon summaries have their own sources, separate from placement articles.",
    contract: "Daily summary assembly",
    source: "cms/sky-daily-summary/{section}",
    documentation: "SKY_WRITING_SYSTEMS.md",
    history: [
      { label: "Summary templates and wording", status: "Implemented contract", detail: "Edit the layout, sentence templates, and summaries here. Published wording is combined with calculated sky facts." },
      { label: "Moon source variants · V6", status: "Implemented contract", detail: "September 10, 2026, 11:31 EDT source. Regular Moon, New Moon, Full Moon, and eclipse passages have separate keys. The bundled bank contains 35 supplied passages and 25 empty entries. Published owner edits use the same keys; empty entries do not reuse the older V5 copy." },
      { label: "Moon writing proposal · V5", status: "Superseded proposal", detail: "An earlier Daily Sky Moon proposal. It is unrelated to placement composition format 5." },
    ],
  },
} as const;

export type SkyWritingSystem = keyof typeof skyWritingSystems;
