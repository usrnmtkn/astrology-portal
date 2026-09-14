from pathlib import Path
p=Path('apps/admin/src/SkyPlacementVariableKey.tsx');s=p.read_text()
if 'phraseSourceRevision' not in s:
 s=s.replace('  useEffect(() => {\n    let active = true;', '  // Row hydration recreates object identities. Only changed content should\n  // reload phrase values, otherwise the picker can continuously hydrate itself.\n  const phraseSourceRevision = JSON.stringify(phraseSource?.record ?? null);\n  useEffect(() => {\n    let active = true;', 1)
 old='''      const { values: seededValues, provenance: seededProvenance } = await loadSkyWritingLibrarySeeds(
        phraseSource.record,
        phraseSource.planet,
        phraseSource.sign,
        loadSource
      );
      const values = { ...seededValues };
      const provenance = { ...seededProvenance };
      const rawComposition = phraseSource.record.ingress as SkyWritingLibraryComposition | undefined;
      const installed = skyWritingLibraryInstalled(rawComposition);'''
 new='''      const rawComposition = phraseSource.record.ingress as SkyWritingLibraryComposition | undefined;
      const installed = skyWritingLibraryInstalled(rawComposition);
      // Saved local or linked library fields are authoritative, including blanks.
      // Governed prefill is needed only before a library exists.
      const seeds = installed ? { values: {}, provenance: {} } : await loadSkyWritingLibrarySeeds(
        phraseSource.record, phraseSource.planet, phraseSource.sign, loadSource
      );
      const values: Record<string, string> = { ...seeds.values };
      const provenance: Record<string, string> = { ...seeds.provenance };'''
 assert old in s
 s=s.replace(old,new,1)
 s=s.replace('[phraseSource?.planet, phraseSource?.sign, phraseSource?.record]', '[phraseSource?.planet, phraseSource?.sign, phraseSourceRevision]')
 p.write_text(s)
