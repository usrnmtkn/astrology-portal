import fs from "node:fs";

const detailPath = "apps/web/src/features/sky/SkyDetailArticle.tsx";
let detail = fs.readFileSync(detailPath, "utf8");

detail = detail.replace(
  "  articleAspectTypeFromText,\n  normalizedArticleAspectToneBucket",
  "  articleAspectTypeFromText,\n  articleNodeAxisBodyParts,\n  normalizedArticleAspectToneBucket"
);

const localsNeedle = "                      const glyphParts = sectionHeading ? articleAspectGlyphPartsFromHeading(sectionHeading) : null;\n                      const sourceTag = inferredSectionQaSourceTag(section);";
const localsReplacement = "                      const glyphParts = sectionHeading ? articleAspectGlyphPartsFromHeading(sectionHeading) : null;\n                      const nodeAxisBody = sectionHeading ? articleNodeAxisBodyParts(sectionHeading, bodyParagraphs) : null;\n                      const southNodeGlyphParts = nodeAxisBody ? articleAspectGlyphPartsFromHeading(nodeAxisBody.southHeading) : null;\n                      const sourceTag = inferredSectionQaSourceTag(section);";
if (!detail.includes(localsNeedle)) throw new Error("aspect rendering locals target not found");
detail = detail.replace(localsNeedle, localsReplacement);

const renderNeedle = `                          {bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                              <p key={\`${"${section.key}-${paragraphIndex}"}\`}>{paragraph}</p>
                            ))
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}`;
const renderReplacement = `                          {nodeAxisBody ? (
                            <>
                              {nodeAxisBody.primaryParagraphs.map((paragraph, paragraphIndex) => (
                                <p key={\`${"${section.key}-north-${paragraphIndex}"}\`}>{paragraph}</p>
                              ))}
                              <div className="article-related-aspects__copy-heading">
                                {southNodeGlyphParts ? <AspectGlyphs from={southNodeGlyphParts.from} aspect={southNodeGlyphParts.aspect} to={southNodeGlyphParts.to} /> : null}
                                <h4>{nodeAxisBody.southHeading}</h4>
                              </div>
                              {nodeAxisBody.southParagraphs.map((paragraph, paragraphIndex) => (
                                <p key={\`${"${section.key}-south-${paragraphIndex}"}\`}>{paragraph}</p>
                              ))}
                            </>
                          ) : bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                              <p key={\`${"${section.key}-${paragraphIndex}"}\`}>{paragraph}</p>
                            ))
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}`;
if (!detail.includes(renderNeedle)) throw new Error("aspect body rendering target not found");
detail = detail.replace(renderNeedle, renderReplacement);
fs.writeFileSync(detailPath, detail);

const testPath = "scripts/test-calendar-south-node-serving.mjs";
let test = fs.readFileSync(testPath, "utf8");
const testAnchor = "assert.equal(studioSouth?.body, marsSouth.body);";
if ((test.match(/assert\.equal\(studioSouth\?\.body, marsSouth\.body\);/g) ?? []).length !== 1) {
  throw new Error("South Node serving regression anchor not unique");
}
test = test.replace(testAnchor, `${testAnchor}\n\nconst skyDetailSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/features/sky/SkyDetailArticle.tsx"), "utf8");\nassert.match(\n  skyDetailSource,\n  /articleNodeAxisBodyParts[\\s\\S]*?article-related-aspects__copy-heading[\\s\\S]*?<h4>\\{nodeAxisBody\\.southHeading\\}<\\/h4>/u,\n  "Paired South Node copy must render with the same aspect subtitle treatment as the North Node heading."\n);`);
fs.writeFileSync(testPath, test);
