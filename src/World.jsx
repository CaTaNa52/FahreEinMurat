import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { CHALLENGES, SLALOM_CONES, SLALOM_FINISH, roadX, updateWheelie, createChallengeState, updateChallenges, failChallenge } from './gameplay.js';

const WORLD = 1200;
const clamp = THREE.MathUtils.clamp;
function rng(seed) { let s = seed >>> 0; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }
function makeTrees(count) {
  const random = rng(1847), trees = [];
  for (let i = 0; i < count; i++) {
    let x, z, attempts = 0;
    do { x = (random() - .5) * (WORLD - 30); z = (random() - .5) * (WORLD - 30); attempts++; }
    while (attempts < 30 && (Math.abs(x - roadX(z)) < 13 || Math.hypot(x, z) < 18));
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
      if (Math.floor((z + WORLD / 2) / 7) % 2 === 0) marks.push({ x: (x + x2) / 2, z: z + 3.5, rot: -Math.atan2(dx, 7) });
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
function Wheel({ z }) { return <group position={[0, .33, z]}>
  <mesh rotation={[0, Math.PI / 2, 0]} castShadow><torusGeometry args={[.28, .085, 10, 20]}/><meshStandardMaterial color="#161c1d" roughness={.9}/></mesh>
  <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.15, .15, .12, 16]}/><meshStandardMaterial color="#aab4ad" metalness={.7} roughness={.3}/></mesh>
</group>; }
function Rider() { return <group>
  <mesh position={[0, 1.28, .13]} castShadow><capsuleGeometry args={[.29, .6, 4, 8]}/><meshStandardMaterial color="#16434c"/></mesh>
  <mesh position={[0, 1.94, .08]} castShadow><sphereGeometry args={[.225, 12, 10]}/><meshStandardMaterial color="#dbb995"/></mesh>
  <mesh position={[0, 2.095, .08]} castShadow><sphereGeometry args={[.24, 12, 10]}/><meshStandardMaterial color="#20282d" roughness={.5}/></mesh>
  <mesh position={[0, 2.08, -.12]}><boxGeometry args={[.35, .07, .19]}/><meshStandardMaterial color="#51dfaa"/></mesh>
  {[-1, 1].map(side => <group key={side}>
    <mesh position={[side * .18, .84, .22]} castShadow><capsuleGeometry args={[.09, .46, 4, 7]}/><meshStandardMaterial color="#1f2832"/></mesh>
    <mesh position={[side * .18, .56, .04]}><boxGeometry args={[.19, .1, .4]}/><meshStandardMaterial color="#e4dcc8"/></mesh>
    <mesh position={[side * .3, 1.43, -.28]} rotation={[-.82, 0, side * .2]} castShadow><capsuleGeometry args={[.09, .49, 4, 7]}/><meshStandardMaterial color="#16434c"/></mesh>
    <mesh position={[side * .35, 1.64, -.75]}><sphereGeometry args={[.09, 8, 8]}/><meshStandardMaterial color="#dbb995"/></mesh>
  </group>)}
</group>; }
function Scooter({ riderRef }) { return <group position={[0, -.33, -.66]}>
  <Wheel z={.66}/><Wheel z={-.69}/>
  <mesh position={[0, .43, .02]} castShadow><boxGeometry args={[.43, .16, 1.35]}/><meshStandardMaterial color="#1c292c" metalness={.36} roughness={.46}/></mesh>
  <mesh position={[0, .52, .02]} castShadow><boxGeometry args={[.4, .03, 1.12]}/><meshStandardMaterial color="#53e4ab" metalness={.32}/></mesh>
  <mesh position={[0, 1.04, -.72]} rotation={[-.07, 0, 0]} castShadow><cylinderGeometry args={[.055, .065, 1.27, 10]}/><meshStandardMaterial color="#9eafb4" metalness={.74} roughness={.28}/></mesh>
  <mesh position={[0, 1.67, -.79]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.05, .05, .79, 10]}/><meshStandardMaterial color="#202b30"/></mesh>
  <mesh position={[0, 1.13, -.79]}><sphereGeometry args={[.12, 10, 10]}/><meshStandardMaterial color="#fff0c0" emissive="#ffe8a4" emissiveIntensity={.8}/></mesh>
  <mesh position={[0, .47, .72]}><boxGeometry args={[.22, .08, .09]}/><meshStandardMaterial color="#ff4545" emissive="#ff2525" emissiveIntensity={.5}/></mesh>
  <group ref={riderRef}><Rider/></group>
