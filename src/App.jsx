import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { CHALLENGES } from './gameplay.js';
import { createInputRouter, gestureActions } from './input.js';
import { loadProfile, PROFILE_KEY, chooseUpgrade } from './customization.js';
import { TUTORIAL_STEPS, hasSeenTutorial, markTutorialSeen } from './tutorial.js';
import Tutorial from './Tutorial.jsx';
import InstallPrompt from './InstallPrompt.jsx';
const GameCanvas = lazy(() => import('./GameCanvas.jsx'));
const Customizer = lazy(() => import('./Customizer.jsx'));
class SceneError extends Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('FahreEinMurat 3D:',error,info);}
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
  useEffect(()=>()=>{for(const id of pointers.current)router.clearPointer(id);},[router]);
  return <button type="button" aria-label={label} className={'ctrl '+className+(held?' held':'')}
    onPointerDown={e=>{
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      pointers.current.add(e.pointerId);
      router.setPointer(e.pointerId,{[action]:true});
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
    for(const {origin,mode} of pointers.current.values()){
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
    zone.current.setPointerCapture(e.pointerId);
    router.setPointer(e.pointerId,gestureActions(mode,mode));
    refresh();
  };
  const move=e=>{
    const prev=pointers.current.get(e.pointerId);
    if(!prev)return;
    e.preventDefault();
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
    const clear=()=>{
      for(const id of pointers.current.keys())router.clearPointer(id);
      pointers.current.clear();
      setActive({gas:false,wheelie:false,brake:false});
    };
    window.addEventListener('blur',clear);
    return ()=>{window.removeEventListener('blur',clear);clear();};
  },[router]);
  return <div ref={zone} className="ride-pad" data-testid="drive-pad"
    data-gas={String(active.gas)} data-wheelie={String(active.wheelie)} data-brake={String(active.brake)}
    onPointerDown={down} onPointerMove={move} onPointerUp={up}
    onPointerCancel={up} onLostPointerCapture={up} onContextMenu={e=>e.preventDefault()}>
    <div className="ride-guide">GAS HALTEN · HOCH ZIEHEN = WHEELIE</div>
    <button ref={el=>{buttons.current.wheelie=el;}} type="button" data-ride="wheelie"
      aria-label="Wheelie halten" className={'ctrl wheel ride-wheelie'+(active.wheelie?' held':'')}>WHEELIE ↑</button>
    <button ref={el=>{buttons.current.brake=el;}} type="button" data-ride="brake"
      aria-label="Bremse" className={'ctrl secondary ride-brake'+(active.brake?' held':'')}>BREMSE</button>
    <button ref={el=>{buttons.current.gas=el;}} type="button" data-ride="gas"
      aria-label="Gas" className={'ctrl primary ride-gas'+(active.gas?' held':'')}>GAS ⚡</button>
  </div>;
}
function supportsWebGL(){try{const canvas=document.createElement('canvas');return !!(canvas.getContext('webgl2')||canvas.getContext('webgl'));}catch{return false;}}
export default function App(){
  const controls=useRef({forward:false,back:false,left:false,right:false,brake:false,wheelie:false,reset:false});
  const routerRef=useRef(null);
  if(!routerRef.current)routerRef.current=createInputRouter(controls);
  const router=routerRef.current;
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
  const [tutorialStep,setTutorialStep]=useState(null);
  const [quality,setQuality]=useState('high');
  const [kmh,setKmh]=useState(0);
  const speedRef=useRef(0);
  const onSpeed=useCallback(speed=>{const value=Math.round(Math.abs(speed)*3.6);if(value!==speedRef.current){speedRef.current=value;setKmh(value);}},[]);
  const onGameEvent=useCallback(event=>{
    if(event.type==='near'){
      setNearby(prev=>prev===event.place?prev:event.place);
      return;
    }
    if(event.type==='benchNearby'){
      setNearBench(prev=>prev===event.benchId?prev:event.benchId);
      return;
    }
    if(event.type==='benchSeat'){
      setSeated(event.seated);
      return;
    }
    if(event.type==='won'){
      // Unlimited rewards: every successful attempt pays again.
      setProfile(prev=>({...prev,coins:prev.coins+CHALLENGES[event.id].reward}));
      setChallenge({...event,reward:CHALLENGES[event.id].reward});
    } else if(event.type==='crash'){
      setChallenge(prev=>prev?.type==='failed'?prev:{type:'crash',reason:'Zu hoch! Du bist vom Scooter gefallen.'});
    } else if(event.type==='respawn'){
      setChallenge(prev=>prev?.type==='crash'?null:prev);
    } else {
      setChallenge(event);
    }
  },[]);
  useEffect(()=>{try{localStorage.setItem(PROFILE_KEY,JSON.stringify(profile));}catch{/* no storage */}},[profile]);
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
    setStudioMessage(outcome.paid?'🪙 '+outcome.paid+' Murat-Coins ausgegeben.':'✓ Anpassung gespeichert.');
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
        if(seated||(!nearby&&nearBench))controls.current.interact=true;
        else if(nearby)openStudio(nearby);
      }if(e.code==='Enter'&&!started)begin();};
    const up=e=>{const a=map[e.code];if(a){router.setKey(e.code,a,false);e.preventDefault();}};
    const blur=()=>router.clearAll();
    const hidden=()=>{if(document.hidden)router.clearAll();};
    addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
  },[started,router,studio,nearby,nearBench,seated,tutorialStep]);
  return <>
    <InstallPrompt started={started}/>
    {started&&<div className="scene-host"><SceneError><Suspense fallback={<div className="loading">3D-WELT WIRD GELADEN …</div>}><GameCanvas controls={controls} quality={quality} onSpeed={onSpeed} onGameEvent={onGameEvent} cosmetics={profile} view={view} paused={!!studio||tutorialStep!==null} tutorialStep={tutorialStep}/></Suspense></SceneError></div>}
    {started&&<div id="hud">
      <div id="top"><div className="brand">FAHRE EIN <em>MURAT.</em></div><div className="pill">🌲 FOREST FREERIDE</div><div className="wallet" data-testid="coins">🪙 {profile.coins.toLocaleString('de-DE')} MURAT-COINS</div></div>
      <div className="speed"><strong data-testid="speed">{kmh}</strong> <span>KM/H</span><small>● FREERIDE + CHALLENGES</small></div>
      <div className="tip">Fahre in leuchtende Felder für Challenges. Wheelie: Leertaste gedrückt halten, rechtzeitig loslassen oder bremsen!</div>
      {challenge && <div className={`challenge-panel ${challenge.type}`} role="status" data-testid="challenge">
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
          <div className="challenge-help">{challenge.type==='won'?`+${challenge.reward.toLocaleString('de-DE')} Murat-Coins! Erneut spielbar.`:(challenge.reason||'Versuch es erneut.')}</div>
          <div className="challenge-help">Verlasse das leuchtende Feld und fahre erneut hinein, um es wieder zu versuchen.</div>
        </>}
      </div>}
      <div className="controls left"><div className="pad"><span></span><Control router={router} action="forward" label="Vorwärts">↑</Control><span></span>
      <Control router={router} action="left" label="Links">←</Control><Control router={router} action="back" label="Rückwärts">↓</Control><Control router={router} action="right" label="Rechts">→</Control></div></div>
      <div className="controls right"><button className="ctrl reset" aria-label="Zurücksetzen" onClick={()=>{router.clearAll();controls.current.reset=true;}}>↺</button>
      <RidePad router={router}/></div>
      <div className="world-actions">
        <button type="button" onClick={()=>openStudio('garage')} aria-label="Garage öffnen">🛠️ GARAGE</button>
        <button type="button" onClick={()=>openStudio('home')} aria-label="Zuhause öffnen">🏠 ZUHAUSE</button>
        <button type="button" onClick={()=>setView(v=>v==='third'?'first':'third')} data-testid="camera-toggle" aria-label="Kamera wechseln">{view==='first'?'👁️ 3RD':'👁️ 1ST'}</button>
        <button type="button" onClick={()=>{router.clearAll();setTutorialStep(0);}} aria-label="Einführung erneut ansehen">❔ HILFE</button>
      </div>
      {(seated||nearBench)&&!studio&&tutorialStep===null&&<div className="bench-entry" role="status">
        <span>{seated?'🪑 Du sitzt auf der Bank':'🪑 Sitzbank in der Nähe'}</span>
        <button type="button" aria-label={seated?'Von Bank aufstehen':'Auf Bank setzen'}
          onClick={()=>{router.clearAll();controls.current.interact=true;}}>
          {seated?'AUFSTEHEN (E)':'HINSETZEN (E)'}
        </button>
      </div>}
      {nearby&&!studio&&<div className="nearby-entry" role="status">
        {nearby==='garage'?'🛠️ Garage':'🏠 Zuhause'} in der Nähe!
        <button type="button" onClick={()=>openStudio(nearby)}>ÖFFNEN (E)</button>
      </div>}
      <div className="hint">WASD · V KAMERA · E GARAGE / ZUHAUSE · R RESET</div>
    </div>}
    {started&&tutorialStep!==null&&!studio&&<Tutorial step={tutorialStep} onNext={nextTutorial} onSkip={finishTutorial}/>}
    {started&&studio&&<SceneError><Suspense fallback={<div className="loading">STUDIO WIRD GELADEN …</div>}>
      <Customizer room={studio} profile={profile} onChange={customize} onClose={closeStudio} message={studioMessage}/>
    </Suspense></SceneError>}
    {!started&&!unsupported&&<div className="overlay"><div className="intro"><div className="eyebrow">OPEN WORLD SCOOTER GAME</div>
      <h1>FAHRE<br/>EIN <i>MURAT.</i></h1>
      <p>Dein Scooter. Deine Straße. Dein Wald. Meistere drei Challenges, suche den goldenen Schlüssel und gestalte Fahrer und Scooter.</p>
      <button className="start" onClick={begin}>JETZT FAHREN →</button>
      <p style={{fontSize:12,opacity:.7}}>PC: WASD / Pfeiltasten · Handy: Gas gedrückt halten und nach oben zum Wheelie wischen.</p>
      <p style={{fontSize:11,opacity:.5}}>REACT THREE FIBER · VERSION 0.7</p>
    </div></div>}
    {unsupported&&<div className="startup-error" role="alert"><h2>WebGL ist in dieser Vorschau nicht verfügbar.</h2><p>Öffne im Codespace den Port 5173 mit „Open in Browser“ direkt in Safari, Chrome oder Edge.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>}
  </>;
}
