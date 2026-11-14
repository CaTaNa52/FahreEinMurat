import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roadX, WORKSHOPS } from './gameplay.js';
import { CROSSROADS, OBSTACLES, CLEARINGS } from './worldLayout.js';
import { BUDDY_SPOTS } from './buddy.js';

// Sunset palette shared by sky, fog and lights.
export const SUNSET={horizon:'#ffb38a',mid:'#ff7fa6',top:'#5b3f9e',fog:'#f6ad94',sun:'#ffd9a0'};
const SUN_DIR=new THREE.Vector3(-.82,.2,-.52).normalize();
export const SUN_POSITION=[SUN_DIR.x*150,SUN_DIR.y*150+40,SUN_DIR.z*150];

// Gradient dome and sun disc that travel with the camera, so the horizon never gets closer.
export function Sky(){
  const group=useRef();
  const geometry=useMemo(()=>{
    const geo=new THREE.SphereGeometry(520,32,18);
    const pos=geo.attributes.position,colors=new Float32Array(pos.count*3);
    const a=new THREE.Color(SUNSET.horizon),b=new THREE.Color(SUNSET.mid),c=new THREE.Color(SUNSET.top),out=new THREE.Color();
    for(let i=0;i<pos.count;i++){
      const h=THREE.MathUtils.clamp(pos.getY(i)/520,0,1);
      if(h<.22)out.copy(a).lerp(b,h/.22);else out.copy(b).lerp(c,Math.min(1,(h-.22)/.5));
      colors.set([out.r,out.g,out.b],i*3);
    }
    geo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    return geo;
  },[]);
  useLayoutEffect(()=>()=>geometry.dispose(),[geometry]);
  useFrame(({camera})=>{if(group.current)group.current.position.set(camera.position.x,Math.max(0,camera.position.y)-20,camera.position.z);});
  return <group ref={group}>
    <mesh geometry={geometry} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} toneMapped={false}/>
    </mesh>
    <group position={[SUN_DIR.x*480,SUN_DIR.y*480,SUN_DIR.z*480]} onUpdate={self=>self.lookAt(0,0,0)}>
      <mesh renderOrder={-9}><circleGeometry args={[70,40]}/>
        <meshBasicMaterial color="#ff9f6b" transparent opacity={.35} fog={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/></mesh>
      <mesh renderOrder={-8} position={[0,0,1]}><circleGeometry args={[30,40]}/>
        <meshBasicMaterial color="#fff0c4" fog={false} depthWrite={false} toneMapped={false} side={THREE.DoubleSide}/></mesh>
    </group>
  </group>;
}

// Palms line both sides of the main road, wherever nothing else stands.
export function makePalms(){
  const palms=[];
  for(let z=-560,i=0;z<=560;z+=17,i++){
    for(const side of [-1,1]){
      const x=roadX(z)+side*(9.7+(i%3)*.5);
      if(CROSSROADS.some(c=>Math.abs(z-c.z)<13))continue;
      if(OBSTACLES.some(o=>Math.abs(x-o.x)<o.w/2+3.2&&Math.abs(z-o.z)<o.d/2+3.2))continue;
      if(CLEARINGS.some(c=>Math.abs(x-c.x)<c.w/2+2&&Math.abs(z-c.z)<c.d/2+2))continue;
      if(Object.values(WORKSHOPS).some(w=>Math.hypot(x-w.x,z-w.z)<w.radius+3))continue;
      if(BUDDY_SPOTS.some(s=>Math.hypot(x-s.x,z-s.z)<5))continue;
      palms.push({x,z,height:6.2+((i*7+side*3)%5)*.55,rot:(i*2.4+side)%6.283});
    }
  }
  return palms;
}
const FRONDS=8;
export function Palms({palms}){
  const trunks=useRef(),fronds=useRef();
  useLayoutEffect(()=>{
    const o=new THREE.Object3D();
    palms.forEach((p,i)=>{
      o.rotation.set(0,p.rot,0);o.scale.set(1,p.height/7,1);o.position.set(p.x,p.height/2,p.z);
      o.updateMatrix();trunks.current.setMatrixAt(i,o.matrix);
      for(let f=0;f<FRONDS;f++){
        const yaw=p.rot+f*Math.PI*2/FRONDS,droop=.42+(f%2)*.22;
        o.scale.set(1,1,1);o.rotation.set(0,yaw,-droop,'YXZ');
        o.position.set(p.x+Math.cos(yaw)*1.55*Math.cos(droop),p.height-.15-Math.sin(droop)*1.55,p.z-Math.sin(yaw)*1.55*Math.cos(droop));
        o.updateMatrix();fronds.current.setMatrixAt(i*FRONDS+f,o.matrix);
      }
    });
    for(const ref of [trunks,fronds]){ref.current.instanceMatrix.needsUpdate=true;ref.current.computeBoundingSphere();}
  },[palms]);
  return <group>
    <instancedMesh ref={trunks} args={[undefined,undefined,palms.length]} castShadow>
      <cylinderGeometry args={[.17,.3,7,7]}/><meshStandardMaterial color="#8a6a4c" roughness={.95}/>
    </instancedMesh>
    <instancedMesh ref={fronds} args={[undefined,undefined,palms.length*FRONDS]}>
      <boxGeometry args={[3.3,.06,.75]}/><meshStandardMaterial color="#2f8f5b" roughness={.8}/>
    </instancedMesh>
  </group>;
}
