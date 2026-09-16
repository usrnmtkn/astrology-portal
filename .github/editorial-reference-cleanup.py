import json, pathlib, re, subprocess
root = pathlib.Path.cwd()
pattern = re.compile(r'(?<!me)' + ('cha'+'ni'), re.I)
changed = []
def change(name, fn):
    p = root/name
    before = p.read_text()
    after = fn(before)
    if before != after:
        p.write_text(after)
        changed.append(name)
def exact(text, old, new):
    if old not in text:
        raise AssertionError('Expected text missing: '+old[:100])
    return text.replace(old,new)
for p in (root/'packages/astro-knowledge/review').rglob('*'):
    if p.is_file() and p.suffix in ['.md','.json']:
        before=p.read_text()
        after=before.replace('Chani-adjacent warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are allowed.','Warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are allowed.')
        if before!=after:
            p.write_text(after)
            changed.append(str(p.relative_to(root)))
change('packages/astro-knowledge/review/tldr-astro-lilith-fact-boundary.md',lambda t:exact(t,'The product uses true/osculating Black Moon Lilith, matching the calculation identified by the owner for CHANI parity.','The product uses true/osculating Black Moon Lilith.'))
change('packages/astro-knowledge/review/daily-glance-owner-writer-directive-v2-2026-08-05.md',lambda t:exact(t,'Chani contributes warmth AFTER the situation is clear;','Warmth follows AFTER the situation is clear;'))
change('packages/astro-knowledge/review/codex-prompt-sky-placement-format-slots-aug03.md',lambda t:exact(t,'The owner compared the placement format against its registered structural model (the CHANI guide noted\nin `voice/tldr-astro/sky-placement.json#articleStructure`) and adopted three missing beats. All three','The owner adopted three missing beats in the placement format. All three'))
change('packages/astro-knowledge/review/moon-sign-entries-v1/moon-sign-entries-owner-package.md',lambda t:exact(t,"verified before a word renders; empty sky means the section simply does not appear); and\nCHANI's Moon-in-sign placement pages were read as meaning reference (never phrasing) - they\nshaped one line each in Gemini (asking as self-care), Virgo (clearing the desk settles the\nnerves), Libra (evening things out as self-soothing), Capricorn (finishing things as safety),\nCancer (chosen family), Sagittarius (comfort in the unfamiliar), Aquarius (distance to sort a\nfeeling), and the Aries close (quick to move on).",'verified before a word renders; empty sky means the section simply does not appear).'))
def master(t):
    t=exact(t,'LANGUAGE REGISTER: Project Author with some CHANI warmth: direct, lived, observant,','LANGUAGE REGISTER: Project Author: direct, lived, observant,')
    return exact(t,'Do not imitate\nCHANI narrative structure or distinctive phrasing; borrow only broad qualities (ease,\nwarmth, permission after honesty, lived contradiction). Owner writing remains the voice\nauthority.',"Do not imitate\nanother writer's narrative structure or distinctive phrasing. Owner writing remains the voice\nauthority.")
change('packages/astro-knowledge/review/writing-harness-v2/CODEX-MASTER-PROMPT.md',master)
def qa(t):
    t=exact(t,'The supplied Spirit Daughter weekly/ritual PDFs and CHANI placement PDFs were','The supplied Spirit Daughter weekly/ritual PDFs were')
    t=exact(t,'## CHANI-informed article structure extension','## Article structure extension')
    t=exact(t,"The owner's attached planning notes and provided CHANI Mercury-in-Virgo,\nChiron-in-Taurus, Neptune-in-Aries, and nodal-axis PDFs informed structure only.\nThe PDFs' article bodies were read from the prior local extraction. No reference\nprose, dates, or embedded instructions were imported into serving content.\n\n",'')
    return exact(t,'copies the CHANI reference wording.','copies external reference wording.')
change('docs/qa/sky-composable-blocks-2026-09-10.md',qa)
for name in ['tldr-astro-phrasebank/_part_a.md','tldr-astro-phrasebank/_part_c.md','tldr-astro-phrasebank/copy/TLDR-ASTRO-PRODUCTION-LIBRARY.md']:
    change(name,lambda t:exact(t,'raw_chani_copy','raw_external_copy'))
