import fs from "node:fs";
import assert from "node:assert/strict";

const source = fs.readFileSync(new URL("../apps/admin/src/SkyPlacementVariableKey.tsx", import.meta.url), "utf8");

assert.match(source, /Calculated Sky variables[\s\S]*Editable phrase variables/u, "Editable phrase variables must render after calculated Sky variables.");
assert.match(source, /SKY_WRITING_LIBRARY_GROUPS/u, "Editable phrase variable reference must use the shared Writing Library registry.");
assert.match(source, /Writing library &amp; placement composition/u, "Phrase-variable accordion must point editors to the prose editor.");

console.log("sky editable phrase variable accordion: ok");
