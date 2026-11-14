import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { CHALLENGES, WORKSHOPS, SLALOM_CONES, SLALOM_FINISH, roadX, updateWheelie, createChallengeState, updateChallenges, failChallenge } from './gameplay.js';
import { Scooter } from './Models.jsx';
import { GroundUnderglow } from './Underglow.jsx';
import { updateDriveSpeed } from './driving.js';
import { consumeFrameInput } from './input.js';
import { City } from './City.jsx';
import { BENCHES, CROSSROADS, OBSTACLES, CLEARINGS, POLICE_LOT, resolveWorldMovement, closestBench } from './worldLayout.js';
import { POOL, SLIDES, SLIDE_ENTRY, SWIM, inWater, exitPoint, distanceToEdge, updateSwim, nearSlideEntry,
  samplePath, pathLength, slideSpeed, waterDepth } from './pool.js';
import { PoolComplex, Swimmer, Splash, groundWithPoolHole } from './Pool.jsx';
import { PoliceStation } from './PoliceStation.jsx';
import { PoliceInterior } from './PoliceInterior.jsx';
import { Traffic } from './Traffic.jsx';
import { Sky, Palms, makePalms, SUNSET, SUN_POSITION } from './Scenery.jsx';
import { BuddyWaiting, Beacon } from './Buddy.jsx';
import { Walker } from './Models.jsx';
import { createTraffic, collideCar, closingSpeed } from './traffic.js';
import { impactOutcome, wallOutcome, applyDamage, isTotaled, speedCap } from './crash.js';
import { createBuddy, updateBuddy, buddyReact, BUDDY_LOOK, BUDDY_SPOTS } from './buddy.js';
import { ROOM, STATION_DOOR, nearStationDoor, createWalk, updateWalk, interiorAction, stationLine } from './interior.js';
import { DRIVE_LIMITS } from './driving.js';

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
      || CROSSROADS.some(c => Math.abs(z-c.z)<10&&Math.abs(x-c.x)<c.length/2+6)
      || CLEARINGS.some(c => Math.abs(x-c.x)<c.w/2+3&&Math.abs(z-c.z)<c.d/2+3)));
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
    <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#454a50" roughness={1} side={THREE.DoubleSide}/></mesh>
    <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]}><boxGeometry args={[.18, .016, 2.6]}/><meshStandardMaterial color="#f2c230"/></instancedMesh>
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

// Optional ?spawn=pool|poolside|police|station|buddy start points (handy for playtests and sharing).
function spawnPoint(){
  let key=null;
  try{key=new URLSearchParams(window.location.search).get('spawn');}catch{/* no location */}
  if(key==='pool')return {x:SLIDE_ENTRY.x,z:SLIDE_ENTRY.z,yaw:-Math.PI/2};
  if(key==='poolside')return {x:POOL.x,z:POOL.z-POOL.d/2-3.2,yaw:Math.PI};
  if(key==='police')return {x:POLICE_LOT.x-4,z:POLICE_LOT.z,yaw:-Math.PI/2};
  if(key==='buddy')return {x:BUDDY_SPOTS[4].x+2.6,z:BUDDY_SPOTS[4].z+1.5,yaw:0,buddy:true};
  if(key==='station')return {x:STATION_DOOR.x,z:STATION_DOOR.z+3.1,yaw:-Math.PI/2};
  return {x:roadX(0),z:0,yaw:0};
}
const SLIDE_LENGTHS=SLIDES.map(s=>pathLength(s.points));
// District shown in the HUD corner when the rider enters a new part of the map.
function areaName(x,z){
  if(Math.hypot(x-POLICE_LOT.x,z-POLICE_LOT.z)<34)return 'POLIZEIWACHE';
  if(Math.abs(x-POOL.x)<POOL.w/2+12&&Math.abs(z-POOL.z)<POOL.d/2+14)return 'ALIASAF FREIBAD';
  if(Math.hypot(x-WORKSHOPS.garage.x,z-WORKSHOPS.garage.z)<26)return 'GARAGENHOF';
  if(Math.abs(x-roadX(z))>70)return 'WALDGEBIET';
  if(z<-300)return 'NORDVIERTEL';
  if(z<-60)return 'INNENSTADT';
  if(z<200)return 'WOHNVIERTEL';
  return 'SÜDSTRAND';
}

