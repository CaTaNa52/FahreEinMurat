import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { POOL, POOL_DECK, SLIDES, SLIDE_TOWER, SLIDE_ENTRY, SLIDE_PILLARS, POOL_OBSTACLES } from './pool.js';
import { DEFAULT_RIDER } from './customization.js';

const X0=POOL.x-POOL.w/2, X1=POOL.x+POOL.w/2, Z0=POOL.z-POOL.d/2, Z1=POOL.z+POOL.d/2;
// Deep end is west (X0), shallow end east (X1) towards the road.
const floorY=x=>POOL.floorDeep+(POOL.floorShallow-POOL.floorDeep)*(x-X0)/POOL.w;

function canvasTexture(size,draw,{repeat=[1,1],color=true}={}){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  draw(canvas.getContext('2d'),size);
  const t=new THREE.CanvasTexture(canvas);
  if(color)t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);
  t.anisotropy=4;
  return t;
}
const tiles=(base,grout,count)=> (c,s)=>{
  c.fillStyle=base;c.fillRect(0,0,s,s);
  const step=s/count;
  for(let i=0;i<count;i++)for(let j=0;j<count;j++){
    // subtle per-tile variation so the surface does not look flat
    c.fillStyle=`rgba(255,255,255,${((i*7+j*13)%5)*.018})`;c.fillRect(i*step,j*step,step,step);
  }
  c.strokeStyle=grout;c.lineWidth=Math.max(2,s/128);
  for(let i=0;i<=count;i++){c.beginPath();c.moveTo(i*step,0);c.lineTo(i*step,s);c.stroke();c.beginPath();c.moveTo(0,i*step);c.lineTo(s,i*step);c.stroke();}
};
// Tileable Voronoi-edge pattern, reads as light caustics on the pool floor.
function drawCaustics(c,s){
  const n=18,pts=[];let seed=91;
  const r=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  for(let i=0;i<n;i++)pts.push([r()*s,r()*s]);
  const img=c.createImageData(s,s);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){
    let d1=1e9,d2=1e9;
    for(const [px,py] of pts)for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){
      const d=Math.hypot(x-px-ox*s,y-py-oy*s);
      if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;
    }
    const v=Math.max(0,1-(d2-d1)/(s*.035));
    const k=(y*s+x)*4,b=Math.pow(v,1.6)*255;
    img.data[k]=b*.85;img.data[k+1]=b;img.data[k+2]=b;img.data[k+3]=255;
  }
  c.putImageData(img,0,0);
}
// Tileable height field converted to a tangent-space normal map for ripples.
function drawWaterNormal(c,s){
  const h=(x,y)=>{const u=x/s*Math.PI*2,v=y/s*Math.PI*2;
    return Math.sin(u*2+v)*.5+Math.sin(u*3-v*2)*.3+Math.sin(v*5+u)*.2+Math.sin(u*7+v*4)*.1;};
  const img=c.createImageData(s,s);
  for(let y=0;y<s;y++)for(let x=0;x<s;x++){
    const dx=(h(x+1,y)-h(x-1,y))*2.2,dy=(h(x,y+1)-h(x,y-1))*2.2,len=Math.hypot(dx,dy,1);
    const k=(y*s+x)*4;
    img.data[k]=(-dx/len*.5+.5)*255;img.data[k+1]=(-dy/len*.5+.5)*255;img.data[k+2]=(1/len*.5+.5)*255;img.data[k+3]=255;
  }
  c.putImageData(img,0,0);
}
function quad(corners,uvScale=1,uvAxes=[0,2]){
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(corners.flat(),3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(corners.flatMap(p=>[p[uvAxes[0]]*uvScale,p[uvAxes[1]]*uvScale]),2));
  g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();
  return g;
}
function useDispose(...items){useLayoutEffect(()=>()=>items.forEach(i=>i?.dispose?.()),items);}

// Ground (grass) and deck share one cut-out so the sunken basin is visible.
export function groundWithPoolHole(size){
  const shape=new THREE.Shape();
  shape.moveTo(-size/2,-size/2);shape.lineTo(size/2,-size/2);shape.lineTo(size/2,size/2);shape.lineTo(-size/2,size/2);shape.closePath();
  shape.holes.push(basinHole());
  return new THREE.ShapeGeometry(shape);
}
function basinHole(){
  // Shape space (x, -z) because the mesh is rotated -90° around X.
  const hole=new THREE.Path();
  hole.moveTo(X0,-Z0);hole.lineTo(X0,-Z1);hole.lineTo(X1,-Z1);hole.lineTo(X1,-Z0);hole.closePath();
  return hole;
}

