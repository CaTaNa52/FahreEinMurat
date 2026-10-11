import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { CHALLENGES } from './gameplay.js';
const GameCanvas = lazy(() => import('./GameCanvas.jsx'));
class SceneError extends Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('FahreEinMurat 3D:',error,info);}
  render(){return this.state.error?<div className="startup-error" role="alert"><h2>3D konnte nicht gestartet werden</h2><p>{this.state.error.message}</p><p>Öffne die Codespaces-Portvorschau direkt in Safari oder Chrome.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>:this.props.children;}
}
function Control({action, label, children, controls, className=''}) {
  const [held,setHeld]=useState(false);
  const stop=()=>{controls.current[action]=false;setHeld(false);};
  useEffect(()=>()=>{controls.current[action]=false;},[action,controls]);
  return <button type="button" aria-label={label} className={`ctrl ${className} ${held?'held':''}`}
    onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);controls.current[action]=true;setHeld(true);}}
    onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop}
    onContextMenu={e=>e.preventDefault()}>{children}</button>;
}
const WALLET_KEY = 'fahre-ein-murat-wallet-v1';
function readWallet(){
  try {
    const data = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}');
    return { coins: Number.isFinite(data.coins) && data.coins >= 0 ? data.coins : 0,
      completed: Array.isArray(data.completed) ? data.completed.filter(id => CHALLENGES[id]) : [] };
  } catch { return { coins: 0, completed: [] }; }
}
function supportsWebGL(){try{const canvas=document.createElement('canvas');return !!(canvas.getContext('webgl2')||canvas.getContext('webgl'));}catch{return false;}}
export default function App(){
  const controls=useRef({forward:false,back:false,left:false,right:false,brake:false,wheelie:false,reset:false});
  const [started,setStarted]=useState(false);
  const [unsupported,setUnsupported]=useState(false);
  const [wallet,setWallet]=useState(readWallet);
  const rewarded=useRef(new Set(wallet.completed));
  const [challenge,setChallenge]=useState(null);
  const [quality,setQuality]=useState('high');
  const [kmh,setKmh]=useState(0);
  const speedRef=useRef(0);
  const onSpeed=useCallback(speed=>{const value=Math.round(Math.abs(speed)*3.6);if(value!==speedRef.current){speedRef.current=value;setKmh(value);}},[]);
  const onGameEvent=useCallback(event=>{
    if(event.type==='won'){
      const first=!rewarded.current.has(event.id);
      if(first) {
        rewarded.current.add(event.id);
        setWallet(prev=>({ coins: prev.coins+CHALLENGES[event.id].reward,
          completed: [...new Set([...prev.completed,event.id])] }));
      }
      setChallenge({ ...event, reward: first ? CHALLENGES[event.id].reward : 0 });
    } else if(event.type==='crash') {
      setChallenge(prev=>prev?.type==='failed'?prev:{type:'crash',reason:'Zu hoch! Du bist vom Scooter gefallen.'});
    } else if(event.type==='respawn') {
      setChallenge(prev=>prev?.type==='crash'?null:prev);
    } else {
      setChallenge(event);
    }
  },[]);
  useEffect(()=>{try{localStorage.setItem(WALLET_KEY,JSON.stringify(wallet));}catch{/* private mode */}},[wallet]);
  const begin=()=>{
    if(!supportsWebGL()){setUnsupported(true);return;}
    setQuality((matchMedia('(pointer:coarse)').matches||innerWidth<850)?'low':'high');
    setStarted(true);
  };
  useEffect(()=>{
    const map={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'brake',ShiftRight:'brake',Space:'wheelie'};
    const down=e=>{const a=map[e.code];if(a){controls.current[a]=true;e.preventDefault();}if(e.code==='KeyR')controls.current.reset=true;if(e.code==='Enter'&&!started)begin();};
    const up=e=>{const a=map[e.code];if(a){controls.current[a]=false;e.preventDefault();}};
    const blur=()=>{for(const key in controls.current)controls.current[key]=false;};
    addEventListener('keydown',down);addEventListener('keyup',up);addEventListener('blur',blur);
    return()=>{removeEventListener('keydown',down);removeEventListener('keyup',up);removeEventListener('blur',blur);};
  },[started]);
  return <>
    {started&&<div className="scene-host"><SceneError><Suspense fallback={<div className="loading">3D-WELT WIRD GELADEN …</div>}><GameCanvas controls={controls} quality={quality} onSpeed={onSpeed} onGameEvent={onGameEvent}/></Suspense></SceneError></div>}
    {started&&<div id="hud">
      <div id="top"><div className="brand">FAHRE EIN <em>MURAT.</em></div><div className="pill">🌲 FOREST FREERIDE</div><div className="wallet" data-testid="coins">🪙 {wallet.coins.toLocaleString('de-DE')} MURAT-COINS</div></div>
      <div className="speed"><strong data-testid="speed">{kmh}</strong> <span>KM/H</span><small>{controls.current.wheelie?'⚡ WHEELIE':'● FREERIDE'}</small></div>
      <div className="tip">Fahre in leuchtende Felder für Challenges. Wheelie: Leertaste gedrückt halten, rechtzeitig loslassen oder bremsen!</div>
      {challenge && <div className={`challenge-panel ${challenge.type}`} role="status" data-testid="challenge">
        {challenge.id && <div className="challenge-name">{CHALLENGES[challenge.id]?.name}</div>}
        {['start','progress'].includes(challenge.type) ? <>
          <div className="challenge-title">{challenge.id==='slalom'?'SLALOM FAHREN!':'WHEELIE BALANCIEREN!'}</div>
          <div className="challenge-stat"><strong>{Math.ceil(challenge.remaining ?? CHALLENGES[challenge.id].limit)}s</strong><span>{challenge.id==='slalom'?
            `${Math.floor(challenge.progress||0)} / 7 Hütchen`:
            `${Number(challenge.progress||0).toFixed(1)} / 4.0 Sek. Balance`}</span></div>
          <div className="challenge-meter"><div style={{width:`${Math.min(100,100*(challenge.progress||0)/(challenge.id==='slalom'?7:4))}%`}}/></div>
          <div className="challenge-help">{challenge.id==='slalom'?
            'Fahre abwechselnd rechts und links an den Hütchen vorbei. Folge den grünen Ringen bis ins Ziel.':
            'Halte Wheelie zum Anheben. Lass los, um zu balancieren. Zu hoher Winkel = Sturz!'} </div>
        </> : <><div className="challenge-title">{challenge.type==='won'?'🏆 GESCHAFFT!':challenge.type==='failed'?'✖ CHALLENGE GESCHEITERT':'💥 STURZ!'}</div>
          <div className="challenge-help">{challenge.type==='won'?(challenge.reward>0?`+${challenge.reward.toLocaleString('de-DE')} Murat-Coins!`:'Bereits belohnt – super gefahren!'):(challenge.reason||'Versuch es erneut.')}</div>
          <div className="challenge-help">Verlasse das leuchtende Feld und fahre erneut hinein, um es wieder zu versuchen.</div>
        </>}
      </div>}
      <div className="controls left"><div className="pad"><span></span><Control controls={controls} action="forward" label="Vorwärts">↑</Control><span></span>
      <Control controls={controls} action="left" label="Links">←</Control><Control controls={controls} action="back" label="Rückwärts">↓</Control><Control controls={controls} action="right" label="Rechts">→</Control></div></div>
      <div className="controls right"><button className="ctrl reset" aria-label="Zurücksetzen" onClick={()=>{controls.current.reset=true;controls.current.wheelie=false;}}>↺</button><div className="stack">
      <Control controls={controls} action="wheelie" label="Wheelie halten" className="wheel">WHEELIE ↑</Control>
      <Control controls={controls} action="brake" label="Bremse" className="secondary">BREMSE</Control></div>
      <Control controls={controls} action="forward" label="Gas" className="primary">GAS ⚡</Control></div>
      <div className="hint">WASD / PFEILTASTEN · SHIFT BREMSEN · LEERTASTE WHEELIE · R RESET</div>
    </div>}
    {!started&&!unsupported&&<div className="overlay"><div className="intro"><div className="eyebrow">OPEN WORLD SCOOTER GAME</div>
      <h1>FAHRE<br/>EIN <i>MURAT.</i></h1>
      <p>Dein Scooter. Deine Straße. Dein Wald. Meistere Slalom und Wheelie-Challenges und verdiene Murat-Coins.</p>
      <button className="start" onClick={begin}>JETZT FAHREN →</button>
      <p style={{fontSize:12,opacity:.7}}>PC: WASD / Pfeiltasten · Handy: Touch-Buttons</p>
      <p style={{fontSize:11,opacity:.5}}>REACT THREE FIBER · VERSION 0.4</p>
    </div></div>}
    {unsupported&&<div className="startup-error" role="alert"><h2>WebGL ist in dieser Vorschau nicht verfügbar.</h2><p>Öffne im Codespace den Port 5173 mit „Open in Browser“ direkt in Safari, Chrome oder Edge.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>}
  </>;
}
