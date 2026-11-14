import test from 'node:test';
import assert from 'node:assert/strict';
import { roadX, WORKSHOPS, CHALLENGES } from '../src/gameplay.js';
import { POOL, POOL_DECK, SLIDES, SLIDE_ENTRY, SWIM, inWater, clampToWater, distanceToEdge, exitPoint,
  updateSwim, samplePath, pathLength, slideSpeed, nearSlideEntry, waterDepth } from '../src/pool.js';
import { OBSTACLES, POLICE, POLICE_LOT, POLICE_CARS, CROSSROADS, intersectsBuilding, resolveWorldMovement } from '../src/worldLayout.js';

test('pool sits right next to the home, off the road and clear of every solid object',()=>{
  const home=WORKSHOPS.home;
  assert.ok(Math.hypot(POOL.x-home.x,POOL.z-home.z)<40,'pool is next to the home');
  assert.ok(POOL_DECK.x+POOL_DECK.w/2<roadX(POOL.z)-5.3,'deck does not cover the road');
  for(const box of OBSTACLES){
    assert.ok(!(Math.abs(box.x-POOL.x)<box.w/2+POOL.w/2&&Math.abs(box.z-POOL.z)<box.d/2+POOL.d/2),box.id+' overlaps basin');
  }
  // The home's collision footprint stays separate from the deck.
  const homeBox=OBSTACLES.find(b=>b.id==='home');
  assert.ok(Math.abs(homeBox.z-POOL_DECK.z)>homeBox.d/2+POOL_DECK.d/2);
});
test('realistic basin: shallow end towards the road, deep end with diving board side',()=>{
  assert.ok(POOL.w>=16&&POOL.d>=10);
  const shallow=waterDepth(POOL.x+POOL.w/2), deep=waterDepth(POOL.x-POOL.w/2);
  assert.ok(Math.abs(shallow-1.09)<.05,'≈1.1 m at the shallow end');
  assert.ok(deep>2.3&&deep<2.6,'≈2.4 m at the deep end');
});
test('both big slides start at the tower top and end inside the water',()=>{
  assert.equal(SLIDES.length,2);
  for(const slide of SLIDES){
    const start=slide.points[0],end=slide.points.at(-1);
    assert.ok(start[1]>7,slide.id+' starts high');
    assert.ok(inWater(end[0],end[2],.5),slide.id+' lands in the basin');
    assert.ok(pathLength(slide.points)>20,slide.id+' is a big slide');
    assert.ok(slide.points.every(p=>p[1]>=POOL.waterY),slide.id+' never dips below water');
  }
});
test('slide sampling follows the path and speed builds on steep parts',()=>{
  const pts=SLIDES[0].points;
  const a=samplePath(pts,0),b=samplePath(pts,1);
  assert.deepEqual([a.x,a.y,a.z].map(v=>+v.toFixed(3)),pts[0].map(v=>+v.toFixed(3)));
  assert.deepEqual([b.x,b.y,b.z].map(v=>+v.toFixed(3)),pts.at(-1).map(v=>+v.toFixed(3)));
  const mid=samplePath(pts,.5);
  assert.ok(mid.y<a.y&&mid.y>b.y);
  assert.ok(slideSpeed(4,.6,.1)>slideSpeed(4,0,.1));
  assert.ok(slideSpeed(50,1,.1)<=12.5,'speed capped');
});
test('swimming moves forward, turns and never leaves the basin walls',()=>{
  const s={x:POOL.x,z:POOL.z,yaw:0,speed:0,stroke:0};
  for(let i=0;i<40;i++)updateSwim(s,{forward:true},.05);
  assert.ok(s.speed>2&&s.speed<=SWIM.topForward);
  assert.ok(s.z<POOL.z-3,'swims towards -z (forward)');
  assert.ok(s.stroke>0,'stroke animation advances');
  for(let i=0;i<400;i++)updateSwim(s,{forward:true,left:i%3===0},.05);
  assert.ok(inWater(s.x,s.z,SWIM.bodyRadius-.001),'swimmer stays inside');
  const c=clampToWater(POOL.x+50,POOL.z-50);
  assert.ok(inWater(c.x,c.z,.4));
});
test('climbing out only works at the edge and lands on the deck',()=>{
  assert.ok(distanceToEdge(POOL.x,POOL.z)>SWIM.exitReach);
  const x=POOL.x+POOL.w/2-.5,z=POOL.z;
  assert.ok(distanceToEdge(x,z)<SWIM.exitReach);
  const out=exitPoint(x,z);
  assert.ok(!inWater(out.x,out.z));
  assert.ok(Math.abs(out.x-POOL_DECK.x)<POOL_DECK.w/2&&Math.abs(out.z-POOL_DECK.z)<POOL_DECK.d/2,'exit is on the deck');
  assert.ok(!OBSTACLES.some(b=>intersectsBuilding(out.x,out.z,b,.72)),'exit point is free');
});
test('slide entry is reachable and drivable from the road',()=>{
  assert.ok(nearSlideEntry(SLIDE_ENTRY.x,SLIDE_ENTRY.z));
  assert.ok(!OBSTACLES.some(b=>intersectsBuilding(SLIDE_ENTRY.x,SLIDE_ENTRY.z,b,.72)),'entry not blocked');
  // Drive along z=SLIDE_ENTRY.z from the road towards the entry without hitting anything.
  const from={x:roadX(SLIDE_ENTRY.z),z:SLIDE_ENTRY.z},to={x:SLIDE_ENTRY.x,z:SLIDE_ENTRY.z};
  const r=resolveWorldMovement(from,to,OBSTACLES,.72);
  assert.ok(!r.blocked&&Math.abs(r.x-to.x)<.01,'clear path from road to slide');
});
test('police station is solid, faces the road and has a reachable parking lot',()=>{
  const box=OBSTACLES.find(b=>b.id==='police');
  assert.ok(box&&box.w>=10&&box.d>=14,'large solid building');
  assert.ok(POLICE.x-POLICE.w/2>roadX(POLICE.z)+5.3,'not on the road');
  assert.ok(POLICE_CARS.length>=2);
  for(const car of POLICE_CARS)assert.ok(OBSTACLES.some(b=>b.id===car.id),'car is solid');
  assert.ok(!OBSTACLES.some(b=>intersectsBuilding(POLICE_LOT.x-4,POLICE_LOT.z,b,.72)),'lot entrance free');
  const hit=resolveWorldMovement({x:POLICE.x-POLICE.w/2-1.5,z:POLICE.z+12},{x:POLICE.x+POLICE.w/2+3,z:POLICE.z+12});
  assert.ok(hit.x<POLICE.x+POLICE.w/2||!intersectsBuilding(hit.x,hit.z,box,.72));
  for(const c of [...Object.values(CHALLENGES)])assert.ok(Math.hypot(c.x-POLICE.x,c.z-POLICE.z)>20,'clear of challenge zones');
  for(const j of CROSSROADS)assert.ok(Math.abs(j.z-POLICE.z)>POLICE.d/2+5,'clear of side streets');
});

