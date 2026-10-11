import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CHALLENGES, WORKSHOPS, SLALOM_CONES, SLALOM_FINISH, roadX, updateWheelie, createChallengeState, updateChallenges, failChallenge } from './gameplay.js';
import { Scooter } from './Models.jsx';
import { City } from './City.jsx';
import { BENCHES, CROSSROADS, OBSTACLES, resolveWorldMovement, closestBench } from './worldLayout.js';

const WORLD = 1200;
const clamp = THREE.MathUtils.clamp;
function rng(seed) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }
function makeTrees(count) {
  const random = rng(1847), trees = [];
  for (let i = 0; i < count; i++) {
    let x, z, attempts = 0;
    do { x = (random() - .5) * (WORLD - 30); z = (random() - .5) * (WORLD - 30); attempts++; }
    while (attempts < 30 && (Math.abs(x - roadX(z)) < 13 || Math.hypot(x, z) < 18
      || OBSTACLES.some(b => Math.abs(x-b.x)<b.w/2+4&&Math.abs(z-b.z)<b.d/2+4)
      || CROSSROADS.some(c => Math.abs(z-c.z)<10&&Math.abs(x-c.x)<c.length/2+6)));
    trees.push({ x, z, scale: .65 + random() * 1.25, rot: random() * 6.283 });
  }
  return trees;
}
function Forest({ trees }) {
  const trunks = useRef(), branches = useRef(), tops = useRef();
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    trees.forEach((t, i) => {
      o.rotation.set(0, t.rot, 0); o.scale.setScalar(t.scale);
      o.position.set(t.x, 1.3 * t.scale, t.z); o.updateMatrix(); trunks.current.setMatrixAt(i, o.matrix);
      o.position.y = 3.7 * t.scale; o.updateMatrix(); branches.current.setMatrixAt(i, o.matrix);
      o.position.y = 5.9 * t.scale; o.scale.setScalar(t.scale * .74); o.updateMatrix(); tops.current.setMatrixAt(i, o.matrix);
    });
    for (const ref of [trunks, branches, tops]) { ref.current.instanceMatrix.needsUpdate = true; ref.current.computeBoundingSphere(); }
  }, [trees]);
  return <group>
    <instancedMesh ref={trunks} args={[undefined, undefined, trees.length]}><cylinderGeometry args={[.23, .38, 2.6, 6]}/><meshStandardMaterial color="#715037"/></instancedMesh>
    <instancedMesh ref={branches} args={[undefined, undefined, trees.length]}><coneGeometry args={[2.1, 5.2, 7]}/><meshStandardMaterial color="#285a42"/></instancedMesh>
    <instancedMesh ref={tops} args={[undefined, undefined, trees.length]}><coneGeometry args={[1.8, 4.5, 7]}/><meshStandardMaterial color="#3c7c50"/></instancedMesh>
  </group>;
}
function Road() {
  const { geometry, dashes } = useMemo(() => {
    const positions = [], marks = [];
    for (let z = -WORLD / 2; z < WORLD / 2; z += 7) {
      const x = roadX(z), x2 = roadX(z + 7), dx = x2 - x;
      const length = Math.hypot(dx, 7), nx = 7 / length * 5.3, nz = -dx / length * 5.3;
      positions.push(x - nx, .026, z - nz, x + nx, .026, z + nz, x2 - nx, .026, z + 7 - nz);
      positions.push(x + nx, .026, z + nz, x2 + nx, .026, z + 7 + nz, x2 - nx, .026, z + 7 - nz);
      if (!CROSSROADS.some(c=>Math.abs(z-c.z)<8)&&Math.floor((z + WORLD / 2) / 7) % 2 === 0) marks.push({ x: (x + x2) / 2, z: z + 3.5, rot: -Math.atan2(dx, 7) });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return { geometry: geo, dashes: marks };
  }, []);
  const dashRef = useRef();
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    dashes.forEach((p, i) => { o.position.set(p.x, .05, p.z); o.rotation.set(0, p.rot, 0); o.updateMatrix(); dashRef.current.setMatrixAt(i, o.matrix); });
    dashRef.current.instanceMatrix.needsUpdate = true;
    dashRef.current.computeBoundingSphere();
  }, [dashes]);
  return <group>
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#545e5c" roughness={1} side={THREE.DoubleSide}/></mesh>
    <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]}><boxGeometry args={[.16, .016, 2.5]}/><meshStandardMaterial color="#eadfc2"/></instancedMesh>
  </group>;
}
function ZoneSign({ title, subtitle, color }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 160;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0b201ddc'; ctx.fillRect(0, 0, 512, 160);
    ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.strokeRect(6, 6, 500, 148);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 47px system-ui';
    ctx.textAlign = 'center'; ctx.fillText(title, 256, 70);
    ctx.font = 'bold 27px system-ui'; ctx.fillStyle = color; ctx.fillText(subtitle, 256, 117);
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [title, subtitle, color]);
  useLayoutEffect(() => () => texture.dispose(), [texture]);
  return <mesh position={[0, 3.35, 0]} renderOrder={2}>
    <planeGeometry args={[5.3, 1.65]}/>
    <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} depthWrite={false}/>
  </mesh>;
}
function ChallengeZone({ config, color, subtitle }) {
  const glow = useRef();
  useFrame(({ clock }) => {
    if (glow.current) glow.current.material.opacity = 0.21 + Math.sin(clock.elapsedTime * 3.3) * 0.12;
  });
  return <group position={[config.x, 0.095, config.z]}>
    <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[config.radius, 48]}/>
      <meshBasicMaterial color={color} transparent opacity={.3} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .012, 0]}>
      <ringGeometry args={[config.radius - .22, config.radius, 64]}/>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={.94} depthWrite={false}/>
    </mesh>
    <ZoneSign title={config.name} subtitle={subtitle} color={color}/>
  </group>;
}
function TrafficCone({ data }) {
  return <group position={[data.x, .065, data.z]}>
    <mesh position={[0, .065, 0]} castShadow>
      <boxGeometry args={[.77, .13, .77]}/>
      <meshStandardMaterial color="#313a39"/>
    </mesh>
    <mesh position={[0, .43, 0]} castShadow>
      <coneGeometry args={[.34, .78, 9]}/>
      <meshStandardMaterial color="#f26b16" roughness={.72}/>
    </mesh>
    <mesh position={[0, .33, 0]}>
      <cylinderGeometry args={[.22, .255, .13, 9]}/>
      <meshStandardMaterial color="#f5f8f2" roughness={.55}/>
    </mesh>
    <mesh position={[0, .55, 0]}>
      <cylinderGeometry args={[.13, .17, .11, 9]}/>
      <meshStandardMaterial color="#f5f8f2" roughness={.55}/>
    </mesh>
    <mesh position={[data.side * 2.95, .013, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.3, 1.49, 28]}/>
      <meshBasicMaterial color="#bfff52" transparent opacity={.94} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
  </group>;
}

