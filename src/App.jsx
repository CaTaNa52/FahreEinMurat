import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
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
function supportsWebGL(){try{const canvas=document.createElement('canvas');return !!(canvas.getContext('webgl2')||canvas.getContext('webgl'));}catch{return false;}}
export default function App(){
  const controls=useRef({forward:false,back:false,left:false,right:false,brake:false,wheelie:false,reset:false});
  const [started,setStarted]=useState(false);
  const [unsupported,setUnsupported]=useState(false);
  const [wheelie,setWheelie]=useState(false);
  const [quality,setQuality]=useState('high');
  const [kmh,setKmh]=useState(0);
  const speedRef=useRef(0);
  const onSpeed=useCallback(speed=>{const value=Math.round(Math.abs(speed)*3.6);if(value!==speedRef.current){speedRef.current=value;setKmh(value);}},[]);
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
    {started&&<div className="scene-host"><SceneError><Suspense fallback={<div className="loading">3D-WELT WIRD GELADEN …</div>}><GameCanvas controls={controls} wheelie={wheelie} quality={quality} onSpeed={onSpeed}/></Suspense></SceneError></div>}
    {started&&<div id="hud">
      <div id="top"><div className="brand">FAHRE EIN <em>MURAT.</em></div><div className="pill">🌲 FOREST FREERIDE</div></div>
      <div className="speed"><strong data-testid="speed">{kmh}</strong> <span>KM/H</span><small>{wheelie?'⚡ WHEELIE MODE':'● FREERIDE'}</small></div>
      <div className="tip">W / ↑ Gas · A/D Lenken · Shift Bremse · Leertaste Wheelie · R Reset</div>
      <div className="controls left"><div className="pad"><span></span><Control controls={controls} action="forward" label="Vorwärts">↑</Control><span></span>
      <Control controls={controls} action="left" label="Links">←</Control><Control controls={controls} action="back" label="Rückwärts">↓</Control><Control controls={controls} action="right" label="Rechts">→</Control></div></div>
      <div className="controls right"><button className="ctrl reset" aria-label="Zurücksetzen" onClick={()=>{controls.current.reset=true;setWheelie(false);}}>↺</button><div className="stack">
      <button className={`ctrl wheel ${wheelie?'active':''}`} aria-label={wheelie?'Vorderrad absenken':'Wheelie'} aria-pressed={wheelie} onClick={()=>setWheelie(v=>!v)}>{wheelie?'RAD RUNTER ↓':'WHEELIE ↑'}</button>
      <Control controls={controls} action="brake" label="Bremse" className="secondary">BREMSE</Control></div>
      <Control controls={controls} action="forward" label="Gas" className="primary">GAS ⚡</Control></div>
      <div className="hint">WASD / PFEILTASTEN · SHIFT BREMSEN · LEERTASTE WHEELIE · R RESET</div>
    </div>}
    {!started&&!unsupported&&<div className="overlay"><div className="intro"><div className="eyebrow">OPEN WORLD SCOOTER GAME</div>
      <h1>FAHRE<br/>EIN <i>MURAT.</i></h1>
      <p>Dein Scooter. Deine Straße. Dein Wald. Erkunde die große 3D-Welt, gib Gas und zieh einen Wheelie.</p>
      <button className="start" onClick={begin}>JETZT FAHREN →</button>
      <p style={{fontSize:12,opacity:.7}}>PC: WASD / Pfeiltasten · Handy: Touch-Buttons</p>
      <p style={{fontSize:11,opacity:.5}}>REACT THREE FIBER · VERSION 0.3</p>
    </div></div>}
    {unsupported&&<div className="startup-error" role="alert"><h2>WebGL ist in dieser Vorschau nicht verfügbar.</h2><p>Öffne im Codespace den Port 5173 mit „Open in Browser“ direkt in Safari, Chrome oder Edge.</p><button onClick={()=>location.reload()}>Erneut versuchen</button></div>}
  </>;
}
