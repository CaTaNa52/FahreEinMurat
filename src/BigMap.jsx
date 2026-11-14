import { useEffect, useRef } from 'react';
import { roadX, CHALLENGES, WORKSHOPS } from './gameplay.js';
import { CROSSROADS, ALL_BUILDINGS, POLICE, POLICE_LOT, WORLD } from './worldLayout.js';
import { POOL, POOL_DECK } from './pool.js';
import { BUDDY_SPOTS, BUDDY_NAME } from './buddy.js';
import { MAP_ZOOM, zoomAt, clampView, fitWorld } from './mapView.js';

const HALF=WORLD/2;
const PLACES=[
  {x:POLICE.x,z:POLICE.z,color:'#4aa3ff',icon:'P',name:'POLIZEIWACHE'},
  {x:WORKSHOPS.garage.x,z:WORKSHOPS.garage.z,color:'#63ffd9',icon:'G',name:'GARAGE'},
  {x:WORKSHOPS.home.x,z:WORKSHOPS.home.z,color:'#ffffff',icon:'H',name:'ZUHAUSE'},
  {x:POOL.x,z:POOL.z,color:'#4de5ff',icon:'≈',name:'FREIBAD'},
  ...Object.values(CHALLENGES).map(c=>({x:c.x,z:c.z,color:'#c8ff57',icon:'★',name:c.name})),
];
const DISTRICTS=[['NORDVIERTEL',-430],['INNENSTADT',-180],['WOHNVIERTEL',70],['SÜDSTRAND',380]];
function draw(ctx,width,height,view,r,time){
  const dpr=ctx.canvas.width/width;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle='#101a26';ctx.fillRect(0,0,width,height);
  ctx.save();
  ctx.translate(width/2,height/2);ctx.scale(view.scale,view.scale);ctx.translate(-view.x,-view.z);
  // land, forest tint, pool area
  ctx.fillStyle='#22382c';ctx.fillRect(-HALF,-HALF,WORLD,WORLD);
  ctx.strokeStyle='#ff4fb0';ctx.lineWidth=2/view.scale;ctx.strokeRect(-HALF,-HALF,WORLD,WORLD);
  ctx.fillStyle='#cdbf9f';ctx.fillRect(POOL_DECK.x-POOL_DECK.w/2,POOL_DECK.z-POOL_DECK.d/2,POOL_DECK.w,POOL_DECK.d);
  ctx.fillStyle='#2f9fe0';ctx.fillRect(POOL.x-POOL.w/2,POOL.z-POOL.d/2,POOL.w,POOL.d);
  ctx.fillStyle='#39485a';ctx.fillRect(POLICE_LOT.x-POLICE_LOT.w/2,POLICE_LOT.z-POLICE_LOT.d/2,POLICE_LOT.w,POLICE_LOT.d);
  // roads
  ctx.strokeStyle='#9aa7b8';ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=9.5;
  for(const j of CROSSROADS){ctx.beginPath();ctx.moveTo(j.x-j.length/2,j.z);ctx.lineTo(j.x+j.length/2,j.z);ctx.stroke();}
  ctx.lineWidth=11;ctx.beginPath();
  for(let z=-HALF;z<=HALF;z+=6){if(z===-HALF)ctx.moveTo(roadX(z),z);else ctx.lineTo(roadX(z),z);}
  ctx.stroke();
  ctx.strokeStyle='#f2c230';ctx.lineWidth=Math.max(.5,1/view.scale);ctx.setLineDash([4,5]);ctx.beginPath();
  for(let z=-HALF;z<=HALF;z+=6){if(z===-HALF)ctx.moveTo(roadX(z),z);else ctx.lineTo(roadX(z),z);}
  ctx.stroke();ctx.setLineDash([]);
  // buildings
  ctx.fillStyle='#6b7c92';
  for(const b of ALL_BUILDINGS)ctx.fillRect(b.x-b.width/2,b.z-b.depth/2,b.width,b.depth);
  ctx.fillStyle='#2b62b0';ctx.fillRect(POLICE.x-POLICE.w/2,POLICE.z-POLICE.d/2,POLICE.w,POLICE.d);
  // traffic
  ctx.fillStyle='#f4f6f8';
  for(const car of r.cars||[]){ctx.save();ctx.translate(car.x,car.z);ctx.rotate(-car.yaw);ctx.fillRect(-1.5,-3,3,6);ctx.restore();}
  ctx.restore();
  // Everything below is drawn in screen pixels so icons and text keep their size.
  const sx=x=>(x-view.x)*view.scale+width/2, sy=z=>(z-view.z)*view.scale+height/2;
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='900 italic 22px system-ui';ctx.fillStyle='#ffffff2e';
  for(const [name,z] of DISTRICTS)ctx.fillText(name,sx(roadX(z)-70),sy(z));
  const pin=(p,color,icon,name,pulse=false)=>{
    const x=sx(p.x),y=sy(p.z),radius=pulse?13+Math.sin(time/170)*3:11;
    ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
    ctx.lineWidth=2.5;ctx.strokeStyle='#0c1118';ctx.stroke();
    ctx.fillStyle='#0c1118';ctx.font='900 13px system-ui';ctx.fillText(icon,x,y+1);
    if(name){
      ctx.font='800 11px system-ui';
      const w=ctx.measureText(name).width+10;
      ctx.fillStyle='#0c1118cc';ctx.fillRect(x-w/2,y+radius+3,w,16);
      ctx.fillStyle='#fff';ctx.fillText(name,x,y+radius+11.5);
    }
  };
  if(view.scale>1.1)for(const s of BUDDY_SPOTS){
    ctx.beginPath();ctx.arc(sx(s.x),sy(s.z),3.5,0,Math.PI*2);ctx.fillStyle='#ff9fd4';ctx.fill();
    if(view.scale>2.4){ctx.font='700 10px system-ui';ctx.fillStyle='#ffd3ee';ctx.fillText(s.name,sx(s.x),sy(s.z)-10);}
  }
  for(const p of PLACES)pin(p,p.color,p.icon,view.scale>.7?p.name:null);
  if(r.buddy)pin(r.buddy,'#ff4fb0','M',BUDDY_NAME.toUpperCase()+' WARTET',true);
  if(r.dest)pin(r.dest,'#ffd84a','Z','ZIEL',true);
  // the rider
  ctx.save();ctx.translate(sx(r.x),sy(r.z));ctx.rotate(-r.yaw);
  ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(10,11);ctx.lineTo(0,6);ctx.lineTo(-10,11);ctx.closePath();
  ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#ff4fb0';ctx.stroke();ctx.restore();
  // north arrow and scale bar
  ctx.fillStyle='#fff';ctx.font='900 15px system-ui';ctx.fillText('N ↑',34,height-28);
  const metres=[10,25,50,100,250].find(m=>m*view.scale>=60)??250;
  ctx.fillRect(70,height-30,metres*view.scale,4);ctx.font='700 11px system-ui';
  ctx.fillText(metres+' m',70+metres*view.scale/2,height-40);
}