function Treasure({position}){
  const spin=useRef();
  useFrame(({clock})=>{
    if(spin.current){
      spin.current.rotation.y=clock.elapsedTime*1.35;
      spin.current.position.y=1.15+Math.sin(clock.elapsedTime*2.4)*.17;
    }
  });
  return <group position={[position.x,0,position.z]}>
    <group ref={spin}>
      <mesh rotation={[0,0,Math.PI/2]} castShadow>
        <torusGeometry args={[.22,.07,9,20]}/>
        <meshStandardMaterial color="#fdd259" metalness={.8} roughness={.16} emissive="#d18a06" emissiveIntensity={.65}/>
      </mesh>
      <mesh position={[.43,0,0]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[.066,.066,.84,10]}/>
        <meshStandardMaterial color="#ffe27a" metalness={.8} roughness={.18}/>
      </mesh>
      <mesh position={[.75,-.13,0]}>
        <boxGeometry args={[.15,.26,.14]}/>
        <meshStandardMaterial color="#ffd24f" metalness={.8} roughness={.15}/>
      </mesh>
      <mesh position={[.59,-.11,0]}>
        <boxGeometry args={[.13,.19,.14]}/>
        <meshStandardMaterial color="#ffd24f" metalness={.8} roughness={.15}/>
      </mesh>
    </group>
    <mesh rotation={[-Math.PI/2,0,0]} position={[0,.055,0]}>
      <circleGeometry args={[.5,24]}/>
      <meshBasicMaterial color="#eec958" transparent opacity={.3} depthWrite={false}/>
    </mesh>
  </group>;
}

