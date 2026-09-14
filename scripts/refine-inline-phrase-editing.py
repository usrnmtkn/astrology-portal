from pathlib import Path
p=Path('apps/admin/src/SkyPlacementArticleVariables.tsx');s=p.read_text()
if 'Edit article phrase' not in s:
 s=s.replace('import { StudioButton, StudioInput } from "./StudioControls";', 'import { StudioButton, StudioInput, StudioTextarea } from "./StudioControls";')
 s=s.replace('import { installSkyWritingLibrary, loadSkyWritingLibrarySeeds, skyWritingLibraryInstalled, type SkyWritingLibraryComposition }', 'import { SKY_WRITING_LIBRARY_GROUPS, installSkyWritingLibrary, loadSkyWritingLibrarySeeds, skyWritingLibraryInstalled, type SkyWritingLibraryComposition }')
 s=s.replace('  const [error, setError] = useState("");', '  const [error, setError] = useState("");\n  const [editingPhrase, setEditingPhrase] = useState("");\n  const phraseEditor = useRef<HTMLTextAreaElement>(null);')
 s=s.replace('  const installed = skyWritingLibraryInstalled(composition);', '''  const installed = skyWritingLibraryInstalled(composition);
  const editingSource = composition?.sources?.[editingPhrase];
  const editingField = SKY_WRITING_LIBRARY_GROUPS.flatMap(group => group.fields).find(field => field.id === editingPhrase)
    ?? (editingSource ? { label: editingPhrase, description: "Custom named phrase for this article.", rows: 4 } : undefined);
  useEffect(() => {
    if (!editingPhrase || !installed) return;
    const frame = requestAnimationFrame(() => {
      phraseEditor.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      phraseEditor.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [editingPhrase, installed]);

  function changePhrase(text: string) {
    if (disabled || !composition || !editingSource || editingSource.reference) return;
    const next = { ...composition, sources: { ...composition.sources, [editingPhrase]: { ...editingSource, text } } };
    setPrepared(next);
    props.onCompositionChange(next);
  }''')
 s=s.replace('phraseSource={{ planet, sign, record, onLoadSource: props.onLoadSource, onEdit: id => props.onOpenSource(contentKey, `ingress.sources.${id}`) }} />', '''phraseSource={{ planet, sign, record, onLoadSource: props.onLoadSource, onEdit: id => {
          setEditingPhrase(id);
          if (!installed) void prepareLibrary();
        } }} />''')
 s=s.replace('    <details className="admin-workspace-details" open>\n      <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>', '''    {editingPhrase && editingField && <section className="admin-sky-writing-context" aria-label="Edit article phrase">
      <strong>{editingField.label} <code>{`{{${editingPhrase}}}`}</code></strong>
      <p>{editingField.description}</p>
      {!editingSource ? <p role="status">Preparing this phrase in your draft…</p> : editingSource.reference ? <>
        <p>This is an exact linked source: <code>{editingSource.reference.contentKey}#{editingSource.reference.field}</code>. Its existing scope and revision checks remain in effect.</p>
        <StudioButton type="button" disabled={disabled} onClick={() => {
          const reference = editingSource.reference!;
          const localName = reference.field.match(/^ingress\\.sources\\.([A-Za-z][A-Za-z0-9]*)$/u)?.[1];
          if (reference.contentKey === contentKey && localName) setEditingPhrase(localName);
          else props.onOpenSource(reference.contentKey, reference.field);
        }}>Edit linked source</StudioButton>
      </> : <label className="admin-review-copy-editor">
        <span>Phrase value</span>
        <StudioTextarea ref={phraseEditor} aria-label="Phrase value" rows={editingField.rows ?? 4} disabled={disabled}
          value={editingSource.text ?? ""} onChange={event => changePhrase(event.target.value)} />
      </label>}
      <p className="admin-field-hint">This edits the phrase in the same article draft. The article template and other unsaved changes are preserved.</p>
      <StudioButton type="button" onClick={() => setEditingPhrase("")}>Done editing phrase</StudioButton>
    </section>}
    <details className="admin-workspace-details" open>
      <AdminDisclosureSummary>Preview this section</AdminDisclosureSummary>''')
 p.write_text(s)
p=Path('tests/visual/sky-placement-article-phrases.spec.ts');s=p.read_text()
if 'Inline phrase edit preserves the article' not in s:
 s=s.replace("  await expect(writing).not.toHaveAttribute('aria-invalid', 'true');", """  await expect(writing).not.toHaveAttribute('aria-invalid', 'true');
  // Inline phrase edit preserves the article and all other unsaved draft fields.
  await picker.getByRole('button', { name: 'Edit opening hook', exact: true }).click();
  const phraseEditor = editor.getByRole('region', { name: 'Edit article phrase' });
  await phraseEditor.getByLabel('Phrase value', { exact: true }).fill('During this transit, fixture edited opening.');
  await expect(writing).toHaveValue('{{openingHook}} {{planetTitle}} in {{signTitle}}. {{closingLine}}');
  await expect(preview).toContainText('fixture edited opening. Saturn in Aries.');
  await phraseEditor.getByRole('button', { name: 'Done editing phrase' }).click();""")
 p.write_text(s)
