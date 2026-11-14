import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { updateTraffic } from './traffic.js';
import { CHALLENGES, SLALOM_FINISH } from './gameplay.js';

// While the slalom runs, the course is closed for traffic.
const SLALOM_SPAN=[SLALOM_FINISH-10,CHALLENGES.slalom.z+8];
const GLASS='#1f2d3a';
function Part({at,size,color,metalness=.35,roughness=.35,castShadow=false}){
  return <mesh position={at} castShadow={castShadow}>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/>
  </mesh>;
}
// Local frame: the car drives towards -z, like the scooter at yaw 0.
function CarBody({car,tail}){
  const van=car.kind==='van',sport=car.kind==='sport';
  const bodyH=van?.95:sport?.5:.62, bodyY=.3+bodyH/2+.06;
  const cabH=van?.75:sport?.42:.55, cabL=van?3.3:sport?1.8:2.2, cabZ=van?.35:sport?.3:.15;
  const top=bodyY+bodyH/2;
  return <group>
    <Part at={[0,bodyY,0]} size={[1.9,bodyH,4.45]} color={car.color} castShadow/>
    <Part at={[0,top+cabH/2,cabZ]} size={[1.7,cabH,cabL]} color={van?car.color:'#e8ecef'} castShadow/>
    <Part at={[0,top+cabH/2,cabZ-cabL/2-.01]} size={[1.58,cabH*.8,.05]} color={GLASS} metalness={.5} roughness={.08}/>
    <Part at={[0,top+cabH/2,cabZ+cabL/2+.01]} size={[1.58,cabH*.76,.05]} color={GLASS} metalness={.5} roughness={.08}/>
    {[-1,1].map(s=><group key={s}>
      <Part at={[s*.86,top+cabH/2,cabZ]} size={[.04,cabH*.72,cabL-.3]} color={GLASS} metalness={.5} roughness={.08}/>
      {[-1.42,1.38].map(z=><mesh key={z} position={[s*.88,.36,z]} rotation={[0,0,Math.PI/2]}>
        <cylinderGeometry args={[.36,.36,.26,14]}/><meshStandardMaterial color="#17191c" roughness={.95}/>
      </mesh>)}
      <mesh position={[s*.62,bodyY+.05,-2.24]}>
        <boxGeometry args={[.4,.15,.04]}/>
        <meshStandardMaterial color="#fff8e0" emissive="#fff1c4" emissiveIntensity={1.6}/>
      </mesh>
    </group>)}
    <mesh position={[0,bodyY+.08,2.24]}>
      <boxGeometry args={[1.62,.13,.04]}/>
      <meshStandardMaterial ref={tail} color="#d0201b" emissive="#ff2a1f" emissiveIntensity={.6}/>
    </mesh>
    <Part at={[0,.42,-2.25]} size={[1.5,.16,.08]} color="#2c3035"/>
    {sport&&<Part at={[0,top+.22,2]} size={[1.7,.06,.34]} color="#15171a"/>}
    {car.kind==='taxi'&&<mesh position={[0,top+cabH+.12,cabZ]}>
      <boxGeometry args={[.7,.2,.3]}/>
      <meshStandardMaterial color="#fff3b0" emissive="#ffd84a" emissiveIntensity={1.8}/>
    </mesh>}
  </group>;
}
export function Traffic({cars,radar,paused}){
  const groups=useRef([]),tails=useRef([]);
  useFrame((_,frameDt)=>{
    if(!paused){
      const r=radar.current;
      updateTraffic(cars,{x:r.x,z:r.z,active:r.mode==='ride'},Math.min(frameDt,.05),r.slalom?SLALOM_SPAN:null);
    }
    cars.forEach((car,i)=>{
      const g=groups.current[i];
      if(g){g.position.set(car.x,0,car.z);g.rotation.y=car.yaw;}
      const t=tails.current[i];
      if(t)t.emissiveIntensity=car.speed<car.cruise*.55?3.4:.6;
    });
  });
  return <group>{cars.map((car,i)=><group key={car.id} ref={el=>{groups.current[i]=el;}}>
    <CarBody car={car} tail={el=>{tails.current[i]=el;}}/>
  </group>)}</group>;
}
