import { useEffect, useId, useRef, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { ModalDialog } from "../../components/ModalDialog";
import { articleHistoryChangeEvent } from "../../services/articleNavigation";
import { forecastPersonHref, navigateForecast } from "./forecastDayNavigation";
import { forecastAspectGuide, forecastRatingExplanation } from "../../content/relationshipForecastCopy";
import { FormattedProse } from "../../components/FormattedProse";
import { useForecastExplanationSources } from "./useForecastExplanationSources";
import { ModalPortal } from "../../components/ModalPortal";
import { ProfileAvatar } from "../../components/ProfileAvatar";
import { useFrictionFlowCopy } from "./useForecastExplanationSources";
import { PageLoadError } from "../../components/PageLoading";
import { FriendsPairForecastReading, PairForecastContact as Contact } from "./FriendsPairForecastReading";
import type { FriendsFeedPerson } from "./friendsFeedSources";
import type { RelationshipForecastDay } from "../../services/relationshipForecast";
import type { ForecastDayState } from "./useRelationshipForecast";
import type { ForecastNormalizer } from "./forecastPersonalReading";


const markers = {easy:"●",mixed:"◐",tense:"◆",active:"◎",quiet:"○"};
const civilLabel = (date:string,weekday = false) => new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US",{timeZone:"UTC",...(weekday ? {weekday:"short" as const} : {}),month:"short",day:"numeric"});

export function FriendsPairForecast({pairs,readerName,readerAvatar,ownerId,timeZone,onOpenFriend,onRetry,loading,error,normalize,copyLoading,copyError,onRetryCopy}: {
  pairs:Array<{friend:FriendsFeedPerson;days:ForecastDayState[]}>;
  readerName:string;readerAvatar?:string;ownerId:string;timeZone:string;
  onOpenFriend:(friend:FriendsFeedPerson)=>void;onRetry:(date:string)=>void;loading:boolean;error:boolean;
  normalize:ForecastNormalizer;copyLoading:boolean;copyError:boolean;onRetryCopy?:()=>void;
}) {
  const titleId=useId();
  const writing=useFrictionFlowCopy(pairs.length>0 || loading || error);
  const copy=writing.copy;
  const forecastLabels={easy:copy("status/easy"),mixed:copy("status/mixed"),tense:copy("status/tense"),active:copy("status/active"),quiet:copy("status/quiet")};
  const pairTitle=(name:string)=>`${copy("feed/pairPrefix")} ${name}`;
  const storageKey=`tldrastro:relationshipForecast:hidden:${ownerId}`;
  const [hidden,setHidden]=useState<string[]>(() => {try {const rows=JSON.parse(localStorage.getItem(storageKey)??"[]");return Array.isArray(rows)?rows.filter(id=>typeof id==="string"):[];}catch{return [];}});
  const [undo,setUndo]=useState<string|null>(null);
  const [menu,setMenu]=useState<string|null>(null);
  const [dialog,setDialog]=useState<{friend:FriendsFeedPerson;date?:string}|null>(null);
  const [explaining,setExplaining]=useState(false);
  const swipe=useRef<{x:number;y:number;id:number}|null>(null);
  const closeId=`${titleId}-close`;
  const tileId=(friend:FriendsFeedPerson,date:string)=>`${titleId}-${friend.id}-${date}`;
  const selectDay=(friend:FriendsFeedPerson,date:string)=>{
    const url=new URL(window.location.href);url.searchParams.set("flowPair",friend.id);url.searchParams.set("flowDate",date);
    window.history.replaceState(window.history.state,"",url);setDialog({friend,date});
  };
  useEffect(()=>{
    const sync=()=>{
      const url=new URL(window.location.href), friend=pairs.find(pair=>pair.friend.id===url.searchParams.get("flowPair"))?.friend;
      const date=url.searchParams.get("flowDate");
      const params=url.pathname==="/friends"?url.searchParams:new URLSearchParams(url.hash.split("?")[1]);
      const feed=(url.pathname==="/friends"||url.hash.split("?")[0]==="#friends")&&!params.has("chart")&&(params.get("tab")??"feed")==="feed";
      setDialog(current=>feed&&friend&&date ? current?.friend.id===friend.id&&current.date===date?current:{friend,date} : current?.date||!feed?null:current);
    };
    sync();window.addEventListener("popstate",sync);window.addEventListener("hashchange",sync);window.addEventListener(articleHistoryChangeEvent,sync);
    return()=>{window.removeEventListener("popstate",sync);window.removeEventListener("hashchange",sync);window.removeEventListener(articleHistoryChangeEvent,sync);};
  },[pairs]);
  const menuButtonId=(friend:FriendsFeedPerson)=>`${titleId}-${friend.id}`;
  useEffect(()=>{
    if(!menu)return;
    const outside=(event:PointerEvent)=>{if(event.target instanceof Element && !event.target.closest(".pair-forecast-menu"))setMenu(null);};
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){setMenu(null);document.getElementById(`${titleId}-${menu}`)?.focus();}};
    document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[menu,titleId]);
  const selected=dialog?.date ? pairs.find(p=>p.friend.id===dialog.friend.id)?.days.find(d=>d.date===dialog.date) : null;
  const saveHidden=(rows:string[])=>{setHidden(rows);try{localStorage.setItem(storageKey,JSON.stringify(rows));}catch{/* Hiding still works for this visit when storage is unavailable. */}};
  const close=()=>{setDialog(null);setExplaining(false);const url=new URL(window.location.href);url.searchParams.delete("flowPair");url.searchParams.delete("flowDate");window.history.replaceState(window.history.state,"",url);};
  const hiddenCount=pairs.filter(pair=>hidden.includes(pair.friend.id)).length;
  if(!pairs.length && !loading && !error && !undo)return null;
  const drivers=(day:RelationshipForecastDay)=>day.contacts.filter(c=>day.drivers.includes(c.id));
  return <section className="friends-feed-group pair-forecast-group" aria-label={copy("feed/title")}>
    <h2>{copy("feed/today")} <small>{copy("feed/title")}</small></h2>
    {loading && !pairs.length && <div className="pair-forecast-placeholder" role="status">{copy("feed/calculatingAll")}</div>}
    {error && !pairs.length && <p role="status">{copy("feed/error")}</p>}
    {undo && <div className="pair-forecast-undo" role="status">{copy("feed/hidden")}<button type="button" onClick={()=>{saveHidden(hidden.filter(id=>id!==undo));setUndo(null);}}>{copy("feed/undo")}</button></div>}
    {hiddenCount>0 && !undo && <div className="pair-forecast-undo"><button type="button" onClick={()=>saveHidden(hidden.filter(id=>!pairs.some(pair=>pair.friend.id===id)))}>{copy("feed/showHidden",{count:hiddenCount})}</button></div>}
    {pairs.filter(pair=>!hidden.includes(pair.friend.id)).map(({friend,days})=><article className="pair-forecast" key={friend.id} aria-label={pairTitle(friend.displayName)}>
      <header>
        <div className="pair-forecast-avatars"><ProfileAvatar name={readerName} email="" avatarUrl={readerAvatar}/><ProfileAvatar name={friend.displayName} email="" avatarUrl={friend.avatarUrl}/></div>
        <div className="pair-forecast-identity"><h3>{copy("feed/pairPrefix")} <button type="button" onClick={()=>onOpenFriend(friend)}>{friend.displayName}</button></h3><small>{civilLabel(days[0].date,true)} – {civilLabel(days[2].date,true)}</small></div>
        <div className="pair-forecast-menu"><button type="button" id={menuButtonId(friend)} className="pair-forecast-overflow" aria-label={copy("feed/options",{pair:pairTitle(friend.displayName)})} aria-expanded={menu===friend.id} onClick={()=>setMenu(menu===friend.id?null:friend.id)}>···</button>
          {menu===friend.id && <div className="pair-forecast-menu-items">
            <button type="button" onClick={()=>{setMenu(null);setDialog({friend});}}>{copy("feed/howRated")}</button>
            <button type="button" onClick={()=>{saveHidden([...hidden,friend.id]);setUndo(friend.id);setMenu(null);}}>{copy("feed/hide")}</button>
          </div>}
        </div>
      </header>
      <div className="pair-forecast-days">{days.map((state,index)=>{
        const day=state.day;
        const relative=index===0?copy("feed/today"):index===1?copy("feed/tomorrow"):new Date(`${state.date}T12:00:00Z`).toLocaleDateString("en-US",{timeZone:"UTC",weekday:"short"});
        return <div key={state.date} className={`pair-forecast-day pair-forecast-day--${state.status === "ready" && day ? day.rating : "neutral"}`}>
          <button type="button" className="pair-forecast-day-open" id={tileId(friend,state.date)} disabled={state.status!=="ready"} aria-label={copy("feed/dayLabel",{relative,date:civilLabel(state.date),status:day?forecastLabels[day.rating]:state.status === "error" ? copy("feed/unavailable"):copy("feed/calculatingLabel"),pair:pairTitle(friend.displayName)})} onClick={()=>selectDay(friend,state.date)}>
            <strong>{relative}<span aria-hidden="true">›</span></strong><small>{civilLabel(state.date,true)}</small>
            {state.status === "loading" ? <span className="pair-forecast-calculating" role="status"><span className="pair-forecast-skeleton" aria-hidden="true"/>{copy("feed/calculating")}</span> : state.status === "error" ? <span>{copy("feed/dayError")}</span> : day && <>
              <span className="pair-forecast-rating"><span aria-hidden="true">{markers[day.rating]}</span>{forecastLabels[day.rating]}</span>
              <ul>{drivers(day).map(contact=><Contact key={contact.id} contact={contact} timeZone={timeZone} friendName={friend.displayName} copy={copy}/>)}</ul>
            </>}
          </button>
          {state.status === "error" && <button type="button" className="pair-forecast-retry" onClick={()=>onRetry(state.date)}>{copy("feed/retry",{date:civilLabel(state.date)})}</button>}
        </div>;
      })}</div>
    </article>)}
    {dialog && selected?.day && <ModalPortal onClose={close} closeOnBackdrop className="pair-forecast-modal" panelClassName="pair-forecast-dialog" titleId={titleId}
      initialFocusId={closeId} restoreFocusId={tileId(dialog.friend,selected.date)}>
      <header className="pair-forecast-dialog-header"
        onPointerDown={event=>{if(event.pointerType==="mouse"||!window.matchMedia("(max-width: 600px)").matches||(event.target instanceof Element&&event.target.closest("button,a")))return;swipe.current={x:event.clientX,y:event.clientY,id:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);}}
        onPointerCancel={()=>{swipe.current=null;}}
        onPointerUp={event=>{const start=swipe.current;swipe.current=null;if(start&&start.id===event.pointerId&&event.clientY-start.y>=64&&event.clientY-start.y>Math.abs(event.clientX-start.x)*1.5)close();}}>
        <span className="modal-dialog__handle" aria-hidden="true"/>
        <button type="button" id={closeId} className="modal-close" aria-label={copy("feed/close")} onClick={close}><X aria-hidden="true"/></button>
        <div className="pair-forecast-avatars" aria-hidden="true"><ProfileAvatar name={readerName} email="" avatarUrl={readerAvatar}/><ProfileAvatar name={dialog.friend.displayName} email="" avatarUrl={dialog.friend.avatarUrl}/></div>
        <h2 id={titleId}>{pairTitle(dialog.friend.displayName)}</h2>
        <div className="pair-forecast-day-meta"><span className={`pair-forecast-detail-rating pair-forecast-day--${selected.day.rating}`}><span aria-hidden="true">{markers[selected.day.rating]}</span> {forecastLabels[selected.day.rating]}</span>
          <span className="pair-forecast-detail-date">{selected.date===pairs[0]?.days[0].date?"Today, ":""}{civilLabel(selected.date,selected.date!==pairs[0]?.days[0].date)}</span></div>
      </header>
      {writing.error && <PageLoadError message={copy("availability/error")} onRetry={writing.retry}/>}
      <FriendsPairForecastReading key={`${dialog.friend.id}:${selected.date}`} day={selected.day} today={selected.date===pairs[0]?.days[0].date} timeZone={timeZone} friendName={dialog.friend.displayName} chartId={dialog.friend.chart.id} normalize={normalize} copyLoading={copyLoading} copyError={copyError} onRetryCopy={onRetryCopy} copy={copy}/>
      <section className="pair-forecast-person-section"><h3>Transits</h3>
        {[{name:dialog.friend.displayName,avatar:dialog.friend.avatarUrl,chartId:dialog.friend.chart.id,owner:false},{name:copy("feed/you"),avatar:readerAvatar,chartId:null,owner:true}].map(person=><a className="pair-forecast-person" key={person.name+person.owner} href={forecastPersonHref(person.chartId,selected.date)}
          onClick={event=>{if(!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&event.button===0){event.preventDefault();navigateForecast(event.currentTarget.href);}}}>
          <ProfileAvatar name={person.owner?readerName:person.name} email="" avatarUrl={person.avatar}/><span><strong>{person.name}</strong><small>{person.owner?"Your":"Their"} transits {selected.date===pairs[0]?.days[0].date?"today":`on ${civilLabel(selected.date,true)}`}</small></span><ChevronRight aria-hidden="true"/>
        </a>)}
      </section>
      <footer><button type="button" className="modal-action pair-forecast-explainer" onClick={()=>setExplaining(true)}>{copy("feed/howRated")}</button></footer>
    </ModalPortal>}
    {dialog && (!dialog.date||explaining) && <ModalDialog title={copy("feed/howRated")} onClose={()=>dialog.date?setExplaining(false):close()} restoreFocusId={dialog.date?undefined:menuButtonId(dialog.friend)}>
      <p>{copy("method/charts")}</p><p>{copy("profection/method")}</p><p>{copy("method/rating")}</p>
      {selected?.day && <ForecastExplanation day={selected.day} friendName={dialog.friend.displayName} copy={copy}/>}
      {writing.error && <PageLoadError message={copy("availability/error")} onRetry={writing.retry}/>}
    </ModalDialog>}
  </section>;
}

