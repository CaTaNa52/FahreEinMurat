import test from 'node:test';
import assert from 'node:assert/strict';
import { impactOutcome, wallOutcome, applyDamage, isTotaled, speedCap, repairCost, damageLabel } from '../src/crash.js';
test('impacts are graded bump < hit < crash by speed',()=>{
  assert.equal(impactOutcome(1).kind,'bump');
  assert.equal(impactOutcome(5).kind,'hit');
  assert.equal(impactOutcome(12).kind,'crash');
  assert.ok(impactOutcome(5).damage<impactOutcome(12).damage);
  assert.equal(impactOutcome(.2).damage,0);
});
test('walls only hurt at speed',()=>{
  assert.equal(wallOutcome(3).kind,'none');
  assert.equal(wallOutcome(-9).kind,'hit');
  assert.equal(wallOutcome(20).kind,'crash');
});
test('damage is clamped, totals at 100, slows the scooter and costs coins to repair',()=>{
  assert.equal(applyDamage(90,40),100);
  assert.equal(applyDamage(5,-20),0);
  assert.ok(isTotaled(100)&&!isTotaled(99));
  assert.equal(speedCap(0,23),23);
  assert.ok(speedCap(50,23)<23&&speedCap(80,23)<speedCap(50,23));
  assert.equal(repairCost(37.2),76);
  assert.equal(damageLabel(0),'WIE NEU');
  assert.equal(damageLabel(85),'SCHROTTREIF');
});
