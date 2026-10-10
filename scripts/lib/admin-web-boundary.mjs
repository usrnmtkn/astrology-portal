import ts from "typescript";

// Existing browser-safe domain contracts are shared by server, reader and
// Studio. Never allow api/**: even a type belongs in the shared contract.
const sharedRoots = [
  "src/shared/", "src/astro-writing/", "src/calendar-writing/",
  "apps/web/src/content/", "apps/web/src/services/", "apps/web/src/styles/"
];
export function allowedSharedDependency(file) {
  return sharedRoots.some(root => file.startsWith(root))
    || file === "apps/web/src/features/calendar/data/lunar-journal.index.json";
}

export function boundaryImports(source, file = "module.tsx") {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = [];
  function visit(node) {
    const specifier = ts.isImportDeclaration(node) || ts.isExportDeclaration(node)
      ? node.moduleSpecifier
      : ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || ts.isIdentifier(node.expression) && node.expression.text === "require")
        ? node.arguments[0] : null;
    if (specifier && ts.isStringLiteralLike(specifier)) imports.push({
      specifier: specifier.text,
      line: ast.getLineAndCharacterOfPosition(specifier.getStart(ast)).line + 1
    });
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return imports;
}

export function withoutComments(source) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, ts.LanguageVariant.JSX, source);
  const spans = [];
  for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
    if (token === ts.SyntaxKind.SingleLineCommentTrivia || token === ts.SyntaxKind.MultiLineCommentTrivia)
      spans.push([scanner.getTokenPos(), scanner.getTextPos()]);
  }
  for (const [start, end] of spans.reverse()) source = source.slice(0, start)
    + source.slice(start, end).replace(/[^\r\n]/gu, " ") + source.slice(end);
  return source;
}