function ChallengeCourse({treasure}) {
  return <group>
    <ChallengeZone config={CHALLENGES.slalom} color="#acff45" subtitle="40 SEK. · 1.000 COINS"/>
    {SLALOM_CONES.map((cone, i) => <TrafficCone key={i} data={cone}/>)}
    <mesh position={[roadX(SLALOM_FINISH), .078, SLALOM_FINISH]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 1.1]}/>
      <meshBasicMaterial color="#ecffac" transparent opacity={.83} side={THREE.DoubleSide}/>
    </mesh>
    <ChallengeZone config={CHALLENGES.wheelie} color="#4de5ff" subtitle="4 SEK. BALANCE · 1.000 COINS"/>
    <ChallengeZone config={CHALLENGES.hunt} color="#ffc84e" subtitle="FIND DEN SCHLÜSSEL · 1.250 COINS"/>
    {treasure&&<Treasure position={treasure}/>}
  </group>;
}


// Visual spill stays horizontal on the asphalt even while doing a wheelie.
// A real point light illuminates nearby StandardMaterials, a radial shader gives
// a broad soft bloom without expensive postprocessing on phones.
function GroundUnderglow({ tint, forwardedRef }) {
  const uniforms=useMemo(()=>({uTint:{value:new THREE.Color(tint)}}),[tint]);
  return <group ref={forwardedRef} renderOrder={3}>
    <mesh position={[0,.006,-.32]} rotation={[-Math.PI/2,0,0]} renderOrder={3}>
      <planeGeometry args={[5.6,6.8]}/>
      <shaderMaterial key={tint} transparent depthWrite={false} depthTest
        blending={THREE.AdditiveBlending} toneMapped={false} uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
        fragmentShader={`uniform vec3 uTint; varying vec2 vUv; void main(){
          vec2 p=(vUv-vec2(.5))*vec2(1.4,1.2);
          float falloff=exp(-dot(p,p)*13.0);
          float inner=exp(-dot(p,p)*35.0);
          gl_FragColor=vec4(uTint,falloff*.46+inner*.18);
        }`}/>
    </mesh>
    <pointLight position={[0,.62,-.28]} color={tint} intensity={8}
      distance={6} decay={2}/>
  </group>;
}

