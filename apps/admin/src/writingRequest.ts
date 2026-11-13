import {adminCredentialHeaders} from './adminSecret';

/** Shared request setup; each writing editor retains its response/error contract. */
export function writingRequest(secret:string,url:string,body?:unknown,signal?:AbortSignal,cache?:RequestCache) {
  return fetch(url,{method:body?'POST':'GET',headers:{...adminCredentialHeaders(secret),'content-type':'application/json'},
    ...(body?{body:JSON.stringify(body)}:{}),cache,
    signal:signal?AbortSignal.any([signal,AbortSignal.timeout(90000)]):AbortSignal.timeout(90000)});
}