</group>; }

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
function ChallengeCourse() {
  return <group>
    <ChallengeZone config={CHALLENGES.slalom} color="#acff45" subtitle="40 SEK. · 1.000 COINS"/>
    {SLALOM_CONES.map((cone, i) => <TrafficCone key={i} data={cone}/>)}
    <mesh position={[roadX(SLALOM_FINISH), .078, SLALOM_FINISH]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[10, 1.1]}/>
      <meshBasicMaterial color="#ecffac" transparent opacity={.83} side={THREE.DoubleSide}/>
    </mesh>
    <ChallengeZone config={CHALLENGES.wheelie} color="#4de5ff" subtitle="4 SEK. BALANCE · 1.000 COINS"/>
  </group>;
}

function Driver({ input, trees, onSpeed, onGameEvent }) {
  const group = useRef(), scooter = useRef(), rider = useRef();
  const { camera } = useThree();
  const player = useRef({ x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, pitchVel: 0, lean: 0, timer: 0, fallen: false, fallTime: 0, respawnZ: 0 });
  const challenge = useRef(createChallengeState());
  const grid = useMemo(() => {
    const cells = new Map();
    trees.forEach(t => { const key = Math.floor(t.x / 16) + ',' + Math.floor(t.z / 16); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(t); });
    return cells;
  }, [trees]);
  useFrame((_, frameDt) => {
    const dt = Math.min(frameDt, .05), p = player.current, c = input.current;
    const before = { x: p.x, z: p.z };
    if (c.reset) {
      failChallenge(challenge.current, 'Challenge abgebrochen.', onGameEvent);
      Object.assign(p, { x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, pitchVel: 0, lean: 0, fallen: false, fallTime: 0 });
      challenge.current.lastZone = null;
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
    } else {
      if (c.forward) p.speed += 11.5 * dt;
      if (c.back) p.speed -= 8 * dt;
      if (!c.forward && !c.back) p.speed *= Math.exp(-1.7 * dt);
      if (c.brake) p.speed *= Math.exp(-7 * dt);
      p.speed = clamp(p.speed, -6, 23); if (Math.abs(p.speed) < .04) p.speed = 0;
      const steer = Number(c.left) - Number(c.right);
      p.yaw += steer * Math.min(1.7, .7 + Math.abs(p.speed) * .075) * dt * Math.sign(p.speed || 1) * (1 - p.pitch * .42);
      p.x -= Math.sin(p.yaw) * p.speed * dt; p.z -= Math.cos(p.yaw) * p.speed * dt;
      p.x = clamp(p.x, -WORLD / 2 + 10, WORLD / 2 - 10);
      p.z = clamp(p.z, -WORLD / 2 + 10, WORLD / 2 - 10);
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
    group.current.position.set(p.x, .34, p.z); group.current.rotation.y = p.yaw;
    scooter.current.rotation.x = p.pitch;
    scooter.current.rotation.z = p.fallen ? Math.min(1.2, p.fallTime * 1.8) : p.lean;
    if (rider.current) {
      const t = p.fallen ? Math.min(1, p.fallTime * 2.2) : 0;
      rider.current.rotation.x = -1.12 * t;
      rider.current.rotation.z = -.6 * t;
      rider.current.position.set(0, -.22 * t, -1.1 * t);
    }
    const desired = new THREE.Vector3(p.x + Math.sin(p.yaw) * 6.9, 3.8, p.z + Math.cos(p.yaw) * 6.9);
    camera.position.lerp(desired, 1 - Math.exp(-5 * dt));
    camera.lookAt(p.x, 1.4 + p.pitch * .4, p.z);
    p.timer += dt; if (p.timer >= .13) { p.timer = 0; onSpeed(p.speed); }
  });
  return <group ref={group}><group ref={scooter}><Scooter riderRef={rider}/></group></group>;
}
export default function World({ input, quality, onSpeed, onGameEvent }) {
  const count = quality === 'low' ? 600 : 1300;
  const trees = useMemo(() => makeTrees(count), [count]);
  return <>
    <color attach="background" args={['#a4c8d0']}/><fog attach="fog" args={['#a4c8d0', 70, quality === 'low' ? 240 : 360]}/>
    <hemisphereLight args={['#e6f5ff', '#59704b', 2.1]}/>
    <directionalLight position={[-70, 115, -70]} intensity={2.7} color="#ffefd0" castShadow={quality === 'high'} shadow-mapSize={[1024,1024]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD, WORLD]}/><meshStandardMaterial color="#577749" roughness={1}/></mesh>
    <Road/><Forest trees={trees}/><ChallengeCourse/><Driver input={input} trees={trees} onSpeed={onSpeed} onGameEvent={onGameEvent}/>
  </>;
}
