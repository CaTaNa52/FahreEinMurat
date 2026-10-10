import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';

const World = lazy(() => import('./World.jsx'));

class GameErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('3D scene error:', error, info); }
  render() {
    if (this.state.error) return <div className="error-screen" role="alert"><h2>3D-Ansicht konnte nicht starten</h2><p>{this.state.error.message}</p><p>Bitte öffne Port 5173 über „Open in Browser“ und aktualisiere die Seite.</p><button onClick={() => location.reload()}>Erneut versuchen</button></div>;
    return this.props.children;
  }
}

function HoldButton({ action, label, children, input, className = '' }) {
  const [pressed, setPressed] = useState(false);
  const release = useCallback(() => { input.current[action] = false; setPressed(false); }, [action, input]);
  useEffect(() => () => { input.current[action] = false; }, [action, input]);
  return <button type="button" className={'control ' + className + (pressed ? ' pressed' : '')} aria-label={label}
    onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); input.current[action] = true; setPressed(true); }}
    onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e => e.preventDefault()}>{children}</button>;
}

function canUseWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export default function App() {
  const [started, setStarted] = useState(false);
  const [webgl, setWebGL] = useState(true);
  const [speed, setSpeed] = useState(0);
  const [wheelie, setWheelie] = useState(false);
  const [quality, setQuality] = useState('high');
  const input = useRef({ forward:false, back:false, left:false, right:false, brake:false, wheelie:false, reset:false });
  const displayedSpeed = useRef(0);
  const begin = () => {
    setWebGL(canUseWebGL());
    setQuality((matchMedia('(pointer:coarse)').matches || innerWidth < 850) ? 'low' : 'high');
    setStarted(true);
  };
  useEffect(() => {
    const keys = { KeyW:'forward', ArrowUp:'forward', KeyS:'back', ArrowDown:'back', KeyA:'left', ArrowLeft:'left', KeyD:'right', ArrowRight:'right', ShiftLeft:'brake', ShiftRight:'brake', Space:'wheelie' };
    const down = e => { if (keys[e.code]) { input.current[keys[e.code]] = true; e.preventDefault(); } if (e.code === 'KeyR') input.current.reset = true; };
    const up = e => { if (keys[e.code]) { input.current[keys[e.code]] = false; e.preventDefault(); } };
    const blur = () => { for (const key of Object.keys(input.current)) input.current[key] = false; setWheelie(false); };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);
  const reportSpeed = useCallback(value => {
    const rounded = Math.round(Math.abs(value) * 3.6);
    if (displayedSpeed.current !== rounded) { displayedSpeed.current = rounded; setSpeed(rounded); }
  }, []);
  return <main className="app">
    {started && webgl && <GameErrorBoundary><Suspense fallback={<div className="loading">3D-Welt wird geladen …</div>}>
      <Canvas className="game-canvas" dpr={quality === 'low' ? [1,1.2] : [1,1.75]}
        shadows={quality === 'high'} camera={{fov:65,near:0.1,far:650,position:[0,3.4,8.3]}}
        gl={{antialias:quality==='high',powerPreference:'high-performance'}}
        fallback={<div className="error-screen"><h2>WebGL ist nicht verfügbar</h2><p>Bitte in Safari, Chrome oder Edge öffnen.</p></div>}>
        <World input={input} wheelieEnabled={wheelie} quality={quality} onSpeed={reportSpeed}/>
      </Canvas>
    </Suspense></GameErrorBoundary>}
    {started && !webgl && <div className="error-screen" role="alert"><h2>Hier ist WebGL nicht verfügbar</h2><p>Öffne in Codespaces den Port 5173 mit „Open in Browser“ statt in der integrierten Vorschau. Auf dem Handy: Safari oder Chrome.</p><button onClick={() => location.reload()}>Erneut versuchen</button></div>}
    {started && webgl && <div className="hud">
      <div className="hud-top"><div className="logo">FAHRE EIN <b>MURAT<span>.</span></b><small>FOREST FREERIDE · ALPHA 0.3</small></div><div className="dashboard"><strong>{speed}</strong><div>KM/H <span>● FREERIDE</span></div></div></div>
      <div className="bottom-controls">
        <div className="direction"><div className="direction-row"><HoldButton input={input} action="forward" label="Vorwärts">↑</HoldButton></div>
          <div className="direction-row"><HoldButton input={input} action="left" label="Links">←</HoldButton><HoldButton input={input} action="back" label="Rückwärts">↓</HoldButton><HoldButton input={input} action="right" label="Rechts">→</HoldButton></div>
        </div>
        <div className="action-controls">
          <button type="button" aria-pressed={wheelie} className={'control wheelie' + (wheelie ? ' active' : '')} onClick={() => setWheelie(v => !v)}>{wheelie ? 'RAD RUNTER ↓' : 'WHEELIE ↑'}</button>
          <HoldButton input={input} action="brake" className="brake" label="Bremsen">BREMSE</HoldButton>
          <HoldButton input={input} action="forward" className="gas" label="Gas geben">GAS ⚡</HoldButton>
        </div>
      </div>
      <div className="keyboard-tip">WASD / Pfeiltasten · Shift bremsen · Leertaste Wheelie · R zurücksetzen</div>
    </div>}
    {!started && <div className="welcome">
      <div className="welcome-header"><span className="welcome-brand">FE<span>M</span>.</span><span className="version">3D SCOOTER OPEN WORLD</span></div>
      <div className="welcome-copy"><span className="eyebrow">DEIN SCOOTER. DEINE WELT.</span><h1>FAHRE EIN<br/><em>MURAT.</em></h1>
        <p>Raus auf die Straße. Quer durch den Wald. Gas geben, Kurven fahren und Wheelies ziehen – direkt im Browser, auch auf dem Handy.</p>
        <button className="play-button" onClick={begin}>JETZT FAHREN <span>↗</span></button>
        <div className="welcome-meta">100% Browser-Spiel · React Three Fiber · Ohne Anmeldung</div>
      </div>
      <div className="welcome-horizon"><div className="sun"/><div className="hills far"/><div className="hills near"/><div className="road-illustration"/></div>
    </div>}
  </main>;
}
