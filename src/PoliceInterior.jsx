import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Walker } from './Models.jsx';
import { ROOM, COUNTER, CELLS, SPOTS } from './interior.js';

const OFFICER={jacket:'#1d4f91',pants:'#16233a',helmet:false,watch:false};
const INMATE={jacket:'#f08a2e',pants:'#f08a2e',helmet:false,watch:false};
function Block({at,size,color,metalness=0,roughness=.85,emissive,emissiveIntensity=0}){
  return <mesh position={at}>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}
      emissive={emissive??'#000000'} emissiveIntensity={emissiveIntensity}/>
  </mesh>;
}
function useCanvasTexture(draw,w,h,deps){
  const map=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    draw(canvas.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },deps);
  useLayoutEffect(()=>()=>map.dispose(),[map]);
  return map;
}
function Sign({at,size,text,bg='#0f2f63',fg='#ffffff',rotation=[0,0,0]}){
  const map=useCanvasTexture((c,w,h)=>{
    c.fillStyle=bg;c.fillRect(0,0,w,h);c.strokeStyle=fg;c.lineWidth=6;c.strokeRect(5,5,w-10,h-10);
    c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';c.font='900 56px system-ui';c.fillText(text,w/2,h/2+3,w-40);
  },512,128,[text,bg,fg]);
  return <mesh position={at} rotation={rotation}><planeGeometry args={size}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>;
}
function Floor(){
  const map=useCanvasTexture((c,w,h)=>{
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){c.fillStyle=(x+y)%2?'#c9d1d8':'#aeb8c2';c.fillRect(x*w/8,y*h/8,w/8,h/8);}
  },256,256,[]);
  map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(ROOM.w/4,ROOM.d/4);
  return <mesh rotation={[-Math.PI/2,0,0]}><planeGeometry args={[ROOM.w,ROOM.d]}/><meshStandardMaterial map={map} roughness={.55}/></mesh>;
}
function NoticeBoard(){
  const map=useCanvasTexture((c,w,h)=>{
    c.fillStyle='#8a6a48';c.fillRect(0,0,w,h);
    const notes=[['GESUCHT','Schlüsseldieb','#fff3c9'],['TEMPO 30','vor der Wache','#ffd6d6'],['FUNDBÜRO','1 Helm, 2 Uhren','#d9f0ff'],['HELM AUF!','auch für Kollegen','#e2ffd9']];
    notes.forEach(([title,sub,bg],i)=>{
      const x=22+i%2*250,y=20+Math.floor(i/2)*120;
      c.fillStyle=bg;c.fillRect(x,y,225,100);
      c.fillStyle='#1b2530';c.textAlign='center';c.font='900 34px system-ui';c.fillText(title,x+112,y+46,205);
      c.font='600 20px system-ui';c.fillText(sub,x+112,y+78,205);
    });
  },512,256,[]);
  return <mesh position={[-ROOM.w/2+.06,1.75,-1.2]} rotation={[0,Math.PI/2,0]}><planeGeometry args={[3,1.5]}/><meshBasicMaterial map={map} toneMapped={false}/></mesh>;
}
function Bars({x0,x1,z}){
  const ref=useRef(),count=Math.max(1,Math.round((x1-x0)/.22));
  useLayoutEffect(()=>{
    const o=new THREE.Object3D();
    for(let i=0;i<count;i++){o.position.set(x0+(i+.5)*(x1-x0)/count,ROOM.h/2,z);o.updateMatrix();ref.current.setMatrixAt(i,o.matrix);}
    ref.current.instanceMatrix.needsUpdate=true;
  },[x0,x1,z,count]);
  return <instancedMesh ref={ref} args={[undefined,undefined,count]}>
    <cylinderGeometry args={[.035,.035,ROOM.h,8]}/><meshStandardMaterial color="#59626c" metalness={.85} roughness={.3}/>
  </instancedMesh>;
}
function SpotRing({spot,color}){
  return <mesh position={[spot.x,.02,spot.z]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[.62,.74,32]}/><meshBasicMaterial color={color} transparent opacity={.8}/>
  </mesh>;
}
// Whole room, placed at ROOM.{x,y,z}. Local +z is the entrance wall.
export function PoliceInterior(){
  const W=ROOM.w,D=ROOM.d,H=ROOM.h,wall='#e9edf0';
  const cellMid=(CELLS.z0+CELLS.z1)/2;
  return <group position={[ROOM.x,ROOM.y,ROOM.z]}>
    <Floor/>
    <mesh position={[0,H,0]} rotation={[Math.PI/2,0,0]}><planeGeometry args={[W,D]}/><meshStandardMaterial color="#f4f6f7"/></mesh>
    {/* walls with the blue station stripe */}
    {[[0,-D/2,W,0],[0,D/2,W,Math.PI],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]].map(([x,z,len,yaw],i)=>
      <group key={i} position={[x,0,z]} rotation={[0,yaw,0]}>
        <mesh position={[0,H/2,0]}><planeGeometry args={[len,H]}/><meshStandardMaterial color={wall} roughness={.9}/></mesh>
        <mesh position={[0,1.05,.01]}><planeGeometry args={[len,.22]}/><meshStandardMaterial color="#1d4f91"/></mesh>
      </group>)}
    {/* ceiling lights */}
    {[[-4,2],[4,2],[-4,-3],[4,-3]].map(([x,z])=><Block key={x+','+z} at={[x,H-.04,z]} size={[2.2,.06,.5]} color="#ffffff" emissive="#fff6e0" emissiveIntensity={2.2}/>)}
    <pointLight position={[-3,H-.5,1]} intensity={14} distance={16} decay={2} color="#fff3df"/>
    <pointLight position={[4.5,H-.5,-2]} intensity={10} distance={14} decay={2} color="#e8f0ff"/>
    {/* entrance: glass doors, exit sign */}
    <Block at={[0,1.25,D/2-.05]} size={[3,2.5,.1]} color="#2b3a46"/>
    {[-1,1].map(s=><Block key={s} at={[s*.7,1.2,D/2-.12]} size={[1.3,2.3,.04]} color="#9fd0ea" metalness={.3} roughness={.08} emissive="#ffb38a" emissiveIntensity={.45}/>)}
    <Sign at={[0,2.85,D/2-.13]} size={[1.9,.48]} text="AUSGANG" bg="#128a4d" rotation={[0,Math.PI,0]}/>
    <SpotRing spot={SPOTS.exit} color="#3fe08a"/>
    {/* reception */}
    <Block at={[COUNTER.x,.55,COUNTER.z]} size={[COUNTER.w,1.1,COUNTER.d]} color="#2a4a78"/>
    <Block at={[COUNTER.x,1.13,COUNTER.z]} size={[COUNTER.w+.2,.07,COUNTER.d+.2]} color="#e7e2d6" roughness={.4}/>
    <mesh position={[COUNTER.x+1.55,1.75,COUNTER.z]}>
      <boxGeometry args={[1.9,1.15,.04]}/>
      <meshStandardMaterial color="#bfe2f2" metalness={.3} roughness={.05} transparent opacity={.32}/>
    </mesh>
    <Block at={[COUNTER.x-1.2,1.33,COUNTER.z-.1]} size={[.6,.4,.06]} color="#14181d" emissive="#4aa3ff" emissiveIntensity={.9}/>
    <Sign at={[COUNTER.x,2.75,-D/2+.03]} size={[4.4,1.1]} text="POLIZEI · EMPFANG"/>
    <group position={[COUNTER.x,0,COUNTER.z-1.15]} rotation={[0,Math.PI,0]}><Walker options={OFFICER} cap="#16233a"/></group>
    <SpotRing spot={SPOTS.officer} color="#4aa3ff"/>
    {/* back office desk, lockers, waiting bench, plant, board */}
    <Block at={[-5.6,.72,-4.5]} size={[2.6,.08,1.2]} color="#b08d62"/>
    {[-1,1].map(s=><Block key={s} at={[-5.6+s*1.15,.36,-4.5]} size={[.1,.72,1.1]} color="#5a646e"/>)}
    <Block at={[-5.6,1.08,-4.75]} size={[.75,.48,.05]} color="#14181d" emissive="#63ffd9" emissiveIntensity={.7}/>
    {[0,1,2,3].map(i=><group key={i}>
      <Block at={[-7.55,1,1.3+i*.85]} size={[.7,2,.8]} color={i%2?'#5f7186':'#52647a'} metalness={.5} roughness={.5}/>
      <Block at={[-7.18,1.2,1.55+i*.85]} size={[.03,.16,.05]} color="#d7dde2" metalness={.8}/>
    </group>)}
    <Block at={[7.4,.45,2.6]} size={[.9,.1,3.2]} color="#a67b52"/>
    <Block at={[7.78,.85,2.6]} size={[.1,.7,3.2]} color="#a67b52"/>
    {[-1.3,1.3].map(z=><Block key={z} at={[7.4,.22,2.6+z]} size={[.8,.44,.1]} color="#3b444c" metalness={.6}/>)}
    <Block at={[7.3,.3,5.2]} size={[.6,.6,.6]} color="#7a5a44"/>
    <mesh position={[7.3,1.1,5.2]}><sphereGeometry args={[.62,10,8]}/><meshStandardMaterial color="#2f8f5b" roughness={1}/></mesh>
    <NoticeBoard/>
    {/* holding cells: cell 1 stands open, cell 2 is occupied */}
    <Block at={[CELLS.x0,H/2,cellMid]} size={[.2,H,CELLS.z1-CELLS.z0]} color="#cfd6dc"/>
    <Block at={[CELLS.split,H/2,cellMid]} size={[.2,H,CELLS.z1-CELLS.z0]} color="#cfd6dc"/>
    <Bars x0={CELLS.x0} x1={CELLS.door[0]} z={CELLS.z1}/>
    <Bars x0={CELLS.door[1]} x1={CELLS.x1} z={CELLS.z1}/>
    <Block at={[(CELLS.x0+CELLS.x1)/2,H-.35,CELLS.z1]} size={[CELLS.x1-CELLS.x0,.12,.14]} color="#59626c" metalness={.8}/>
    {/* open cell door, swung inwards */}
    <group position={[CELLS.door[0],0,CELLS.z1]} rotation={[0,1.25,0]}><Bars x0={0} x1={1.3} z={0}/></group>
    <Sign at={[2.8,2.75,CELLS.z1+.09]} size={[1.2,.3]} text="ZELLE 1" bg="#3b444c"/>
    <Sign at={[6.2,2.75,CELLS.z1+.09]} size={[1.2,.3]} text="ZELLE 2" bg="#3b444c"/>
    <Block at={[2.75,.38,-5.45]} size={[2.2,.16,.9]} color="#8793a0"/>
    <Block at={[2.75,.5,-5.45]} size={[2.1,.1,.8]} color="#d9dde2"/>
    <Block at={[6.3,.38,-5.45]} size={[2.2,.16,.9]} color="#8793a0"/>
    <group position={[6.2,0,-3.6]} rotation={[0,Math.PI,0]}><Walker options={INMATE}/></group>
    <SpotRing spot={SPOTS.inmate} color="#f08a2e"/>
  </group>;
}
