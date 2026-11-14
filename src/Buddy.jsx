import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Walker } from './Models.jsx';
import { BUDDY_LOOK } from './buddy.js';

// Light column + ground ring: visible from far away, like a mission marker.
export function Beacon({spot,color}){
  const beam=useRef(),ring=useRef();
  useFrame(({clock})=>{
    const pulse=.5+Math.sin(clock.elapsedTime*3.2)*.5;
    if(beam.current)beam.current.material.opacity=.16+pulse*.12;
    if(ring.current)ring.current.scale.setScalar(1+pulse*.18);
  });
  return <group position={[spot.x,0,spot.z]}>
    <mesh ref={beam} position={[0,9,0]}>
      <cylinderGeometry args={[1.5,1.5,18,24,1,true]}/>
      <meshBasicMaterial color={color} transparent opacity={.2} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending}/>
    </mesh>
    <mesh ref={ring} rotation={[-Math.PI/2,0,0]} position={[0,.09,0]}>
      <ringGeometry args={[1.9,2.25,40]}/>
      <meshBasicMaterial color={color} transparent opacity={.9} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
  </group>;
}
// The buddy waiting at the kerb, facing the road and waving.
export function BuddyWaiting({spot}){
  return <group>
    <Beacon spot={spot} color="#ff4fb0"/>
    <group position={[spot.x,0,spot.z]} rotation={[0,spot.side===1?Math.PI/2:-Math.PI/2,0]}>
      <Walker options={BUDDY_LOOK} wave/>
    </group>
  </group>;
}
