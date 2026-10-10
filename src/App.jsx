import { useEffect, useRef } from 'react';
import { startGame } from './game';

function Control({ action, children, className = '' }) {
  return <button type="button" className={`ctrl ${className}`} data-control={action} aria-label={action}>{children}</button>;
}

export default function App() {
  const mount = useRef(null);
  useEffect(() => { const game = startGame(mount.current); return () => game.destroy(); }, []);
  return <>
    <div ref={mount} className="scene-host" aria-label="Dreidimensionale Scooter-Spielwelt" />
    <div id="hud">
      <div id="top"><div className="brand">FAHRE EIN <em>MURAT.</em></div><div className="pill">🌲 FOREST FREERIDE</div></div>
      <div className="speed"><strong id="speed">0</strong> <span>KM/H</span><small id="status">BEREIT ZUM FAHREN</small></div>
      <div className="tip">Fahre durch die offene Waldlandschaft. Halte W für Gas, S zum Bremsen, A/D zum Lenken und Leertaste für einen Wheelie.</div>
      <div className="label">FAHRSTEUERUNG</div>
      <div className="controls left"><div className="pad">
        <span></span><Control action="forward">↑</Control><span></span>
        <Control action="left">←</Control><Control action="back">↓</Control><Control action="right">→</Control>
      </div></div>
      <div className="controls right">
        <button type="button" className="ctrl reset" id="reset" aria-label="Zurücksetzen">↺</button>
        <div className="stack"><button type="button" className="ctrl wheel" id="wheel" aria-label="Wheelie">WHEELIE ↑</button><Control action="brake" className="secondary">BREMSE</Control></div>
        <Control action="gas" className="primary">GAS ⚡</Control>
      </div>
      <div className="hint">W / ↑ GAS · S / ↓ RÜCKWÄRTS · A D LENKEN · SHIFT BREMSEN · LEERTASTE WHEELIE · R RESET</div>
    </div>
    <div id="overlay" className="overlay"><div className="intro">
      <div className="eyebrow">OPEN WORLD SCOOTER GAME</div><h1>FAHRE<br/>EIN <i>MURAT.</i></h1>
      <p>Dein Scooter. Deine Straße. Dein Wald. Erkunde die große 3D-Welt, beschleunige und zieh einen Wheelie.</p>
      <button type="button" id="start" className="start">JETZT FAHREN →</button>
      <p style={{fontSize:12,opacity:.7}}>PC: WASD / Pfeiltasten · Leertaste Wheelie<br/>Handy: Touch-Buttons</p>
    </div></div>
  </>;
}
