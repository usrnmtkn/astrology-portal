import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

/** Exercise emitted ESM with Node itself: tsx/Vite hide missing .js imports. */
export function verifyCalendarFeedRuntimeImports() {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const stage = mkdtempSync(join(tmpdir(), "calendar-feed-runtime-"));
  const seen = new Set<string>();
  function emit(source: string, destination: string) {
    if (seen.has(source)) return;
    seen.add(source);
    const input = readFileSync(source, "utf8");
    const output = /\.tsx?$/u.test(source) ? ts.transpileModule(input, {
      compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext }, fileName: source
    }).outputText : input;
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, output);
    if (source.endsWith(".json")) return;
    for (const dependency of ts.preProcessFile(output, true, true).importedFiles) {
      const specifier = dependency.fileName;
      if (!specifier.startsWith(".")) continue;
      assert([".js", ".mjs", ".json"].includes(extname(specifier)), `${relative(root, source)}: runtime import ${specifier} needs a Node-resolvable extension`);
      let next = resolve(dirname(source), specifier);
      if (!existsSync(next) && next.endsWith(".js")) next = next.slice(0, -3) + ".ts";
      assert(existsSync(next), `Missing runtime dependency: ${relative(root, next)}`);
      emit(next, resolve(dirname(destination), specifier));
    }
  }
  try {
    writeFileSync(join(stage, "package.json"), '{"type":"module"}');
    symlinkSync(join(root, "node_modules"), join(stage, "node_modules"), "dir");
    for (const name of ["calendar-feed", "calendar-reading"]) {
      const entry = join(stage, `api/${name}.js`);
      emit(join(root, `api/${name}.ts`), entry);
      execFileSync(process.execPath, ["--input-type=module", "--eval", `await import(${JSON.stringify(pathToFileURL(entry).href)})`], { cwd: stage, stdio: "pipe" });
    }
  } finally { rmSync(stage, { recursive: true, force: true }); }
}
