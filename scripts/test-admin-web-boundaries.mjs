import assert from "node:assert/strict";
import { boundaryImports, withoutComments, allowedSharedDependency } from "./lib/admin-web-boundary.mjs";

const source = `// /api/admin/example and import("./comment") are documentation.
import {
  reader
} from "../../web/src/features/reader";
export { value } from "../../web/src/components/Reader";
const lazy = () => import("../../web/src/App");
import type { Contract } from "../../../api/_lib/contract";
const route = "/api/admin/example";
`;
assert.deepEqual(boundaryImports(source).map(row => row.specifier), [
  "../../web/src/features/reader", "../../web/src/components/Reader", "../../web/src/App", "../../../api/_lib/contract"
]);
assert.equal(withoutComments(source).split('\n')[0].trim(), '');
assert.match(withoutComments(source), /const route = "\/api\/admin\/example"/u);
for (const file of ["apps/web/src/App", "apps/web/src/components/Reader", "apps/admin/src/Dashboard", "api/_lib/contract", "src/shared-escape/module"])
  assert.equal(allowedSharedDependency(file), false, file);
for (const file of ["src/shared/components/PageLoading", "src/calendar-writing/passageContract", "src/astro-writing/horoscopeRecovery"])
  assert.equal(allowedSharedDependency(file), true, file);
console.log("PASS architecture boundaries: multiline imports, re-exports, dynamic imports, server types, comments, shared contracts.");