function Driver({ input, trees, cars, radar, onSpeed, onGameEvent, cosmetics, view, paused, onBenchChange, quality }) {
  const group = useRef(), scooter = useRef(), rider = useRef(), glow = useRef();
  const camera = useThree(state => state.camera);
  const camTarget = useMemo(() => new THREE.Vector3(), []);
  const spawn = useMemo(spawnPoint, []);
  const player = useRef({ x: spawn.x, z: spawn.z, yaw: spawn.yaw, speed: 0, pitch: 0, pitchVel: 0, lean: 0, timer: 0, fallen: false, fallTime: 0, respawnZ: 0,
    damage: 0, crashes: 0, hitCooldown: 0, safe: 0, shake: 0, stay: false, totaled: false, wheelieTime: 0 });
  // On foot inside the police station.
  const walker=useRef(), walk=useRef(createWalk()), walkMotion=useRef({stride:0,speed:0});
  const talkTurn=useRef({officer:0,inmate:0});
  const snapCamera=useRef(false);
  // The buddy who sometimes rides along.
  const buddy=useRef(spawn.buddy?createBuddy(.5,[0,12]):createBuddy());
  const [buddyView,setBuddyView]=useState({phase:'away',spot:null,dest:null});
  const prompt=useRef(null), area=useRef(null);
  const setPrompt=action=>{if(prompt.current!==action){prompt.current=action;onGameEvent({type:'prompt',action});}};
  const syncBuddy=()=>{
    const b=buddy.current;
    setBuddyView({phase:b.phase,spot:b.spot,dest:b.dest});
    Object.assign(radar.current,{buddy:b.phase==='waiting'?b.spot:null,dest:b.phase==='riding'?b.dest:null});
  };
  const say=text=>{if(text)onGameEvent({type:'buddy',text});};
  // One place for every collision: grade it, damage the scooter, maybe throw the rider off.
  const impact=(outcome,source)=>{
    const p=player.current;
    if(outcome.kind==='none'||p.fallen)return;
    if(outcome.kind==='bump'){
      if(p.hitCooldown<=0&&outcome.damage){p.damage=applyDamage(p.damage,outcome.damage);p.hitCooldown=.6;onGameEvent({type:'damage',value:p.damage});}
      return;
    }
    if(outcome.kind==='hit'&&p.hitCooldown>0)return;
    p.hitCooldown=.9;p.shake=outcome.kind==='crash'?1:.55;
    p.damage=applyDamage(p.damage,outcome.damage);
    onGameEvent({type:'damage',value:p.damage});
    const totaled=isTotaled(p.damage);
    if(outcome.kind==='crash'||totaled){
      p.fallen=true;p.fallTime=0;p.speed=0;p.stay=true;p.totaled=totaled;p.crashes++;
      failChallenge(challenge.current,totaled?'Totalschaden!':'Unfall!',onGameEvent);
      onGameEvent({type:totaled?'totaled':'crash',source,damage:p.damage});
      say(buddyReact(buddy.current,'crash'));
    }else{
      onGameEvent({type:'impact',source,damage:p.damage});
      say(buddyReact(buddy.current,'hit'));
    }
  };
  const challenge = useRef(createChallengeState());
  const nearest=useRef(null);
  const nearestBench=useRef(null);
  const seatRef=useRef(null);
  const [seat,setSeat]=useState(null);
  const proximityTimer=useRef(0);
  // Water state machine: ride -> (drive in | slide) -> swim -> climb out -> ride.
  const swimmer=useRef(), mode=useRef('ride');
  const [modeView,setModeView]=useState('ride');
  const swim=useRef({x:0,z:0,yaw:0,speed:0,stroke:0});
  const motion=useRef({stroke:0,horizontal:0,pose:'swim'});
  const slide=useRef({index:0,dist:0,speed:3});
  const nextSlide=useRef(0);
  const [splash,setSplash]=useState(null);
  const poolFlags=useRef({slide:null,canExit:null,depth:null});
  const setMode=(next,extra={})=>{
    mode.current=next;setModeView(next);
    onGameEvent({type:'pool',mode:next,...extra});
  };
  const enterWater=(x,z,yaw,speed,power)=>{
    const sw=swim.current;
    Object.assign(sw,{x,z,yaw,speed:Math.min(SWIM.topForward,Math.max(0,speed)),stroke:0});
    motion.current.pose='swim';motion.current.horizontal=0;
    setSplash({id:Date.now(),x,z,power});
    setMode('swim');
  };
  const grid = useMemo(() => {
    const cells = new Map();
    trees.forEach(t => { const key = Math.floor(t.x / 16) + ',' + Math.floor(t.z / 16); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(t); });
    return cells;
  }, [trees]);
  useFrame((_, frameDt) => {
    if(paused)return;
    const dt = Math.min(frameDt, .05), p = player.current, raw = input.current;
    const c = consumeFrameInput(input);
    // One-shot flags are owned by the shared controls object, not the frame copy.
    Object.defineProperty(c,'reset',{get:()=>raw.reset,set:v=>{raw.reset=v;}});
    Object.defineProperty(c,'interact',{get:()=>raw.interact,set:v=>{raw.interact=v;}});
    const before = { x: p.x, z: p.z };
    if (c.reset) {
      failChallenge(challenge.current, 'Challenge abgebrochen.', onGameEvent);
      Object.assign(p, { x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, pitchVel: 0, lean: 0, fallen: false, fallTime: 0, safe: 3, stay: false, totaled: false });
      snapCamera.current=true;
      challenge.current.lastZone = null;
      if(mode.current!=='ride')setMode('ride');
      if(seatRef.current){
        seatRef.current=null;setSeat(null);onBenchChange(null);
        onGameEvent({type:'benchSeat',seated:false});
      }
      c.reset = false;
    }
    if(raw.repair){
      // Paid for in the HUD; the garage hands back a scooter as good as new.
      raw.repair=false;p.damage=0;onGameEvent({type:'damage',value:0});
    }
    p.hitCooldown=Math.max(0,p.hitCooldown-dt);p.safe=Math.max(0,p.safe-dt);
    p.shake=Math.max(0,p.shake-dt*1.8);
    Object.assign(radar.current,{x:p.x,z:p.z,yaw:p.yaw,mode:mode.current,slalom:challenge.current.active==='slalom'});
    if(mode.current==='walk'){
      // Inside the station: same controls, but on foot. The world above keeps running.
      const w=updateWalk(walk.current,c,dt);
      walkMotion.current.stride=w.stride;walkMotion.current.speed=w.speed;
      walker.current.position.set(ROOM.x+w.x,ROOM.y,ROOM.z+w.z);
      walker.current.rotation.set(0,w.yaw,0);
      const action=interiorAction(w.x,w.z);
      setPrompt(action?'station-'+action:null);
      if(c.interact){
        c.interact=false;
        if(action==='exit'){
          snapCamera.current=true;setPrompt(null);setMode('ride');
          return;
        }
        if(action){
          const turn=talkTurn.current[action]++;
          onGameEvent({type:'talk',who:action,text:stationLine(action,{crashes:p.crashes,damage:p.damage},turn)});
        }
      }
      const first=view==='first';
      const limX=ROOM.w/2-.45,limZ=ROOM.d/2-.45;
      const desired=first
        ? camTarget.set(ROOM.x+w.x-Math.sin(w.yaw)*.15,ROOM.y+1.66,ROOM.z+w.z-Math.cos(w.yaw)*.15)
        : (()=>{
          // Chase cam stays inside the room; squeezed against a wall it rises instead.
          const cx=clamp(w.x+Math.sin(w.yaw)*3.1,-limX,limX),cz=clamp(w.z+Math.cos(w.yaw)*3.1,-limZ,limZ);
          const squeeze=Math.max(0,3.1-Math.hypot(cx-w.x,cz-w.z));
          return camTarget.set(ROOM.x+cx,ROOM.y+Math.min(ROOM.h-.25,2.35+squeeze*.5),ROOM.z+cz);
        })();
      if(snapCamera.current){camera.position.copy(desired);snapCamera.current=false;}
      else camera.position.lerp(desired,1-Math.exp(-(first?14:7)*dt));
      if(first)camera.lookAt(ROOM.x+w.x-Math.sin(w.yaw)*6,ROOM.y+1.55,ROOM.z+w.z-Math.cos(w.yaw)*6);
      else camera.lookAt(ROOM.x+w.x,ROOM.y+1.45,ROOM.z+w.z);
      p.timer+=dt;if(p.timer>=.13){p.timer=0;onSpeed(w.speed);}
      return;
    }
    if(mode.current!=='ride'){
      // Keep the parked scooter upright where the rider left it.
      group.current.position.set(p.x,.34,p.z);group.current.rotation.y=p.yaw;
      scooter.current.rotation.set(0,0,0);
      if(glow.current){glow.current.position.set(p.x,.067,p.z);glow.current.rotation.y=p.yaw;}
    }
    if(mode.current==='slide'){
      const sl=slide.current, path=SLIDES[sl.index].points, len=SLIDE_LENGTHS[sl.index];
      const at=samplePath(path,sl.dist/len);
      sl.speed=slideSpeed(sl.speed,at.slope,dt);
      sl.dist+=sl.speed*dt;
      motion.current.pose='slide';
      const pos=samplePath(path,sl.dist/len);
      swimmer.current.position.set(pos.x,pos.y+.12,pos.z);
      swimmer.current.rotation.set(0,pos.yaw,0);
      const first=view==='first';
      const behind=first?-.1:4.2;
      camTarget.set(pos.x+Math.sin(pos.yaw)*behind,pos.y+(first?1.05:2.3),pos.z+Math.cos(pos.yaw)*behind);
      camera.position.lerp(camTarget,1-Math.exp(-(first?14:6)*dt));
      camera.lookAt(pos.x-Math.sin(pos.yaw)*6,pos.y+(first?.3:.4)-1.2,pos.z-Math.cos(pos.yaw)*6);
      p.timer+=dt;if(p.timer>=.13){p.timer=0;onSpeed(sl.speed);}
      if(sl.dist>=len){
        const end=path[path.length-1],prev=path[path.length-2];
        enterWater(end[0],end[2],Math.atan2(-(end[0]-prev[0]),-(end[2]-prev[2])),1.6,1.6);
      }
      c.interact=false;
      return;
    }
    if(mode.current==='swim'){
      const sw=updateSwim(swim.current,c,dt);
      const m=motion.current;
      m.stroke=sw.stroke;
      m.horizontal=THREE.MathUtils.damp(m.horizontal,Math.abs(sw.speed)>.35?1:0,3.5,dt);
      const bob=Math.sin(sw.stroke*Math.PI*2)*.03;
      swimmer.current.position.set(sw.x,THREE.MathUtils.lerp(POOL.waterY-.98,POOL.waterY-.14,m.horizontal)+bob,sw.z);
      swimmer.current.rotation.set(0,sw.yaw,0);
      const canExit=distanceToEdge(sw.x,sw.z)<SWIM.exitReach;
      if(c.interact){
        c.interact=false;
        if(canExit){
          // Climb out over the nearest edge and get back onto the parked scooter.
          const out=exitPoint(sw.x,sw.z);
          const scooterNear=Math.hypot(p.x-out.x,p.z-out.z)<9;
          if(!scooterNear){p.x=out.x;p.z=out.z;p.yaw=out.yaw;}
          p.speed=0;p.pitch=0;p.pitchVel=0;p.lean=0;
          setMode('ride');
          return;
        }
      }
      const first=view==='first';
      const desired=first
        ? camTarget.set(sw.x-Math.sin(sw.yaw)*.25,POOL.waterY+.28,sw.z-Math.cos(sw.yaw)*.25)
        : camTarget.set(
          // Chase cam stays over the basin/deck so slide tubes never block the view.
          THREE.MathUtils.clamp(sw.x+Math.sin(sw.yaw)*4.6,POOL.x-POOL.w/2+1.1,POOL.x+POOL.w/2+1.5),
          POOL.waterY+2.7,
          THREE.MathUtils.clamp(sw.z+Math.cos(sw.yaw)*4.6,POOL.z-POOL.d/2-1.5,POOL.z+POOL.d/2+1.5));
      camera.position.lerp(desired,1-Math.exp(-(first?12:5)*dt));
      if(first)camera.lookAt(sw.x-Math.sin(sw.yaw)*8,POOL.waterY+.1,sw.z-Math.cos(sw.yaw)*8);
      else camera.lookAt(sw.x,POOL.waterY+.2,sw.z);
      const depth=Math.round(waterDepth(sw.x)*10)/10;
      const f=poolFlags.current;
      if(f.canExit!==canExit||f.depth!==depth){
        f.canExit=canExit;f.depth=depth;
        onGameEvent({type:'poolEdge',canExit,depth});
      }
      p.timer+=dt;if(p.timer>=.13){p.timer=0;onSpeed(sw.speed);}
      return;
    }
    if (p.fallen) {
      p.fallTime += dt;
      if (p.fallTime > (p.totaled ? 3.4 : 2.15)) {
        p.fallen = false;
        p.pitch = 0; p.pitchVel = 0; p.lean = 0; p.speed = 0; p.safe = 3;
        if (p.totaled) {
          // Towed to the garage forecourt and repaired there.
          p.x = WORKSHOPS.garage.x; p.z = WORKSHOPS.garage.z - 8.6; p.yaw = Math.PI / 2;
          p.damage = 0; p.totaled = false; snapCamera.current = true;
          onGameEvent({ type: 'damage', value: 0 });
        } else if (!p.stay) {
          p.z = p.respawnZ;
          p.x = roadX(p.z);
          p.yaw = 0;
        }
        p.stay = false;
        challenge.current.lastZone = null;
        onGameEvent({ type: 'respawn' });
      }
    } else if(!seatRef.current) {
      p.speed = Math.min(updateDriveSpeed(p.speed, c, dt), speedCap(p.damage, DRIVE_LIMITS.topForward));
      const steer = Number(c.left) - Number(c.right);
      p.yaw += steer * Math.min(1.7, .7 + Math.abs(p.speed) * .075) * dt * Math.sign(p.speed || 1) * (1 - p.pitch * .42);
      const target={
        x:clamp(p.x-Math.sin(p.yaw)*p.speed*dt,-WORLD/2+10,WORLD/2-10),
        z:clamp(p.z-Math.cos(p.yaw)*p.speed*dt,-WORLD/2+10,WORLD/2-10)
      };
      const resolved=resolveWorldMovement(before,target,OBSTACLES,.72);
      p.x=resolved.x;p.z=resolved.z;
      if(resolved.blocked){
        const hitSpeed=p.speed;
        p.speed*=.28;
        impact(wallOutcome(hitSpeed),'wall');
        if(p.fallen)return;
      }
      // Traffic: get pushed out of the car, graded by how fast both closed in.
      for(const car of cars){
        const hit=collideCar(p.x,p.z,.72,car);
        if(!hit)continue;
        const closing=closingSpeed(hit,p.yaw,p.speed);
        p.x+=hit.nx*hit.depth;p.z+=hit.nz*hit.depth;
        if(p.safe>0)continue;
        const outcome=impactOutcome(closing);
        car.stun=Math.max(car.stun,outcome.kind==='bump'?.8:3);
        if(outcome.kind==='bump')p.speed*=.6;else p.speed=-p.speed*.35;
        impact(outcome,'car');
        if(p.fallen)return;
      }
      if(inWater(p.x,p.z,.3)){
        // Rider jumps in; the scooter stays parked on the deck at the edge.
        const out=exitPoint(p.x,p.z,1.1);
        const entry={x:p.x,z:p.z,yaw:p.yaw,speed:p.speed};
        p.x=out.x;p.z=out.z;p.speed=0;p.pitch=0;p.pitchVel=0;
        failChallenge(challenge.current,'Ab ins Wasser – Challenge beendet.',onGameEvent);
        say(buddyReact(buddy.current,'swim'));
        enterWater(entry.x,entry.z,entry.yaw,entry.speed*.25,Math.min(2.2,.8+Math.abs(entry.speed)*.12));
        return;
      }
      const gx = Math.floor(p.x / 16), gz = Math.floor(p.z / 16);
      for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (const tree of grid.get((gx + ox) + ',' + (gz + oz)) || []) {
        const dx = p.x - tree.x, dz = p.z - tree.z, dist = Math.hypot(dx, dz), radius = tree.scale * .38 + .45;
        if (dist > .001 && dist < radius) {
          const hitSpeed = p.speed;
          p.x = tree.x + dx / dist * radius; p.z = tree.z + dz / dist * radius; p.speed *= .7;
          impact(wallOutcome(hitSpeed * .9), 'tree');
        }
      }
      if (p.fallen) return;
      p.lean = THREE.MathUtils.damp(p.lean, steer * Math.min(Math.abs(p.speed) / 20, 1) * .12, 5, dt);
      if (updateWheelie(p, c.wheelie && p.speed > 2, c.brake, dt)) {
        p.fallen = true; p.fallTime = 0; p.speed = 0;
        p.respawnZ = clamp(p.z + 12, -WORLD / 2 + 10, WORLD / 2 - 10);
        failChallenge(challenge.current, 'Gestürzt! Wheelie zu hoch.', onGameEvent);
        onGameEvent({ type: 'crash', source: 'wheelie' });
        say(buddyReact(buddy.current,'crash'));
      } else {
        updateChallenges(challenge.current, before, p, dt, onGameEvent);
        p.wheelieTime = p.pitch > .3 ? p.wheelieTime + dt : 0;
        if (p.wheelieTime > 1.2) say(buddyReact(buddy.current,'wheelie'));
        else if (p.speed > 20) say(buddyReact(buddy.current,'fast'));
      }
    }
    // Buddy: texts, waits, hops on, gets dropped off.
    const b=buddy.current,phaseBefore=b.phase;
    const pickup=b.near&&!!c.interact&&!seatRef.current;
    for(const event of updateBuddy(b,{x:p.x,z:p.z,speed:p.speed,interact:pickup,riding:!p.fallen&&!seatRef.current},dt)){
      if(event.used)c.interact=false;
      onGameEvent({type:'buddy',event:event.type,text:event.text,reward:event.reward??0,place:(event.spot??event.dest)?.name});
    }
    if(b.phase!==phaseBefore)syncBuddy();
    const atDoor=nearStationDoor(p.x,p.z)&&Math.abs(p.speed)<3&&!p.fallen;
    const bench=closestBench(p.x,p.z,3.85);
    if(c.interact){
      if(seatRef.current){
        seatRef.current=null;setSeat(null);onBenchChange(null);
        onGameEvent({type:'benchSeat',seated:false});c.interact=false;
      }else if(atDoor){
        // Park the scooter by the entrance and walk in.
        walk.current=createWalk();talkTurn.current={officer:0,inmate:0};
        p.speed=0;p.pitch=0;p.pitchVel=0;p.lean=0;c.interact=false;snapCamera.current=true;
        failChallenge(challenge.current,'Challenge beendet – du bist in der Wache.',onGameEvent);
        setPrompt(null);setMode('walk');
        return;
      }else if(nearSlideEntry(p.x,p.z)&&Math.abs(p.speed)<2.5&&!p.fallen){
        slide.current={index:nextSlide.current,dist:0,speed:3};
        nextSlide.current=(nextSlide.current+1)%SLIDES.length;
        p.speed=0;p.pitch=0;p.pitchVel=0;c.interact=false;
        failChallenge(challenge.current,'Ab auf die Rutsche – Challenge beendet.',onGameEvent);
        setMode('slide',{slide:SLIDES[slide.current.index].name});
        return;
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
      ? camTarget.set(p.x-Math.sin(p.yaw)*.52,1.72+Math.sin(p.pitch)*.14,p.z-Math.cos(p.yaw)*.52)
      : camTarget.set(p.x+Math.sin(p.yaw)*6.9,3.8,p.z+Math.cos(p.yaw)*6.9);
    if(snapCamera.current){camera.position.copy(desired);snapCamera.current=false;}
    else camera.position.lerp(desired,1-Math.exp(-(first?12:5)*dt));
    if(p.shake>0){
      // Impact shake: short, decaying, never enough to hide the road.
      camera.position.x+=(Math.random()-.5)*p.shake*.5;camera.position.y+=(Math.random()-.5)*p.shake*.35;
    }
    if(first)camera.lookAt(p.x-Math.sin(p.yaw)*12,1.57+p.pitch*1.5,p.z-Math.cos(p.yaw)*12);
    else camera.lookAt(p.x,1.4+p.pitch*.4,p.z);
    proximityTimer.current+=dt;
    if(proximityTimer.current>.3){
      proximityTimer.current=0;
      const at=Object.entries(WORKSHOPS).find(([,place])=>Math.hypot(p.x-place.x,p.z-place.z)<place.radius+4)?.[0]??null;
      if(at!==nearest.current){nearest.current=at;onGameEvent({type:'near',place:at});}
      const slideHere=nearSlideEntry(p.x,p.z)?SLIDES[nextSlide.current].name:null;
      if(poolFlags.current.slide!==slideHere){
        poolFlags.current.slide=slideHere;
        onGameEvent({type:'slideNearby',slide:slideHere});
      }
      setPrompt(seatRef.current?null:buddy.current.near?'buddy-pickup':atDoor?'station-enter':null);
      const here=areaName(p.x,p.z);
      if(here!==area.current){area.current=here;onGameEvent({type:'area',name:here});}
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
          showRider={view!=='first'&&!seat&&modeView==='ride'}
          passenger={buddyView.phase==='riding'?BUDDY_LOOK:null}/>
      </group>
    </group>
    <group ref={walker} visible={modeView==='walk'&&view!=='first'}>
      <Walker options={cosmetics.rider} motion={walkMotion}/>
    </group>
    {buddyView.phase==='waiting'&&buddyView.spot&&<BuddyWaiting spot={buddyView.spot}/>}
    {buddyView.phase==='riding'&&buddyView.dest&&<Beacon spot={buddyView.dest} color="#ffd84a"/>}
    <group ref={swimmer} visible={(modeView==='swim'||modeView==='slide')&&!(view==='first'&&modeView==='swim')}>
      <Swimmer rider={cosmetics.rider} motion={motion}/>
    </group>
    <Splash key={splash?.id??'none'} event={splash}/>
    {cosmetics.garage.underglow&&<GroundUnderglow forwardedRef={glow}
      tint={cosmetics.garage.glowColor??'#55ffcf'} quality={quality}/>}
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
// Compile every material once up front (ignores frustum culling) so new buildings
// do not cause shader-compile hitches the first time they come into view.
function ShaderWarmup(){
  const gl=useThree(s=>s.gl),scene=useThree(s=>s.scene),camera=useThree(s=>s.camera);
  useLayoutEffect(()=>{
    try{gl.compile(scene,camera);}catch{/* best effort */}
  },[gl,scene,camera]);
  return null;
}
export default function World({ input, radar, quality, onSpeed, onGameEvent, cosmetics, view, paused, tutorialStep=null }) {
  const count = quality === 'low' ? 600 : 1300;
  const trees = useMemo(() => makeTrees(count), [count]);
  const palms = useMemo(makePalms, []);
  // Palms are solid too: they share the tree collision grid with a slim trunk.
  const solids = useMemo(() => [...trees, ...palms.map(p => ({ x: p.x, z: p.z, scale: .2 }))], [trees, palms]);
  const cars = useMemo(() => createTraffic(quality === 'low' ? 7 : 11, Math.random, spawnPoint().z), [quality]);
  const [treasure,setTreasure] = useState(null);
  const [seatedBench,setSeatedBench]=useState(null);
  const ground = useMemo(() => groundWithPoolHole(WORLD), []);
  useLayoutEffect(() => { radar.current.cars = cars; }, [cars, radar]);
  useLayoutEffect(() => () => ground.dispose(), [ground]);
  const handleEvent = event => {
    if(event.id==='hunt') {
      if(event.type==='start')setTreasure(event.target);
      if(event.type==='won'||event.type==='failed')setTreasure(null);
    }
    onGameEvent(event);
  };
  return <>
    <color attach="background" args={[SUNSET.fog]}/><fog attach="fog" args={[SUNSET.fog, 70, quality === 'low' ? 240 : 360]}/>
    <Sky/>
    <hemisphereLight args={['#ffd9cf', '#5c6a55', 1.9]}/>
    <directionalLight position={SUN_POSITION} intensity={2.9} color={SUNSET.sun} castShadow={quality === 'high'} shadow-mapSize={[1024,1024]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={ground} receiveShadow><meshStandardMaterial color="#6a8452" roughness={1}/></mesh>
    <Road/><City quality={quality} seatedBench={seatedBench} rider={cosmetics.rider}/>
    <PoliceStation/><PoliceInterior/><PoolComplex quality={quality}/>
    <Forest trees={trees}/><Palms palms={palms}/><ChallengeCourse treasure={treasure}/>
    <Traffic cars={cars} radar={radar} paused={paused}/>
    <Driver input={input} trees={solids} cars={cars} radar={radar} onSpeed={onSpeed} onGameEvent={handleEvent}
      cosmetics={cosmetics} view={view} paused={paused} onBenchChange={setSeatedBench} quality={quality}/>
    <TourCamera step={tutorialStep}/>
    <ShaderWarmup/>
  </>;
}