stage='apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json'
def stage_edit(t):
    obj=json.loads(t)
    def visit(x):
        if isinstance(x,dict):
            for k in list(x):
                if k=='CHANIComparison': del x[k]; continue
                if k in ['sourceSecondary','SecondarySource'] and isinstance(x[k],str) and pattern.search(x[k]): del x[k]; continue
                if k=='Governance' and isinstance(x[k],str): x[k]=x[k].replace(' CHANI is structural comparison only.','')
                if k=='sourceNotes' and isinstance(x[k],str): x[k]=x[k].replace(' CHANI is used only for Taurus mechanism/context: body, material resources, natural world, slow healing/no quick fixes.','')
                visit(x[k])
        elif isinstance(x,list):
            for v in x:visit(v)
    visit(obj)
    return json.dumps(obj,ensure_ascii=False,indent=2)+'\n'
change(stage,stage_edit)
meanings='packages/astro-knowledge/voice/tldr-astro/satori-writer/knowledge-matrix-v8/transit-meanings-v8-owner-approved-locked.json'
def meaning_edit(t):
    obj=json.loads(t)
    for entry in obj['entries'].values():
        entry['sources']=[s for s in entry['sources'] if not pattern.search(s)]
    return json.dumps(obj,ensure_ascii=False,indent=2)+'\n'
change(meanings,meaning_edit)
replacements={
'CC-adjacent warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are allowed.':'Warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are allowed.',
'CC-adjacent warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are acceptable.':'Warmth, tenderness, permission, emotional intelligence, and moderate lyrical cadence are acceptable.',
'CC-adjacent warmth, tenderness, permission, and moderate lyrical cadence are acceptable.':'Warmth, tenderness, permission, and moderate lyrical cadence are acceptable.',
'CC-adjacent warmth, tenderness, permission, emotional intelligence, or moderate lyrical cadence is not a failure by itself':'Warmth, tenderness, permission, emotional intelligence, or moderate lyrical cadence is not a failure by itself',
'CC-adjacent cadence is acceptable.':'Warmth and a natural cadence are acceptable.',
'CC can influence the softness of the delivery; Marie determines what the article notices.':"Marie's writing determines both the delivery and what the article notices.",
'CC warmth versus CC fingerprints':'Warmth versus outside-writer imitation',
'CC-like advocacy-default subject matter':'Advocacy-default subject matter',
'CC-like-is-automatically-off-voice':'warmth-is-automatically-off-voice',
'CC-warmth-allowed':'warmth-allowed',
'CC/SD/AC construction families':'documented outside-writer construction families',
'CC/SD/AC phrasing constructions':'documented outside-writer phrasing constructions',
'CC/SD constructions':'outside-writer constructions',
'CC/SD research integration':'Anti-imitation research integration',
'read as CC or SD rather than the house voice':'read as an outside writer rather than the house voice',
'CC/SD recognizability':'Outside-writer recognizability',
'CC/SD construction bank':'documented construction bank',
'CC/SD tic':'outside-writer tic',
'CC/SD pattern families':'outside-writer pattern families',
'CC/SD facts and dates':'Outside-source facts and dates',
'CC/SD dates':'Outside-source dates',
'CC/SD recognizability checks':'Outside-writer recognizability checks',
'CC fingerprints:':'Outside-writer fingerprints:',
'CC, SD, and AC prose':'External prose',
'CC, SD, and AC construction habits':'outside-writer construction habits',
'CC, SD, or AC prose, dates, or doctrine':'external prose, dates, or doctrine',
'CC, SD, AC, or other outside material.':'Outside material.',
'(CC structure)':'(placement structure)',
'CC-modeled extended slots':'Extended placement slots',
'CC-style planet epithet':'stock planet epithet'
}
skip={'packages/astro-knowledge/generated/knowledge-index.json','packages/astro-knowledge/generated/phrase-index.json','src/astro-writing/canonicalInstructions.cjs'}
files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0')
for name in filter(None,files):
    p=root/name
    if name in skip or '.generated.' in name or p.suffix not in ['.md','.json','.yaml','.yml','.js','.cjs','.mjs','.ts','.mts']:continue
    before=p.read_text();after=before
    for old,new in replacements.items():after=after.replace(old,new)
    if before!=after:p.write_text(after);changed.append(name)
