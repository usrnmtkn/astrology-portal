import {Fragment} from 'react';
import WritingReferenceText,{referenceHeadingId} from './WritingReferenceText';
import {StudioButton} from './StudioControls';
import {PageLoading} from '../../../src/shared/components/PageLoading';

type RuleDocument={id:string;title:string;path:string;role:string;kind:string;body:string;bodySha256:string;sourceUrl:string|null;qualifiedBy:string[];records?:Record<string,unknown>[]};
type EffectiveRule={id:string;tier:string;surface:string[];promptText?:string;ownerAuthority:{sourcePath:string}};
export type WritingStandard={revision:string|null;documents:RuleDocument[];amendmentsId:string;registry:{rules:EffectiveRule[];retired:EffectiveRule[];sourceSha256:string;sourceUrl:string|null};superseded:{path:string;title:string;sourceUrl:string|null}[]};
type Profile={id:string|null;revision:number;sha256:string;updatedAt:string|null;fieldHashes:Record<string,string>;profile:{period:string;voiceGuidance:string;structure:string;sourceGuidance:string;prompt:string}};
type Correction={id:string;version:number;scope:string[];reason:string;rejected:string|null;reasonSha256:string;rejectedSha256:string|null;sourceUri:string;sourceDate:string;sha256:string;kind:string};
type Edit={id:string;version:number;family:string;scope:string;contentKey:string;reason:string;before:string;after:string;updatedAt:string;fieldHashes:Record<string,string>};
export type LiveWritingRules={checkedAt:string;complete:boolean;profiles:{status:string;rows?:Profile[];error?:string};feedback:{status:string;enabledForWriting?:boolean;writing?:Correction[];edits?:Edit[];error?:string}};
const fieldNames:Record<string,string>={voiceGuidance:'Voice guidance',structure:'Structure',sourceGuidance:'Source guidance',prompt:'Prompt template',bad:'Original wording · rejected evidence',corrected:'Recorded correction',owner_reason:'Owner reason',why:'Reason',rule:'Rule',category:'Category',family:'Scope',content_key:'Content key',positive_evidence_revoked:'Positive evidence revoked',rejected_at:'Recorded date',source:'Source'};
function ExactFields({fields,hashes}:{fields:Record<string,unknown>;hashes?:Record<string,string>}) {
  return <>{Object.entries(fields).map(([key,value])=><Fragment key={key}>
    <p><strong>{fieldNames[key]??key}</strong></p><p className="memory-detail-content" data-field={key} data-field-sha256={hashes?.[key]}>{typeof value==='string'?value:JSON.stringify(value,null,2)}</p>
  </Fragment>)}</>;
}
function Provenance({document}:{document:RuleDocument}) {
  const frontmatter=/^---\r?\n[\s\S]*?\r?\n---\r?\n/u.exec(document.body)?.[0];
  return <details className="studio-contained-disclosure"><summary>Source and provenance</summary>
    <p>{document.path}</p>{document.sourceUrl&&<a href={document.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}
    <p>Exact source SHA-256</p><code>{document.bodySha256}</code>
    {frontmatter&&<><p>Source metadata</p><pre className="writing-reference-code">{frontmatter}</pre></>}
  </details>;
}

export default function WritingStandardDocument({standard,live,liveError,onRetryLive}:{standard:WritingStandard;live:LiveWritingRules|null;liveError:string;onRetryLive:()=>void}) {
  const named=(path:string)=>standard.documents.find(doc=>doc.path===path);
  return <section className="writing-rulebook studio-stack" aria-label="All writing rules" data-complete={Boolean(live?.complete)} data-repository-revision={standard.revision}>
    <h1>All writing rules</h1>
    <p>Complete shared rules, surface-specific standards and owner corrections. Original wording is preserved. Current owner amendments and each source’s stated scope qualify older guidance; rejected examples and reference passages do not become universal rules.</p>
    <nav className="admin-toolbar-actions" aria-label="Writing-rule updates">
      {['Aphorisms and maxims — November 6 owner amendment','No mixed metaphors — November 6 owner amendment','Horoscope endings — November 6 owner amendment'].map(title=><a key={title} href={`#${referenceHeadingId(standard.amendmentsId,title)}`}>{title.split(' — ')[0]}</a>)}
    </nav>
    <details className="studio-contained-disclosure"><summary>Contents · {standard.documents.length} repository sources and current Studio guidance</summary>
      <nav className="writing-reference-contents studio-stack" aria-label="Rulebook contents">
        {standard.documents.map(doc=><a href={`#${doc.id}`} key={doc.id}>{doc.title}</a>)}
        <a href="#effective-writing-rules">Effective rule enforcement</a><a href="#saved-horoscope-instructions">Saved horoscope instructions</a><a href="#active-studio-corrections">Active Studio corrections</a>
      </nav>
    </details>
    {standard.documents.map(doc=><section className="writing-reference-section studio-stack" key={doc.id}>
      <article id={doc.id} className="writing-standard-document" aria-label={doc.title} data-source-path={doc.path} data-source-sha256={doc.bodySha256}>
        <h2>{doc.title}</h2><p>{doc.kind==='note'?'Workflow reference · ':''}{doc.role}</p>
        {doc.qualifiedBy.length>0&&<p>Read with {doc.qualifiedBy.map((name,i)=><Fragment key={name}>{i>0?', ':''}{named(name)?<a href={`#${named(name)!.id}`}>{named(name)!.title}</a>:name}</Fragment>)}.</p>}
        {doc.records?<><p>Rejected wording is correction evidence. A recorded replacement applies only within its original scope and does not approve new reader copy.</p>
          {doc.records.map((record,i)=><section className="writing-reference-copy studio-stack" key={i} aria-label={`Correction ${i+1}`}><h3>Correction {i+1}</h3><ExactFields fields={record}/></section>)}</>
          :<WritingReferenceText text={doc.body} prefix={doc.id} title={doc.title}/>}
      </article><Provenance document={doc}/>
    </section>)}
    <section id="effective-writing-rules" className="writing-reference-section studio-stack" aria-label="Effective rule enforcement">
      <h2>Effective rule enforcement</h2><p>Recorded enforcement tiers and scope. Advisory guidance remains for owner review; no result grants wording or publication approval.</p>
      {standard.registry.rules.map(rule=><section key={rule.id} data-rule-id={rule.id} className="writing-reference-copy studio-stack"><h3>{rule.id}</h3><p>{rule.tier} · {rule.surface.join(', ')}</p>
        {rule.promptText&&<p className="memory-detail-content">{rule.promptText}</p>}{named(rule.ownerAuthority.sourcePath)&&<a href={`#${named(rule.ownerAuthority.sourcePath)!.id}`}>Read the governing source</a>}
      </section>)}
      <details className="studio-contained-disclosure"><summary>Registry provenance and retired entries</summary>
        {standard.registry.sourceUrl&&<a href={standard.registry.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}<p>Exact source SHA-256</p><code>{standard.registry.sourceSha256}</code>
        {standard.registry.retired.map(rule=><p key={rule.id}>Retired: {rule.id}</p>)}
      </details>
    </section>
    <section id="saved-horoscope-instructions" className="writing-reference-section studio-stack" aria-label="Saved horoscope instructions">
      <h2>Saved horoscope instructions</h2><p>Read-only Daily, Weekly, Monthly and Seasonal profiles. The current horoscope-ending amendment above makes older wrap-up requirements optional; saved wording remains intact.</p>
      {!live&&!liveError&&<PageLoading compact message="Loading current Studio guidance…"/>}
      {(liveError||live?.profiles.status==='unavailable')&&<p role="alert">{liveError||live?.profiles.error}</p>}
      {live?.profiles.rows?.map(row=><article key={row.profile.period} className="writing-standard-document" aria-label={`${row.profile.period} horoscope instructions`} data-profile-sha256={row.sha256}>
        <h3>{row.profile.period.charAt(0).toUpperCase()+row.profile.period.slice(1)} horoscope instructions</h3>
        <p>{row.id?`Saved revision ${row.revision} · ${row.updatedAt}`:'Default profile · not saved'}</p>
        <ExactFields fields={{voiceGuidance:row.profile.voiceGuidance,structure:row.profile.structure,sourceGuidance:row.profile.sourceGuidance,prompt:row.profile.prompt}} hashes={row.fieldHashes}/>
        <details className="studio-contained-disclosure"><summary>Profile provenance</summary><p>Live Studio · {row.id??'Repository default'}</p><code>{row.sha256}</code></details>
      </article>)}
    </section>
    <section id="active-studio-corrections" className="writing-reference-section studio-stack" aria-label="Active Studio corrections">
      <h2>Active Studio corrections</h2><p>Apply each instruction only to its recorded targets. Quoted rejections are negative evidence; replacements do not grant approval outside their original passage.</p>
      {live?.feedback.status==='unavailable'&&<p role="alert">{live.feedback.error}</p>}
      {live?.feedback.status==='current'&&<>
        {!live.feedback.enabledForWriting&&<p>Studio correction retrieval is disabled for new writing requests. The active records below remain available for review.</p>}
        {!live.feedback.writing?.length&&!live.feedback.edits?.length&&<p>No active Studio corrections were returned by the complete current snapshot.</p>}
        {live.feedback.writing?.map(row=><article key={row.id} className="writing-standard-document" aria-label={`Owner instruction ${row.id}`}><h3>Owner instruction · {row.scope.join(', ')}</h3>
          <p className="memory-detail-content" data-field="reason" data-field-sha256={row.reasonSha256}>{row.reason}</p>{row.rejected&&<><p><strong>Rejected wording · never a positive example</strong></p><p className="memory-detail-content" data-field="rejected" data-field-sha256={row.rejectedSha256??undefined}>{row.rejected}</p></>}
          <details className="studio-contained-disclosure"><summary>Private Studio provenance</summary><p>{row.sourceUri} · {row.sourceDate} · version {row.version}</p><code>{row.sha256}</code></details>
        </article>)}
        {live.feedback.edits?.map(row=><article key={row.id} className="writing-standard-document" aria-label={`Studio correction ${row.id}`}><h3>Studio correction · {row.contentKey}</h3><p>{row.family} · {row.scope} · version {row.version}</p>
          {row.family==='sky-article'&&<p>These are complete reader-field documents. Unchanged fields and unchanged wording are context, not rejected writing. Apply the correction only to the actual differences, within its approved scope.</p>}
          <ExactFields fields={{owner_reason:row.reason,bad:row.before,corrected:row.after}} hashes={row.fieldHashes}/>
          <details className="studio-contained-disclosure"><summary>Private Studio provenance</summary><p>{row.id} · {row.updatedAt}</p></details>
        </article>)}
      </>}
      {(liveError||live&&!live.complete)&&<StudioButton type="button" onClick={onRetryLive}>Retry Studio guidance</StudioButton>}
      {live&&<p>Studio guidance checked {new Date(live.checkedAt).toLocaleString()}.</p>}
    </section>
    {standard.superseded.length>0&&<details className="studio-contained-disclosure"><summary>Superseded sources · historical reference only</summary>
      <p>These sources are excluded from the current rules above.</p>{standard.superseded.map(doc=><p key={doc.path}>{doc.sourceUrl?<a href={doc.sourceUrl} target="_blank" rel="noreferrer">{doc.title}</a>:doc.title}</p>)}
    </details>}
  </section>;
}
