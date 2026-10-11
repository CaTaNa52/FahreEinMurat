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

const touch=(identifier,clientX,clientY)=>({identifier,clientX,clientY});

test('Safari: native touchend releases GAS even if pointerup never arrived',()=>{
  const {router,controls}=setup();
  const events=[];
  const unsubscribe=router.subscribe(()=>events.push({...router.snapshot()}));
  router.setPointer(42,{forward:true},{pointerType:'touch',clientX:285,clientY:690});
  router.trackTouches('start',[touch(7,285,690)],[touch(7,285,690)]);
  assert.equal(controls.current.forward,true);
  router.trackTouches('end',[touch(7,285,690)],[]);
  assert.equal(controls.current.forward,false);
  assert.equal(router.hasPointer(42),false);
  assert.equal(events.at(-1).forward,false);
  unsubscribe();
});

test('TouchEvent-first order also associates finger and cleans up',()=>{
  const {router,controls}=setup();
  const gas=touch(0,280,712);
  router.trackTouches('start',[gas],[gas]);
  router.setPointer(11,{forward:true},{pointerType:'touch',clientX:gas.clientX,clientY:gas.clientY});
  assert.equal(controls.current.forward,true);
  router.trackTouches('end',[gas],[]);
  assert.equal(controls.current.forward,false);
});

test('multitouch: releasing gas never leaves it held when second finger steers',()=>{
  const {router,controls}=setup();
  const gas=touch(17,300,700),left=touch(23,44,680);
  router.setPointer(10,{forward:true},{pointerType:'touch',clientX:gas.clientX,clientY:gas.clientY});
  router.trackTouches('start',[gas],[gas]);
  router.setPointer(11,{left:true},{pointerType:'touch',clientX:left.clientX,clientY:left.clientY});
  router.trackTouches('start',[left],[gas,left]);
  assert.equal(controls.current.forward,true);
  assert.equal(controls.current.left,true);
  router.trackTouches('end',[gas],[left]);
  assert.equal(controls.current.forward,false,'gas must release when only steering touch remains');
  assert.equal(controls.current.left,true,'steering touch stays active');
  router.trackTouches('end',[left],[]);
  assert.equal(controls.current.left,false);
});

test('ending steering touch keeps gas pressed until gas finger actually ends',()=>{
  const {router,controls}=setup();
  const gas=touch(51,287,705),steer=touch(52,42,704);
  router.trackTouches('start',[gas,steer],[gas,steer]);
  router.setPointer(11,{forward:true},{pointerType:'touch',clientX:gas.clientX,clientY:gas.clientY});
  router.setPointer(12,{left:true},{pointerType:'touch',clientX:steer.clientX,clientY:steer.clientY});
  router.trackTouches('end',[steer],[gas]);
  assert.equal(controls.current.left,false);
  assert.equal(controls.current.forward,true);
  router.trackTouches('end',[gas],[]);
  assert.equal(controls.current.forward,false);
});

test('touchcancel, missing touchstart and clearAll prevent ghost acceleration',()=>{
  const {router,controls}=setup();
  router.setPointer(66,{forward:true},{pointerType:'touch',clientX:289,clientY:720});
  router.trackTouches('end',[],[]);
  assert.equal(controls.current.forward,false,'all fingers gone clears unpaired touches');
  router.setPointer(67,{forward:true},{pointerType:'touch',clientX:289,clientY:720});
  router.trackTouches('start',[touch(4,289,720)],[touch(4,289,720)]);
  router.clearAll();
  assert.equal(controls.current.forward,false);
  router.setPointer(68,{wheelie:true},{pointerType:'touch',clientX:289,clientY:720});
  router.trackTouches('end',[],[]);
  assert.equal(controls.current.wheelie,false);
});

test('unrelated keyboard inputs remain active during native touch release',()=>{
  const {router,controls}=setup();
  router.setKey('KeyW','forward',true);
  router.setPointer(1,{forward:true},{pointerType:'touch',clientX:280,clientY:690});
  router.trackTouches('start',[touch(13,280,690)],[touch(13,280,690)]);
  router.trackTouches('end',[touch(13,280,690)],[]);
  assert.equal(controls.current.forward,true,'physical keyboard is independent');
  router.setKey('KeyW','forward',false);
  assert.equal(controls.current.forward,false);
});
