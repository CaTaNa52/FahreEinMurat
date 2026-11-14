import { useEffect, useRef } from 'react';
import { roadX, CHALLENGES, WORKSHOPS } from './gameplay.js';
import { CROSSROADS, ALL_BUILDINGS, POLICE, POLICE_LOT } from './worldLayout.js';
import { POOL } from './pool.js';

const SIZE=264, RANGE=95;            // canvas pixels, metres from centre to rim
const POIS=[
  {x:POLICE.x,z:POLICE.z,color:'#4aa3ff',label:'P'},
  {x:WORKSHOPS.garage.x,z:WORKSHOPS.garage.z,color:'#63ffd9',label:'G'},
  {x:WORKSHOPS.home.x,z:WORKSHOPS.home.z,color:'#ffffff',label:'H'},
  ...Object.values(CHALLENGES).map(c=>({x:c.x,z:c.z,color:'#c8ff57',label:'★'})),
];
// Heading-up radar: the rider is the arrow in the middle, the world turns around it.
function draw(ctx,r,time){
  const c=SIZE/2, scale=c/RANGE;
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.save();
  ctx.beginPath();ctx.arc(c,c,c-4,0,Math.PI*2);ctx.clip();
  ctx.fillStyle='#16202cdd';ctx.fillRect(0,0,SIZE,SIZE);
  if(r.mode==='walk'){
    ctx.fillStyle='#4aa3ff';ctx.font='900 30px system-ui';ctx.textAlign='center';
    ctx.fillText('POLIZEI',c,c-4);ctx.font='700 20px system-ui';ctx.fillStyle='#cfe3ff';ctx.fillText('WACHE · INNEN',c,c+26);
    ctx.restore();return;
  }
  ctx.translate(c,c);ctx.rotate(r.yaw);ctx.scale(scale,scale);ctx.translate(-r.x,-r.z);
  ctx.fillStyle='#2f7fb8';ctx.fillRect(POOL.x-POOL.w/2,POOL.z-POOL.d/2,POOL.w,POOL.d);
  ctx.fillStyle='#39485a';ctx.fillRect(POLICE_LOT.x-POLICE_LOT.w/2,POLICE_LOT.z-POLICE_LOT.d/2,POLICE_LOT.w,POLICE_LOT.d);
  ctx.strokeStyle='#8f9db0';ctx.lineCap='round';ctx.lineJoin='round';
  ctx.lineWidth=9.5;
  for(const j of CROSSROADS){
    if(Math.abs(j.z-r.z)>RANGE*1.5)continue;
    ctx.beginPath();ctx.moveTo(j.x-j.length/2,j.z);ctx.lineTo(j.x+j.length/2,j.z);ctx.stroke();
  }
  ctx.lineWidth=11;ctx.beginPath();
  for(let z=r.z-RANGE*1.5;z<=r.z+RANGE*1.5;z+=6){const x=roadX(z);if(z===r.z-RANGE*1.5)ctx.moveTo(x,z);else ctx.lineTo(x,z);}
  ctx.stroke();
  ctx.fillStyle='#55657a';
  for(const b of ALL_BUILDINGS){
    if(Math.hypot(b.x-r.x,b.z-r.z)>RANGE*1.5)continue;
    ctx.fillRect(b.x-b.width/2,b.z-b.depth/2,b.width,b.depth);
  }
  ctx.fillStyle='#2b62b0';ctx.fillRect(POLICE.x-POLICE.w/2,POLICE.z-POLICE.d/2,POLICE.w,POLICE.d);
  // traffic
  ctx.fillStyle='#f4f6f8';
  for(const car of r.cars||[]){
    if(Math.hypot(car.x-r.x,car.z-r.z)>RANGE*1.3)continue;
    ctx.save();ctx.translate(car.x,car.z);ctx.rotate(-car.yaw);ctx.fillRect(-1.6,-3.2,3.2,6.4);ctx.restore();
  }
  ctx.restore();
  // Icons stay upright and stick to the rim when their target is out of range.
  const blip=(p,color,label,pulse=false)=>{
    const dx=p.x-r.x,dz=p.z-r.z,cos=Math.cos(r.yaw),sin=Math.sin(r.yaw);
    let x=(dx*cos-dz*sin)*scale,y=(dx*sin+dz*cos)*scale;
    const d=Math.hypot(x,y),max=c-17;
    if(d>max){if(!pulse&&!label.match(/[PGH]/))return;x*=max/d;y*=max/d;}
    const radius=pulse?11+Math.sin(time/160)*3:9;
    ctx.beginPath();ctx.arc(c+x,c+y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    ctx.lineWidth=2.5;ctx.strokeStyle='#0c1118';ctx.stroke();
    ctx.fillStyle='#0c1118';ctx.font='900 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(label,c+x,c+y+1);
  };
  for(const p of POIS)blip(p,p.color,p.label);
  if(r.buddy)blip(r.buddy,'#ff4fb0','M',true);
  if(r.dest)blip(r.dest,'#ffd84a','Z',true);
  // north marker and the rider arrow
  const nx=-Math.sin(r.yaw)*(c-14),ny=-Math.cos(r.yaw)*(c-14);
  ctx.fillStyle='#ffffff';ctx.font='900 17px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('N',c-nx,c+ny);
  ctx.beginPath();ctx.moveTo(c,c-13);ctx.lineTo(c+9,c+10);ctx.lineTo(c,c+5);ctx.lineTo(c-9,c+10);ctx.closePath();
  ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=2.5;ctx.strokeStyle='#0c1118';ctx.stroke();
}
export default function Minimap({radar,onOpen}){
  const canvas=useRef(null);
  useEffect(()=>{
    const ctx=canvas.current?.getContext('2d');
    if(!ctx)return undefined;
    let frame=0,last=0;
    const loop=time=>{
      frame=requestAnimationFrame(loop);
      if(time-last<90)return;      // ~11 fps is plenty for a radar
      last=time;draw(ctx,radar.current,time);
    };
    frame=requestAnimationFrame(loop);
    return ()=>cancelAnimationFrame(frame);
  },[radar]);
  return <button type="button" className="minimap" data-testid="minimap" aria-label="Karte öffnen" onClick={onOpen}>
    <canvas ref={canvas} width={SIZE} height={SIZE}/>
    <span className="minimap-hint" aria-hidden="true">⤢</span>
  </button>;
}
