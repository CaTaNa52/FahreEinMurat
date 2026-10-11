import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGES, SLALOM_CONES, SLALOM_FINISH,
  updateWheelie, createChallengeState, updateChallenges,
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
