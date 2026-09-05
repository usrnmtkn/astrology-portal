#!/usr/bin/env node
import fs from "node:fs";

const path = "apps/web/src/App.tsx";
let source = fs.readFileSync(path, "utf8");
const before = `    studio
    && loadedExactRegistry
    && !loadedExactRegistry.approvedExactSkyAspectCopy(aspect.from, aspect.type, aspect.to)
`;
const after = `    studio
    && loadedExactRegistry
    && loadedExactRegistry.approvedExactSkyAspectCopy
    && !loadedExactRegistry.approvedExactSkyAspectCopy(aspect.from, aspect.type, aspect.to)
`;

if (source.includes(before)) {
  source = source.replace(before, after);
  fs.writeFileSync(path, source);
} else if (!source.includes(after)) {
  throw new Error("Expected exact lookup guard boundary was not found.");
}

console.log("Studio exact fallback now requires an available canonical exact lookup.");
