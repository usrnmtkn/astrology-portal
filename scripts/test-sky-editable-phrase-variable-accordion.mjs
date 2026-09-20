import fs from "node:fs";
import assert from "node:assert/strict";

const key = fs.readFileSync(new URL("../apps/admin/src/SkyPlacementVariableKey.tsx", import.meta.url), "utf8");
const library = fs.readFileSync(new URL("../apps/admin/src/SkyWritingLibraryEditor.tsx", import.meta.url), "utf8");
const fields = fs.readFileSync(new URL("../apps/admin/src/SkyFallbackFieldsEditor.tsx", import.meta.url), "utf8");

assert.match(key, /Calculated Sky variables[\s\S]*Editable phrase variables/u, "Editable phrase variables must render after calculated Sky variables.");
assert.match(key, /SKY_WRITING_LIBRARY_GROUPS/u, "Editable phrase variable reference must use the shared Writing Library registry.");
assert.match(key, /AdminDataTable/u, "Variables must be browsable as tables, one row per variable.");
assert.match(library, /AdminDataTable/u, "Writing Library phrases must be browsable as tables.");
assert.doesNotMatch(library, /Source details/u, "Writing Library rows must not nest a Source details disclosure inside the phrase table.");
assert.doesNotMatch(key, /Source and scope/u, "Phrase variable tables must show the source key without a nested disclosure.");

// A phrase shared through a reference must not reopen the placement that stores
// it. Editing Sun in Virgo landed on Sun in Aries when openLibraryField
// followed the reference.
const openLibraryField = library.match(/function openLibraryField\([\s\S]*?\n {2}\}/u)?.[0] ?? "";
assert.ok(openLibraryField, "SkyWritingLibraryEditor must keep openLibraryField as the phrase edit entry point.");
assert.doesNotMatch(openLibraryField, /reference\.contentKey/u, "Editing a phrase must stay on the current placement, not open the linked placement.");
assert.match(fields, /surfaceSection\} admin-sky-writing-editor`\} aria-label="Phrase variable editor"/u, "The phrase editor must sit on the shared Studio card surface.");
assert.match(fields, /surfaceSection\} admin-sky-writing-editor`\} aria-label="Writing editor"/u, "Placement writing must sit on the shared Studio card surface.");

console.log("sky editable phrase variable tables: ok");
