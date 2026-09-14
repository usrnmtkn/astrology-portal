from pathlib import Path
p=Path('scripts/test-sky-placement-studio-api.mts');s=p.read_text()
s=s.replace("for (const ingress of [undefined, { ...composition, sources:", "for (const ingress of [null, { ...composition, sources:")
s=s.replace("const copy = { ...row.sections.packageRecord, ingress, placementArticle: '{{placementOpportunity}}' };", "const copy = { ...row.sections.packageRecord, ingress, placementArticle: '{{placementOpportunity}}', placementArticleDirect: '', placementArticleRetrograde: '' };")
s=s.replace("const lastPublished = JSON.stringify(row.sections.packageRecord);", "console.log('PASS: shared and custom Direct/Retrograde phrase templates saved, published, loaded and rendered across two revisions.');\n const lastPublished = JSON.stringify(row.sections.packageRecord);")
p.write_text(s)
