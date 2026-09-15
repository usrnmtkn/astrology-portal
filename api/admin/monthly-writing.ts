import type { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { AdminHttpError, adminErrorStatus, readAdminJsonBody, sendAdminJson, sendAdminMethodNotAllowed } from "../_lib/admin-http.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";
import { monthlyKey, monthlyLibrary, readMonthlyDocument, saveMonthlyDocument } from "../_lib/monthly-authoring-storage.js";
import { calculateMonthlyTemplateFacts } from "../_lib/monthly-template-facts.js";
import { monthlyTemplateStarter } from "../../src/monthly-writing/starter.js";
import { monthlyContext, snapshotMonthlyLibrary, stableJson, validateMonth, validateMonthlyEdition } from "../../src/monthly-writing/model.js";
loadLocalWebEnv();
export const maxDuration=300;
const signature=(value:unknown)=>createHash("sha256").update(stableJson(value)).digest("hex");
const services={authorize:isContentAdminAuthorized,read:readMonthlyDocument,save:saveMonthlyDocument,library:monthlyLibrary,calculate:calculateMonthlyTemplateFacts,
  generate:async (...args: Parameters<typeof import("../_lib/content-generation.js").generateMonthlyTemplatePhrases>) => (await import("../_lib/content-generation.js")).generateMonthlyTemplatePhrases(...args)};
export function createMonthlyWritingHandler(dependencies:Partial<typeof services>={}) {
  const deps={...services,...dependencies};
  return async (req:IncomingMessage,res:ServerResponse)=> {
    res.setHeader("Cache-Control","private, no-store"); res.setHeader("X-Content-Type-Options","nosniff"); res.setHeader("Vary","Authorization, x-content-admin-session, x-content-generation-secret");
    if(!["GET","POST"].includes(req.method??"")) {sendAdminMethodNotAllowed(res,["GET","POST"]);return;}
    const credential=["authorization","x-content-admin-session","x-content-generation-secret"].some(key=>String(req.headers[key]??"").trim());
    try {
    if(!credential || !await deps.authorize(req)) {sendAdminJson(res,401,{ok:false,error:"Sign in with Content Studio owner access."});return;}
      if(req.method==="GET") {
        const url=new URL(req.url??"/","http://localhost");
        const identity=validateMonth(url.searchParams.get("month"),url.searchParams.get("timeZone"));
        const [template,edition,library]=await Promise.all([deps.read(monthlyKey("template")),deps.read(monthlyKey("edition",identity.month,identity.timeZone)),deps.library()]);
        sendAdminJson(res,200,{ok:true,template,edition,library,starter:monthlyTemplateStarter()});return;
      }
      const body=await readAdminJsonBody<Record<string,any>>(req,600_000);
      if(body.action==="calculate") {
        const identity=validateMonth(body.month,body.timeZone);
        sendAdminJson(res,200,{ok:true,facts:await deps.calculate(identity.month,identity.timeZone)});return;
      }
      if(body.action==="save-template") {
        if(body.document?.kind!=="template") throw new AdminHttpError(400,"Choose a template document.");
        sendAdminJson(res,200,{ok:true,saved:await deps.save(body.document,body.expectedUpdatedAt)});return;
      }
      if(!["save-edition","generate"].includes(body.action)) throw new AdminHttpError(400,"Unknown monthly writing action.");
      const edition=validateMonthlyEdition(body.document);
      const facts=await deps.calculate(edition.month,edition.timeZone);
      monthlyContext(facts,edition);
      const library=await deps.library();
      const names = new Set(Object.values(edition.template.definitions).map(def => def.libraryName).filter(Boolean));
      const fresh = snapshotMonthlyLibrary(library.filter((item:any) => names.has(item.name)));
      if (edition.librarySnapshot === undefined) edition.librarySnapshot = fresh;
      else {
        const stored = await deps.read(monthlyKey("edition",edition.month,edition.timeZone));
        const previous = stored?.document.kind === "edition" ? stored.document.librarySnapshot : undefined;
        if (stableJson(edition.librarySnapshot)!==stableJson(fresh) && stableJson(edition.librarySnapshot)!==stableJson(previous)) throw new AdminHttpError(409,"The variable library changed. Refresh its snapshot and review before continuing.");
      }
      if(body.action==="save-edition") { sendAdminJson(res,200,{ok:true,saved:await deps.save(edition,body.expectedUpdatedAt)});return; }
      if(body.selectionReviewed !== true) throw new AdminHttpError(422,"Review the selected monthly highlights before generating writing.");
      if(!Array.isArray(body.targetIds) || body.targetIds.some((id:unknown)=>typeof id!=="string")) throw new AdminHttpError(400,"Choose literal phrase targets.");
      if(body.instruction!==undefined && (typeof body.instruction!=="string" || body.instruction.length>6000)) throw new AdminHttpError(400,"Keep the writing request under 6,000 characters.");
      if(body.provider!==undefined && !["openai","claude","anthropic"].includes(body.provider)) throw new AdminHttpError(400,"Invalid writing provider.");
      const before=signature(edition);
      const generated=await deps.generate({facts,edition,library,targetIds:body.targetIds,instruction:body.instruction,provider:body.provider});
      // This endpoint never saves a model result or changes an approval state.
      sendAdminJson(res,200,{ok:true,...generated,baseFingerprint:before,factsFingerprint:facts.fingerprint});
    } catch(error) {
      const status=error instanceof AdminHttpError?adminErrorStatus(error):/Choose|Invalid|template|phrase|month|definition|token|section|Select|protected|changed|Missing|Needs/u.test(error instanceof Error?error.message:"")?422:500;
      sendAdminJson(res,status,{ok:false,error:error instanceof Error?error.message:"Monthly writing failed. Existing text was not changed."});
    }
  };
}
export default createMonthlyWritingHandler();