// Full-screen map: drag to pan, wheel / pinch / buttons to zoom. The game is paused while it is open.
export default function BigMap({radar,onClose}){
  const canvas=useRef(null);
  const view=useRef(clampView({scale:MAP_ZOOM.start,x:radar.current.x,z:radar.current.z}));
  const pointers=useRef(new Map()),pinch=useRef(0);
  useEffect(()=>{
    const el=canvas.current,ctx=el.getContext('2d');
    let frame=0;
    const loop=time=>{
      frame=requestAnimationFrame(loop);
      const width=el.clientWidth,height=el.clientHeight,dpr=Math.min(2,window.devicePixelRatio||1);
      if(el.width!==Math.round(width*dpr)||el.height!==Math.round(height*dpr)){el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);}
      if(width&&height)draw(ctx,width,height,view.current,radar.current,time);
    };
    frame=requestAnimationFrame(loop);
    const wheel=e=>{
      e.preventDefault();
      const box=el.getBoundingClientRect();
      view.current=zoomAt(view.current,Math.exp(-e.deltaY*.0016),e.clientX-box.left,e.clientY-box.top,box.width,box.height);
    };
    el.addEventListener('wheel',wheel,{passive:false});
    return ()=>{cancelAnimationFrame(frame);el.removeEventListener('wheel',wheel);};
  },[radar]);
  const spread=()=>{const [a,b]=[...pointers.current.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
  const down=e=>{
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.current.size===2)pinch.current=spread();
  };
  const move=e=>{
    const last=pointers.current.get(e.pointerId);
    if(!last)return;
    const box=e.currentTarget.getBoundingClientRect();
    if(pointers.current.size===1){
      const v=view.current;
      view.current=clampView({...v,x:v.x-(e.clientX-last.x)/v.scale,z:v.z-(e.clientY-last.y)/v.scale});
      last.x=e.clientX;last.y=e.clientY;
      return;
    }
    last.x=e.clientX;last.y=e.clientY;
    const [a,b]=[...pointers.current.values()],now=spread();
    if(pinch.current>0&&now>0)view.current=zoomAt(view.current,now/pinch.current,(a.x+b.x)/2-box.left,(a.y+b.y)/2-box.top,box.width,box.height);
    pinch.current=now;
  };
  const up=e=>{pointers.current.delete(e.pointerId);pinch.current=0;};
  const zoom=factor=>{const el=canvas.current;view.current=zoomAt(view.current,factor,el.clientWidth/2,el.clientHeight/2,el.clientWidth,el.clientHeight);};
  const centre=()=>{view.current=clampView({...view.current,x:radar.current.x,z:radar.current.z});};
  const whole=()=>{const el=canvas.current;view.current=fitWorld(el.clientWidth,el.clientHeight);};
  return <div className="bigmap" role="dialog" aria-modal="true" aria-label="Karte" data-testid="bigmap">
    <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}/>
    <div className="bigmap-title">KARTE<small>Ziehen = verschieben · Rad / zwei Finger = zoomen</small></div>
    <button type="button" className="bigmap-close" onClick={onClose} aria-label="Karte schließen">✕</button>
    <div className="bigmap-tools">
      <button type="button" onClick={()=>zoom(1.5)} aria-label="Hineinzoomen">＋</button>
      <button type="button" onClick={()=>zoom(1/1.5)} aria-label="Herauszoomen">－</button>
      <button type="button" onClick={centre} aria-label="Auf mich zentrieren">◎</button>
      <button type="button" onClick={whole} aria-label="Ganze Karte zeigen">▣</button>
    </div>
    <div className="bigmap-legend">
      <span><i style={{background:'#fff'}}/>Du</span><span><i style={{background:'#f4f6f8',borderRadius:2}}/>Autos</span>
      <span><i style={{background:'#c8ff57'}}/>Challenge</span><span><i style={{background:'#ff4fb0'}}/>{BUDDY_NAME}</span><span><i style={{background:'#ffd84a'}}/>Ziel</span>
    </div>
  </div>;
}