function Basin({quality}){
  const wallTex=useMemo(()=>canvasTexture(256,tiles('#a9e2ef','#e8fbff',8),{repeat:[.5,.5]}),[]);
  const floorTex=useMemo(()=>canvasTexture(256,tiles('#8fd3e6','#d9f6ff',8),{repeat:[.5,.5]}),[]);
  const caustic=useMemo(()=>canvasTexture(quality==='low'?128:192,drawCaustics,{repeat:[.22,.22],color:false}),[quality]);
  const caustic2=useMemo(()=>{const t=caustic.clone();t.needsUpdate=true;t.repeat.set(.16,.16);return t;},[caustic]);
  const normal=useMemo(()=>canvasTexture(128,drawWaterNormal,{repeat:[2.6,1.8],color:false}),[]);
  const normal2=useMemo(()=>{const t=normal.clone();t.needsUpdate=true;t.repeat.set(1.3,.9);return t;},[normal]);
  const geos=useMemo(()=>({
    floor:quad([[X0,floorY(X0),Z0],[X1,floorY(X1),Z0],[X1,floorY(X1),Z1],[X0,floorY(X0),Z1]]),
    caustic:quad([[X0,floorY(X0)+.015,Z0],[X1,floorY(X1)+.015,Z0],[X1,floorY(X1)+.015,Z1],[X0,floorY(X0)+.015,Z1]]),
    north:quad([[X0,0,Z0],[X1,0,Z0],[X1,floorY(X1),Z0],[X0,floorY(X0),Z0]],1,[0,1]),
    south:quad([[X0,0,Z1],[X1,0,Z1],[X1,floorY(X1),Z1],[X0,floorY(X0),Z1]],1,[0,1]),
    west:quad([[X0,0,Z0],[X0,0,Z1],[X0,floorY(X0),Z1],[X0,floorY(X0),Z0]],1,[2,1]),
    east:quad([[X1,0,Z0],[X1,0,Z1],[X1,floorY(X1),Z1],[X1,floorY(X1),Z0]],1,[2,1]),
    ...Object.fromEntries([-3,0,3].map(dz=>{
      const a=X0+1.4,b=X1-1.4,y=x=>floorY(x)+.01;
      return ['lane'+dz,quad([[a,y(a),POOL.z+dz-.13],[b,y(b),POOL.z+dz-.13],[b,y(b),POOL.z+dz+.13],[a,y(a),POOL.z+dz+.13]])];
    })),
  }),[]);
  useDispose(wallTex,floorTex,caustic,caustic2,normal,normal2,...Object.values(geos));
  const water=useRef(),caus=useRef(),caus2=useRef();
  useFrame((_,dt)=>{
    normal.offset.x+=dt*.018;normal.offset.y+=dt*.011;
    normal2.offset.x-=dt*.012;normal2.offset.y+=dt*.016;
    caustic.offset.x+=dt*.03;caustic.offset.y+=dt*.017;
    caustic2.offset.x-=dt*.021;caustic2.offset.y-=dt*.026;
  });
  return <group>
    <mesh geometry={geos.floor} receiveShadow><meshStandardMaterial map={floorTex} roughness={.55} side={THREE.DoubleSide}/></mesh>
    {['north','south','west','east'].map(k=><mesh key={k} geometry={geos[k]}><meshStandardMaterial map={wallTex} roughness={.45} side={THREE.DoubleSide}/></mesh>)}
    {/* dark-blue racing lane lines with end Ts follow the sloped floor */}
    {[-3,0,3].map(dz=><mesh key={dz} geometry={geos['lane'+dz]}>
      <meshStandardMaterial color="#1f4e8c" roughness={.5} side={THREE.DoubleSide}/>
    </mesh>)}
    <mesh ref={caus} geometry={geos.caustic}>
      <meshBasicMaterial map={caustic} transparent opacity={.42} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    <mesh ref={caus2} geometry={geos.caustic} position={[0,.005,0]}>
      <meshBasicMaterial map={caustic2} transparent opacity={.26} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    {/* underwater lights along the long walls */}
    {[-1,1].map(side=>[0,1,2].map(i=><mesh key={side+'-'+i} position={[X0+4+i*5,-.75,side<0?Z0+.02:Z1-.02]} rotation={[0,side<0?0:Math.PI,0]}>
      <circleGeometry args={[.17,16]}/><meshBasicMaterial color="#e9fbff" toneMapped={false}/>
    </mesh>))}
    {/* water: tinted, transparent, two scrolling ripple normal maps */}
    <mesh ref={water} position={[POOL.x,POOL.waterY,POOL.z]} rotation={[-Math.PI/2,0,0]} renderOrder={3}>
      <planeGeometry args={[POOL.w,POOL.d]}/>
      <meshStandardMaterial color="#1f9fc8" transparent opacity={.6} roughness={.04} metalness={.25}
        normalMap={normal} normalScale={[.55,.55]} depthWrite={false}/>
    </mesh>
    <mesh position={[POOL.x,POOL.waterY+.004,POOL.z]} rotation={[-Math.PI/2,0,0]} renderOrder={4}>
      <planeGeometry args={[POOL.w,POOL.d]}/>
      <meshStandardMaterial color="#9fe8ff" transparent opacity={.14} roughness={.02} metalness={.5}
        normalMap={normal2} normalScale={[.4,.4]} depthWrite={false}/>
    </mesh>
    {/* coping stones around the edge, with a wet darker inner rim */}
    {[[POOL.x,Z0-.3,POOL.w+1.2,.6],[POOL.x,Z1+.3,POOL.w+1.2,.6],[X0-.3,POOL.z,.6,POOL.d],[X1+.3,POOL.z,.6,POOL.d]].map(([x,z,w,d],i)=>
      <mesh key={i} position={[x,.07,z]} receiveShadow castShadow><boxGeometry args={[w,.12,d]}/><meshStandardMaterial color="#f1ede4" roughness={.75}/></mesh>)}
    {/* depth markings on the coping */}
    <DepthMark at={[X1-1.3,.135,Z0-.3]} text="1,25 m"/>
    <DepthMark at={[X0+1.3,.135,Z0-.3]} text="2,60 m"/>
  </group>;
}
function DepthMark({at,text}){
  const map=useMemo(()=>canvasTexture(128,(c,s)=>{
    c.fillStyle='#f1ede4';c.fillRect(0,0,s,s);c.fillStyle='#1f4e8c';c.font='900 34px system-ui';c.textAlign='center';c.fillText(text,s/2,s/2+12);
  }),[text]);
  useDispose(map);
  return <mesh position={at} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[.9,.5]}/><meshBasicMaterial map={map}/></mesh>;
}
function Deck(){
  const tex=useMemo(()=>canvasTexture(256,tiles('#d9ccb1','#b9ac92',2)),[]);
  const geo=useMemo(()=>{
    const {x,z,w,d}=POOL_DECK,s=new THREE.Shape();
    s.moveTo(x-w/2,-(z-d/2));s.lineTo(x+w/2,-(z-d/2));s.lineTo(x+w/2,-(z+d/2));s.lineTo(x-w/2,-(z+d/2));s.closePath();
    s.holes.push(basinHole());
    return new THREE.ShapeGeometry(s);
  },[]);
  useDispose(tex,geo);
  return <mesh geometry={geo} rotation={[-Math.PI/2,0,0]} position={[0,.034,0]} receiveShadow>
    <meshStandardMaterial map={tex} roughness={.88}/>
  </mesh>;
}
function Metal({children,...props}){return <mesh {...props}>{children}<meshStandardMaterial color="#dfe5e8" metalness={.9} roughness={.22}/></mesh>;}
function Ladder({x,z,dir}){
  // Two curved stainless rails hooking over the coping into the water.
  const rail=useMemo(()=>{
    const c=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.0,-.55*dir),new THREE.Vector3(0,.95,-.45*dir),new THREE.Vector3(0,1.05,0),new THREE.Vector3(0,.4,.15*dir),new THREE.Vector3(0,-1.1,.15*dir)]);
    return new THREE.TubeGeometry(c,24,.035,8,false);
  },[dir]);
  useDispose(rail);
  return <group position={[x,0,z]}>
    {[-.3,.3].map(o=><Metal key={o} geometry={rail} position={[o,0,0]}/>)}
    {[-.2,-.55,-.9].map(y=><Metal key={y} position={[0,y,.17*dir]} rotation={[0,0,Math.PI/2]}><boxGeometry args={[.06,.62,.14]}/></Metal>)}
  </group>;
}
function DivingBoard(){
  return <group position={[X0-.6,0,POOL.z-2.8]}>
    <mesh position={[0,.4,0]} castShadow><boxGeometry args={[1,.8,.8]}/><meshStandardMaterial color="#c7c3ba"/></mesh>
    <mesh position={[1.5,.86,0]} rotation={[0,0,.025]} castShadow><boxGeometry args={[3.2,.08,.55]}/><meshStandardMaterial color="#2f8fe3" roughness={.4}/></mesh>
  </group>;
}
function SlideTower(){
  const T=SLIDE_TOWER, legs=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const steps=14, mid=T.top/2;
  return <group position={[T.x,0,T.z]}>
    {legs.map(([a,b],i)=><mesh key={i} position={[a*(T.w/2-.15),(T.top+1.3)/2,b*(T.d/2-.15)]} castShadow>
      <cylinderGeometry args={[.13,.15,T.top+1.3,10]}/><meshStandardMaterial color="#f2f4f2" metalness={.3} roughness={.4}/>
    </mesh>)}
    {[mid,T.top].map(y=><mesh key={y} position={[0,y-.1,0]} castShadow receiveShadow>
      <boxGeometry args={[T.w,.2,T.d]}/><meshStandardMaterial color="#e1d6c2" roughness={.8}/>
    </mesh>)}
    {/* railings */}
    {[[0,-T.d/2,T.w,.06],[0,T.d/2,T.w,.06],[-T.w/2,0,.06,T.d]].map(([x,z,w,d],i)=><group key={i}>
      <mesh position={[x,T.top+.95,z]}><boxGeometry args={[w,.07,d]}/><meshStandardMaterial color="#f8c630"/></mesh>
      <mesh position={[x,T.top+.5,z]}><boxGeometry args={[w,.05,d]}/><meshStandardMaterial color="#f8c630"/></mesh>
    </group>)}
    {/* tent roof */}
    <mesh position={[0,T.top+1.95,0]} rotation={[0,Math.PI/4,0]} castShadow>
      <coneGeometry args={[T.w*.82,1.35,4]}/><meshStandardMaterial color="#e3412f" roughness={.7}/>
    </mesh>
    {/* outside flight to the mid landing, inside flight to the top */}
    {Array.from({length:steps},(_,i)=>{
      const f=(i+.5)/steps;
      return <mesh key={'a'+i} position={[0,f*mid,-T.d/2-3.3+f*3.3]} castShadow>
        <boxGeometry args={[1.2,.08,.3]}/><meshStandardMaterial color="#d3c8b4"/>
      </mesh>;
    })}
    {[-1,1].map(s=><mesh key={'st'+s} position={[s*.62,mid/2,-T.d/2-1.65]} rotation={[Math.atan2(mid,3.3),0,0]}>
      <boxGeometry args={[.07,.14,Math.hypot(mid,3.3)]}/><meshStandardMaterial color="#f8c630"/>
    </mesh>)}
    {Array.from({length:steps},(_,i)=>{
      const f=(i+.5)/steps;
      return <mesh key={'b'+i} position={[-T.w/2+.75,mid+f*mid,T.d/2-.5-f*(T.d-1)]}>
        <boxGeometry args={[1,.08,.28]}/><meshStandardMaterial color="#d3c8b4"/>
      </mesh>;
    })}
  </group>;
}
// Half-pipe cross-section swept along a path; frames use world-up so it never twists.
function halfPipe(points,radius,segments=12){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const n=Math.max(60,points.length*5),pos=[],uv=[],idx=[];
  const up=new THREE.Vector3(0,1,0),side=new THREE.Vector3(),down=new THREE.Vector3(),t=new THREE.Vector3(),p=new THREE.Vector3();
  for(let i=0;i<=n;i++){
    curve.getPointAt(i/n,p);curve.getTangentAt(i/n,t);
    side.crossVectors(t,up).normalize();down.crossVectors(side,t).normalize().negate();
    for(let j=0;j<=segments;j++){
      const a=j/segments*Math.PI;
      pos.push(p.x+side.x*Math.cos(a)*radius+down.x*Math.sin(a)*radius,
        p.y+side.y*Math.cos(a)*radius+down.y*Math.sin(a)*radius+radius*.55,
        p.z+side.z*Math.cos(a)*radius+down.z*Math.sin(a)*radius);
      uv.push(j/segments,i/n*curve.getLength()/2);
      if(i<n&&j<segments){const k=i*(segments+1)+j;idx.push(k,k+segments+1,k+1,k+1,k+segments+1,k+segments+2);}
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(idx);g.computeVertexNormals();
  return g;
}
function Slides(){
  const [spiral,wave]=SLIDES;
  const geos=useMemo(()=>{
    // Both slides end at the outlet; the last path stretch is the rider flying into the water.
    const tubePts=spiral.points.slice(0,-1), wavePts=wave.points.filter(p=>p[2]<POOL.z-POOL.d/2+1);
    const curve=new THREE.CatmullRomCurve3(tubePts.map(p=>new THREE.Vector3(p[0],p[1]+.5,p[2])));
    return {spiral:new THREE.TubeGeometry(curve,220,.58,16,false),wave:halfPipe(wavePts,.66),
      waveFilm:halfPipe(wavePts,.6,10)};
  },[spiral,wave]);
  // Running water film inside the open slide.
  const film=useMemo(()=>canvasTexture(128,(c,s)=>{
    c.fillStyle='#000';c.fillRect(0,0,s,s);
    for(let i=0;i<26;i++){c.strokeStyle=`rgba(200,245,255,${.25+(i%3)*.15})`;c.lineWidth=2+(i%4);c.beginPath();
      const x=(i*37)%s;c.moveTo(x,0);c.bezierCurveTo(x+9,s*.3,x-9,s*.7,x,s);c.stroke();}
  },{color:false,repeat:[1,1]}),[]);
  useDispose(geos.spiral,geos.wave,geos.waveFilm,film);
  useFrame((_,dt)=>{film.offset.y-=dt*1.8;});
  const col=[SLIDE_TOWER.x+.2,SLIDE_TOWER.z+7.2];
  return <group>
    <mesh geometry={geos.spiral} castShadow>
      <meshStandardMaterial color={spiral.color} roughness={.22} metalness={.1} transparent opacity={.72} side={THREE.DoubleSide} depthWrite={false}/>
    </mesh>
    <mesh position={[col[0],(SLIDE_TOWER.top)/2,col[1]]} castShadow>
      <cylinderGeometry args={[.32,.4,SLIDE_TOWER.top,12]}/><meshStandardMaterial color="#e9ecea" metalness={.3} roughness={.45}/>
    </mesh>
    {spiral.points.filter((_,i)=>i>2&&i%4===0&&i<spiral.points.length-3).map((pt,i)=>{
      const dx=pt[0]-col[0],dz=pt[2]-col[1],len=Math.hypot(dx,dz);
      return <mesh key={i} position={[col[0]+dx/2,pt[1]+.1,col[1]+dz/2]} rotation={[0,-Math.atan2(dz,dx),Math.PI/2]}>
        <cylinderGeometry args={[.06,.06,len,6]}/><meshStandardMaterial color="#cfd5d8" metalness={.7} roughness={.3}/>
      </mesh>;
    })}
    <mesh geometry={geos.wave} castShadow>
      <meshStandardMaterial color={wave.color} roughness={.18} metalness={.12} side={THREE.DoubleSide}/>
    </mesh>
    <mesh geometry={geos.waveFilm}>
      <meshBasicMaterial map={film} transparent opacity={.55} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide}/>
    </mesh>
    {SLIDE_PILLARS.map(p=><mesh key={p.id} position={[p.x,p.h/2,p.z]} castShadow>
      <cylinderGeometry args={[.13,.16,p.h,10]}/><meshStandardMaterial color="#e9ecea" metalness={.3} roughness={.45}/>
    </mesh>)}
  </group>;
}
function Lounger({x,z}){
  return <group position={[x,0,z]}>
    {[-.35,.35].map(o=>[-.85,.85].map(l=><mesh key={o+'-'+l} position={[o,.17,l]}><boxGeometry args={[.05,.34,.05]}/><meshStandardMaterial color="#c9ced1" metalness={.8}/></mesh>))}
    <mesh position={[0,.36,.2]} castShadow><boxGeometry args={[.8,.08,1.5]}/><meshStandardMaterial color="#f4f1ea"/></mesh>
    <mesh position={[0,.62,-.78]} rotation={[-.75,0,0]} castShadow><boxGeometry args={[.8,.08,.75]}/><meshStandardMaterial color="#f4f1ea"/></mesh>
    <mesh position={[0,.42,.1]}><boxGeometry args={[.7,.04,1.3]}/><meshStandardMaterial color="#2f8fe3"/></mesh>
  </group>;
}
function Umbrella({x,z,color}){
  return <group position={[x,0,z]}>
    <mesh position={[0,1.2,0]}><cylinderGeometry args={[.04,.04,2.4,8]}/><meshStandardMaterial color="#e8e2d4"/></mesh>
    <mesh position={[0,2.35,0]} castShadow><coneGeometry args={[1.35,.55,8,1,true]}/><meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={.8}/></mesh>
    <mesh position={[0,.06,0]}><cylinderGeometry args={[.3,.34,.12,12]}/><meshStandardMaterial color="#6d6a63"/></mesh>
  </group>;
}
function LifeguardChair({x,z}){
  return <group position={[x,0,z]}>
    {[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b],i)=><mesh key={i} position={[a*.55,.9,b*.55]} rotation={[b*.12,0,-a*.12]}><boxGeometry args={[.09,1.85,.09]}/><meshStandardMaterial color="#f4f1ea"/></mesh>)}
    <mesh position={[0,1.8,0]} castShadow><boxGeometry args={[1,.1,.85]}/><meshStandardMaterial color="#e3412f"/></mesh>
    <mesh position={[0,2.25,.42]} castShadow><boxGeometry args={[1,.85,.08]}/><meshStandardMaterial color="#e3412f"/></mesh>
    <mesh position={[.65,1.55,-.2]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.22,.07,8,16]}/><meshStandardMaterial color="#ff5a3c"/></mesh>
    <mesh position={[0,3.35,0]}><coneGeometry args={[.85,.4,8,1,true]}/><meshStandardMaterial color="#f8c630" side={THREE.DoubleSide}/></mesh>
    <mesh position={[0,2.6,0]}><cylinderGeometry args={[.03,.03,1.5,6]}/><meshStandardMaterial color="#ccc"/></mesh>
  </group>;
}
function Shower({x,z}){
  return <group position={[x,0,z]}>
    <Metal position={[0,1.2,0]}><cylinderGeometry args={[.05,.05,2.4,8]}/></Metal>
    <Metal position={[.25,2.35,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.03,.03,.5,6]}/></Metal>
    <Metal position={[.5,2.28,0]}><cylinderGeometry args={[.14,.08,.08,12]}/></Metal>
    <mesh position={[.15,.04,0]} rotation={[-Math.PI/2,0,0]}><circleGeometry args={[.55,18]}/><meshStandardMaterial color="#b9c2c4"/></mesh>
  </group>;
}
function PoolSign(){
  const map=useMemo(()=>canvasTexture(512,(c,s)=>{
    c.fillStyle='#0f3c5c';c.fillRect(0,0,s,s);
    c.fillStyle='#2fb7e3';for(let i=0;i<4;i++){c.beginPath();for(let x=0;x<=s;x+=8)c.lineTo(x,s*.78+Math.sin(x/s*Math.PI*4+i)*10+i*14);c.lineTo(s,s);c.lineTo(0,s);c.fill();}
    c.fillStyle='#fff';c.textAlign='center';c.font='900 92px system-ui';c.fillText('ALIASAF',s/2,s*.36,s-40);
    c.font='900 74px system-ui';c.fillStyle='#ffd24f';c.fillText('FREIBAD',s/2,s*.56);
  }),[]);
  useDispose(map);
  const x=POOL_DECK.x+POOL_DECK.w/2-.6, z=POOL_DECK.z-POOL_DECK.d/2+2.6;
  return <group position={[x,0,z]} rotation={[0,-Math.PI/2,0]}>
    {[-1,1].map(s=><mesh key={s} position={[s*1.05,1.4,0]}><cylinderGeometry args={[.06,.06,2.8,8]}/><meshStandardMaterial color="#dfe5e8" metalness={.8}/></mesh>)}
    <mesh position={[0,2.35,0]}><planeGeometry args={[2.1,2.1]}/><meshBasicMaterial map={map} side={THREE.DoubleSide} toneMapped={false}/></mesh>
  </group>;
}
function EntryMarker(){
  const ring=useRef();
  useFrame(({clock})=>{if(ring.current)ring.current.material.opacity=.45+Math.sin(clock.elapsedTime*3)*.25;});
  return <mesh ref={ring} position={[SLIDE_ENTRY.x,.05,SLIDE_ENTRY.z]} rotation={[-Math.PI/2,0,0]}>
    <ringGeometry args={[1.05,1.3,40]}/><meshBasicMaterial color="#4de5ff" transparent opacity={.6} depthWrite={false}/>
  </mesh>;
}
export function PoolComplex({quality='high'}){
  const loungers=POOL_OBSTACLES.filter(o=>o.id.startsWith('lounger'));
  const guard=POOL_OBSTACLES.find(o=>o.id==='lifeguard');
  const shower=POOL_OBSTACLES.find(o=>o.id==='pool-shower');
  return <group>
    <Deck/>
    <Basin quality={quality}/>
    <Ladder x={X1-1.6} z={Z0} dir={1}/>
    <Ladder x={X1-1.6} z={Z1} dir={-1}/>
    <DivingBoard/>
    <SlideTower/>
    <Slides/>
    <EntryMarker/>
    {loungers.map(l=><Lounger key={l.id} x={l.x} z={l.z}/>)}
    {loungers.slice(0,-1).map((l,i)=><Umbrella key={'u'+i} x={l.x+2} z={l.z+.4} color={i%2?'#2f8fe3':'#f8c630'}/>)}
    <LifeguardChair x={guard.x} z={guard.z}/>
    <Shower x={shower.x} z={shower.z}/>
    <PoolSign/>
  </group>;
}

