import { Canvas } from '@react-three/fiber';
import World from './World.jsx';
// Mobile used to render at only 1-1.2 DPR without antialiasing, resulting in
// visibly blurry geometry and jagged UI-adjacent edges on high-DPI phones.
// The capped 1.4-1.9 DPR keeps it sharp without allocating a full 3x retina
// framebuffer. Dynamic shadows stay disabled on the low quality preset.
export const getCanvasSettings = quality => ({
  dpr:quality==='low'?[1.4,1.9]:[1,1.85],
  antialias:true,
  shadows:quality==='high'
});
export default function GameCanvas({ controls, quality, onSpeed, onGameEvent, cosmetics, view, paused, tutorialStep }) {
  const settings=getCanvasSettings(quality);
  return <Canvas dpr={settings.dpr} shadows={settings.shadows}
    camera={{ fov:65, near:.1, far:700, position:[0,3.5,8] }}
    gl={{ antialias:settings.antialias, powerPreference:'high-performance' }}
    fallback={<div className="startup-error"><h2>WebGL nicht verfügbar</h2><p>Öffne den Codespace über Port 5173 in einem normalen Browser.</p></div>}>
    <World input={controls} quality={quality} onSpeed={onSpeed} onGameEvent={onGameEvent} cosmetics={cosmetics} view={view} paused={paused} tutorialStep={tutorialStep}/>
  </Canvas>;
}
