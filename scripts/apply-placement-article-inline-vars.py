from pathlib import Path
import json, subprocess
root=Path.cwd()
def replace(path, old, new):
 p=root/path; s=p.read_text()
 assert s.count(old)==1,(path,s.count(old),old[:100])
 p.write_text(s.replace(old,new))
r='apps/web/src/content/fallbackArchitectureV3/resolver/'
a='apps/admin/src/'
if 'skyPlacementArticleVariables.mjs' not in (root/r/'skyPlacementV4Canonical.mjs').read_text():
 p=root/a/'skyWritingLibrary.ts'; s=p.read_text()
 start=s.index('export const SKY_WRITING_LIBRARY_GROUPS: SkyWritingLibraryGroup[] = ['); end=s.index('\nconst module = ',start)
 registry=s[start:end].replace('export const SKY_WRITING_LIBRARY_GROUPS: SkyWritingLibraryGroup[] = [','export const SKY_WRITING_LIBRARY_GROUPS = [',1)
 (root/r/'skyWritingLibraryRegistry.mjs').write_text('// Shared editorial field registry. This is not reader prose.\nconst field = (id, label, description, kind, rows = 4) => ({ id, label, description, kind, rows });\n\n'+registry+'\nexport const SKY_WRITING_LIBRARY_FIELD_IDS = Object.freeze(SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields.map(item => item.id)));\n')
 s=s[:start]+'// @ts-ignore Shared registry keeps the picker and reader validator in sync.\nimport { SKY_WRITING_LIBRARY_GROUPS as sharedGroups } from "../../web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs";\nexport const SKY_WRITING_LIBRARY_GROUPS = sharedGroups as SkyWritingLibraryGroup[];\n'+s[end:]
 s=s.replace('const field = (id: string, label: string, description: string, kind: SkyWritingLibrarySourceKind, rows = 4): SkyWritingLibraryField => ({ id, label, description, kind, rows });\n','');p.write_text(s)
 replace(r+'skyPlacementV4Canonical.mjs','import { skyPlacementVariableFacts, fillSkyPlacementVariables } from "./skyPlacementVariables.mjs";','import { skyPlacementVariableFacts, fillSkyPlacementVariables } from "./skyPlacementVariables.mjs";\nimport { fillSkyPlacementArticleVariables, skyPlacementArticleDependencyText } from "./skyPlacementArticleVariables.mjs";')
 replace(r+'skyPlacementV4Canonical.mjs','fillSkyPlacementVariables(article[skyPlacementArticlePath(article, facts.motion)], facts).trim()','fillSkyPlacementArticleVariables(article[skyPlacementArticlePath(article, facts.motion)], facts, article, [article, ...corpus.content.continuous.filter(row => row.contentKey !== article.contentKey)]).trim()')
 replace(r+'skyPlacementV4Canonical.mjs','const copy = [source.placementArticle, source.placementArticleDirect, source.placementArticleRetrograde,','const copy = [source.placementArticle, source.placementArticleDirect, source.placementArticleRetrograde,\n      skyPlacementArticleDependencyText(source, [source, ...corpus.content.continuous.filter(row => row.contentKey !== source.contentKey)]),')
 p='api/admin/generated-content.ts'
 replace(p,'import { isSkyPlacementVariableField, skyPlacementVariableIssues } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";','import { isSkyPlacementVariableField, skyPlacementVariableIssues } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs";\n// @ts-ignore Shared article validation and exact source publication checks.\nimport { isSkyPlacementArticleField, skyPlacementArticleVariableIssues, skyPlacementArticlePublicationIssues } from "../../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";')
 replace(p,'      hardFailures.push(...skyPlacementVariableIssues(packageValueAt(effective, path)).map((issue: string) => `${path}: ${issue}`));','      const issues = isSkyPlacementArticleField(record.contentKey, path)\n        ? skyPlacementArticleVariableIssues(packageValueAt(effective, path), effective)\n        : skyPlacementVariableIssues(packageValueAt(effective, path));\n      hardFailures.push(...issues.map((issue: string) => `${path}: ${issue}`));')
 replace(p,'    if (skyVariableField) {\n      const issues = skyPlacementVariableIssues(value);','    if (skyVariableField) {\n      // Canonical article mirrors accept the same tokens as their source.\n      const articleField = isSkyPlacementArticleField(row.content_key, field.replace(/^packageDraft\\./u, ""))\n        || isSkyEvergreenSource(record) && ["body", "body_you"].includes(field);\n      const issues = articleField ? skyPlacementArticleVariableIssues(value, proposedRecord) : skyPlacementVariableIssues(value);')
 replace(p,'    if (isSkyEvergreenSource(promotedRecord) && isRecord(promotedRecord.ingress)) {\n      const composition = promotedRecord.ingress;','    if (isSkyEvergreenSource(promotedRecord)) {\n      const composition = isRecord(promotedRecord.ingress) ? promotedRecord.ingress : {};')
 replace(p,'      const issues = skyIngressPublicationIssues(promotedRecord, referencedRecords);','      const issues = [\n        ...skyIngressPublicationIssues(promotedRecord, referencedRecords),\n        ...skyPlacementArticlePublicationIssues(promotedRecord, referencedRecords)\n      ];')
 p=a+'SkyFallbackFieldsEditor.tsx'
 replace(p,'import SkyPlacementVariableKey, { SkyVariableText } from "./SkyPlacementVariableKey";','import SkyPlacementVariableKey, { SkyVariableText } from "./SkyPlacementVariableKey";\nimport SkyPlacementArticleVariables from "./SkyPlacementArticleVariables";\n// @ts-ignore Shared article-token validator used by publishing and readers.\nimport { isSkyPlacementArticleField, skyPlacementArticleVariableIssues } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";')
 replace(p,'  const variableIssues: string[] = supportsVariables ? skyPlacementVariableIssues(field.value) : [];','  const supportsArticlePhrases = field && isSkyPlacementArticleField(contentKey, field.key);\n  const variableIssues: string[] = supportsVariables ? supportsArticlePhrases\n    ? skyPlacementArticleVariableIssues(field.value, { ...source, contentKey })\n    : skyPlacementVariableIssues(field.value) : [];')
 replace(p,'{supportsVariables && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && <SkyPlacementVariableKey facts={variableFacts} onInsert={insertVariable} disabled={disabled} />}', '''{supportsVariables && !selectedSection?.phrases && !selectedSection?.paragraphs && !selectedSection?.items && (supportsArticlePhrases
        ? <SkyPlacementArticleVariables key={`${contentKey}#${field.key}`} contentKey={contentKey} planet={planet} sign={sign} motion={rxContext ? "retrograde" : "direct"}
          fieldPath={field.key} value={field.value} source={source} disabled={disabled} onInsert={insertVariable}
          onCompositionChange={value => onChange("ingress", value)} onLoadSource={onLoadSource} onOpenSource={onOpenSource} />
        : <SkyPlacementVariableKey facts={variableFacts} onInsert={insertVariable} disabled={disabled} />)}''')
 replace(p,'''      <details className="admin-workspace-details">
        <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>
        <p className="admin-sky-writing-preview">{field.value ? supportsVariables ? <SkyVariableText value={field.value} facts={variableFacts} /> : field.value : "No writing saved for this section."}</p>
      </details>''','''      {!supportsArticlePhrases && <details className="admin-workspace-details">
        <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>
        <p className="admin-sky-writing-preview">{field.value ? supportsVariables ? <SkyVariableText value={field.value} facts={variableFacts} /> : field.value : "No writing saved for this section."}</p>
      </details>}''')
 p=a+'SkyPlacementVariableKey.tsx'
 replace(p,'import "./sky-variable-key.css";','import "./sky-variable-key.css";\n// @ts-ignore Same hash/scope checks as the article renderer.\nimport { resolveIngressSource } from "../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";\n// @ts-ignore Shared source-aware article preview.\nimport { skyPlacementArticleVariableSegments } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";')
 replace(p,'''export function SkyVariableText({ value, facts }: { value: string; facts: SkyVariableFacts }) {
  return <>{skyPlacementVariableSegments(value, facts).map((part: { text: string; token?: string; name?: string; available?: boolean }, index: number) => part.token
    ? <span key={index} className={`admin-composition-variable ${part.available ? "variable-fact" : "variable-unmapped"}`}
      data-variable-color={variableColors.get(part.name ?? "")}
      title={`${part.token}${part.available ? " · calculated value" : " · needs a calculated value"}`}>{part.text}</span>
    : <span key={index}>{part.text}</span>)}</>;
}''','''export function SkyVariableText({ value, facts, source, references = [] }: {
  value: string; facts: SkyVariableFacts; source?: Record<string, any>; references?: Record<string, any>[];
}) {
  const segments = source ? skyPlacementArticleVariableSegments(value, facts, source, references) : skyPlacementVariableSegments(value, facts);
  return <>{segments.map((part: { text: string; token?: string; name?: string; kind?: string; reason?: string; available?: boolean }, index: number) => part.token
    ? <span key={index} className={`admin-composition-variable ${!part.available ? "variable-unmapped" : part.kind && part.kind !== "fact" ? phraseClass(part.kind) : "variable-fact"}`}
      data-variable-color={variableColors.get(part.name ?? "")}
      title={`${part.token} · ${part.reason || (part.kind && part.kind !== "fact" ? "Writing Library phrase" : part.available ? "calculated value" : "needs a calculated value")}`}>{part.text}</span>
    : <span key={index}>{part.text}</span>)}</>;
}''')
 replace(p,'export default function SkyPlacementVariableKey({ facts, onInsert, disabled = false, phraseSource }: {','export default function SkyPlacementVariableKey({ facts, onInsert, onInsertPhrase, disabled = false, phraseSource }: {')
 replace(p,'  onInsert?: (token: string) => void;','  onInsert?: (token: string) => void;\n  onInsertPhrase?: (token: string) => void;')
 replace(p,'            values[sourceId] = sourceTextAtPath(target, source.reference.field);\n            provenance[sourceId] = `${source.reference.contentKey}#${source.reference.field}`;','            const checked = resolveIngressSource({ ...phraseSource.record, ingress: composition }, sourceId, target ? [target] : []);\n            values[sourceId] = checked.reason ? "" : checked.text ?? "";\n            provenance[sourceId] = checked.reason || `${source.reference.contentKey}#${source.reference.field}`;')
 replace(p,'      <p><strong>Current writing for {contextLabel}.</strong> The text shown here is the value the Writing Library will use. Empty optional fields are clearly marked instead of being filled with generic copy.</p>','      <p><strong>Current writing for {contextLabel}.</strong> Editable phrase variables can be used directly in Placement articles, motion-specific Placement articles, and placement composition templates. Their prose is edited in the Writing Library. Empty fields stay empty until authored.</p>')
 replace(p,'                {phraseSource?.onEdit && <StudioButton className="admin-sky-phrase-edit"','                {onInsertPhrase && <StudioButton type="button" disabled={disabled} aria-label={`Insert {{${item.id}}}`} onClick={() => onInsertPhrase(`{{${item.id}}}`)}>Insert</StudioButton>}\n                {phraseSource?.onEdit && <StudioButton className="admin-sky-phrase-edit"')
 f=root/p;s=f.read_text();start=s.index('function sourceTextAtPath(');end=s.index('\nfunction scopeLabel(',start);f.write_text(s[:start]+s[end:])
 p=a+'SkyPlacementComposition.tsx';s=(root/p).read_text()
 s=s.replace('type Props = {','// @ts-ignore Shared article scope; other sections remain facts-only.\nimport { isSkyPlacementArticleField, skyPlacementArticlePhraseNames } from "../../web/src/content/fallbackArchitectureV3/resolver/skyPlacementArticleVariables.mjs";\n\ntype Props = {',1)
 marker='  const selectedWriting = writing === "ingress"'
 assert marker in s
 s=s.replace(marker,'''  const [phraseReferences, setPhraseReferences] = useState<Record<string, any>[]>([]);
  const phraseReferenceKey = JSON.stringify([...new Set(["placementArticle", "placementArticleDirect", "placementArticleRetrograde"]
    .flatMap(path => skyPlacementArticlePhraseNames(phraseRecord?.[path]))
    .map((name: any) => phraseRecord?.ingress?.sources?.[name]?.reference?.contentKey)
    .filter((key: any) => key && key !== phraseRecord?.contentKey))]);
  useEffect(() => {
    let active = true;
    const referenceKeys: string[] = JSON.parse(phraseReferenceKey);
    setPhraseReferences([]);
    void Promise.all(referenceKeys.map(async key => {
      const row = await loadRowRef.current?.({ id: `package:${key}`, content_key: key, inventory_only: true } as CompositionMapRow) as CompositionMapRow | undefined;
      return row ? effectivePackageRecord(row.sections) as Record<string, any> : undefined;
    })).then(records => { if (active) setPhraseReferences(records.filter((row): row is Record<string, any> => Boolean(row))); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Linked writing could not be loaded."); });
    return () => { active = false; };
  }, [phraseReferenceKey, phraseRecord?.contentKey]);
'''+marker)
 s=s.replace('<SkyVariableText value={field.value} facts={variableFacts} />','<SkyVariableText value={field.value} facts={variableFacts} source={isSkyPlacementArticleField(field.row.content_key, field.path) ? phraseRecord : undefined} references={phraseRecord ? [phraseRecord, ...phraseReferences] : []} />')
 s=s.replace('inline Sky variables substitute calculated facts within that passage.','article variables substitute calculated facts and saved Writing Library phrases within that passage. Fallback sections retain their calculated-variable contract.')
 (root/p).write_text(s)
 p=a+'GeneratedContentAdminDashboard.tsx'
 replace(p,'''              {variableReferences.length > 0 && (
                <StudioButton type="button" onClick={() => {
                  setSelectedTemplateVariableName(null);''','''              {(variableReferences.length > 0 || /^sky-placement\\/article\\/[^/]+\\/[^/]+$/u.test(currentDraft.contentKey)) && (
                <StudioButton type="button" onClick={() => {
                  // Placement articles use their scoped picker and textarea cursor.
                  const articlePicker = editorRef.current?.querySelector<HTMLDetailsElement>("[data-sky-article-variable-picker]");
                  if (articlePicker) {
                    setTemplateVariableReferenceOpen(false);
                    articlePicker.open = true;
                    articlePicker.scrollIntoView({ block: "start", behavior: "smooth" });
                    articlePicker.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
                    return;
                  }
                  setSelectedTemplateVariableName(null);''')
 replace(p,'                  {isTemplateDraft ? "Reader preview & variables" : "Variables"} ({variableReferences.length})','                  {/^sky-placement\\/article\\/[^/]+\\/[^/]+$/u.test(currentDraft.contentKey) ? "Variables" : <>{isTemplateDraft ? "Reader preview & variables" : "Variables"} ({variableReferences.length})</>}')
 p=root/'docs/content-management/SKY_PLACEMENT_V5.md';s=p.read_text()
 s=s.replace('Named library sources such as\n`{{placementThesis}}` belong in section templates; they are not inline calculated\nvariables.','Named library sources such as\n`{{placementThesis}}` can be used in section templates and directly in Placement\narticle, Direct placement article, and Retrograde placement article. They remain\nauthored phrase variables, not calculated facts.')
 s=s.replace('The\ncomplete-article fields do not accept sentence-source aliases; use the V5 section\ntemplates for assembly. Existing inline Sky variables remain compatible.','The\ncomplete-article fields accept the selected placement\'s named Writing Library\nsources as well as existing calculated article variables. Source values stay\nin `ingress.sources`; `ingress.enabled` only selects the separate composition\nfallback. Existing inline Sky variables remain compatible.')
 s+='''\n## Inline phrase variables in Placement articles\n\nThe three complete article fields support literal prose, calculated variables,\nand Writing Library tokens. The Variables button opens Calculated Sky variables\nand Editable phrase variables. Insert retains the token at the cursor. Inserting\nor pasting a phrase prepares the Writing Library in the draft from governed\nsources, preserving local text and links. It never enables or publishes writing.\n\nDraft and saved previews use the same pure article source resolver as the reader.\nMissing phrases remain visible as draft gaps and block publication, even when\ncomposition is disabled or absent. The reader refuses incomplete articles; it\ndoes not delete part of a sentence. Unused library fields remain optional.\nDirect and retrograde articles use the explicit tokens the editor wrote; there\nis no automatic motion suffix substitution or prose rewrite.\n\nLinks retain one-hop scope and SHA-256 checks. Changed or retired links require\nreview and relinking. Governed local prefill is a copy, not an automatically\nupdating link. Phrase text can contain calculated article variables but never\nother phrase tokens, recursive references, or conditional blocks. Use entryDate\nand exitDate for sign residency; pass dates and per-event aspect facts stay in\ncomposition modules. No existing prose, phrase grammar, approval, or reader\nselection precedence changes when this feature is installed.\n''';p.write_text(s)