// ---- Swimmer, procedurally animated (crawl, treading water, sliding) ----
export function Swimmer({rider,motion}){
  const safe={...DEFAULT_RIDER,...(rider&&typeof rider==='object'?rider:{})};
  const body=useRef(),armL=useRef(),armR=useRef(),legL=useRef(),legR=useRef();
  useFrame(()=>{
    const m=motion.current; if(!m||!body.current)return;
    const s=m.stroke||0, h=m.horizontal||0;
    if(m.pose==='slide'){
      body.current.rotation.x=1.18;
      armL.current.rotation.set(-.4,0,.35);armR.current.rotation.set(-.4,0,-.35);
      legL.current.rotation.set(-.25,0,.05);legR.current.rotation.set(-.25,0,-.05);
      return;
    }
    body.current.rotation.x=THREE.MathUtils.lerp(0,-Math.PI/2+.14,h);
    const crawl=s*Math.PI*2;
    // crawl: alternating windmill arms + flutter kick; tread: sculling arms + cycling legs
    armL.current.rotation.set(THREE.MathUtils.lerp(Math.sin(s*5)*.25,crawl,h),0,THREE.MathUtils.lerp(1.15+Math.sin(s*5)*.25,.08,h));
    armR.current.rotation.set(THREE.MathUtils.lerp(-Math.sin(s*5)*.25,crawl+Math.PI,h),0,THREE.MathUtils.lerp(-1.15-Math.sin(s*5)*.25,-.08,h));
    legL.current.rotation.x=Math.sin(s*9)*(.12+.18*h);
    legR.current.rotation.x=-Math.sin(s*9)*(.12+.18*h);
  });
  const skin='#dbb995';
  return <group ref={body}>
    <mesh position={[0,.43,0]} castShadow><capsuleGeometry args={[.23,.42,4,10]}/><meshStandardMaterial color={skin} roughness={.6}/></mesh>
    <mesh position={[0,.08,0]}><capsuleGeometry args={[.215,.08,4,10]}/><meshStandardMaterial color={safe.pants} roughness={.5}/></mesh>
    <mesh position={[0,.98,0]} castShadow><sphereGeometry args={[.2,14,12]}/><meshStandardMaterial color={skin} roughness={.6}/></mesh>
    <mesh position={[0,1.04,0]}><sphereGeometry args={[.207,14,12,0,Math.PI*2,0,Math.PI*.52]}/><meshStandardMaterial color={safe.helmet?safe.helmetColor:'#2a2320'} roughness={safe.helmet?.25:.9}/></mesh>
    <mesh position={[0,1,-.17]}><boxGeometry args={[.3,.07,.06]}/><meshStandardMaterial color="#1b2a33" metalness={.4} roughness={.1}/></mesh>
    {[[-1,armL],[1,armR]].map(([side,ref])=><group key={side} ref={ref} position={[side*.31,.72,0]}>
      <mesh position={[0,-.3,0]} castShadow><capsuleGeometry args={[.075,.46,4,8]}/><meshStandardMaterial color={skin} roughness={.6}/></mesh>
      {side===1&&safe.watch&&<mesh position={[0,-.5,0]}><cylinderGeometry args={[.09,.09,.07,10]}/><meshStandardMaterial color={safe.watchColor} metalness={.6} roughness={.25}/></mesh>}
    </group>)}
    {[[-1,legL],[1,legR]].map(([side,ref])=><group key={side} ref={ref} position={[side*.12,0,0]}>
      <mesh position={[0,-.42,0]} castShadow><capsuleGeometry args={[.09,.62,4,8]}/><meshStandardMaterial color={skin} roughness={.6}/></mesh>
    </group>)}
  </group>;
}