test('slide tracks are evenly spaced and turn smoothly (no per-segment jumps)',async()=>{
  const {SLIDE_TRACKS,SLIDES,sampleTrack,trackPoint}=await import('../src/pool.js');
  SLIDE_TRACKS.forEach((track,index)=>{
    const {pts,spacing,len}=track;
    assert.ok(len>20,'slide is long enough');
    // Even spacing: every step within 12 % of the nominal spacing.
    for(let i=1;i<pts.length;i++){
      const step=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]);
      assert.ok(Math.abs(step-spacing)<spacing*.12,`step ${i} of slide ${index}: ${step}`);
    }
    // Same start and end as the designed path.
    const first=SLIDES[index].points[0],last=SLIDES[index].points.at(-1);
    assert.ok(Math.hypot(pts[0][0]-first[0],pts[0][2]-first[2])<.01);
    assert.ok(Math.hypot(pts.at(-1)[0]-last[0],pts.at(-1)[2]-last[2])<.01);
    // Riding at 10 cm steps: position moves ~10 cm, heading never turns more than 6° (a 1 m curve radius).
    let prev=sampleTrack(track,1);
    for(let d=1.1;d<len-1;d+=.1){
      const now=sampleTrack(track,d);
      const moved=Math.hypot(now.x-prev.x,now.y-prev.y,now.z-prev.z);
      assert.ok(moved>.07&&moved<.13,`moved ${moved} at ${d}`);
      let turn=Math.abs(now.yaw-prev.yaw);if(turn>Math.PI)turn=Math.PI*2-turn;
      assert.ok(turn<.1,`heading jump ${turn} at ${d} on slide ${index}`);
      prev=now;
    }
  });
  // Outside the track the line simply continues (used by the chase camera).
  const t=SLIDE_TRACKS[0],before=trackPoint(t,-1),start=trackPoint(t,0);
  assert.ok(Math.abs(Math.hypot(before[0]-start[0],before[1]-start[1],before[2]-start[2])-1)<.05);
});
