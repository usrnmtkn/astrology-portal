import type {AdminDraft} from './GeneratedContentAdminDashboard';
import {isDynamicBondEffectExactRecord} from '../../web/src/content/bondEffectIdentity.js';

export function bondEffectExactSourceDraft(contentKey:string):AdminDraft|null {
  const record={contentKey,content_role:'fallback_hook',grammar_frame:'complete_sentence',body_you:'',body_they:'',review_status:'needs_review'};
  if(!isDynamicBondEffectExactRecord(record))return null;
  const [,family,planet]=contentKey.split('/');
  const title=planet.split('-').map(word=>word[0].toUpperCase()+word.slice(1)).join(' ');
  return {id:null,contentKey,surface:'relationship',mode:'in_depth',status:'DRAFT',lane:'reference',reviewState:'needs-review',
    blockType:'fallback_hook',promptVersion:'manual-admin',headline:`${title} ${family.slice('bond-effect-'.length)} · Between you two`,summary:'',body:'',reviewerNotes:'',
    sections:{packageRecord:record},facts:{fallbackArchitectureV3:true,review_status:'needs_review'},
    sourceSnapshot:{sourcePackage:'tldrastro-fallback-architecture-v3',contentType:'fallback-system',contentSystem:'fallback',content_role:'fallback_hook',review_status:'needs_review'}};
}
