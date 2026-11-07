// Pure pool, slide and swimming rules. No React or Three.js so it can be unit tested.
import { roadX, WORKSHOPS } from './gameplay.js';

// Outdoor pool complex right next to the home (garden side, a little further along the road).
// The basin is sunk into the ground: the ground plane gets a matching hole.
export const POOL = {
  id:'pool', name:'ALIASAF FREIBAD',
  x:WORKSHOPS.home.x-10, z:184,   // basin centre
  w:18, d:12,                     // basin size (x / z) in metres
  waterY:-.16, floorShallow:-1.25, floorDeep:-2.6,
};
// Paved deck around the basin (not a blocker, scooter can drive on it).
export const POOL_DECK = { x:POOL.x-1.5, z:POOL.z-1.5, w:POOL.w+13, d:POOL.d+15 };
export const SLIDE_TOWER = { x:POOL.x-13.2, z:POOL.z-12, w:4.4, d:4.4, top:7.6 };
export const SLIDE_ENTRY = { x:SLIDE_TOWER.x+SLIDE_TOWER.w/2+1.3, z:SLIDE_TOWER.z-2.8, radius:2.6 };
export const SWIM = { topForward:2.5, topReverse:.9, accel:2.6, turn:1.55, bodyRadius:.45, exitReach:1.25 };

const T = SLIDE_TOWER;
function spiralPoints(){
  // Closed red tube: leaves the tower to the north, winds 1.6 turns downwards and
  // shoots out into the shallow end of the basin.
  const cx=T.x+.2, cz=T.z+7.2, r=3.1, pts=[[T.x,T.top,T.z+T.d/2-.2],[T.x,T.top-.3,T.z+T.d/2+1.2]];
  const turns=1.6, steps=26, start=-Math.PI/2-.35;
  for(let i=0;i<=steps;i++){
    const f=i/steps, a=start+f*turns*Math.PI*2;
    pts.push([cx+Math.cos(a)*r*(1-f*.12), T.top-.8-f*5.6, cz+Math.sin(a)*r*(1-f*.12)]);
  }
  const westEdge=POOL.x-POOL.w/2;
  pts.push([westEdge-1.2,.9,POOL.z+1.6],[westEdge+.4,.25,POOL.z+1.8],[westEdge+2.2,POOL.waterY+.18,POOL.z+1.9]);
  return pts;
}
// Uniform Catmull-Rom densifier so gameplay sampling follows the rendered curve.
export function smoothPath(ctrl,perSegment=8){
  const out=[];
  for(let i=0;i<ctrl.length-1;i++){
    const p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)];
    for(let k=0;k<perSegment;k++){
      const t=k/perSegment,t2=t*t,t3=t2*t;
      out.push([0,1,2].map(j=>.5*((2*p1[j])+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)));
    }
  }
  out.push([...ctrl[ctrl.length-1]]);
  return out;
}
function wavePoints(){
  // Open blue wave slide: leaves the tower to the east, rolls over three humps along
  // the north side of the deck and turns south into the basin.
  const sx=T.x+T.w/2, z0=T.z, north=POOL.z-POOL.d/2, eastLand=POOL.x+5.4;
  return smoothPath([
    [sx,T.top,z0],[sx+2.2,T.top-.6,z0+.4],[sx+4.7,T.top-2.2,z0+2],[sx+7.2,T.top-2,z0+.4],
    [sx+9.7,T.top-3.6,z0+2],[sx+12.2,T.top-3.4,z0+.6],[sx+14.7,T.top-5,z0+1.8],
    [eastLand,1.6,north-1.8],[eastLand+.2,.7,north+.6],[eastLand,POOL.waterY+.18,north+2.6],
  ]);
}
export const SLIDES = [
  { id:'spiral', name:'TURBO-SPIRALE', color:'#e3412f', tube:true, points:spiralPoints() },
  { id:'wave', name:'WELLENRUTSCHE', color:'#2f8fe3', tube:false, points:wavePoints() },
];

export function pathLength(points){
  let len=0;
  for(let i=1;i<points.length;i++){
    const [ax,ay,az]=points[i-1],[bx,by,bz]=points[i];
    len+=Math.hypot(bx-ax,by-ay,bz-az);
  }
  return len;
}
// Linear sample along the poly-line by distance fraction (0..1) with a smoothed heading.
export function samplePath(points,fraction){
  const target=Math.max(0,Math.min(1,fraction))*pathLength(points);
  let walked=0;
  for(let i=1;i<points.length;i++){
    const a=points[i-1],b=points[i];
    const seg=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    if(walked+seg>=target||i===points.length-1){
      const t=seg>0?Math.min(1,(target-walked)/seg):0;
      return {
        x:a[0]+(b[0]-a[0])*t, y:a[1]+(b[1]-a[1])*t, z:a[2]+(b[2]-a[2])*t,
        yaw:Math.atan2(-(b[0]-a[0]),-(b[2]-a[2])),
        slope:Math.atan2(a[1]-b[1],Math.hypot(b[0]-a[0],b[2]-a[2])||1e-6),
      };
    }
    walked+=seg;
  }
  const last=points[points.length-1];
  return {x:last[0],y:last[1],z:last[2],yaw:0,slope:0};
}
// Gravity-like slide speed: accelerates on steep sections, capped for readability.
export function slideSpeed(current,slope,dt){
  const accel=2.2+9.81*Math.sin(Math.max(0,slope))*.75;
  return Math.min(12.5,Math.max(3,current+accel*dt-current*.06*dt));
}