p=root/'scripts/test-sky-placement-studio-api.mts';s=p.read_text()
if 'Inline Writing Library phrases use the complete article' not in s:
 s+='''\n// Inline Writing Library phrases use the complete article even with composition disabled.
{
 const { makeSkyIngressComposition } = await import('../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs');
 let row = stored.find(item => item.content_key === articleKey && item.status === 'LIVE');
 const composition = { ...makeSkyIngressComposition(), modules: [], enabled: false };
 Object.assign(composition.sources, {
  openingHook: { kind: 'placement', text: 'During this transit, fixture article opening.' },
  planetFunction: { kind: 'planet', text: 'fixture planetary function' },
  signMethod: { kind: 'sign', text: 'fixture sign method' },
  closingLine: { kind: 'placement', text: 'Fixture article final sentence.' },
  directNote: { kind: 'placement', text: 'During this transit, fixture direct {{planetTitle}}.' },
  retrogradeNote: { kind: 'placement', text: 'During this transit, fixture retrograde {{planetTitle}}.' }
 });
 const template = '{{openingHook}} {{planetTitle}} uses {{planetFunction}} with {{signMethod}}. {{closingLine}}';
 for (let revision = 1; revision <= 2; revision++) {
  composition.sources.closingLine.text = `Fixture article final sentence ${revision}.`;
  const copy = { ...row.sections.packageRecord, ingress: composition, placementArticle: template,
   placementArticleDirect: '{{directNote}} {{closingLine}}', placementArticleRetrograde: '{{retrogradeNote}} {{closingLine}}' };
  const draft = (await request('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: 'needs_review', sections: { ...row.sections, packageDraft: copy } })).rows[0];
  assert.equal(draft.sections.packageDraft.placementArticle, template);
  row = (await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' })).rows[0];
  assert.equal(row.sections.packageRecord.placementArticle, template);
  assert.equal(row.sections.packageRecord.ingress.enabled, false);
  await runtime.refreshContentPublications(true); runtime.clearCachedFallbackArchitectureV3Bundle();
  runtime.installFallbackArchitectureV3Bundle(await runtime.loadFallbackArchitectureV3DashboardBundle());
  for (const isRetrograde of [false, true]) {
   const rendered = runtime.skyV4ReaderRenderer.renderRoute({ route: 'placement', planet: 'saturn', sign: 'aries', isRetrograde });
   assert.equal(rendered.mainBody, `During this transit, fixture ${isRetrograde ? 'retrograde' : 'direct'} Saturn. Fixture article final sentence ${revision}.`);
   assert.equal(rendered.resolution, 'canonical-article');
  }
 }
 const lastPublished = JSON.stringify(row.sections.packageRecord);
 for (const ingress of [undefined, { ...composition, sources: { ...composition.sources, placementOpportunity: { kind: 'placement', text: '' } } }]) {
  const copy = { ...row.sections.packageRecord, ingress, placementArticle: '{{placementOpportunity}}' };
  const draft = (await request('PATCH', { id: row.id, expectedUpdatedAt: row.updated_at, reviewStatus: 'needs_review', sections: { ...row.sections, packageDraft: copy } })).rows[0];
  assert.equal(draft.sections.packageDraft.placementArticle, '{{placementOpportunity}}');
  const rejected = await request('PATCH', { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: 'approve-package-revision' }, '', 400);
  assert(JSON.stringify(rejected).includes('placementOpportunity'));
  row = stored.find(item => item.id === row.id);
  assert.equal(JSON.stringify(row.sections.packageRecord), lastPublished, 'rejected publication preserves approved copy');
 }
 console.log('PASS: phrase templates and both motions save/publish twice through API/loader/reader; missing phrases cannot publish with disabled or absent composition.');
}
''';p.write_text(s)
p=root/'package.json';data=json.loads(p.read_text())
command='node scripts/test-sky-placement-article-variable-unit.mjs && node --import tsx scripts/test-sky-placement-article-variables.mts'
data['scripts']['test:sky-placement-article-variables']=command
if 'test:sky-placement-article-variables' not in data['scripts']['test:sky-evergreen-sections']:
 data['scripts']['test:sky-evergreen-sections']='npm run test:sky-placement-article-variables && '+data['scripts']['test:sky-evergreen-sections']
p.write_text(json.dumps(data,indent=2)+'\n')
# Only executable source/test pins change, never historical or authored prose.
old='v3-2026-09-11b';new='v3-2026-09-14a'
for name in subprocess.check_output(['git','ls-files'],text=True).splitlines():
 p=root/name
 if p.suffix in ('.ts','.mts','.mjs') and ('/resolver/' in name or name.startswith('scripts/') or name.startswith('tests/')):
  text=p.read_text()
  if old in text:
   print('Updating executable package version pin:',name);p.write_text(text.replace(old,new))
print('Implementation applied. No reader prose rows or publication states were modified.')
