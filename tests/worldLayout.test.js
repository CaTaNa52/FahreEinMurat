import test from 'node:test';
import assert from 'node:assert/strict';
import { roadX, WORKSHOPS, CHALLENGES, SLALOM_CONES, TREASURE_SPAWNS } from '../src/gameplay.js';
import { CROSSROADS, BUILDINGS, DISTRICT_BUILDINGS, ALL_BUILDINGS, BENCHES, LAMPS, SIGNALS, OBSTACLES,
  intersectsBuilding, resolveWorldMovement, closestBench } from '../src/worldLayout.js';

test('street system includes multiple real traversable cross roads, signals and lamps',()=>{
  assert.ok(CROSSROADS.length>=3);
  assert.ok(SIGNALS.length>=CROSSROADS.length*2);
  assert.ok(LAMPS.length>=12);
  for(const road of CROSSROADS){
    assert.ok(road.length>120);
    assert.ok(road.width>8);
    assert.ok(Math.abs(road.x-roadX(road.z))<.01);
    assert.ok(!OBSTACLES.some(box=>intersectsBuilding(road.x,road.z,box,.7)));
  }
});
test('home and garage have consistent collision footprints and remain approachable',()=>{
  for(const id of ['home','garage']){
    const box=OBSTACLES.find(b=>b.id===id),house=WORKSHOPS[id];
    assert.ok(box,'Every visible workshop is a solid building');
    assert.ok(intersectsBuilding(house.x,house.z,box,.72));
    assert.ok(!intersectsBuilding(roadX(house.z),house.z,box,.72),'Road remains passable');
    assert.ok(!intersectsBuilding(box.x+box.w/2+2,box.z,box,.72),'Outside of wall is reachable');
  }
});
test('collisions reject front wall penetration at riding speed and let rider slide alongside',()=>{
  for(const box of OBSTACLES.filter(b=>['home','garage','cafe'].includes(b.id))){
    const left=box.x-box.w/2-3, z=box.z;
    const forward={x:box.x+box.w/2+3,z};
    const hit=resolveWorldMovement({x:left,z},forward);
    assert.ok(hit.blocked,box.id+' blocks driving through walls');
    assert.ok(hit.x < box.x-box.w/2,box.id+' did not tunnel');
    const along=resolveWorldMovement({x:left,z}, {x:box.x,z:z+box.d/2+10});
    assert.ok(along.blocked,'Diagonal movement collides');
    assert.ok(!intersectsBuilding(along.x,along.z,box,.72));
    // Sliding along a face should permit motion parallel to the building.
    const faceX=box.x-box.w/2-1;
    const slid=resolveWorldMovement({x:faceX,z:box.z-7},{x:faceX,z:box.z+7});
    assert.ok(slid.z>box.z+6,'Wall sliding moves parallel to exterior');
  }
});
test('building, furniture and crossroads do not cover challenge starting areas or hidden collectibles',()=>{
  assert.ok(BUILDINGS.length>=12);
  const points=[...Object.values(CHALLENGES),...TREASURE_SPAWNS];
  for(const c of points){
    assert.ok(!OBSTACLES.some(box=>intersectsBuilding(c.x,c.z,box,.74)),
      'Challenge point or key remains accessible');
  }
});
test('all benches have a physical seat and are discoverable within interaction range',()=>{
  assert.ok(BENCHES.length>=5);
  for(const bench of BENCHES){
    assert.ok(OBSTACLES.some(o=>o.id===bench.id));
    const near=closestBench(bench.x+2.2,bench.z,3.9);
    assert.equal(near.id,bench.id);
  }
  assert.equal(closestBench(1000,1000),null);
});

test('side roads have neighbourhood buildings, working lights and sitting places',()=>{
  assert.equal(DISTRICT_BUILDINGS.length,CROSSROADS.length*4);
  assert.equal(ALL_BUILDINGS.length,BUILDINGS.length+DISTRICT_BUILDINGS.length);
  assert.ok(BENCHES.length>=CROSSROADS.length+6);
  assert.ok(LAMPS.length>=CROSSROADS.length*2+18);
  for(const street of CROSSROADS){
    const houses=DISTRICT_BUILDINGS.filter(b=>Math.abs(b.z-street.z)<20);
    assert.equal(houses.length,4);
    for(const b of houses){
      assert.ok(Math.abs(b.z-street.z)>street.width/2+b.depth/2,
        b.id+' must remain outside asphalt');
      assert.ok(OBSTACLES.some(c=>c.id===b.id),'Visible building has a collider');
    }
    const travel=resolveWorldMovement(
      {x:street.x-street.length/2+9,z:street.z},
      {x:street.x+street.length/2-9,z:street.z},OBSTACLES,.72);
    assert.equal(travel.blocked,false,'Cross street is actually rideable');
    assert.ok(travel.x>street.x+street.length/2-12);
  }
});

test('rotated homes retain correctly oriented walls and block all sides',()=>{
  const home=OBSTACLES.find(o=>o.id==='home');
  assert.equal(home.w,8.2);assert.equal(home.d,9.3);
  for(const side of [-1,1]){
    const x=home.x+side*(home.w/2+4.2);
    const target={x:home.x-side*2,z:home.z};
    const result=resolveWorldMovement({x,z:home.z},target);
    assert.equal(result.blocked,true,'Cannot pass through facade');
    assert.ok(!intersectsBuilding(result.x,result.z,home,.72));
  }
  for(const building of BUILDINGS.filter(b=>b.kind==='house')){
    const physical=OBSTACLES.find(o=>o.id===building.id);
    assert.equal(physical.w,building.depth);
    assert.equal(physical.d,building.width);
  }
});

test('large high-speed jumps cannot tunnel through new district houses or props',()=>{
  const colliders=[...DISTRICT_BUILDINGS.slice(0,4).map(b=>OBSTACLES.find(o=>o.id===b.id)),
    OBSTACLES.find(o=>o.id==='garage')];
  for(const c of colliders){
    const before={x:c.x-c.w/2-22,z:c.z};
    const after={x:c.x+c.w/2+22,z:c.z};
    const result=resolveWorldMovement(before,after,OBSTACLES,.72);
    assert.equal(result.blocked,true,c.id);
    assert.ok(result.x<c.x-c.w/2,'Swept collision stops before wall');
  }
});
