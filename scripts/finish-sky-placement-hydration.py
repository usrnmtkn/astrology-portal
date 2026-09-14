# Temporary draft-branch patch; stamp the committed article with its source identity.
from pathlib import Path
p=Path('apps/web/src/App.tsx')
s=p.read_text()
if 'skyDetailResolvedIdentity' not in s:
 a='  const [skyDetailRetry, setSkyDetailRetry] = useState(0);'
 assert s.count(a)==1
 s=s.replace(a,a+'\n  const [skyDetailResolvedIdentity, setSkyDetailResolvedIdentity] = useState<string | null>(null);')
 start=s.index('    // A calculation/content update can queue this effect')
 end=s.index('\n  }, [contentRegistryVersion',start)
 part=s[start:end]
 assert part.count('setSelectedSkyDetail(')==4
 part=part.replace('setSelectedSkyDetail(', 'commitResolvedSkyDetail(')
 marker='    setSkyDetailReadError(null);'
 assert part.count(marker)==1
 part=part.replace(marker,'''    const commitResolvedSkyDetail = (detail: SkyDetail | null) => {
      // Evaluate the complete article before advancing both React state values.
      // A new overlay must not expose the old article for one intermediate frame.
      setSkyDetailResolvedIdentity(skyPlacementPublicationIdentity());
      setSelectedSkyDetail(detail);
    };
    setSkyDetailReadError(null);''')
 s=s[:start]+part+s[end:]
 a='        || skyPlacementFallbackStatus === "ready") ? ('
 assert s.count(a)==1
 s=s.replace(a,'        || skyPlacementFallbackStatus === "ready" && skyDetailResolvedIdentity === skyPlacementResolvedIdentity) ? (')
 p.write_text(s)
p=Path('tests/visual/sky-placement-hydration-boundary.spec.ts')
s=p.read_text()
a="detail: { contentKey: key, published: true, updatedAt: new Date().toISOString() }"
b="detail: { contentKey: key, published: true, updatedAt: new Date(Date.now() + ((window as any).__noticeSequence = ((window as any).__noticeSequence ?? 0) + 1)).toISOString() }"
if a in s:
 s=s.replace(a,b)
 p.write_text(s)
