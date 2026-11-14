import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuddy, updateBuddy, buddyReact, rideReward, BUDDY_SPOTS, PICKUP_RADIUS } from '../src/buddy.js';
import { OBSTACLES, intersectsBuilding } from '../src/worldLayout.js';
import { inWater } from '../src/pool.js';
import { roadX } from '../src/gameplay.js';
const seeded=()=>{let s=11;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};
const run=(state,ctx,seconds,random)=>{const all=[];for(let t=0;t<seconds;t+=.1)all.push(...updateBuddy(state,ctx,.1,random));return all;};

test('every buddy spot is reachable: beside the road, not inside anything solid',()=>{
  for(const s of BUDDY_SPOTS){
    assert.ok(Math.abs(s.x-roadX(s.z))>5.6,s.name+' is off the carriageway');
    assert.ok(!OBSTACLES.some(o=>intersectsBuilding(s.x,s.z,o,1.3)),s.name+' is clear');
    assert.ok(!inWater(s.x,s.z,1));
  }
});
test('full ride: call, pick up, chat, drop off, paid, away again',()=>{
  const random=seeded(),state=createBuddy(5),me={x:roadX(0),z:0,speed:8,interact:false,riding:true};
  const call=run(state,me,6,random).find(e=>e.type==='call');
  assert.ok(call&&call.text.includes(call.spot.name));
  assert.equal(state.phase,'waiting');
  // Driving past at speed or pressing E far away does nothing.
  assert.equal(updateBuddy(state,{...me,interact:true},.1,random).length,0);
  const at={x:state.spot.x-1,z:state.spot.z,speed:0,interact:false,riding:true};
  updateBuddy(state,at,.1,random);
  assert.equal(state.near,true);
  const pickup=updateBuddy(state,{...at,interact:true},.1,random)[0];
  assert.equal(pickup.type,'pickup');
  assert.notEqual(pickup.dest,call.spot);
  assert.ok(run(state,{...at,speed:9},40,random).some(e=>e.type==='chat'));
  const drop=updateBuddy(state,{x:state.dest.x,z:state.dest.z+2,speed:.5,interact:false,riding:true},.1,random)[0];
  assert.equal(drop.type,'dropoff');
  assert.ok(drop.reward>=200&&drop.reward<=800);
  assert.equal(state.phase,'away');
  assert.equal(state.rides,1);
});
test('he gives up when nobody comes and never calls while you swim or walk',()=>{
  const random=seeded(),state=createBuddy(1);
  assert.equal(run(state,{x:0,z:0,speed:0,riding:false},30,random).length,0);
  run(state,{x:0,z:0,speed:0,riding:true},2,random);
  assert.equal(state.phase,'waiting');
  assert.ok(run(state,{x:500,z:500,speed:0,riding:true},160,random).some(e=>e.type==='gaveUp'));
  assert.equal(state.phase,'away');
});
test('reactions only while riding along and rate-limited',()=>{
  const random=seeded(),state=createBuddy();
  assert.equal(buddyReact(state,'crash',random),null);
  state.phase='riding';
  assert.equal(typeof buddyReact(state,'crash',random),'string');
  assert.equal(buddyReact(state,'hit',random),null);
  assert.ok(rideReward({x:0,z:0},{x:0,z:300})>rideReward({x:0,z:0},{x:0,z:120}));
  assert.ok(PICKUP_RADIUS>3);
});