function Driver({ input, trees, onSpeed, onGameEvent, cosmetics, view, paused, onBenchChange }) {
  const group = useRef(), scooter = useRef(), rider = useRef(), glow = useRef();
  const { camera } = useThree();
  const player = useRef({ x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, pitchVel: 0, lean: 0, timer: 0, fallen: false, fallTime: 0, respawnZ: 0 });
  const challenge = useRef(createChallengeState());
  const nearest=useRef(null);
  const nearestBench=useRef(null);
  const seatRef=useRef(null);
  const [seat,setSeat]=useState(null);
  const proximityTimer=useRef(0);
  const grid = useMemo(() => {
    const cells = new Map();
    trees.forEach(t => { const key = Math.floor(t.x / 16) + ',' + Math.floor(t.z / 16); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(t); });
    return cells;
  }, [trees]);
  useFrame((_, frameDt) => {
    if(paused)return;
    const dt = Math.min(frameDt, .05), p = player.current, c = input.current;
    const before = { x: p.x, z: p.z };
    if (c.reset) {
      failChallenge(challenge.current, 'Challenge abgebrochen.', onGameEvent);
      Object.assign(p, { x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, pitchVel: 0, lean: 0, fallen: false, fallTime: 0 });
      challenge.current.lastZone = null;
      if(seatRef.current){
        seatRef.current=null;setSeat(null);onBenchChange(null);
        onGameEvent({type:'benchSeat',seated:false});
      }
      c.reset = false;
    }
    if (p.fallen) {
      p.fallTime += dt;
      if (p.fallTime > 2.15) {
        p.fallen = false;
        p.pitch = 0; p.pitchVel = 0; p.lean = 0; p.speed = 0;
        p.z = p.respawnZ;
        p.x = roadX(p.z);
        p.yaw = 0;
        challenge.current.lastZone = null;
        onGameEvent({ type: 'respawn' });
      }
    } else if(!seatRef.current) {
      if (c.forward) p.speed += 11.5 * dt;
      if (c.back) p.speed -= 8 * dt;
      if (!c.forward && !c.back) p.speed *= Math.exp(-1.7 * dt);
      if (c.brake) p.speed *= Math.exp(-7 * dt);
      p.speed = clamp(p.speed, -6, 23); if (Math.abs(p.speed) < .04) p.speed = 0;
      const steer = Number(c.left) - Number(c.right);
      p.yaw += steer * Math.min(1.7, .7 + Math.abs(p.speed) * .075) * dt * Math.sign(p.speed || 1) * (1 - p.pitch * .42);
      const target={
        x:clamp(p.x-Math.sin(p.yaw)*p.speed*dt,-WORLD/2+10,WORLD/2-10),
        z:clamp(p.z-Math.cos(p.yaw)*p.speed*dt,-WORLD/2+10,WORLD/2-10)
      };
      const resolved=resolveWorldMovement(before,target,OBSTACLES,.72);
      p.x=resolved.x;p.z=resolved.z;
      if(resolved.blocked)p.speed*=.28;
      const gx = Math.floor(p.x / 16), gz = Math.floor(p.z / 16);
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (const tree of grid.get((gx + ox) + ',' + (gz + oz)) || []) {
        const dx = p.x - tree.x, dz = p.z - tree.z, dist = Math.hypot(dx, dz), radius = tree.scale * .38 + .45;
        if (dist > .001 && dist < radius) { p.x = tree.x + dx / dist * radius; p.z = tree.z + dz / dist * radius; p.speed *= .7; }
      }
      p.lean = THREE.MathUtils.damp(p.lean, steer * Math.min(Math.abs(p.speed) / 20, 1) * .12, 5, dt);
      if (updateWheelie(p, c.wheelie && p.speed > 2, c.brake, dt)) {
        p.fallen = true; p.fallTime = 0; p.speed = 0;
        p.respawnZ = clamp(p.z + 12, -WORLD / 2 + 10, WORLD / 2 - 10);
        failChallenge(challenge.current, 'Gestürzt! Wheelie zu hoch.', onGameEvent);
        onGameEvent({ type: 'crash' });
      } else {
        updateChallenges(challenge.current, before, p, dt, onGameEvent);
      }
    }
    const bench=closestBench(p.x,p.z,3.85);
    if(c.interact){
      if(seatRef.current){
        seatRef.current=null;setSeat(null);onBenchChange(null);
        onGameEvent({type:'benchSeat',seated:false});c.interact=false;
      }else if(bench&&Math.abs(p.speed)<1.8&&!p.fallen){
        seatRef.current=bench;setSeat(bench);onBenchChange(bench);
        p.speed=0;p.pitch=0;p.pitchVel=0;p.lean=0;
        onGameEvent({type:'benchSeat',seated:true});c.interact=false;
      }else c.interact=false;
    }
    if(seatRef.current)p.speed=0;
    if(glow.current){
      glow.current.position.set(p.x,.067,p.z);
      glow.current.rotation.y=p.yaw;
    }
    group.current.position.set(p.x, .34, p.z); group.current.rotation.y = p.yaw;
    scooter.current.rotation.x = p.pitch;
    scooter.current.rotation.z = p.fallen ? Math.min(1.2, p.fallTime * 1.8) : p.lean;
    if (rider.current) {
      const t = p.fallen ? Math.min(1, p.fallTime * 2.2) : 0;
      rider.current.rotation.x = -1.12 * t;
      rider.current.rotation.z = -.6 * t;
      rider.current.position.set(0, -.22 * t, -1.1 * t);
    }
    const first=view==='first';
    const desired = first
      ? new THREE.Vector3(p.x-Math.sin(p.yaw)*.52,1.72+Math.sin(p.pitch)*.14,p.z-Math.cos(p.yaw)*.52)
      : new THREE.Vector3(p.x+Math.sin(p.yaw)*6.9,3.8,p.z+Math.cos(p.yaw)*6.9);
    camera.position.lerp(desired,1-Math.exp(-(first?12:5)*dt));
    if(first)camera.lookAt(p.x-Math.sin(p.yaw)*12,1.57+p.pitch*1.5,p.z-Math.cos(p.yaw)*12);
    else camera.lookAt(p.x,1.4+p.pitch*.4,p.z);
    proximityTimer.current+=dt;
    if(proximityTimer.current>.3){
      proximityTimer.current=0;
      const at=Object.entries(WORKSHOPS).find(([,place])=>Math.hypot(p.x-place.x,p.z-place.z)<place.radius+4)?.[0]??null;
      if(at!==nearest.current){nearest.current=at;onGameEvent({type:'near',place:at});}
      const currentBench=seatRef.current||(Math.abs(p.speed)<1.8?closestBench(p.x,p.z,3.85):null);
      if(currentBench?.id!==nearestBench.current?.id){
        nearestBench.current=currentBench;
        onGameEvent({type:'benchNearby',benchId:currentBench?.id??null});
      }
    }
    p.timer += dt; if (p.timer >= .13) { p.timer = 0; onSpeed(p.speed); }
  });
  return <>
    <group ref={group}>
      <group ref={scooter}>
        <Scooter riderRef={rider} options={cosmetics.garage} rider={cosmetics.rider}
          showRider={view!=='first'&&!seat}/>
      </group>
    </group>
    {cosmetics.garage.underglow&&<GroundUnderglow forwardedRef={glow}
      tint={cosmetics.garage.glowColor??'#55ffcf'}/>}
  </>;
}
// Guided camera introduction: free-look at actual buildings and challenge zones
// while player physics are safely paused. No scene swaps or extra WebGL context.
function TourCamera({step}){
  const {camera}=useThree();
  useFrame((_,frameDt)=>{
    if(step===null||step===undefined)return;
    const place=step===0?WORKSHOPS.home:step===1?WORKSHOPS.garage:
      step===2?CHALLENGES.slalom:{x:roadX(0),z:0};
    const dt=Math.min(frameDt,.05),k=1-Math.exp(-3.3*dt);
    const x=place.x,z=place.z;
    const target=step===3?
      new THREE.Vector3(x+6.5,3.6,z+9.5):
      new THREE.Vector3(x+12.5,7.2,z-19.5);
    camera.position.lerp(target,k);
    camera.lookAt(x,step===3?1.2:2.1,z);
  });
  return null;
}
export default function World({ input, quality, onSpeed, onGameEvent, cosmetics, view, paused, tutorialStep=null }) {
  const count = quality === 'low' ? 600 : 1300;
  const trees = useMemo(() => makeTrees(count), [count]);
  const [treasure,setTreasure] = useState(null);
  const [seatedBench,setSeatedBench]=useState(null);
  const handleEvent = event => {
    if(event.id==='hunt') {
      if(event.type==='start')setTreasure(event.target);
      if(event.type==='won'||event.type==='failed')setTreasure(null);
    }
    onGameEvent(event);
  };
  return <>
    <color attach="background" args={['#a4c8d0']}/><fog attach="fog" args={['#a4c8d0', 70, quality === 'low' ? 240 : 360]}/>
    <hemisphereLight args={['#e6f5ff', '#59704b', 2.1]}/>
    <directionalLight position={[-70, 115, -70]} intensity={2.7} color="#ffefd0" castShadow={quality === 'high'} shadow-mapSize={[1024,1024]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD, WORLD]}/><meshStandardMaterial color="#577749" roughness={1}/></mesh>
    <Road/><City quality={quality} seatedBench={seatedBench} rider={cosmetics.rider}/>
    <Forest trees={trees}/><ChallengeCourse treasure={treasure}/>
    <Driver input={input} trees={trees} onSpeed={onSpeed} onGameEvent={handleEvent}
      cosmetics={cosmetics} view={view} paused={paused} onBenchChange={setSeatedBench}/>
    <TourCamera step={tutorialStep}/>
  </>;
}