function ForecastExplanation({day,friendName,copy}:{day:RelationshipForecastDay;friendName:string;copy:ReturnType<typeof useFrictionFlowCopy>["copy"]}) {
  const sources=useForecastExplanationSources(day.contacts),guide=forecastAspectGuide(sources.rows);
  return <><p data-content-key={`cms/friction-flow/explanation/${day.rating}`}>{forecastRatingExplanation(day,copy)}</p>
    <details className="pair-forecast-guide"><summary>{copy("profection/heading")}</summary><div className="modal-dialog__content">
      {day.annualTiming.map(year=><p key={year.owner}><strong>{year.owner==="reader"?copy("feed/you"):friendName}</strong> · {copy("profection/facts",{house:year.house,sign:year.sign,lordOfYear:year.lordOfYear})}</p>)}
      {day.annualTiming.length>0&&<p data-content-key="cms/friction-flow/profection/priority">{copy("profection/priority")}</p>}
    </div></details>
    {guide&&<details className="pair-forecast-guide"><summary>{copy("section/guide")}</summary><div data-content-key={guide.contentKey}><FormattedProse text={guide.body}/></div><a href={guide.href}>{copy("section/guideLink")}</a></details>}
    {sources.error&&<PageLoadError message={copy("availability/error")} onRetry={sources.retry}/>}
  </>;
}
