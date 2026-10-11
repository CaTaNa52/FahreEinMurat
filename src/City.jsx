import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WORKSHOPS } from './gameplay.js';
import { CROSSROADS, BUILDINGS, BENCHES, LAMPS, SIGNALS } from './worldLayout.js';
import { DEFAULT_RIDER } from './customization.js';

const asphalt='#4b5456';
function Cuboid({at,size,color,metalness=0,roughness=.83,castShadow=false}){
  return <mesh position={at} castShadow={castShadow} receiveShadow>
    <boxGeometry args={size}/>
    <meshStandardMaterial color={color} metalness={metalness} roughness={roughness}/>
  </mesh>;
}
function BuildingLabel({name,width=4.6,color='#dbffbb'}){
  const texture=useMemo(()=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const c=canvas.getContext('2d');
    c.fillStyle='#17312edc';c.fillRect(0,0,512,128);
    c.strokeStyle=color;c.lineWidth=7;c.strokeRect(4,4,504,120);
    c.fillStyle='#fff';c.textAlign='center';c.font='900 48px system-ui';
    c.fillText(name,256,83,470);
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;return map;
  },[name,color]);
  return <mesh rotation={[0,Math.PI,0]}>
    <planeGeometry args={[width,width/4]}/>
    <meshBasicMaterial side={THREE.DoubleSide} map={texture} transparent depthWrite={false}/>
  </mesh>;
}
function House({item,isHome=false}){
  const width=item.width??9.3, depth=item.depth??8.2;
  const color=item.paint??'#e4d2ae',eave=4.5,rise=2.05;
  const panelLength=Math.hypot(width/2+.55,rise);
  const slope=Math.atan2(rise,width/2+.55);
  const gable=useMemo(()=>{
    const shape=new THREE.Shape();
    shape.moveTo(-width/2,0);shape.lineTo(0,rise);shape.lineTo(width/2,0);shape.closePath();
    return shape;
  },[width,rise]);
  return <group position={[item.x,0,item.z]}>
    <Cuboid at={[0,2.25,0]} size={[width,4.5,depth]} color={color} castShadow/>
    {[-1,1].map(side=><group key={'roof'+side}>
      <mesh position={[side*(width/4+.135),eave+rise/2,0]} rotation={[0,0,-side*slope]} castShadow receiveShadow>
        <boxGeometry args={[panelLength,.21,depth+1.35]}/>
        <meshStandardMaterial color={isHome?'#754338':'#6b5450'} roughness={.91}/>
      </mesh>
      <mesh position={[0,eave,side*depth/2]}>
        <shapeGeometry args={[gable]}/>
        <meshStandardMaterial side={THREE.DoubleSide} color={color}/>
      </mesh>
    </group>)}
    <Cuboid at={[-width*.27,eave+rise*.5,depth*.18]} size={[.7,1.8,.82]} color="#8f6652" castShadow/>
    <Cuboid at={[0,1.43,-depth/2-.09]} size={[1.65,2.87,.16]} color={isHome?'#624734':'#67584e'}/>
    <Cuboid at={[.49,1.33,-depth/2-.19]} size={[.1,.1,.1]} color="#dec481" metalness={.7}/>
    {[-1,1].map(side=><group key={'windows'+side}>
      <Cuboid at={[side*width*.3,2.5,-depth/2-.095]} size={[1.58,1.65,.19]} color="#f3eee0"/>
      <Cuboid at={[side*width*.3,2.5,-depth/2-.21]} size={[1.36,1.42,.08]} color="#77abc5" metalness={.1} roughness={.26}/>
      <Cuboid at={[side*width*.3,2.5,-depth/2-.26]} size={[.1,1.42,.06]} color="#f2eee3"/>
      <Cuboid at={[side*width*.3,2.5,-depth/2-.26]} size={[1.36,.1,.06]} color="#f2eee3"/>
      <Cuboid at={[side*(width/2+.07),2.7,0]} size={[.12,1.65,1.55]} color="#bce3f2"/>
      <Cuboid at={[side*(width*.33),.28,-depth/2-1]} size={[1.08,.56,.95]} color="#7c9170"/>
      <mesh position={[side*(width*.33),.77,-depth/2-1]}>
        <coneGeometry args={[.64,1.2,8]}/>
        <meshStandardMaterial color="#39764f"/>
      </mesh>
    </group>)}
    <Cuboid at={[0,.15,-depth/2-.75]} size={[2.8,.3,1.5]} color="#b8b2a6"/>
    <Cuboid at={[0,.07,-depth/2-1.65]} size={[3.3,.14,1]} color="#a6a197"/>
    {isHome&&<group position={[0,3.84,-depth/2-.2]}><BuildingLabel name="ZUHAUSE" color="#d0edb0"/></group>}
  </group>;
}
function Garage(){
  const item=WORKSHOPS.garage;
  return <group position={[item.x,0,item.z]}>
    <Cuboid at={[0,2.35,0]} size={[10.3,4.7,9.2]} color="#394e51" castShadow/>
    <Cuboid at={[0,4.8,-.13]} size={[11.6,.48,10.5]} color="#222f31" castShadow/>
    <Cuboid at={[-3.7,5.11,-.13]} size={[.65,.32,10.9]} color="#bcebc9"/>
    <Cuboid at={[0,2,-4.68]} size={[6.9,3.7,.2]} color="#799399" metalness={.52} roughness={.43}/>
    {Array.from({length:7},(_,i)=><Cuboid key={i} at={[0,.5+i*.48,-4.82]} size={[6.85,.048,.08]} color="#35484b"/>)}
    {[-1,1].map(side=><group key={side}>
      <Cuboid at={[side*4.35,2.45,-4.71]} size={[.8,1.9,.16]} color="#e0ecdb"/>
      <Cuboid at={[side*4, .75,-6.25]} size={[.23,1.5,.23]} color="#e0d0b4"/>
    </group>)}
    <group position={[0,4.14,-4.87]}><BuildingLabel name="MURAT GARAGE" width={5.1} color="#57e8cb"/></group>
    <Cuboid at={[0,.085,-7.5]} size={[8.8,.15,4.4]} color="#777d77"/>
    {[-1,1].map(side=><mesh key={'lamp'+side} position={[side*3.9,4.15,-4.88]}>
      <boxGeometry args={[.6,.13,.18]}/>
      <meshStandardMaterial color="#ccfff1" emissive="#63ffd9" emissiveIntensity={1.7}/>
    </mesh>)}
  </group>;
}
function ShopsAndFlats({item}){
  const floors=item.kind==='flats'?3:1,height=item.kind==='flats'?9.5:4.8;
  const front=-item.depth/2-.08;
  return <group position={[item.x,0,item.z]}>
    <Cuboid at={[0,height/2,0]} size={[item.width,height,item.depth]} color={item.paint} castShadow/>
    <Cuboid at={[0,height+.18,0]} size={[item.width+.7,.38,item.depth+.7]} color="#474c51" castShadow/>
    {Array.from({length:floors},(_,floor)=>[-1,0,1].map(col=>
      <group key={floor+'-'+col} position={[col*item.width*.28,2.4+floor*2.8,front]}>
        <Cuboid at={[0,0,0]} size={[1.58,1.45,.15]} color="#f0e7d7"/>
        <Cuboid at={[0,0,-.12]} size={[1.39,1.27,.1]} color="#83b0bd" metalness={.1} roughness={.3}/>
        <Cuboid at={[0,0,-.18]} size={[.07,1.27,.08]} color="#e9e8db"/>
      </group>
    ))}
    {item.kind==='shop'&&<>
      <Cuboid at={[0,1.06,front-.11]} size={[2.3,2.11,.14]} color="#273c3f"/>
      <Cuboid at={[0,1.85,front-.34]} size={[item.width*.92,.45,1.25]} color="#a25740"/>
      <group position={[0,3.94,front-.15]}><BuildingLabel name={item.label} width={4.8} color="#ffe394"/></group>
      <Cuboid at={[0,.075,front-1.25]} size={[item.width+.3,.15,2.4]} color="#a4a69c"/>
    </>}
    {item.kind==='flats'&&<Cuboid at={[0,.075,front-1.1]} size={[item.width+.4,.15,2.15]} color="#888b83"/>}
  </group>;
}
function SideStreet({junction}){
  return <group position={[junction.x,0,junction.z]}>
    <mesh position={[0,.037,0]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[junction.length,junction.width]}/>
      <meshStandardMaterial color={asphalt} roughness={1}/>
    </mesh>
    {Array.from({length:Math.floor(junction.length/13)},(_,i)=>{
      const x=-junction.length/2+7+i*13;
      // The central intersection keeps the roads visually open.
      return Math.abs(x)>9.4?<Cuboid key={i} at={[x,.065,0]} size={[3,.016,.14]} color="#e0d8b9"/>:null;
    })}
    {[-1,1].map(side=><group key={side}>
      {Array.from({length:6},(_,i)=><Cuboid key={i} at={[side*(6.7+i*.37),.08,0]} size={[.23,.012,7.4]} color="#f5f1e7"/>)}
      <Cuboid at={[side*9,.085,0]} size={[.2,.015,8.3]} color="#e8f5ec"/>
    </group>)}
  </group>;
}
function Signal({data}){
  const red=useRef(),yellow=useRef(),green=useRef();
  useFrame(({clock})=>{
    const phase=Math.floor(clock.elapsedTime/7)%3;
    const x=phase===(data.side===1?0:2);
    if(red.current)red.current.emissiveIntensity=x?.25:3;
    if(yellow.current)yellow.current.emissiveIntensity=phase===1?3:.15;
    if(green.current)green.current.emissiveIntensity=x?3:.2;
  });
  return <group position={[data.x,0,data.z]} rotation={[0,data.side===1?Math.PI/2:-Math.PI/2,0]}>
    <mesh position={[0,1.88,0]} castShadow>
      <cylinderGeometry args={[.09,.12,3.76,9]}/>
      <meshStandardMaterial color="#788887" metalness={.55}/>
    </mesh>
    <Cuboid at={[0,3.42,-.06]} size={[.68,1.45,.55]} color="#202c2c"/>
    {[['#fa403f',red,3.87],['#f4c442',yellow,3.43],['#58fb91',green,2.99]].map(([color,ref,y])=>
      <mesh key={y} position={[0,y,-.37]} rotation={[Math.PI/2,0,0]}>
        <sphereGeometry args={[.18,12,9,0,Math.PI*2,0,Math.PI/2]}/>
        <meshStandardMaterial ref={ref} color={color} emissive={color} emissiveIntensity={.2}/>
      </mesh>)}
    <Cuboid at={[0,.68,.15]} size={[.8,.08,.26]} color="#8a9491"/>
  </group>;
}
function StreetLamp({data,lighted=false}){
  const side=data.x<0?-1:1;
  return <group position={[data.x,0,data.z]} rotation={[0,side===1?0:Math.PI,0]}>
    <mesh position={[0,2.75,0]} castShadow>
      <cylinderGeometry args={[.082,.12,5.5,8]}/>
      <meshStandardMaterial color="#6e8081" metalness={.68} roughness={.39}/>
    </mesh>
    <mesh position={[.74,5.37,0]} rotation={[0,0,-Math.PI/2]}>
      <cylinderGeometry args={[.065,.065,1.52,8]}/>
      <meshStandardMaterial color="#6e8081" metalness={.7}/>
    </mesh>
    <Cuboid at={[1.4,5.24,0]} size={[.75,.18,.49]} color="#293638"/>
    <mesh position={[1.4,5.13,0]}>
      <boxGeometry args={[.72,.045,.47]}/>
      <meshStandardMaterial emissive="#ffe2a4" emissiveIntensity={1.5} color="#fff4d2"/>
    </mesh>
    {lighted&&<pointLight position={[1.4,5.1,0]} intensity={1.5} color="#ffe7b7" distance={16} decay={2}/>}
  </group>;
}
function Bench({bench}){
  return <group position={[bench.x,0,bench.z]} rotation={[0,bench.side===1?Math.PI:0,0]}>
    {[-1,1].map(side=><group key={side}>
      <Cuboid at={[side*1.27,.4,.15]} size={[.095,.8,.12]} color="#313d3f" metalness={.58}/>
      <Cuboid at={[side*1.27,.7,.43]} size={[.095,1.4,.13]} color="#313d3f" metalness={.58}/>
    </group>)}
    {Array.from({length:3},(_,i)=><Cuboid key={'seat'+i} at={[0,.81,.11+i*.19]} size={[3,.08,.17]} color="#a67b52"/>)}
    {Array.from({length:3},(_,i)=><Cuboid key={'back'+i} at={[0,1.08+i*.23,.5]} size={[3,.17,.085]} color="#a67b52"/>)}
    <Cuboid at={[0,.07,.17]} size={[3.65,.14,2.6]} color="#aab2a6"/>
  </group>;
}
function SeatedPerson({rider}){
  const clothes={...DEFAULT_RIDER,...rider};
  return <group position={[0,0,-.09]}>
    <mesh position={[0,1.28,-.05]} castShadow>
      <capsuleGeometry args={[.3,.42,4,8]}/>
      <meshStandardMaterial color={clothes.jacket}/>
    </mesh>
    <mesh position={[0,1.93,-.05]}>
      <sphereGeometry args={[.22,12,10]}/>
      <meshStandardMaterial color="#d8b58f"/>
    </mesh>
    {clothes.helmet&&<mesh position={[0,2.07,-.05]}>
      <sphereGeometry args={[.23,12,10]}/>
      <meshStandardMaterial color={clothes.helmetColor}/>
    </mesh>}
    {[-1,1].map(side=><group key={side}>
      <mesh position={[side*.18,.79,-.34]} rotation={[Math.PI/2,0,0]}>
        <capsuleGeometry args={[.11,.43,4,8]}/>
        <meshStandardMaterial color={clothes.pants}/>
      </mesh>
      <mesh position={[side*.18,.45,-.58]}>
        <capsuleGeometry args={[.11,.55,4,8]}/>
        <meshStandardMaterial color={clothes.pants}/>
      </mesh>
      <mesh position={[side*.36,1.29,-.38]} rotation={[Math.PI/3,0,0]}>
        <capsuleGeometry args={[.09,.43,4,8]}/>
        <meshStandardMaterial color={clothes.jacket}/>
      </mesh>
    </group>)}
    {clothes.watch&&<Cuboid at={[.38,1.03,-.48]} size={[.2,.12,.2]} color={clothes.watchColor}/>}
  </group>;
}
export function City({quality='low',seatedBench=null,rider}){
  return <group>
    {CROSSROADS.map(j=><SideStreet key={j.id} junction={j}/>)}
    {SIGNALS.map(s=><Signal key={s.id} data={s}/>)}
    {LAMPS.map((lamp,i)=><StreetLamp key={lamp.id} data={lamp} lighted={quality==='high'&&i%5===0}/>)}
    <Garage/>
    <House item={{...WORKSHOPS.home,width:9.3,depth:8.2,paint:'#eddbbb'}} isHome/>
    {BUILDINGS.map(item=>item.kind==='house'
      ? <House key={item.id} item={item}/>
      : <ShopsAndFlats key={item.id} item={item}/>)}
    {BENCHES.map(b=><Bench key={b.id} bench={b}/>)}
    {seatedBench&&<group position={[seatedBench.x,.03,seatedBench.z]}
        rotation={[0,seatedBench.side===1?Math.PI:0,0]}>
      <SeatedPerson rider={rider}/>
    </group>}
  </group>;
}