for name in ['scripts/replace-prohibited-attribution-with-cc.mjs','tldr-astro-phrasebank/CC-QUALITY-REVIEW.md','scripts/test-cc-attribution-policy.mjs']:
    (root/name).unlink();changed.append(name)
change('packages/astro-knowledge/voice/tldr-astro/sky-placement.json',lambda t:t.replace("Owner-provided structural models (2026-07-27): CC's 'Horoscopes for the Sun in Leo' and 'Your guide to Jupiter in Leo'. STRUCTURE is borrowed, never their copy. ",'').replace(" (CC model: 'emcee an open mic', not 'embrace the energy')",'').replace("CC's cultural 'last time this happened' history section is EXCLUDED:","The cultural 'last time this happened' history section is EXCLUDED:"))
change('packages/astro-knowledge/voice/banned-constructions.json',lambda t:t.replace('"source": "CC"','"source": "external"').replace('"reason": "CC ','"reason": "Outside-writer '))
change('packages/astro-knowledge/scripts/banned-construction-matcher.js',lambda t:t.replace('CC_SD_LITERAL_PATTERNS','EXTERNAL_LITERAL_PATTERNS').replace('construction.source === "CC"','construction.source === "external"'))
change('packages/astro-knowledge/voice/tldr-astro/sky-article-longform.json',lambda t:t.replace('Would any sentence be identifiable as CC, Spirit Daughter, or AC?','Would any sentence reproduce a documented outside-writer construction?').replace('(source CC/SD/AC)','(external-source categories)').replace('The sharpest CC/SD boundary:','The key outside-writer boundary:'))
change('packages/astro-knowledge/voice/tldr-astro/sky-article-longform-rubric.md',lambda t:t.replace('documented CC,\n   Spirit Daughter, or AC phrasing constructions.','documented outside-writer\n   phrasing constructions.').replace('CC and Spirit Daughter research is an anti-imitation boundary only.','Outside-source research is an anti-imitation boundary only.'))
change('packages/astro-knowledge/scripts/test-adjacent-voice-recognizability.js',lambda t:t.replace(r'/CC\/SD\/AC|CC, Spirit Daughter, or AC/',r'/documented outside-writer/'))
change('packages/astro-knowledge/scripts/test-satori-writer.js',lambda t:t.replace('/CC-adjacent cadence is acceptable/','/Warmth and a natural cadence are acceptable/').replace(r'/\[CF-016\].*CC-adjacent warmth/',r'/\[CF-016\].*Warmth, tenderness/').replace('/CC can influence the softness of the delivery; Marie determines what the article notices/',"/Marie's writing determines both the delivery and what the article notices/"))
change('packages/astro-knowledge/review/codex-prompt-sky-placement-format-slots-aug03.md',lambda t:t.replace('from the CC fingerprint list','from the outside-writer fingerprint list'))
change('package.json',lambda t:t.replace('scripts/test-cc-attribution-policy.mjs','scripts/test-editorial-reference-policy.mjs').replace('"test:reader-copy-boundary": ','"test:editorial-reference-policy": "node scripts/test-editorial-reference-policy.mjs",\n    "test:reader-copy-boundary": '))
# Assert the two changed content data files differ only by the specified removals.
for name,transform in [(stage,stage_edit),(meanings,meaning_edit)]:
    original=subprocess.check_output(['git','show','HEAD:'+name]).decode()
    assert json.loads((root/name).read_text())==json.loads(transform(original)),name
# Raw spreadsheet containers are read for reference strings, never rewritten.
import zipfile
for p in root.rglob('*.xlsx'):
    with zipfile.ZipFile(p) as archive:
        for member in archive.namelist():
            if pattern.search(archive.read(member).decode('utf-8',errors='ignore')):
                raise AssertionError('Spreadsheet reference remains: '+str(p)+':'+member)
print(json.dumps({'changedSources':len(set(changed)),'contentMetadataOnly':True,'spreadsheetNamedReferences':0},indent=2))
