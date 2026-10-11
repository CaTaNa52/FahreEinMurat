import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGES, SLALOM_CONES, SLALOM_FINISH,
  updateWheelie, createChallengeState, updateChallenges, nextTreasureIndex, TREASURE_SPAWNS,
} from '../src/gameplay.js';

test('holding wheelie increases front-wheel angle and eventually causes a fall', () => {
  const p = { speed: 12, pitch: 0, pitchVel: 0 };
  let crashed = false;
  for (let i = 0; i < 180; i++) {
    if (updateWheelie(p, true, false, 1 / 60)) { crashed = true; break; }
  }
  assert.ok(crashed);
  assert.ok(p.pitch > 0.85);
});

test('releasing the button or braking brings the front wheel down', () => {
  const p = { speed: 12, pitch: 0, pitchVel: 0 };
  for (let i = 0; i < 18; i++) updateWheelie(p, true, false, 1 / 60);
  const lifted = p.pitch;
  assert.ok(lifted > 0.06);
  for (let i = 0; i < 120; i++) updateWheelie(p, false, false, 1 / 60);
  assert.equal(p.pitch, 0);
  p.pitch = 0.4; p.pitchVel = 0.3;
  for (let i = 0; i < 120; i++) updateWheelie(p, false, true, 1 / 60);
  assert.equal(p.pitch, 0);
});

function begin(id) {
  const state = createChallengeState(), events = [];
  const zone = CHALLENGES[id];
  const emit = event => events.push(event);
  updateChallenges(state, { x: zone.x, z: zone.z + 9 }, { x: zone.x, z: zone.z, speed: 8, pitch: 0 }, .016, emit);
  assert.equal(state.active, id);
  return { state, events, emit };
}
test('slalom requires every alternating side and the finish line', () => {
  const { state, events, emit } = begin('slalom');
  for (const cone of SLALOM_CONES) {
    const x = cone.x + cone.side * 2.8;
    updateChallenges(state, { x, z: cone.z + 1.2 }, { x, z: cone.z - 1.2, speed: 9, pitch: 0 }, .08, emit);
  }
  assert.equal(state.progress, SLALOM_CONES.length);
  const x = SLALOM_CONES.at(-1).x;
  updateChallenges(state, { x, z: SLALOM_FINISH + 1 }, { x, z: SLALOM_FINISH - 1, speed: 8, pitch: 0 }, .08, emit);
  assert.equal(state.active, null);
  assert.equal(events.at(-1).type, 'won');
});

test('wrong side of a traffic cone fails the course', () => {
  const { state, events, emit } = begin('slalom');
  const cone = SLALOM_CONES[0], x = cone.x - cone.side * 2.5;
  updateChallenges(state, { x, z: cone.z + 1 }, { x, z: cone.z - 1, speed: 8, pitch: 0 }, .08, emit);
  assert.equal(state.active, null);
  assert.equal(events.at(-1).type, 'failed');
});

test('wheelie demands uninterrupted controlled balance', () => {
  const { state, events, emit } = begin('wheelie');
  const c = CHALLENGES.wheelie;
  const p = { x: c.x, z: c.z - 1, speed: 10, pitch: .44 };
  for (let i = 0; i < 22; i++) updateChallenges(state, p, p, .1, emit);
  assert.ok(state.progress > 2);
  updateChallenges(state, p, { ...p, pitch: 0 }, .1, emit);
  assert.equal(state.progress, 0);
  for (let i = 0; i < 41; i++) updateChallenges(state, p, p, .1, emit);
  assert.equal(state.active, null);
  assert.equal(events.at(-1).type, 'won');
});

test('cannot re-trigger a challenge while standing in the same zone', () => {
  const { state, events, emit } = begin('wheelie');
  const c = CHALLENGES.wheelie;
  state.active = null;
  const p = { x: c.x, z: c.z, pitch: 0, speed: 0 };
  updateChallenges(state, p, p, .1, emit);
  assert.equal(events.filter(x => x.type === 'start').length, 1);
});


test('all challenge start zones are far apart',()=>{
  const zones=Object.values(CHALLENGES);
  assert.equal(zones.length,3);
  for(let i=0;i<zones.length;i++)for(let j=i+1;j<zones.length;j++){
    assert.ok(Math.hypot(zones[i].x-zones[j].x,zones[i].z-zones[j].z)>150);
  }
});

test('wheelie can be completed again and again for another reward',()=>{
  const {state,events,emit}=begin('wheelie');
  const c=CHALLENGES.wheelie;
  const inside={x:c.x,z:c.z,pitch:.44,speed:12};
  const outside={x:c.x+50,z:c.z+50,pitch:0,speed:10};
  for(let round=0;round<3;round++){
    for(let i=0;i<21;i++)updateChallenges(state,inside,inside,.2,emit);
    assert.equal(state.active,null);
    assert.equal(events.filter(e=>e.type==='won').length,round+1);
    updateChallenges(state,inside,outside,.02,emit);
    updateChallenges(state,outside,inside,.02,emit);
    assert.equal(state.active,'wheelie');
  }
});

test('hidden treasure spawns elsewhere on each new run without a HUD hint',()=>{
  const c=CHALLENGES.hunt;
  const s=createChallengeState(),events=[];
  const emit=e=>events.push(e);
  const inside={x:c.x,z:c.z,pitch:0,speed:10,yaw:0};
  const outside={x:c.x+55,z:c.z+35,pitch:0,speed:10,yaw:0};
  updateChallenges(s,outside,inside,.02,emit,()=>.4);
  const first=s.target;
  assert.ok(TREASURE_SPAWNS.some(t=>t.x===first.x&&t.z===first.z));
  updateChallenges(s,inside,inside,.2,emit,()=>.4);
  const progress=events.find(e=>e.type==='progress');
  assert.equal('distance' in progress,false);
  assert.equal('bearing' in progress,false);
  assert.equal('target' in progress,false);
  const firstKey={...inside,x:first.x,z:first.z};
  updateChallenges(s,inside,firstKey,.02,emit);
  assert.equal(events.at(-1).type,'won');
  updateChallenges(s,firstKey,outside,.02,emit);
  updateChallenges(s,outside,inside,.02,emit,()=>.4);
  const second=s.target;
  assert.notDeepEqual(second,first);
  assert.equal(events.filter(e=>e.type==='start'&&e.id==='hunt').length,2);
});

test('random treasure positions never repeat consecutively',()=>{
  for(let old=0;old<TREASURE_SPAWNS.length;old++) {
    for(const random of [()=>0,()=>.4,()=>.99999]){
      const next=nextTreasureIndex(old,random);
      assert.ok(next>=0&&next<TREASURE_SPAWNS.length);
      assert.notEqual(next,old);
    }
  }
});
