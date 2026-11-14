import test from 'node:test';
import assert from 'node:assert/strict';
import { createTraffic, updateTraffic, carPose, collideCar, closingSpeed, localTo, LANE, TRAFFIC_LIMIT } from '../src/traffic.js';
import { roadX } from '../src/gameplay.js';
const seeded=()=>{let s=7;return()=>{s=(s*16807)%2147483647;return s/2147483647;};};

test('cars keep right: northbound east of the axis, southbound west of it',()=>{
  const north=carPose({t:0,dir:-1}), south=carPose({t:0,dir:1});
  assert.ok(north.x>roadX(0)&&south.x<roadX(0));
  assert.ok(Math.abs(Math.hypot(north.x-roadX(0),north.z)-LANE)<.01);
});
test('traffic never spawns on top of the player and uses both directions',()=>{
  const cars=createTraffic(10,seeded(),0);
  assert.equal(cars.length,10);
  assert.ok(cars.every(c=>Math.abs(c.t)>=70));
  assert.ok(cars.some(c=>c.dir===1)&&cars.some(c=>c.dir===-1));
});
test('cars drive along the road, stay in their lane and wrap at the map end',()=>{
  const cars=createTraffic(8,seeded(),0);
  const start=cars.map(c=>c.t);
  for(let i=0;i<600;i++)updateTraffic(cars,{x:999,z:999,active:true},.05);
  cars.forEach((c,i)=>{
    assert.notEqual(c.t,start[i]);
    assert.ok(Math.abs(c.t)<=TRAFFIC_LIMIT+1);
    assert.ok(Math.abs(Math.hypot(c.x-roadX(c.t),c.z-c.t)-LANE)<.05);
  });
});
test('a car brakes to a stop for a rider standing in its lane',()=>{
  const car={id:'a',dir:-1,t:60,speed:12,cruise:12,stun:0};Object.assign(car,carPose(car));
  const rider={...carPose({t:20,dir:-1}),active:true};
  for(let i=0;i<200;i++)updateTraffic([car],rider,.05);
  assert.equal(car.speed,0);
  assert.ok(localTo(car,rider.x,rider.z).f>2.6,'stops before touching the rider');
});
test('cars queue behind each other instead of overlapping',()=>{
  const lead={id:'l',dir:1,t:0,speed:0,cruise:0,stun:99};Object.assign(lead,carPose(lead));
  const follow={id:'f',dir:1,t:-60,speed:13,cruise:13,stun:0};Object.assign(follow,carPose(follow));
  for(let i=0;i<300;i++)updateTraffic([lead,follow],{active:false},.05);
  assert.ok(lead.t-follow.t>4.6);
});
test('closed slalom section: cars wait at the border',()=>{
  const car={id:'a',dir:-1,t:10,speed:12,cruise:12,stun:0};Object.assign(car,carPose(car));
  for(let i=0;i<200;i++)updateTraffic([car],{active:false},.05,[-130,-18]);
  assert.ok(car.t>-18&&car.speed===0);
});
test('collision pushes the rider out and reports the closing speed',()=>{
  const car={id:'a',dir:-1,t:0,speed:10,cruise:10,stun:0};Object.assign(car,carPose(car));
  assert.equal(collideCar(car.x+6,car.z,.72,car),null);
  // Rider right in front of the bumper (car drives towards -z).
  const hit=collideCar(car.x-Math.sin(car.yaw)*2.6,car.z-Math.cos(car.yaw)*2.6,.72,car);
  assert.ok(hit&&hit.depth>0);
  assert.ok(closingSpeed(hit,car.yaw,0)>9,'standing rider gets rear-ended at car speed');
  assert.ok(closingSpeed(hit,car.yaw,10)<.01,'same speed, same direction: no impact');
  const inside=collideCar(car.x,car.z,.72,car);
  assert.ok(inside.depth>=.72);
});