export function inWater(x,z,margin=0){
  return Math.abs(x-POOL.x)<POOL.w/2-margin&&Math.abs(z-POOL.z)<POOL.d/2-margin;
}
export function onDeck(x,z){
  return Math.abs(x-POOL_DECK.x)<POOL_DECK.w/2&&Math.abs(z-POOL_DECK.z)<POOL_DECK.d/2;
}
// Swimmer stays inside the basin walls.
export function clampToWater(x,z,radius=SWIM.bodyRadius){
  return {
    x:Math.max(POOL.x-POOL.w/2+radius,Math.min(POOL.x+POOL.w/2-radius,x)),
    z:Math.max(POOL.z-POOL.d/2+radius,Math.min(POOL.z+POOL.d/2-radius,z)),
  };
}
export function distanceToEdge(x,z){
  return Math.min(POOL.w/2-Math.abs(x-POOL.x),POOL.d/2-Math.abs(z-POOL.z));
}
// Water depth below the surface, sloping from shallow (east, road side) to deep (west).
export function waterDepth(x){
  const f=Math.max(0,Math.min(1,(POOL.x+POOL.w/2-x)/POOL.w));
  return -(POOL.floorShallow+(POOL.floorDeep-POOL.floorShallow)*f)+POOL.waterY;
}
// Exit point on the deck just beyond the nearest basin edge.
export function exitPoint(x,z,gap=1.3){
  const dx=x-POOL.x, dz=z-POOL.z;
  const toX=POOL.w/2-Math.abs(dx), toZ=POOL.d/2-Math.abs(dz);
  if(toX<toZ)return {x:POOL.x+Math.sign(dx||1)*(POOL.w/2+gap),z,yaw:dx>0?-Math.PI/2:Math.PI/2};
  return {x,z:POOL.z+Math.sign(dz||1)*(POOL.d/2+gap),yaw:dz>0?Math.PI:0};
}
export function updateSwim(s,controls,dt){
  const step=Math.max(0,Math.min(.05,dt));
  const {forward=false,back=false,brake=false,left=false,right=false}=controls;
  if(forward&&!brake)s.speed=Math.min(SWIM.topForward,s.speed+SWIM.accel*step);
  else if(back||brake)s.speed=Math.max(-SWIM.topReverse,s.speed-SWIM.accel*step);
  else s.speed*=Math.exp(-1.9*step);
  if(Math.abs(s.speed)<.02&&!forward&&!back&&!brake)s.speed=0;
  s.yaw+=(Number(left)-Number(right))*SWIM.turn*step;
  const next=clampToWater(s.x-Math.sin(s.yaw)*s.speed*step,s.z-Math.cos(s.yaw)*s.speed*step);
  const hitWall=Math.abs(next.x-(s.x-Math.sin(s.yaw)*s.speed*step))>1e-6||Math.abs(next.z-(s.z-Math.cos(s.yaw)*s.speed*step))>1e-6;
  s.x=next.x;s.z=next.z;
  if(hitWall)s.speed*=.4;
  s.stroke=(s.stroke??0)+step*(1.2+Math.abs(s.speed)*1.6);
  return s;
}
export function nearSlideEntry(x,z){
  return Math.hypot(x-SLIDE_ENTRY.x,z-SLIDE_ENTRY.z)<SLIDE_ENTRY.radius;
}
// Solid props of the pool complex. The basin and deck stay open.
// Support pillars of the open wave slide (shared by renderer and colliders).
export const SLIDE_PILLARS = SLIDES[1].points
  .filter((pt,i)=>i>2&&i%7===0&&pt[1]>1.1)
  .map((pt,i)=>({id:'slide-pillar-'+i,x:pt[0],z:pt[2],h:pt[1]-.55}));
export const POOL_OBSTACLES = [
  {id:'slide-stairs',x:T.x,z:T.z-T.d/2-1.7,w:1.4,d:3.4},
  ...SLIDE_PILLARS.map(p=>({id:p.id,x:p.x,z:p.z,w:.42,d:.42})),
  {id:'slide-tower',x:T.x,z:T.z,w:T.w,d:T.d},
  {id:'lifeguard',x:POOL.x+7.4,z:POOL.z+POOL.d/2+2.1,w:1.4,d:1.4},
  {id:'pool-shower',x:POOL.x+POOL.w/2+4.2,z:POOL.z-POOL.d/2-1.6,w:.6,d:.6},
  {id:'slide-spiral',x:T.x+.2,z:T.z+7.2,w:1.2,d:1.2},
  ...[0,1,2].map(i=>({id:'lounger-'+i,x:POOL.x-4+i*4,z:POOL.z+POOL.d/2+4.2,w:.9,d:2.1})),
];
export const POOL_ROAD_GAP = roadX(POOL.z)-5.3-(POOL_DECK.x+POOL_DECK.w/2);
