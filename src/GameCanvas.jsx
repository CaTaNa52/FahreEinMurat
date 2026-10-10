import { Canvas } from '@react-three/fiber';
import World from './World.jsx';
export default function GameCanvas({ controls, wheelie, quality, onSpeed }) {
  return <Canvas dpr={quality==='low'?[1,1.2]:[1,1.65]} shadows={quality==='high'}
    camera={{ fov:65, near:.1, far:700, position:[0,3.5,8] }}
    gl={{ antialias:quality==='high', powerPreference:'high-performance' }}
    fallback={<div className="startup-error"><h2>WebGL nicht verfügbar</h2><p>Öffne den Codespace über Port 5173 in einem normalen Browser.</p></div>}>
    <World input={controls} wheelieEnabled={wheelie} quality={quality} onSpeed={onSpeed}/>
  </Canvas>;
}
