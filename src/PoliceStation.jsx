import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { POLICE, POLICE_LOT, POLICE_CARS } from './worldLayout.js';

function Box({at,size,color,metalness=0,roughness=.8,emissive,emissiveIntensity=0,castShadow=false,refObj}){
  return <mesh ref={refObj} position={at} castShadow={castShadow} receiveShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}
      emissive={emissive??'#000000'} emissiveIntensity={emissiveIntensity}/>
  </mesh>;
}
function useLabel(text,{bg='#12325f',fg='#ffffff',border='#7fb4ff',w=512,h=128,font=62}={}){
  const map=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const c=canvas.getContext('2d');
    c.fillStyle=bg;c.fillRect(0,0,w,h);
    c.strokeStyle=border;c.lineWidth=8;c.strokeRect(5,5,w-10,h-10);
    c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';
    c.font=`900 ${font}px system-ui`;c.fillText(text,w/2,h/2+3,w-40);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[text,bg,fg,border,w,h,font]);
  useLayoutEffect(()=>()=>map.dispose(),[map]);
  return map;
}
// Local frame: facade faces -z. The group is rotated so -z points west, to the road.
function StationBuilding(){
  const W=POLICE.d, D=POLICE.w, H1=3.6, H2=3.4, front=-D/2;
  const sign=useLabel('POLIZEI',{bg:'#0f2f63',border:'#ffffff'});
  const blueLamp=useLabel('POLIZEI',{bg:'#1f6fe0',border:'#d9e9ff',font:66,w:512,h:150});
  const lamp=useRef();
  useFrame(({clock})=>{
    if(lamp.current)lamp.current.material.emissiveIntensity=1.2+Math.sin(clock.elapsedTime*2.2)*.35;
  });
  const windows=[];
  for(let floor=0;floor<2;floor++)for(let i=0;i<6;i++){
    const x=-W/2+1.6+i*(W-3.2)/5;
    if(floor===0&&Math.abs(x)<2.6)continue; // entrance
    windows.push({x,y:floor===0?1.9:H1+1.75});
  }
  return <group>
    {/* Ground floor: light render, upper floor: blue-grey panel cladding */}
    <Box at={[0,H1/2,0]} size={[W,H1,D]} color="#e8ecef" castShadow/>
    <Box at={[0,H1+H2/2,0]} size={[W-.3,H2,D-.3]} color="#c9d3dc" castShadow/>
    <Box at={[0,H1+.12,front-.02]} size={[W+.05,.34,.12]} color="#1d4f91"/>
    <Box at={[0,H1+H2+.25,0]} size={[W+.5,.5,D+.5]} color="#4a5562" castShadow/>
    <Box at={[0,.12,0]} size={[W+.6,.24,D+.6]} color="#9aa1a6"/>
    {/* windows with frames and sills */}
    {windows.map((w,i)=><group key={i} position={[w.x,w.y,front]}>
      <Box at={[0,0,-.06]} size={[1.9,1.45,.12]} color="#f4f6f7"/>
      <Box at={[0,0,-.13]} size={[1.7,1.27,.06]} color="#6f9cb8" metalness={.25} roughness={.18}/>
      <Box at={[0,0,-.17]} size={[.07,1.27,.04]} color="#f4f6f7"/>
      <Box at={[0,-.78,-.16]} size={[2.05,.08,.22]} color="#b7bec3"/>
    </group>)}
    {/* glass entrance, canopy and sign */}
    <Box at={[0,1.45,front-.07]} size={[4.4,2.9,.14]} color="#2b3a46"/>
    {[-1,1].map(s=><Box key={s} at={[s*1.02,1.35,front-.16]} size={[1.9,2.6,.05]} color="#89b9d4" metalness={.3} roughness={.08}/>)}
    <Box at={[0,1.35,front-.19]} size={[.08,2.6,.06]} color="#c8d0d6" metalness={.7}/>
    <Box at={[0,3.12,front-1.35]} size={[5.6,.22,2.7]} color="#f2f4f5" castShadow/>
    <Box at={[0,3.25,front-1.35]} size={[5.7,.06,2.8]} color="#1d4f91"/>
    {[-1,1].map(s=><mesh key={s} position={[s*2.55,1.5,front-2.5]} castShadow>
      <cylinderGeometry args={[.09,.09,3,10]}/>
      <meshStandardMaterial color="#c5ccd1" metalness={.75} roughness={.3}/>
    </mesh>)}
    <mesh position={[0,3.62,front-2.72]} rotation={[0,Math.PI,0]}>
      <planeGeometry args={[4.6,1.15]}/>
      <meshBasicMaterial map={sign} side={THREE.DoubleSide} toneMapped={false}/>
    </mesh>
    {/* classic blue police lamp above the door */}
    <mesh ref={lamp} position={[0,H1+1.05,front-.32]}>
      <boxGeometry args={[2.3,.68,.5]}/>
      <meshStandardMaterial color="#2a7bff" emissive="#2a7bff" emissiveMap={blueLamp} map={blueLamp} emissiveIntensity={1.2}/>
    </mesh>
    {/* steps and ramp */}
    <Box at={[0,.2,front-.95]} size={[4.8,.4,1.6]} color="#b8bec2"/>
    <Box at={[0,.08,front-2.1]} size={[5.4,.16,1]} color="#aeb4b8"/>
    {/* wall lights */}
    {[-1,1].map(s=><Box key={'wl'+s} at={[s*(W/2-1),2.75,front-.12]} size={[.35,.22,.22]} color="#fff6da" emissive="#ffe4a1" emissiveIntensity={1.4}/>)}
    {/* rooftop: AC units, radio mast with blinking aviation light */}
    <Box at={[-W/4,H1+H2+.95,1.2]} size={[2.2,.9,1.6]} color="#9aa3ab" metalness={.4}/>
    <Box at={[W/4-1,H1+H2+.8,-1]} size={[1.6,.6,1.2]} color="#a7afb6" metalness={.4}/>
    <RadioMast at={[W/2-1.8,H1+H2+.5,1.8]}/>
  </group>;
}
function RadioMast({at}){
  const beacon=useRef();
  useFrame(({clock})=>{
    if(beacon.current)beacon.current.material.emissiveIntensity=Math.sin(clock.elapsedTime*3)>.6?4:.2;
  });
  return <group position={at}>
    <mesh position={[0,2.2,0]}><cylinderGeometry args={[.05,.09,4.4,6]}/><meshStandardMaterial color="#d7dde2" metalness={.8} roughness={.3}/></mesh>
    {[.9,1.8,2.7].map(y=><mesh key={y} position={[0,y,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.025,.025,.9,5]}/><meshStandardMaterial color="#d7dde2" metalness={.8}/></mesh>)}
    <mesh ref={beacon} position={[0,4.45,0]}><sphereGeometry args={[.12,10,8]}/><meshStandardMaterial color="#ff3b30" emissive="#ff2a1f" emissiveIntensity={1}/></mesh>
  </group>;
}
function Flag({at}){
  const cloth=useRef();
  const geo=useMemo(()=>new THREE.PlaneGeometry(1.8,1.1,12,4),[]);
  const base=useMemo(()=>geo.attributes.position.array.slice(),[geo]);
  const tex=useMemo(()=>{
    const c=document.createElement('canvas');c.width=96;c.height=60;const g=c.getContext('2d');
    [['#111111',0],['#dd0000',20],['#ffce00',40]].forEach(([col,y])=>{g.fillStyle=col;g.fillRect(0,y,96,20);});
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[]);
  useLayoutEffect(()=>()=>{tex.dispose();geo.dispose();},[tex,geo]);
  useFrame(({clock})=>{
    const pos=geo.attributes.position, t=clock.elapsedTime;
    for(let i=0;i<pos.count;i++){
      const x=base[i*3]+.9;
      pos.array[i*3+2]=Math.sin(x*3.1-t*4.2)*.13*x;
    }
    pos.needsUpdate=true;
  });
  return <group position={at}>
    <mesh position={[0,3.6,0]} castShadow><cylinderGeometry args={[.06,.08,7.2,8]}/><meshStandardMaterial color="#e3e7ea" metalness={.8} roughness={.25}/></mesh>
    <mesh ref={cloth} geometry={geo} position={[.92,6.5,0]}>
      <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={.9}/>
    </mesh>
  </group>;
}
export function PoliceCar({car}){
  const left=useRef(), right=useRef();
  const door=useLabel('POLIZEI',{bg:'#ffffff',fg:'#1d4f91',border:'#ffffff',font:70});
  useFrame(({clock})=>{
    if(!car.lights)return;
    const t=clock.elapsedTime*7.5, a=Math.sin(t)>0, b=Math.sin(t+Math.PI*.9)>0;
    if(left.current)left.current.material.emissiveIntensity=a?5:.15;
    if(right.current)right.current.material.emissiveIntensity=b?5:.15;
  });
  return <group position={[car.x,0,car.z]} rotation={[0,car.yaw,0]}>
    {/* body: silver-white with blue livery, cabin, glass */}
    <Box at={[0,.62,0]} size={[1.86,.62,4.4]} color="#f3f5f6" metalness={.35} roughness={.35} castShadow/>
    <Box at={[0,.62,0]} size={[1.88,.2,4.42]} color="#1d5bb8" metalness={.3} roughness={.35}/>
    <Box at={[0,1.18,.15]} size={[1.68,.55,2.2]} color="#e9edef" metalness={.35} roughness={.35} castShadow/>
    <Box at={[0,1.2,-.98]} size={[1.6,.48,.06]} color="#2c3c4b" metalness={.4} roughness={.08}/>
    <Box at={[0,1.2,1.27]} size={[1.6,.46,.06]} color="#2c3c4b" metalness={.4} roughness={.08}/>
    {[-1,1].map(s=><group key={s}>
      <Box at={[s*.85,1.2,.15]} size={[.04,.42,2]} color="#2c3c4b" metalness={.4} roughness={.08}/>
      <mesh position={[s*.95,.72,.1]} rotation={[0,s*Math.PI/2,0]}><planeGeometry args={[1.5,.37]}/><meshBasicMaterial map={door} toneMapped={false}/></mesh>
      {[-1.4,1.35].map(z=><mesh key={z} position={[s*.86,.36,z]} rotation={[0,0,Math.PI/2]} castShadow>
        <cylinderGeometry args={[.36,.36,.26,16]}/><meshStandardMaterial color="#1b1f22" roughness={.95}/>
      </mesh>)}
      <Box at={[s*.6,.66,-2.21]} size={[.38,.14,.04]} color="#fff8e0" emissive="#fff1c4" emissiveIntensity={1.1}/>
      <Box at={[s*.62,.7,2.21]} size={[.32,.14,.04]} color="#d0201b" emissive="#b8140f" emissiveIntensity={.6}/>
    </group>)}
    <Box at={[0,.5,-2.22]} size={[1.5,.16,.08]} color="#3a4046"/>
    {/* light bar */}
    <Box at={[0,1.5,.2]} size={[1.25,.08,.32]} color="#2d3135"/>
    <mesh ref={left} position={[-.33,1.6,.2]}><boxGeometry args={[.55,.14,.28]}/><meshStandardMaterial color="#2f74ff" emissive="#2f74ff" emissiveIntensity={.15} transparent opacity={.92}/></mesh>
    <mesh ref={right} position={[.33,1.6,.2]}><boxGeometry args={[.55,.14,.28]}/><meshStandardMaterial color="#2f74ff" emissive="#2f74ff" emissiveIntensity={.15} transparent opacity={.92}/></mesh>
  </group>;
}
function ParkingLot(){
  const L=POLICE_LOT;
  return <group>
    <mesh position={[L.x,.031,L.z]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[L.w,L.d]}/><meshStandardMaterial color="#4f585b" roughness={1}/>
    </mesh>
    {[-9.3,-3.1,3.1,9.3].map(dz=><mesh key={dz} position={[POLICE_CARS[0].x,.04,L.z+dz]} rotation={[-Math.PI/2,0,0]}>
      <planeGeometry args={[5.4,.13]}/><meshBasicMaterial color="#f1efe6"/>
    </mesh>)}
    <mesh position={[L.x-L.w/2+3,.041,L.z]} rotation={[-Math.PI/2,0,Math.PI/2]}>
      <planeGeometry args={[L.d-4,.13]}/><meshBasicMaterial color="#f1efe6"/>
    </mesh>
    {Array.from({length:6},(_,i)=><mesh key={i} position={[POLICE.x-POLICE.w/2-1.2,.35,L.z-7.5+i*3]} castShadow>
      <cylinderGeometry args={[.1,.12,.7,8]}/><meshStandardMaterial color={i%2?'#f2f2f2':'#1d4f91'}/>
    </mesh>)}
  </group>;
}
export function PoliceStation(){
  return <group>
    <ParkingLot/>
    <group position={[POLICE.x,0,POLICE.z]} rotation={[0,Math.PI/2,0]}><StationBuilding/></group>
    {POLICE_CARS.map(c=><PoliceCar key={c.id} car={c}/>)}
    <Flag at={[POLICE.x-POLICE.w/2-2,0,POLICE.z+POLICE.d/2+1.2]}/>
  </group>;
}
