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
  // Closed red tube. Every joint is tangential, so the ride has no kinks: it leaves the
  // tower heading south, swings into the helix at its north-west side, winds 1.23 turns
  // clockwise around the column and peels off south-east in one long bend into the basin.
  const cx=T.x+.2, cz=T.z+7.2, r=3.1, sx=T.x-.6;
  const pts=[[sx,T.top,T.z+T.d/2-.2],[sx,T.top-.3,T.z+T.d/2+1]];
  const from=Math.PI+.75, sweep=1.42+Math.PI*2, steps=24;
  for(let i=0;i<=steps;i++){
    const f=i/steps, a=from-f*sweep, shrink=1-f*.08;
    pts.push([cx+Math.cos(a)*r*shrink, T.top-.8-f*5.3, cz+Math.sin(a)*r*shrink]);
  }
  const westEdge=POOL.x-POOL.w/2;
  pts.push([westEdge-3.6,1.2,POOL.z],[westEdge-1.2,.9,POOL.z+1.6],[westEdge+.4,.25,POOL.z+1.8],[westEdge+2.2,POOL.waterY+.18,POOL.z+1.9]);
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
// A slide as an evenly spaced track (one point every ~20 cm along the smoothed curve).
// Riding it by distance gives constant, jitter-free motion; heading and slope come
// from a 1.6 m window around the rider, so they turn continuously instead of per segment.
// Centripetal Catmull-Rom: unlike the uniform variant it never overshoots or loops
// where control points are unevenly spaced (spiral exit, slide outlet).
function centripetalPath(ctrl,perSegment=6){
  const out=[],gap=(a,b)=>Math.max(1e-4,Math.sqrt(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])));
  const mix=(a,b,ta,tb,t)=>[0,1,2].map(j=>((tb-t)*a[j]+(t-ta)*b[j])/(tb-ta));
  for(let i=0;i<ctrl.length-1;i++){
    const p1=ctrl[i],p2=ctrl[i+1];
    // Mirror the neighbour at both ends so the curve starts and ends straight.
    const p0=ctrl[i-1]??[0,1,2].map(j=>2*p1[j]-p2[j]),p3=ctrl[i+2]??[0,1,2].map(j=>2*p2[j]-p1[j]);
    const t0=0,t1=t0+gap(p0,p1),t2=t1+gap(p1,p2),t3=t2+gap(p2,p3);
    for(let k=0;k<perSegment;k++){
      const t=t1+(t2-t1)*k/perSegment;
      const a1=mix(p0,p1,t0,t1,t),a2=mix(p1,p2,t1,t2,t),a3=mix(p2,p3,t2,t3,t);
      out.push(mix(mix(a1,a2,t0,t2,t),mix(a2,a3,t1,t3,t),t1,t2,t));
    }
  }
  out.push([...ctrl[ctrl.length-1]]);
  return out;
}
export function buildTrack(points,spacing=.2){
  const dense=centripetalPath(points,6), len=pathLength(dense), count=Math.max(2,Math.ceil(len/spacing));
  const pts=[[...dense[0]]];
  let seg=1, walked=0, segLen=Math.hypot(dense[1][0]-dense[0][0],dense[1][1]-dense[0][1],dense[1][2]-dense[0][2]);
  for(let i=1;i<count;i++){
    const target=i*len/count;
    while(walked+segLen<target&&seg<dense.length-1){
      walked+=segLen;seg++;
      segLen=Math.hypot(dense[seg][0]-dense[seg-1][0],dense[seg][1]-dense[seg-1][1],dense[seg][2]-dense[seg-1][2]);
    }
    const a=dense[seg-1],b=dense[seg],t=segLen>0?(target-walked)/segLen:0;
    pts.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]);
  }
  pts.push([...dense[dense.length-1]]);
  return {len,spacing:len/count,pts};
}
// Position on the track at `dist` metres; before the start / after the end it
// continues straight, which the chase camera uses.
export function trackPoint(track,dist){
  const {pts,spacing,len}=track,last=pts.length-1;
  if(dist<=0||dist>=len){
    const [a,b]=dist<=0?[pts[1],pts[0]]:[pts[last-1],pts[last]];
    const over=(dist<=0?-dist:dist-len)/spacing;
    return [b[0]+(b[0]-a[0])*over,b[1]+(b[1]-a[1])*over,b[2]+(b[2]-a[2])*over];
  }
  const f=dist/spacing,i=Math.min(last-1,Math.floor(f)),t=f-i,a=pts[i],b=pts[i+1];
  return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
}
export function sampleTrack(track,dist,window=.8){
  const d=Math.max(0,Math.min(track.len,dist));
  const [x,y,z]=trackPoint(track,d),a=trackPoint(track,d-window),b=trackPoint(track,d+window);
  const dx=b[0]-a[0],dz=b[2]-a[2];
  return {x,y,z,yaw:Math.atan2(-dx,-dz),slope:Math.atan2(a[1]-b[1],Math.hypot(dx,dz)||1e-6)};
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
export const SLIDE_TRACKS = SLIDES.map(slide=>buildTrack(slide.points));
