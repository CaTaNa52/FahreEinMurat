import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Shared, lazily built gradient textures (never disposed: they live as long as the app).
let spill=null,column=null;
function gradient(build){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  build(canvas.getContext('2d'));
  return new THREE.CanvasTexture(canvas);
}
const spillMap=()=>spill??=gradient(c=>{
  const g=c.createRadialGradient(64,64,6,64,64,64);
  g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.45,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
});
const columnMap=()=>column??=gradient(c=>{
  // Canvas top = top of the light column: fades out upwards.
  const g=c.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.55,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,1)');
  c.fillStyle=g;c.fillRect(0,0,128,128);
});

// Action spot on the ground: bright ring, pool of light around it and a soft light
// column, so it reads from far away and at dusk. Unlit + additive: free on phones.
export function ActionMarker({x,z,radius=1.3,color,y=.06,height=4.2,ring=true}){
  const glow=useRef(),beam=useRef(),edge=useRef();
  useFrame(({clock})=>{
    const pulse=.5+Math.sin(clock.elapsedTime*2.6+x)*.5;
    if(glow.current)glow.current.material.opacity=.5+pulse*.3;
    if(beam.current)beam.current.material.opacity=.3+pulse*.22;
    if(edge.current)edge.current.scale.setScalar(1+pulse*.035);
  });
  return <group position={[x,y,z]}>
    <mesh ref={glow} rotation={[-Math.PI/2,0,0]} renderOrder={1}>
      <circleGeometry args={[radius*1.9,40]}/>
      <meshBasicMaterial map={spillMap()} color={color} transparent opacity={.7} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </mesh>
    {ring&&<mesh ref={edge} rotation={[-Math.PI/2,0,0]} position={[0,.02,0]} renderOrder={2}>
      <ringGeometry args={[radius-.24,radius,56]}/>
      <meshBasicMaterial color={color} transparent opacity={1} side={THREE.DoubleSide} depthWrite={false} toneMapped={false}/>
    </mesh>}
    <mesh ref={beam} position={[0,height/2,0]} renderOrder={3}>
      <cylinderGeometry args={[radius*.96,radius*.96,height,36,1,true]}/>
      <meshBasicMaterial map={columnMap()} color={color} transparent opacity={.4} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false}/>
    </mesh>
  </group>;
}
