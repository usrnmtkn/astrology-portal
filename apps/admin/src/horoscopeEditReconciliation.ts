import {horoscopeCanonicalJson,horoscopeSignLabel} from '../../web/src/content/horoscopeEditions.mjs';

export function horoscopeEditableState(row:any){
  return {draft:row.sections.horoscopeEdition,outlines:row.source_snapshot?.horoscopeOutlines??{},
    profile:row.source_snapshot?.studioWritingProfile??null,editorialImport:row.source_snapshot?.editorialImport??null};
}
const same=(a:any,b:any)=>horoscopeCanonicalJson(a??null)===horoscopeCanonicalJson(b??null);
/** Three-way reconciliation is local only. A subsequent explicit save still
 * submits the latest exact version and can be refused by another storage race. */
export function reconcileHoroscopeEdits(base:any,latest:any,local:any){
  if(base.id!==latest.id||base.content_key!==latest.content_key||base.status!==latest.status
    ||latest.source_snapshot?.horoscopeGeneration?.active||latest.source_snapshot?.horoscopeGeneration?.batch?.status==='running'
    ||!same(base.facts,latest.facts)||!same(base.sections.horoscopeEdition.window,latest.sections.horoscopeEdition.window))return null;
  const before=horoscopeEditableState(base),remote=horoscopeEditableState(latest);
  const conflicts:{label:string;local:any;remote:any}[]=[];
  function merge(preferLocal:boolean){
    const field=(label:string,old:any,mine:any,theirs:any)=>{
      if(same(mine,old))return theirs;
      if(same(theirs,old)||same(mine,theirs))return mine;
      if(preferLocal)conflicts.push({label,local:mine,remote:theirs});
      return preferLocal?mine:theirs;
    };
    return {
      draft:{...remote.draft,passages:remote.draft.passages.map((p:any)=>{
        const old=before.draft.passages.find((v:any)=>v.sign===p.sign),mine=local.draft.passages.find((v:any)=>v.sign===p.sign);
        return {...p,headline:field(`${horoscopeSignLabel(p.sign)} headline`,old?.headline,mine?.headline,p.headline),
          body:field(`${horoscopeSignLabel(p.sign)} reading`,old?.body,mine?.body,p.body)};
      })},
      outlines:field('Writing outlines',before.outlines,local.outlines,remote.outlines),
      profile:field('Writing instructions',before.profile,local.profile,remote.profile),
      editorialImport:field('Imported source',before.editorialImport,local.editorialImport,remote.editorialImport)
    };
  }
  const keepLocal=merge(true),useSaved=merge(false);
  return {keepLocal,useSaved,conflicts};
}
