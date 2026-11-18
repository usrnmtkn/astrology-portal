import {horoscopeEditionKey,horoscopeEditionBody,horoscopeSignLabel,type HoroscopeEdition} from '../../web/src/content/horoscopeEditions.mjs';

export function editionDraft(edition:HoroscopeEdition,brief:unknown,sourceSnapshot:unknown,saved?:any){
  return {...(saved?{id:saved.id,expectedUpdatedAt:saved.updated_at}:{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',model:'manual',targetDate:null}),status:'DRAFT',lane:'serving',reviewState:null,headline:`${horoscopeSignLabel(edition.window.period)} horoscopes`,body:horoscopeEditionBody(edition),summary:'',sections:{horoscopeEdition:edition},facts:{horoscopeBrief:brief},sourceSnapshot};
}
