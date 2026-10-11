import { roadX, WORKSHOPS } from './gameplay.js';

// Shared source of truth for visible world objects and the gameplay colliders.
export const CROSSROADS = [-325, -175, 25, 288].map((z,i)=>({
  id:'junction-'+i, x:roadX(z), z, width:9.5, length:i%2===0?280:225
}));
export const BUILDINGS = [
  {id:'bakery',z:-408,side:1,offset:24,kind:'shop',paint:'#b98e63',label:'BÄCKEREI'},
  {id:'north-flat',z:-370,side:-1,offset:25,kind:'flats',paint:'#8c9eaa',label:'WOHNHAUS'},
  {id:'corner-shop',z:-287,side:1,offset:24,kind:'shop',paint:'#cb9e84',label:'KIOSK'},
  {id:'apartments',z:-254,side:-1,offset:25,kind:'flats',paint:'#9eb5a9',label:'APARTMENTS'},
  {id:'cafe',z:-224,side:1,offset:25,kind:'shop',paint:'#caab7a',label:'CAFÉ'},
  {id:'townhome',z:-143,side:-1,offset:24,kind:'house',paint:'#d9c8a4',label:'WOHNHAUS'},
  {id:'corner-flat',z:-81,side:1,offset:24,kind:'flats',paint:'#adafbb',label:'WOHNHAUS'},
  {id:'shop-central',z:-20,side:-1,offset:26,kind:'shop',paint:'#c48c73',label:'MARKT'},
  {id:'family-1',z:52,side:-1,offset:25,kind:'house',paint:'#d7bf9a',label:'WOHNHAUS'},
  {id:'mid-flat',z:108,side:1,offset:26,kind:'flats',paint:'#9fae9a',label:'WOHNHAUS'},
  {id:'family-2',z:207,side:-1,offset:25,kind:'house',paint:'#c4ad9c',label:'WOHNHAUS'},
  {id:'shop-park',z:242,side:1,offset:25,kind:'shop',paint:'#aaa4bd',label:'SPÄTI'},
  {id:'south-flat',z:325,side:-1,offset:26,kind:'flats',paint:'#bba999',label:'WOHNHAUS'},
  {id:'townhomes',z:370,side:1,offset:25,kind:'house',paint:'#dcc49b',label:'WOHNHAUS'},
].map((b)=>({...b,x:roadX(b.z)+b.side*b.offset,
  width:b.kind==='flats'?11:b.kind==='shop'?10:9,
  depth:b.kind==='flats'?9:b.kind==='shop'?9:8}));

export const BENCHES = [-395,-205,-93,48,200,350].map((z,i)=>({
  id:'bench-'+i,x:roadX(z)+(i%2===0?12.5:-12.5),z,side:i%2===0?1:-1
}));
export const LAMPS = [-430,-385,-340,-295,-235,-195,-145,-95,-42,4,55,95,150,210,265,320,380,420]
  .map((z,i)=>({id:'lamp-'+i,x:roadX(z)+(i%2?8:-8),z}));
export const SIGNALS = CROSSROADS.flatMap(j=>[-1,1].map((side)=>({
  id:j.id+'-light-'+side,x:j.x+side*7.9,z:j.z+(side===1?7:-7),side
})));

// Blocking geometry uses dimensions of the exact buildings rendered in 3D.
// Open spaces (pavement, streets, spawn zones) are intentionally not blockers.
export const OBSTACLES = [
  {id:'home',x:WORKSHOPS.home.x,z:WORKSHOPS.home.z,w:9.3,d:8.2},
  {id:'garage',x:WORKSHOPS.garage.x,z:WORKSHOPS.garage.z,w:10.3,d:9.2},
  ...BUILDINGS.map(b=>({id:b.id,x:b.x,z:b.z,w:b.width,d:b.depth})),
  ...BENCHES.map(b=>({id:b.id,x:b.x,z:b.z,w:3.3,d:1.15})),
  ...LAMPS.map(l=>({id:l.id,x:l.x,z:l.z,w:.53,d:.53})),
  ...SIGNALS.map(l=>({id:l.id,x:l.x,z:l.z,w:.65,d:.65})),
];

export function intersectsBuilding(x,z,box,radius=.68){
  const dx=Math.max(Math.abs(x-box.x)-box.w/2,0);
  const dz=Math.max(Math.abs(z-box.z)-box.d/2,0);
  return dx*dx+dz*dz<radius*radius;
}
// Swept, axis-separated circle-vs-AABB solver. Small steps prevent tunneling
// through walls at top scooter speed; independent axes allow wall sliding.
export function resolveWorldMovement(from,to,obstacles=OBSTACLES,radius=.68){
  const deltaX=to.x-from.x,deltaZ=to.z-from.z;
  const steps=Math.max(1,Math.ceil(Math.hypot(deltaX,deltaZ)/.35));
  const stepX=deltaX/steps,stepZ=deltaZ/steps;
  let x=from.x,z=from.z,blocked=false;
  for(let i=0;i<steps;i++){
    const nx=x+stepX;
    if(!obstacles.some(b=>intersectsBuilding(nx,z,b,radius)))x=nx;
    else blocked=true;
    const nz=z+stepZ;
    if(!obstacles.some(b=>intersectsBuilding(x,nz,b,radius)))z=nz;
    else blocked=true;
  }
  return {x,z,blocked};
}
export function closestBench(x,z,maxDistance=4){
  let best=null,distance=maxDistance;
  for(const b of BENCHES){
    const d=Math.hypot(x-b.x,z-b.z);
    if(d<distance){best=b;distance=d;}
  }
  return best;
}
