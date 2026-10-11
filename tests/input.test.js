import test from 'node:test';
import assert from 'node:assert/strict';
import { createInputRouter, gestureActions } from '../src/input.js';

function setup(){
  const controls={current:{forward:false,back:false,left:false,right:false,brake:false,wheelie:false,reset:false}};
  return {controls,router:createInputRouter(controls)};
}

test('one finger can keep accelerating while dragging GAS to WHEELIE',()=>{
  assert.deepEqual(gestureActions('gas','gas'),{forward:true});
  assert.deepEqual(gestureActions('gas','wheelie'),{forward:true,wheelie:true});
  assert.deepEqual(gestureActions('gas','brake'),{brake:true});
  assert.deepEqual(gestureActions('wheelie','wheelie'),{wheelie:true});
  const {controls,router}=setup();
  router.setPointer(1,gestureActions('gas','gas'));
  assert.equal(controls.current.forward,true);
  router.setPointer(1,gestureActions('gas','wheelie'));
  assert.equal(controls.current.forward,true);
  assert.equal(controls.current.wheelie,true);
  router.setPointer(1,gestureActions('gas','gas'));
  assert.equal(controls.current.wheelie,false);
  assert.equal(controls.current.forward,true);
  router.setPointer(1,gestureActions('gas','brake'));
  assert.equal(controls.current.forward,false);
  assert.equal(controls.current.brake,true);
  router.clearPointer(1);
  assert.equal(controls.current.brake,false);
});

test('releasing one touch never releases another touch input',()=>{
  const {controls,router}=setup();
  router.setPointer(11,{forward:true});
  router.setPointer(12,{left:true});
  assert.equal(controls.current.forward,true);
  assert.equal(controls.current.left,true);
  router.clearPointer(12);
  assert.equal(controls.current.forward,true);
  assert.equal(controls.current.left,false);
  router.setPointer(13,{wheelie:true});
  assert.equal(controls.current.forward,true);
  assert.equal(controls.current.wheelie,true);
  router.clearPointer(11);
  assert.equal(controls.current.forward,false);
  assert.equal(controls.current.wheelie,true);
});

test('keyboard and touch can hold the same action independently',()=>{
  const {controls,router}=setup();
  router.setKey('KeyW','forward',true);
  router.setPointer(1,{forward:true});
  router.setKey('KeyW','forward',false);
  assert.equal(controls.current.forward,true);
  router.clearPointer(1);
  assert.equal(controls.current.forward,false);
  router.setKey('Space','wheelie',true);
  assert.equal(controls.current.wheelie,true);
  router.clearAll();
  assert.equal(controls.current.wheelie,false);
});
