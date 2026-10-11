import test from 'node:test';
import assert from 'node:assert/strict';
import { roadX, WORKSHOPS, CHALLENGES, SLALOM_CONES, TREASURE_SPAWNS } from '../src/gameplay.js';
import { CROSSROADS, BUILDINGS, BENCHES, LAMPS, SIGNALS, OBSTACLES,
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
