import test from 'node:test';
import assert from 'node:assert/strict';
import { STATION_DOOR, nearStationDoor, ROOM, ENTRY, SPOTS, INTERIOR_OBSTACLES, CELLS, createWalk, updateWalk, interiorAction, stationLine } from '../src/interior.js';
import { OBSTACLES, intersectsBuilding, POLICE } from '../src/worldLayout.js';

test('the station door is outside the building and reachable between the patrol cars',()=>{
  assert.ok(STATION_DOOR.x<POLICE.x-POLICE.w/2);
  const reachable=[[STATION_DOOR.x,POLICE.z+3.1],[STATION_DOOR.x,POLICE.z-3.1]];
  for(const [x,z] of reachable){
    assert.ok(!OBSTACLES.some(o=>intersectsBuilding(x,z,o,.72)));
    assert.ok(nearStationDoor(x,z));
  }
  assert.ok(!nearStationDoor(POLICE.x-40,POLICE.z));
});
test('entry, exit and talk spots are free of furniture',()=>{
  for(const p of [ENTRY,...Object.values(SPOTS)])
    assert.ok(!INTERIOR_OBSTACLES.some(o=>intersectsBuilding(p.x,p.z,o,.38)));
  assert.equal(interiorAction(ENTRY.x,ENTRY.z),'exit');
  assert.equal(interiorAction(SPOTS.officer.x,SPOTS.officer.z),'officer');
  assert.equal(interiorAction(-6,4),null);
});
test('walking: forward, turning, blocked by counter, walls and cell bars',()=>{
  const w=createWalk();
  for(let i=0;i<40;i++)updateWalk(w,{forward:true},.05);
  assert.ok(w.z<ENTRY.z-3&&w.stride>0);
  // Straight ahead from the door the way is free until the back wall.
  for(let i=0;i<400;i++)updateWalk(w,{forward:true},.05);
  assert.ok(w.z>=-ROOM.d/2+.4&&w.z<-4);
  // The counter stops you.
  const c=Object.assign(createWalk(),{x:-3.2,z:1.5});
  for(let i=0;i<200;i++)updateWalk(c,{forward:true},.05);
  assert.ok(c.z>-.2);
  // Closed bars of cell 2 stop you, the open door of cell 1 lets you in.
  const bars=Object.assign(createWalk(),{x:6,z:0});
  for(let i=0;i<200;i++)updateWalk(bars,{forward:true},.05);
  assert.ok(bars.z>CELLS.z1);
  const open=Object.assign(createWalk(),{x:(CELLS.door[0]+CELLS.door[1])/2,z:0});
  for(let i=0;i<200;i++)updateWalk(open,{forward:true},.05);
  assert.ok(open.z<CELLS.z1-.5);
  const back=createWalk();
  for(let i=0;i<200;i++)updateWalk(back,{brake:true},.05);
  assert.ok(back.z<=ROOM.d/2-.4);
});
test('the officer comments on the rider record',()=>{
  assert.match(stationLine('officer',{crashes:0},0),/Willkommen/);
  assert.match(stationLine('officer',{crashes:0},1),/Keine Unfälle/);
  assert.match(stationLine('officer',{crashes:4},1),/4 Unfälle/);
  assert.match(stationLine('officer',{crashes:1,damage:60},2),/Garage/);
  assert.equal(typeof stationLine('inmate',{},5),'string');
});
