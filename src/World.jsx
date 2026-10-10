import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const WORLD = 1200;
const clamp = THREE.MathUtils.clamp;
const roadX = z => Math.sin(z * .004) * 48 + Math.sin(z * .012) * 10;
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
function Scooter() { return <group position={[0, -.33, -.66]}>
  <Wheel z={.66}/><Wheel z={-.69}/>
  <mesh position={[0, .43, .02]} castShadow><boxGeometry args={[.43, .16, 1.35]}/><meshStandardMaterial color="#1c292c" metalness={.36} roughness={.46}/></mesh>
  <mesh position={[0, .52, .02]} castShadow><boxGeometry args={[.4, .03, 1.12]}/><meshStandardMaterial color="#53e4ab" metalness={.32}/></mesh>
  <mesh position={[0, 1.04, -.72]} rotation={[-.07, 0, 0]} castShadow><cylinderGeometry args={[.055, .065, 1.27, 10]}/><meshStandardMaterial color="#9eafb4" metalness={.74} roughness={.28}/></mesh>
  <mesh position={[0, 1.67, -.79]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[.05, .05, .79, 10]}/><meshStandardMaterial color="#202b30"/></mesh>
  <mesh position={[0, 1.13, -.79]}><sphereGeometry args={[.12, 10, 10]}/><meshStandardMaterial color="#fff0c0" emissive="#ffe8a4" emissiveIntensity={.8}/></mesh>
  <mesh position={[0, .47, .72]}><boxGeometry args={[.22, .08, .09]}/><meshStandardMaterial color="#ff4545" emissive="#ff2525" emissiveIntensity={.5}/></mesh>
  <Rider/>
</group>; }
function Driver({ input, wheelieEnabled, trees, onSpeed }) {
  const group = useRef(), scooter = useRef();
  const { camera } = useThree();
  const player = useRef({ x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, lean: 0, timer: 0 });
  const grid = useMemo(() => {
    const cells = new Map();
    trees.forEach(t => { const key = Math.floor(t.x / 16) + ',' + Math.floor(t.z / 16); if (!cells.has(key)) cells.set(key, []); cells.get(key).push(t); });
    return cells;
  }, [trees]);
  useFrame((_, frameDt) => {
    const dt = Math.min(frameDt, .05), p = player.current, c = input.current;
    if (c.reset) { Object.assign(p, { x: roadX(0), z: 0, yaw: 0, speed: 0, pitch: 0, lean: 0 }); c.reset = false; }
    if (c.forward) p.speed += 11.5 * dt;
    if (c.back) p.speed -= 8 * dt;
    if (!c.forward && !c.back) p.speed *= Math.exp(-1.7 * dt);
    if (c.brake) p.speed *= Math.exp(-7 * dt);
    p.speed = clamp(p.speed, -6, 23); if (Math.abs(p.speed) < .04) p.speed = 0;
    const steer = Number(c.left) - Number(c.right);
    p.yaw += steer * Math.min(1.7, .7 + Math.abs(p.speed) * .075) * dt * Math.sign(p.speed || 1);
    p.x -= Math.sin(p.yaw) * p.speed * dt; p.z -= Math.cos(p.yaw) * p.speed * dt;
    p.x = clamp(p.x, -WORLD / 2 + 10, WORLD / 2 - 10);
    p.z = clamp(p.z, -WORLD / 2 + 10, WORLD / 2 - 10);
    const gx = Math.floor(p.x / 16), gz = Math.floor(p.z / 16);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) for (const tree of grid.get((gx + ox) + ',' + (gz + oz)) || []) {
      const dx = p.x - tree.x, dz = p.z - tree.z, dist = Math.hypot(dx, dz), radius = tree.scale * .38 + .45;
      if (dist > .001 && dist < radius) { p.x = tree.x + dx / dist * radius; p.z = tree.z + dz / dist * radius; p.speed *= .7; }
    }
    p.pitch = THREE.MathUtils.damp(p.pitch, (wheelieEnabled || c.wheelie) && p.speed > 1.5 ? .49 : 0, 5, dt);
    p.lean = THREE.MathUtils.damp(p.lean, steer * Math.min(Math.abs(p.speed) / 20, 1) * .12, 5, dt);
    group.current.position.set(p.x, .34, p.z); group.current.rotation.y = p.yaw;
    scooter.current.rotation.x = p.pitch; scooter.current.rotation.z = p.lean;
    const desired = new THREE.Vector3(p.x + Math.sin(p.yaw) * 6.9, 3.8, p.z + Math.cos(p.yaw) * 6.9);
    camera.position.lerp(desired, 1 - Math.exp(-5 * dt)); camera.lookAt(p.x, 1.4 + p.pitch * .4, p.z);
    p.timer += dt; if (p.timer >= .13) { p.timer = 0; onSpeed(p.speed); }
  });
  return <group ref={group}><group ref={scooter}><Scooter/></group></group>;
}
export default function World({ input, wheelieEnabled, quality, onSpeed }) {
  const count = quality === 'low' ? 600 : 1300;
  const trees = useMemo(() => makeTrees(count), [count]);
  return <>
    <color attach="background" args={['#a4c8d0']}/><fog attach="fog" args={['#a4c8d0', 70, quality === 'low' ? 240 : 360]}/>
    <hemisphereLight args={['#e6f5ff', '#59704b', 2.1]}/>
    <directionalLight position={[-70, 115, -70]} intensity={2.7} color="#ffefd0" castShadow={quality === 'high'} shadow-mapSize={[1024,1024]} shadow-camera-left={-90} shadow-camera-right={90} shadow-camera-top={90} shadow-camera-bottom={-90}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[WORLD, WORLD]}/><meshStandardMaterial color="#577749" roughness={1}/></mesh>
    <Road/><Forest trees={trees}/><Driver input={input} wheelieEnabled={wheelieEnabled} trees={trees} onSpeed={onSpeed}/>
  </>;
}
