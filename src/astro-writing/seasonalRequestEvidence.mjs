/** Lossless request projections. Frozen manifests, profiles and their hashes
 * retain the originals; expand references before verifying those hashes. */
export function seasonalManifestInput(manifest,facts) {
  if(typeof manifest.query?.seasonMeaning!=='string'||manifest.query.seasonMeaning!==JSON.stringify(facts.seasonalMeaning))return manifest;
  return {...manifest,query:{...manifest.query,
    seasonMeaning:{serializedJsonRef:'governedFacts.seasonalMeaning'}}};
}

export function seasonalProfilePassageReferences(passages,profile,renderedPrompt) {
  const matches=[...profile.voiceGuidance.matchAll(/BEGIN COMPLETE OWNER PREFERRED REVISION\s*\n([\s\S]*?)\nEND COMPLETE OWNER PREFERRED REVISION/gu)];
  if(matches.length!==1||!renderedPrompt.includes(profile.voiceGuidance))return passages;
  const complete=matches[0][1];
  return passages.map(p=>{
    if(p.text!==complete)return p;
    const {text,...metadata}=p;
    return {...metadata,profilePassageRef:'voiceGuidance/COMPLETE OWNER PREFERRED REVISION'};
  });
}
