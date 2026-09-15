import { createHash, randomUUID } from "node:crypto";
import { adminFetchJson, AdminHttpError } from "./admin-http.js";
import { studioStorage } from "./sky-studio-sources.js";
import { listStudioVariables } from "./studio-variables.js";
import { MONTHLY_PREFIX, stableJson, validateMonth, validateMonthlyEdition, validateMonthlyTemplate, type MonthlyEdition, type MonthlyTemplate, type StoredMonthly } from "../../src/monthly-writing/model.js";
import { assertCleanReaderCopy } from "../../apps/web/src/content/editorialCopyBoundary.mjs";
export type MonthlyStorage = (params: URLSearchParams, options?: {method?:string;body?:string}) => Promise<{ok:boolean;status:number;payload:any}>;
export const monthlyStorage: MonthlyStorage = async (params,options={}) => {
  const {url,headers}=studioStorage();
  return adminFetchJson(`${url}?${params}`,{...options,headers:{...headers,prefer:"return=representation"}});
};
export function monthlyKey(kind: "template"|"edition",month?:string,timeZone?:string) {
  if(kind==="template") return `${MONTHLY_PREFIX}template/default`;
  validateMonth(month,timeZone);
  return `${MONTHLY_PREFIX}edition/${month}/${encodeURIComponent(timeZone!)}`;
}
export async function readMonthlyDocument<T extends MonthlyTemplate|MonthlyEdition>(key:string,storage:MonthlyStorage=monthlyStorage):Promise<StoredMonthly<T>|null> {
  if(!key.startsWith(MONTHLY_PREFIX)) throw new AdminHttpError(400,"Invalid monthly content key.");
  const response=await storage(new URLSearchParams({content_key:`eq.${key}`,mode:"eq.article",select:"id,updated_at,sections,status,lane,source_snapshot",limit:"2"}));
  if(!response.ok || !Array.isArray(response.payload)) throw new AdminHttpError(502,"Monthly writing could not be loaded. Existing drafts were not changed.");
  if(response.payload.length>1) throw new AdminHttpError(409,"Multiple monthly records have this identity. Resolve the duplicate before editing.");
  const row=response.payload[0];
  if(!row) return null;
  if(typeof row.id !== "string" || !Number.isFinite(Date.parse(row.updated_at))) throw new AdminHttpError(502,"Monthly storage returned an invalid version.");
  if(row.status!=="DRAFT" || row.lane!=="reference" || !row.sections?.monthlyAuthoring) throw new AdminHttpError(409,"Unexpected monthly authoring state. Reload before editing.");
  const document=row.sections.monthlyAuthoring.kind==="template" ? validateMonthlyTemplate(row.sections.monthlyAuthoring) : validateMonthlyEdition(row.sections.monthlyAuthoring);
  if(monthlyKey(document.kind,document.kind==="edition"?document.month:undefined,document.kind==="edition"?document.timeZone:undefined)!==key) throw new AdminHttpError(409,"Monthly record identity does not match its document.");
  return {id:row.id,updatedAt:row.updated_at,document:document as T, writeId:row.source_snapshot?.monthlyWriteId} as StoredMonthly<T> & {writeId?:string};
}
function assertDocumentCopy(document:MonthlyTemplate|MonthlyEdition) {
  const template=document.kind==="template"?document:document.template;
  // Instructions and descriptions are separate from fields the renderer reads.
  assertCleanReaderCopy({body:template.body});
  for(const definition of Object.values(template.definitions)) for(const value of [definition.value,...Object.values(definition.bySign??{})]) assertCleanReaderCopy({body:value});
  if(document.kind==="edition") for(const value of [...Object.values(document.values),...Object.values(document.eventValues).flatMap(Object.values)]) assertCleanReaderCopy({body:value});
}
export async function saveMonthlyDocument(value:unknown,expectedUpdatedAt:unknown,storage:MonthlyStorage=monthlyStorage) {
  const document=(value as any)?.kind==="template"?validateMonthlyTemplate(value):validateMonthlyEdition(value);
  assertDocumentCopy(document);
  const key=monthlyKey(document.kind,document.kind==="edition"?document.month:undefined,document.kind==="edition"?document.timeZone:undefined);
  const old=await readMonthlyDocument(key,storage);
  if((old?.updatedAt??null)!==(expectedUpdatedAt??null)) throw new AdminHttpError(409,"This monthly record changed after you opened it. Reload before saving; your edits are still here.");
  const digest=createHash("sha256").update(key).digest("hex");
  // Stable primary key makes competing initial saves conflict, even on schemas
  // whose nullable target_date is not part of a NULLS NOT DISTINCT index.
  const id=old?.id??`${digest.slice(0,8)}-${digest.slice(8,12)}-5${digest.slice(13,16)}-a${digest.slice(17,20)}-${digest.slice(20,32)}`;
  const writeId=randomUUID();
  const updatedAt=new Date(Math.max(Date.now(),old?Date.parse(old.updatedAt)+1:0)).toISOString();
  const row={id,content_key:key,mode:"article",surface:"sky",event_type:"monthly-authoring",target_date:null,status:"DRAFT",lane:"reference",review_state:null,provider:"manual-admin",prompt_version:"monthly-authoring-v1",headline:document.kind==="template"?"Monthly sentence templates":`Monthly writing · ${document.month}`,body:"",summary:"",sections:{monthlyAuthoring:document},source_snapshot:{content_role:"source_material",ownerApproved:false,promotionAuthorized:false,monthlyWriteId:writeId},updated_at:updatedAt};
  const params=new URLSearchParams();
  if(old) {params.set("id",`eq.${id}`);params.set("updated_at",`eq.${old.updatedAt}`);params.set("content_key",`eq.${key}`);params.set("status","eq.DRAFT");params.set("lane","eq.reference");}
  let response;
  try {response=await storage(params,{method:old?"PATCH":"POST",body:JSON.stringify(row)});}
  catch(error) {
    // Reconcile by read only. Never retry a timed-out mutation automatically.
    const confirmed=await readMonthlyDocument(key,storage).catch(()=>null);
    if((confirmed as any)?.writeId===writeId && stableJson(confirmed?.document)===stableJson(document)) return confirmed;
    throw error;
  }
  if(response.status===409 || response.ok && (!Array.isArray(response.payload)||response.payload.length!==1)) throw new AdminHttpError(409,"The monthly save conflicted. Reload before retrying; your edits are still here.");
  if(!response.ok) throw new AdminHttpError(502,"Monthly writing could not be saved. Your edits are still here.");
  const saved=response.payload[0];
  if(!Number.isFinite(Date.parse(saved.updated_at)) || saved.id!==id || saved.source_snapshot?.monthlyWriteId!==writeId || stableJson(saved.sections?.monthlyAuthoring)!==stableJson(document)) throw new AdminHttpError(502,"The monthly save could not be verified. Reload before trying again.");
  return {id,updatedAt:saved.updated_at,document};
}
export async function monthlyLibrary(storage:MonthlyStorage=monthlyStorage) { return listStudioVariables(storage); }