// ---- Splash VFX: droplet burst + expanding ripple rings, event-driven ----
const DROPS=46;
export function Splash({event}){
  const drops=useRef(),ring=useRef(),ring2=useRef(),age=useRef(0);
  const seeds=useMemo(()=>Array.from({length:DROPS},(_,i)=>{
    const a=i/DROPS*Math.PI*2+Math.sin(i*12.9)*.4, r=.6+((i*37)%11)/11;
    return {vx:Math.cos(a)*r*1.5,vz:Math.sin(a)*r*1.5,vy:2.2+((i*53)%13)/13*2.6,s:.022+((i*17)%7)*.006};
  }),[]);
  const o=useMemo(()=>new THREE.Object3D(),[]);
  useLayoutEffect(()=>{age.current=0;},[event?.id]);
  useFrame((_,dt)=>{
    if(!event||!drops.current)return;
    age.current+=Math.min(dt,.05);
    const t=age.current,p=event.power??1;
    seeds.forEach((d,i)=>{
      const y=POOL.waterY+d.vy*p*t-4.9*t*t;
      o.position.set(event.x+d.vx*p*t,Math.max(POOL.waterY-.3,y),event.z+d.vz*p*t);
      o.scale.setScalar(y<POOL.waterY?0:d.s*(1+p*.35));
      o.updateMatrix();drops.current.setMatrixAt(i,o.matrix);
    });
    drops.current.instanceMatrix.needsUpdate=true;
    for(const [ref,delay,speed] of [[ring,0,1.9],[ring2,.25,1.4]]){
      if(!ref.current)continue;
      const k=Math.max(0,t-delay);
      ref.current.scale.setScalar(.3+k*speed*(.7+p*.5));
      ref.current.material.opacity=Math.max(0,.75-k*.55);
    }
  });
  if(!event)return null;
  return <group>
    <instancedMesh ref={drops} args={[undefined,undefined,DROPS]} frustumCulled={false}>
      <sphereGeometry args={[1,6,5]}/><meshStandardMaterial color="#f3fdff" transparent opacity={.7} roughness={.05} metalness={.2}/>
    </instancedMesh>
    {[ring,ring2].map((r,i)=><mesh key={i} ref={r} position={[event.x,POOL.waterY+.02,event.z]} rotation={[-Math.PI/2,0,0]} renderOrder={5}>
      <ringGeometry args={[.8,1,40]}/><meshBasicMaterial color="#f2fdff" transparent opacity={.7} depthWrite={false}/>
    </mesh>)}
  </group>;
}
