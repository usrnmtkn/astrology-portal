import {lazy,Suspense,useRef,useState} from 'react';
import {StudioTabs} from './StudioControls';
import {PageLoading} from '../../web/src/components/PageLoading';
const Reusable = lazy(()=>import('./ReusableLunationWritingStudio'));
const Dated = lazy(()=>import('./DatedLunationWritingStudio'));
export default function LunationWritingStudio({secret,dirtyRef,onOpenContent}:{secret:string;dirtyRef:{current:boolean};onOpenContent:(key:string)=>Promise<void>}) {
  const initial=new URLSearchParams(window.location.hash.split('?')[1]??'');
  const [mode,setMode]=useState(initial.get('writing')==='dated'?'dated':'reusable');
  const childDirty=useRef(false);
  // Both children update the parent's existing navigation guard.
  const guard={get current(){return childDirty.current;},set current(value:boolean){childDirty.current=value;dirtyRef.current=value;}};
  const stableGuard=useRef(guard).current;
  function choose(value:string) {
    if(value===mode)return;
    if(childDirty.current&&!window.confirm('Discard unsaved changes and switch lunar writing views?'))return;
    const params=new URLSearchParams(window.location.hash.split('?')[1]??'');
    params.set('view','lunation-writing');params.set('writing',value);
    window.history.replaceState(null,'',`${window.location.pathname}${window.location.search}#calendar-writeups?${params}`);
    childDirty.current=false;dirtyRef.current=false;setMode(value);
  }
  return <StudioTabs label="Lunar writing type" tabs={[{value:'reusable',label:'Reusable sign readings'},{value:'dated',label:'Dated articles & eclipses'}]} value={mode} onValueChange={choose}>
    <Suspense fallback={<PageLoading message="Loading lunar writing…"/>}>
      {mode==='reusable'?<Reusable secret={secret} dirtyRef={stableGuard} onOpenContent={onOpenContent}/>:<Dated secret={secret} dirtyRef={stableGuard} onOpenContent={onOpenContent} onEditGuidance={()=>choose('reusable')}/>}
    </Suspense>
  </StudioTabs>;
}
