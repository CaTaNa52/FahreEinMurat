import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { CHALLENGES } from './gameplay.js';
import { createInputRouter, gestureActions } from './input.js';
import { loadProfile, PROFILE_KEY, chooseUpgrade } from './customization.js';
import { TUTORIAL_STEPS, hasSeenTutorial, markTutorialSeen } from './tutorial.js';
import Tutorial from './Tutorial.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import Minimap from './Minimap.jsx';
import { BUDDY_NAME } from './buddy.js';
import { TOW_FEE, repairCost, damageLabel } from './crash.js';

const PROMPTS={
  'buddy-pickup':{icon:'🤝',text:BUDDY_NAME+' will mitfahren',button:'AUFSTEIGEN LASSEN (E)',label:'Kollegen aufsteigen lassen'},
  'station-enter':{icon:'🚓',text:'Polizeiwache',button:'REINGEHEN (E)',label:'Polizeiwache betreten'},
  'station-exit':{icon:'🚪',text:'Ausgang',button:'RAUSGEHEN (E)',label:'Polizeiwache verlassen'},
  'station-officer':{icon:'👮',text:'Beamter am Empfang',button:'ANSPRECHEN (E)',label:'Beamten ansprechen'},
  'station-inmate':{icon:'🔒',text:'Zelle 2',button:'ANSPRECHEN (E)',label:'Insassen ansprechen'},
};
const CRASH_TEXT={
  car:'Du bist mit einem Auto zusammengestoßen.',
  wall:'Zu schnell gegen ein Hindernis.',
  tree:'Der Baum war stärker.',
  wheelie:'Zu hoch! Du bist vom Scooter gefallen.',
};
const GameCanvas = lazy(() => import('./GameCanvas.jsx'));
const Customizer = lazy(() => import('./Customizer.jsx'));
class SceneError extends Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('AliAsaf-Scooter 3D:',error,info);}
  render(){return this.state.error?<div className="startup-error" role="alert"><h2>3D konnte nicht gestartet werden</h2><p>{this.state.error.message}</p><p>Öffne die Codespaces-Portvorschau direkt in Safari oder Chrome.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>:this.props.children;}
}
function Control({ action, label, children, router, className='' }) {
  const [held,setHeld]=useState(false);
  const pointers=useRef(new Set());
  const stop=e=>{
    pointers.current.delete(e.pointerId);
    router.clearPointer(e.pointerId);
    setHeld(pointers.current.size>0);
  };
  useEffect(()=>{
    const update=()=>{
      for(const id of [...pointers.current]){
        if(!router.hasPointer(id))pointers.current.delete(id);
      }
      setHeld(pointers.current.size>0);
    };
    const unsubscribe=router.subscribe(update);
    return ()=>{unsubscribe();for(const id of pointers.current)router.clearPointer(id);pointers.current.clear();};
  },[router]);
  return <button type="button" aria-label={label} className={'ctrl '+className+(held?' held':'')}
    onPointerDown={e=>{
      e.preventDefault();
      // Pointer capture helps normal drags; native window listeners are the
      // fallback for iOS when capture/React pointerup gets interrupted.
      try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Safari */}
      pointers.current.add(e.pointerId);
      router.setPointer(e.pointerId,{[action]:true},{
        pointerType:e.pointerType,clientX:e.clientX,clientY:e.clientY
      });
      setHeld(true);
    }}
    onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onContextMenu={e=>e.preventDefault()}>{children}</button>;
}
// Capture gestures on the pad, NOT on each button. The same touch stays captured
// while sliding from GAS to WHEELIE or BREMSE, even in mobile Safari.
function RidePad({router}) {
  const zone=useRef(null);
  const buttons=useRef({});
  const pointers=useRef(new Map());
  const [active,setActive]=useState({gas:false,wheelie:false,brake:false});
  const refresh=()=>{
    const next={gas:false,wheelie:false,brake:false};
    for(const [id,{origin,mode}] of pointers.current){
      if(!router.hasPointer(id)){pointers.current.delete(id);continue;}
      const actions=gestureActions(origin,mode);
      next.gas ||= !!actions.forward;
      next.wheelie ||= !!actions.wheelie;
      next.brake ||= !!actions.brake;
    }
    setActive(next);
  };
  const findTarget=(x,y)=>{
    let best=null,nearest=Infinity;
    for(const name of ['gas','wheelie','brake']){
      const rect=buttons.current[name]?.getBoundingClientRect();
      if(!rect)continue;
      const px=Math.max(rect.left,Math.min(rect.right,x));
      const py=Math.max(rect.top,Math.min(rect.bottom,y));
      const distance=Math.hypot(x-px,y-py);
      if(distance<nearest){nearest=distance;best=name;}
    }
    return nearest<=38?best:null; // Short gaps between buttons remain swipeable.
  };
  const down=e=>{
    const element=e.target.closest?.('[data-ride]');
    if(!element||!zone.current.contains(element))return;
    e.preventDefault();
    const mode=element.dataset.ride;
    pointers.current.set(e.pointerId,{origin:mode,mode});
    try{zone.current.setPointerCapture(e.pointerId);}catch{/* Safari */}
    router.setPointer(e.pointerId,gestureActions(mode,mode),{
      pointerType:e.pointerType,clientX:e.clientX,clientY:e.clientY
    });
    refresh();
  };
  const move=e=>{
    const prev=pointers.current.get(e.pointerId);
    if(!prev)return;
    // Don't resurrect an input cleared globally by blur, touchcancel, or reset.
    if(!router.hasPointer(e.pointerId)){
      pointers.current.delete(e.pointerId);refresh();return;
    }
    e.preventDefault();
    router.movePointer(e.pointerId,e.clientX,e.clientY);
    const mode=findTarget(e.clientX,e.clientY)??prev.mode;
    if(mode===prev.mode)return;
    pointers.current.set(e.pointerId,{origin:prev.origin,mode});
    router.setPointer(e.pointerId,gestureActions(prev.origin,mode));
    refresh();
  };
  const up=e=>{
    if(!pointers.current.has(e.pointerId))return;
    pointers.current.delete(e.pointerId);
    router.clearPointer(e.pointerId);
    refresh();
  };
  useEffect(()=>{
    // Shared router is the source of truth. Global touchend/pointerup and
    // clearAll must also update the visual "held" state on the touch pad.
    const unsubscribe=router.subscribe(refresh);
    return ()=>{
      unsubscribe();
      for(const id of pointers.current.keys())router.clearPointer(id);
      pointers.current.clear();
    };
  },[router]);
  return <div ref={zone} className="ride-pad" data-testid="drive-pad"
    data-gas={String(active.gas)} data-wheelie={String(active.wheelie)} data-brake={String(active.brake)}
    onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onPointerCancel={up} onLostPointerCapture={up} onContextMenu={e=>e.preventDefault()}>
    <div className="ride-guide">GAS HALTEN · HOCH ZIEHEN = WHEELIE</div>
    <button ref={el=>{buttons.current.wheelie=el;}} type="button" data-ride="wheelie"
      aria-label="Wheelie halten" className={'ctrl wheel ride-wheelie'+(active.wheelie?' held':'')}>WHEELIE ↑</button>
    <button ref={el=>{buttons.current.brake=el;}} type="button" data-ride="brake"
      aria-label="Bremse" className={'ctrl secondary ride-brake'+(active.brake?' held':'')}>BREMSE<span className="brake-caption">HALTEN: RÜCK ↩</span></button>
    <button ref={el=>{buttons.current.gas=el;}} type="button" data-ride="gas"
      aria-label="Gas" className={'ctrl primary ride-gas'+(active.gas?' held':'')}>GAS ⚡</button>
  </div>;
}
function supportsWebGL(){try{const canvas=document.createElement('canvas');return !!(canvas.getContext('webgl2')||canvas.getContext('webgl'));}catch{return false;}}
export default function App(){
  const controls=useRef({forward:false,back:false,left:false,right:false,brake:false,wheelie:false,reset:false});
  // Live positions for the minimap, written by the 3D world every frame.
  const radar=useRef({x:0,z:0,yaw:0,mode:'ride',slalom:false,cars:[],buddy:null,dest:null});
  const routerRef=useRef(null);
  if(!routerRef.current)routerRef.current=createInputRouter(controls);
  const router=routerRef.current;
  useEffect(()=>{
    const endPointer=e=>router.clearPointer(e.pointerId);
    // Track raw TouchEvents independently of PointerEvents. In particular,
    // older Safari/PWA versions can omit a captured element's pointerup.
    const touchStart=e=>router.trackTouches('start',e.changedTouches,e.touches);
    const touchMove=e=>router.trackTouches('move',e.changedTouches,e.touches);
    const touchEnd=e=>router.trackTouches('end',e.changedTouches,e.touches);
    const clear=()=>router.clearAll();
    const visibility=()=>{if(document.hidden)clear();};
    window.addEventListener('pointerup',endPointer,true);
    window.addEventListener('pointercancel',endPointer,true);
    window.addEventListener('lostpointercapture',endPointer,true);
    window.addEventListener('touchstart',touchStart,{capture:true,passive:true});
    window.addEventListener('touchmove',touchMove,{capture:true,passive:true});
    window.addEventListener('touchend',touchEnd,{capture:true,passive:true});
    window.addEventListener('touchcancel',touchEnd,{capture:true,passive:true});
    window.addEventListener('blur',clear);
    window.addEventListener('pagehide',clear);
    document.addEventListener('visibilitychange',visibility);
    return ()=>{
      window.removeEventListener('pointerup',endPointer,true);
      window.removeEventListener('pointercancel',endPointer,true);
      window.removeEventListener('lostpointercapture',endPointer,true);
      window.removeEventListener('touchstart',touchStart,true);
      window.removeEventListener('touchmove',touchMove,true);
      window.removeEventListener('touchend',touchEnd,true);
      window.removeEventListener('touchcancel',touchEnd,true);
      window.removeEventListener('blur',clear);
      window.removeEventListener('pagehide',clear);
      document.removeEventListener('visibilitychange',visibility);
      clear();
    };
  },[router]);
  const [started,setStarted]=useState(false);
  const [unsupported,setUnsupported]=useState(false);
  const [profile,setProfile]=useState(()=>loadProfile(localStorage));
  const [challenge,setChallenge]=useState(null);
  const [view,setView]=useState('third');
  const [studio,setStudio]=useState(null);
  const [studioMessage,setStudioMessage]=useState('');
  const [nearby,setNearby]=useState(null);
  const [nearBench,setNearBench]=useState(null);
  const [seated,setSeated]=useState(false);
  const [poolMode,setPoolMode]=useState('ride');
  const [slideNear,setSlideNear]=useState(null);
  const [poolEdge,setPoolEdge]=useState({canExit:false,depth:null});
  const [activeSlide,setActiveSlide]=useState(null);
  const [tutorialStep,setTutorialStep]=useState(null);
  const [prompt,setPrompt]=useState(null);
  const [damage,setDamage]=useState(0);
  const [phone,setPhone]=useState(null);
  const [banner,setBanner]=useState(null);
  const [area,setArea]=useState(null);
  const [passenger,setPassenger]=useState(false);
  const stamp=useRef(0);
  const flash=(setter,value,ms)=>{
    const id=++stamp.current;
    setter({...value,id});
    setTimeout(()=>setter(prev=>prev?.id===id?null:prev),ms);
  };
  const [quality,setQuality]=useState('high');
  const [kmh,setKmh]=useState(0);
  const [reversing,setReversing]=useState(false);
  const speedRef=useRef(0);
  const onSpeed=useCallback(speed=>{
    const value=Math.round(Math.abs(speed)*3.6);
    if(value!==speedRef.current){speedRef.current=value;setKmh(value);}
    setReversing(prev=>prev===(speed<-.10)?prev:speed<-.10);
  },[]);
  const onGameEvent=useCallback(event=>{
    if(event.type==='near'){
      setNearby(prev=>prev===event.place?prev:event.place);
      return;
    }
    if(event.type==='benchNearby'){
      setNearBench(prev=>prev===event.benchId?prev:event.benchId);
      return;
    }
    if(event.type==='pool'){
      setPoolMode(event.mode);
      if(event.mode==='slide')setActiveSlide(event.slide??null);
      if(event.mode==='ride')setPoolEdge({canExit:false,depth:null});
      return;
    }
    if(event.type==='slideNearby'){
      setSlideNear(prev=>prev===event.slide?prev:event.slide);
      return;
    }
    if(event.type==='poolEdge'){
      setPoolEdge({canExit:event.canExit,depth:event.depth});
      return;
    }
    if(event.type==='benchSeat'){
      setSeated(event.seated);
      return;
    }
    if(event.type==='prompt'){setPrompt(event.action);return;}
    if(event.type==='damage'){setDamage(event.value);return;}
    if(event.type==='area'){flash(setArea,{name:event.name},4200);return;}
    if(event.type==='talk'){
      flash(setPhone,{from:event.who==='officer'?'Polizist':'Insasse',avatar:event.who==='officer'?'👮':'🔒',text:event.text},6500);
      return;
    }
    if(event.type==='buddy'){
      if(!event.text)return;
      flash(setPhone,{from:BUDDY_NAME,avatar:'M',text:event.text,call:event.event==='call'},event.event==='call'?9000:5500);
      if(event.event==='pickup')setPassenger(true);
      if(event.event==='dropoff'){
        setPassenger(false);
        setProfile(prev=>({...prev,coins:prev.coins+event.reward}));
        flash(setBanner,{kind:'won',title:'KOLLEGE ABGELIEFERT',sub:'+'+event.reward.toLocaleString('de-DE')+' AliAsaf-Coins'},4200);
      }
      return;
    }
    if(event.type==='impact'){
      flash(setBanner,{kind:'hit',title:'RUMMS!',sub:'Scooter-Schaden '+Math.round(event.damage)+' %'},1600);
      return;
    }
    if(event.type==='totaled'){
      setProfile(prev=>({...prev,coins:Math.max(0,prev.coins-TOW_FEE)}));
      flash(setBanner,{kind:'crash',title:'TOTALSCHADEN',sub:'Abschleppdienst zur Garage · bis zu −'+TOW_FEE+' Coins'},3600);
      return;
    }
    if(event.type==='won'){
      // Unlimited rewards: every successful attempt pays again.
      setProfile(prev=>({...prev,coins:prev.coins+CHALLENGES[event.id].reward}));
      setChallenge({...event,reward:CHALLENGES[event.id].reward});
      flash(setBanner,{kind:'won',title:'MISSION GESCHAFFT',sub:'+'+CHALLENGES[event.id].reward.toLocaleString('de-DE')+' AliAsaf-Coins'},4200);
    } else if(event.type==='crash'){
      flash(setBanner,{kind:'crash',title:'CRASH!',sub:CRASH_TEXT[event.source]??CRASH_TEXT.wheelie},2300);
      setChallenge(prev=>prev?.type==='failed'?prev:{type:'crash',reason:CRASH_TEXT[event.source]??CRASH_TEXT.wheelie});
    } else if(event.type==='respawn'){
      setChallenge(prev=>prev?.type==='crash'?null:prev);
    } else {
      setChallenge(event);
    }
  },[]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* no storage */}},[profile]);
  // Results (won / failed / crash) are short notes, not windows: they leave by themselves.
  useEffect(()=>{
    if(!challenge||['start','progress'].includes(challenge.type))return undefined;
    const timer=setTimeout(()=>setChallenge(prev=>prev===challenge?null:prev),3600);
    return ()=>clearTimeout(timer);
  },[challenge]);
  const openStudio=(room)=>{
    router.clearAll();
    setStudioMessage('');
    setStudio(room);
  };
  const closeStudio=()=>{router.clearAll();setStudio(null);setStudioMessage('');};
  const customize=(category,key,value)=>{
    const outcome=chooseUpgrade(profile,category,key,value);
    if(outcome.error){setStudioMessage(outcome.error);return;}
    setProfile(outcome.profile);
    setStudioMessage(outcome.paid?'🪙 '+outcome.paid+' AliAsaf-Coins ausgegeben.':'✓ Anpassung gespeichert.');
  };
  const interact=()=>{router.clearAll();controls.current.interact=true;};
  const repair=()=>{
    const cost=Math.min(profile.coins,repairCost(damage));
    setProfile(prev=>({...prev,coins:prev.coins-cost}));
    controls.current.repair=true;
    flash(setBanner,{kind:'won',title:'REPARIERT',sub:cost?'−'+cost.toLocaleString('de-DE')+' AliAsaf-Coins':'Geht aufs Haus'},2600);
  };
  const finishTutorial=()=>{
    markTutorialSeen(window.localStorage);
    router.clearAll();
    setTutorialStep(null);
  };
  const nextTutorial=()=>{
    if(tutorialStep === null)return;
    if(tutorialStep >= TUTORIAL_STEPS.length-1)finishTutorial();
    else setTutorialStep(step=>step+1);
  };
  const begin=()=>{
    if(!supportsWebGL()){setUnsupported(true);return;}
    setQuality((matchMedia('(pointer:coarse)').matches||innerWidth<850)?'low':'high');
    setStarted(true);
    if(!hasSeenTutorial(window.localStorage))setTutorialStep(0);
  };
  useEffect(()=>{
    const map={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'brake',ShiftRight:'brake',Space:'wheelie'};
    const down=e=>{
      if(tutorialStep!==null){
        if(e.code==='Escape')finishTutorial();
        else if(e.code==='Enter'&&!e.repeat)nextTutorial();
        e.preventDefault();return;
      }
      if(studio){if(e.code==='Escape')closeStudio();return;}
      const a=map[e.code];if(a){router.setKey(e.code,a,true);e.preventDefault();}if(e.code==='KeyR')controls.current.reset=true;if(e.code==='KeyV'&&!e.repeat)setView(v=>v==='third'?'first':'third');if(e.code==='KeyE'&&!e.repeat){
        if(prompt||seated||poolMode==='swim'||poolMode==='walk'||(!nearby&&(nearBench||slideNear)))controls.current.interact=true;
        else if(nearby)openStudio(nearby);
      }if(e.code==='Enter'&&!started)begin();};
    const up=e=>{const a=map[e.code];if(a){router.setKey(e.code,a,false);e.preventDefault();}};
    const blur=()=>router.clearAll();
    const hidden=()=>{if(document.hidden)router.clearAll();};
    addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
  },[started,router,studio,nearby,nearBench,seated,tutorialStep,poolMode,slideNear,prompt]);
  return <>
    <InstallPrompt started={started}/>
    {started&&<div className={'scene-host'+(banner?.kind==='crash'?' wrecked':'')}><SceneError><Suspense fallback={<div className="loading">3D-WELT WIRD GELADEN …</div>}><GameCanvas controls={controls} radar={radar} quality={quality} onSpeed={onSpeed} onGameEvent={onGameEvent} cosmetics={profile} view={view} paused={!!studio||tutorialStep!==null} tutorialStep={tutorialStep}/></Suspense></SceneError></div>}
    {started&&<div id="hud">
      <div id="top"><Minimap radar={radar}/><div className="top-info"><div className="brand">ALIASAF<em>-SCOOTER.</em></div><div className="wallet" data-testid="coins">🪙 {profile.coins.toLocaleString('de-DE')} ALIASAF-COINS</div>
        <div className={'damage'+(damage>=70?' bad':damage>=40?' warn':'')} data-testid="damage" role="status" aria-label={'Scooter-Zustand: '+damageLabel(damage)}>
          <span>🛴 {damageLabel(damage)}</span><div className="damage-bar"><div style={{width:(100-damage)+'%'}}/></div>
        </div>
        {passenger&&<div className="passenger" data-testid="passenger">🤝 {BUDDY_NAME.toUpperCase()} FÄHRT MIT · ZIEL GELB</div>}
      </div></div>
      <div className="speed"><strong data-testid="speed">{kmh}</strong> <span>KM/H</span><small>{reversing?'↩ RÜCKWÄRTS':poolMode==='walk'?'● ZU FUSS':'● FREERIDE + CHALLENGES'}</small></div>
      <div className="tip">Fahre in leuchtende Felder für Challenges. Achte auf den Verkehr: Crashs beschädigen den Scooter. Wenn {BUDDY_NAME} schreibt, hol ihn am pinken Punkt der Karte ab.</div>
      {banner&&<div key={banner.id} className={'banner '+banner.kind} role="status" data-testid="banner"><strong>{banner.title}</strong><span>{banner.sub}</span></div>}
      {phone&&<div key={phone.id} className={'phone'+(phone.call?' call':'')} role="status" data-testid="phone">
        <div className="phone-avatar">{phone.avatar}</div>
        <div><div className="phone-from">{phone.call?'📱 NEUE NACHRICHT · ':''}{phone.from.toUpperCase()}</div><div className="phone-text">{phone.text}</div></div>
      </div>}
      {area&&poolMode!=='walk'&&<div key={area.id} className="area-name" aria-hidden="true">{area.name}</div>}
      {poolMode==='walk'&&<div key="fade-in" className="scene-fade"/>}
      {challenge && <div className={`challenge-panel ${challenge.type}`+(['start','progress'].includes(challenge.type)?' live':' result')} role="status" data-testid="challenge">
        {challenge.id && <div className="challenge-name">{CHALLENGES[challenge.id]?.name}</div>}
        {['start','progress'].includes(challenge.type) ? <>
          <div className="challenge-title">{challenge.id==='slalom'?'SLALOM FAHREN!':challenge.id==='wheelie'?'WHEELIE BALANCIEREN!':'FIND DEN GOLDENEN SCHLÜSSEL!'}</div>
          <div className="challenge-stat"><strong>{Math.ceil(challenge.remaining ?? CHALLENGES[challenge.id].limit)}s</strong><span>{challenge.id==='slalom'? `${Math.floor(challenge.progress||0)} / 7 Hütchen`:
            challenge.id==='wheelie'? `${Number(challenge.progress||0).toFixed(1)} / 4.0 Sek. Balance`:
            'SUCHEN & FINDEN'}</span></div>
          {challenge.id!=='hunt'&&<div className="challenge-meter"><div style={{width:`${Math.min(100,100*(challenge.progress||0)/(challenge.id==='slalom'?7:4))}%`}}/></div>}
          <div className="challenge-help">{challenge.id==='slalom'?
            'Fahre abwechselnd rechts und links an den Hütchen vorbei. Folge den grünen Ringen bis ins Ziel.':
            challenge.id==='wheelie'?'Halte Wheelie zum Anheben. Lass los, um zu balancieren. Zu hoher Winkel = Sturz!':
            'Ein goldener Schlüssel ist irgendwo versteckt. Keine Pfeile, keine Entfernungsanzeige – erkunde die Welt und finde ihn!'} </div>
          {challenge.id==='wheelie'&&<div className="wheelie-angle">Radwinkel: <strong>{Math.round((challenge.pitch||0)*180/Math.PI)}°</strong> · Balance: 13–40° · Sturz: 50°</div>}
        </> : <><div className="challenge-title">{challenge.type==='won'?'🏆 GESCHAFFT!':challenge.type==='failed'?'✖ CHALLENGE GESCHEITERT':'💥 STURZ!'}</div>
          <div className="challenge-help">{challenge.type==='won'?`+${challenge.reward.toLocaleString('de-DE')} AliAsaf-Coins! Erneut spielbar.`:(challenge.reason||'Versuch es erneut.')}</div>
          <div className="challenge-help">Verlasse das leuchtende Feld und fahre erneut hinein, um es wieder zu versuchen.</div>
        </>}
      </div>}
      <div className="controls left"><div className="steering-pad" data-testid="steering-pad">
        <Control router={router} action="left" label="Links" className="steer-control">←</Control>
        <Control router={router} action="right" label="Rechts" className="steer-control">→</Control>
      </div></div>
      <div className="controls right"><button className="ctrl reset" aria-label="Zurücksetzen" onClick={()=>{router.clearAll();controls.current.reset=true;}}>↺</button>
      <RidePad router={router}/></div>
      <div className="world-actions">
        <button type="button" onClick={()=>openStudio('garage')} aria-label="Garage öffnen">🛠️<span className="wa-label"> GARAGE</span></button>
        <button type="button" onClick={()=>openStudio('home')} aria-label="Zuhause öffnen">🏠<span className="wa-label"> ZUHAUSE</span></button>
        <button type="button" onClick={()=>setView(v=>v==='third'?'first':'third')} data-testid="camera-toggle" aria-label="Kamera wechseln">👁️<span className="wa-label"> </span>{view==='first'?'3RD':'1ST'}</button>
        <button type="button" onClick={()=>{router.clearAll();setTutorialStep(0);}} aria-label="Einführung erneut ansehen">❔<span className="wa-label"> HILFE</span></button>
      </div>
      {poolMode==='swim'&&!studio&&tutorialStep===null&&<div className="bench-entry pool-entry" role="status" data-testid="swim-status">
        <span>🏊 Du schwimmst{poolEdge.depth!=null?` · Tiefe ${poolEdge.depth.toLocaleString('de-DE')} m`:''}</span>
        <button type="button" disabled={!poolEdge.canExit} aria-label="Aus dem Becken klettern"
          onClick={()=>{router.clearAll();controls.current.interact=true;}}>
          {poolEdge.canExit?'RAUSKLETTERN (E)':'ZUM RAND SCHWIMMEN'}
        </button>
      </div>}
      {poolMode==='slide'&&<div className="bench-entry pool-entry" role="status" data-testid="slide-status">
        <span>🛝 {activeSlide??'RUTSCHE'} – WUUUSCH!</span>
      </div>}
      {poolMode==='walk'&&!studio&&tutorialStep===null&&<div className="bench-entry station-entry" role="status" data-testid="station-status">
        <span>{prompt&&PROMPTS[prompt]?PROMPTS[prompt].icon+' '+PROMPTS[prompt].text:'🚓 In der Polizeiwache · GAS = gehen'}</span>
        {prompt&&PROMPTS[prompt]&&<button type="button" aria-label={PROMPTS[prompt].label} onClick={interact}>{PROMPTS[prompt].button}</button>}
      </div>}
      {poolMode==='ride'&&prompt&&PROMPTS[prompt]&&!seated&&!studio&&tutorialStep===null&&<div className={'bench-entry '+(prompt==='buddy-pickup'?'buddy-entry':'station-entry')} role="status" data-testid="action-prompt">
        <span>{PROMPTS[prompt].icon} {PROMPTS[prompt].text}</span>
        <button type="button" aria-label={PROMPTS[prompt].label} onClick={interact}>{PROMPTS[prompt].button}</button>
      </div>}
      {poolMode==='ride'&&slideNear&&!prompt&&!seated&&!studio&&tutorialStep===null&&<div className="bench-entry pool-entry" role="status">
        <span>🛝 Wasserrutsche: {slideNear}</span>
        <button type="button" aria-label="Rutschen" onClick={()=>{router.clearAll();controls.current.interact=true;}}>RUTSCHEN (E)</button>
      </div>}
      {(seated||nearBench)&&poolMode==='ride'&&!prompt&&!studio&&tutorialStep===null&&<div className="bench-entry" role="status">
        <span>{seated?'🪑 Du sitzt auf der Bank':'🪑 Sitzbank in der Nähe'}</span>
        <button type="button" aria-label={seated?'Von Bank aufstehen':'Auf Bank setzen'}
          onClick={()=>{router.clearAll();controls.current.interact=true;}}>
          {seated?'AUFSTEHEN (E)':'HINSETZEN (E)'}
        </button>
      </div>}
      {nearby&&!studio&&<div className="nearby-entry" role="status">
        {nearby==='garage'?'🛠️ Garage':'🏠 Zuhause'} in der Nähe!
        <button type="button" onClick={()=>openStudio(nearby)}>ÖFFNEN (E)</button>
        {nearby==='garage'&&damage>0&&<button type="button" className="repair" onClick={repair} aria-label="Scooter reparieren">
          🔧 REPARIEREN · {Math.min(profile.coins,repairCost(damage)).toLocaleString('de-DE')} 🪙</button>}
      </div>}
      <div className="hint">WASD · V KAMERA · E AKTION (GARAGE, WACHE, KOLLEGE, RUTSCHE) · R RESET</div>
    </div>}
    {started&&tutorialStep!==null&&!studio&&<Tutorial step={tutorialStep} onNext={nextTutorial} onSkip={finishTutorial}/>}
    {started&&studio&&<SceneError><Suspense fallback={<div className="loading">STUDIO WIRD GELADEN …</div>}>
      <Customizer room={studio} profile={profile} onChange={customize} onClose={closeStudio} message={studioMessage}/>
    </Suspense></SceneError>}
    {!started&&!unsupported&&<div className="overlay"><div className="intro"><img className="intro-logo" src="/icons/logo.svg" alt="AliAsaf-Scooter Logo" width="132" height="132"/><div className="eyebrow">OPEN WORLD SCOOTER GAME</div>
      <h1>ALIASAF<br/><i>SCOOTER.</i></h1>
      <p>Deine Stadt bei Sonnenuntergang. Weich dem Verkehr aus, nimm deinen Kollegen {BUDDY_NAME} mit, schau in der Polizeiwache vorbei und hol dir Coins in drei Challenges.</p>
      <button className="start" onClick={begin}>JETZT FAHREN →</button>
      <p style={{fontSize:12,opacity:.7}}>PC: WASD / Pfeiltasten · Handy: Gas gedrückt halten und nach oben zum Wheelie wischen.</p>
      <p style={{fontSize:11,opacity:.5}}>REACT THREE FIBER · VERSION 1.0 · SUNSET CITY</p>
    </div></div>}
    {unsupported&&<div className="startup-error" role="alert"><h2>WebGL ist in dieser Vorschau nicht verfügbar.</h2><p>Öffne im Codespace den Port 5173 mit „Open in Browser“ direkt in Safari, Chrome oder Edge.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>}
  </>;
}
