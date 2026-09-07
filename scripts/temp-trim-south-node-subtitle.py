from pathlib import Path
import subprocess

subprocess.run(["git", "checkout", "origin/main", "--", "apps/web/src/utils/articleAspects.ts"], check=True)

detail_path = Path("apps/web/src/features/sky/SkyDetailArticle.tsx")
detail = detail_path.read_text()
detail = detail.replace(
    "  articleAspectTypeFromText,\n  articleNodeAxisBodyParts,\n  normalizedArticleAspectToneBucket",
    "  articleAspectTypeFromText,\n  normalizedArticleAspectToneBucket",
    1,
)
old_locals = '''                      const glyphParts = sectionHeading ? articleAspectGlyphPartsFromHeading(sectionHeading) : null;
                      const nodeAxisBody = sectionHeading ? articleNodeAxisBodyParts(sectionHeading, bodyParagraphs) : null;
                      const southNodeGlyphParts = nodeAxisBody ? articleAspectGlyphPartsFromHeading(nodeAxisBody.southHeading) : null;
                      const sourceTag = inferredSectionQaSourceTag(section);'''
new_locals = '''                      const glyphParts = sectionHeading ? articleAspectGlyphPartsFromHeading(sectionHeading) : null;
                      const southNodeMatch = sectionHeading.endsWith("North Node")
                        ? bodyParagraphs.find((paragraph) => paragraph.startsWith("South Node ("))?.match(/^South Node \\(([^)]+)\\):\\s*(.*)$/su)
                        : null;
                      const southNodeHeading = southNodeMatch
                        ? `${glyphParts?.from} ${southNodeMatch[1][0].toUpperCase()}${southNodeMatch[1].slice(1)} South Node`
                        : "";
                      const sourceTag = inferredSectionQaSourceTag(section);'''
if old_locals not in detail:
    raise SystemExit("current node-axis locals not found")
detail = detail.replace(old_locals, new_locals, 1)
old_render = '''                          {nodeAxisBody ? (
                            <>
                              {nodeAxisBody.primaryParagraphs.map((paragraph, paragraphIndex) => (
                                <p key={`${section.key}-north-${paragraphIndex}`}>{paragraph}</p>
                              ))}
                              <div className="article-related-aspects__copy-heading">
                                {southNodeGlyphParts ? <AspectGlyphs from={southNodeGlyphParts.from} aspect={southNodeGlyphParts.aspect} to={southNodeGlyphParts.to} /> : null}
                                <h4>{nodeAxisBody.southHeading}</h4>
                              </div>
                              {nodeAxisBody.southParagraphs.map((paragraph, paragraphIndex) => (
                                <p key={`${section.key}-south-${paragraphIndex}`}>{paragraph}</p>
                              ))}
                            </>
                          ) : bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => (
                              <p key={`${section.key}-${paragraphIndex}`}>{paragraph}</p>
                            ))
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}'''
new_render = '''                          {bodyParagraphs.length > 0
                            ? bodyParagraphs.map((paragraph, paragraphIndex) => southNodeMatch?.[0] === paragraph ? (
                              <Fragment key={`${section.key}-${paragraphIndex}`}>
                                <div className="article-related-aspects__copy-heading"><h4>{southNodeHeading}</h4></div>
                                <p>{southNodeMatch[2]}</p>
                              </Fragment>
                            ) : <p key={`${section.key}-${paragraphIndex}`}>{paragraph}</p>)
                            : <p>{typeof section.body === "string" ? stripLegacySkyArticleScaffoldPrefix(section.body) : section.body}</p>}'''
if old_render not in detail:
    raise SystemExit("current node-axis render block not found")
detail_path.write_text(detail.replace(old_render, new_render, 1))

test_path = Path("scripts/test-calendar-south-node-serving.mjs")
test = test_path.read_text()
old_test = '''assert.match(
  skyDetailSource,
  /articleNodeAxisBodyParts[\\s\\S]*?article-related-aspects__copy-heading[\\s\\S]*?<h4>\\{nodeAxisBody\\.southHeading\\}<\\/h4>/u,
  "Paired South Node copy must render with the same aspect subtitle treatment as the North Node heading."
);'''
new_test = '''assert.match(
  skyDetailSource,
  /southNodeMatch[\\s\\S]*?article-related-aspects__copy-heading[\\s\\S]*?<h4>\\{southNodeHeading\\}<\\/h4>/u,
  "Paired South Node copy must render with the same aspect subtitle treatment as the North Node heading."
);'''
if old_test not in test:
    raise SystemExit("South Node subtitle regression assertion not found")
test_path.write_text(test.replace(old_test, new_test, 1))
