import test from 'node:test';
import assert from 'node:assert/strict';
import { DRIVE_LIMITS, updateDriveSpeed } from '../src/driving.js';
import { readFileSync } from 'node:fs';

test('gas accelerates forward, and brake has priority over simultaneous gas',()=>{
  let speed=0;
  for(let i=0;i<20;i++)speed=updateDriveSpeed(speed,{forward:true},.05);
  assert.ok(speed>10);
  const first=speed;
  speed=updateDriveSpeed(speed,{forward:true,brake:true},.05);
  assert.ok(speed<first,'Brake must override pressed gas');
});

test('brake slows down to full stop then smoothly drives in reverse while held',()=>{
  let speed=15;
  const steps=[];
  for(let i=0;i<45;i++){
    speed=updateDriveSpeed(speed,{brake:true},.05);
    steps.push(speed);
  }
  const stopIndex=steps.findIndex(v=>v===0);
  assert.ok(stopIndex>=0,'Forward motion needs a true standstill');
  assert.ok(stopIndex<steps.length-3,'Hold continues into reverse');
  assert.ok(steps.slice(0,stopIndex).every(v=>v>=0),'No instant gear reversal');
  assert.ok(speed<-.1,'Holding brake after stop reverses');
  assert.ok(speed>=-DRIVE_LIMITS.topReverse,'Reversing is slow');
  const beforeRelease=speed;
  speed=updateDriveSpeed(speed,{},.05);
  assert.ok(Math.abs(speed)<Math.abs(beforeRelease),'Release should coast rather than continue accelerating');
});

test('brake from a standing start reverses slowly; forward gas can stop reversing',()=>{
  let speed=0;
  for(let i=0;i<60;i++)speed=updateDriveSpeed(speed,{brake:true},.05);
  assert.equal(speed,-DRIVE_LIMITS.topReverse);
  for(let i=0;i<5;i++)speed=updateDriveSpeed(speed,{forward:true},.05);
  assert.ok(speed<=0,'Cannot instantly jump from reverse to forward');
  for(let i=0;i<30;i++)speed=updateDriveSpeed(speed,{forward:true},.05);
  assert.ok(speed>0,'Gas moves forward after reverse stops');
});

test('desktop S/reverse key remains functional and safe at zero dt',()=>{
  assert.equal(updateDriveSpeed(4,{back:true},0),4);
  assert.ok(updateDriveSpeed(0,{back:true},.05)<0);
});

test('scooter neon uses only downward-directed spotlights, never omni-directional point lights',()=>{
  const file=readFileSync('src/Underglow.jsx','utf8');
  assert.match(file,/<spotLight\b/);
  assert.match(file,/target=\{lightTarget\}/);
  assert.match(file,/position=\{\[0,-\.06,-\.28\]\}/);
  assert.doesNotMatch(file,/<pointLight\b/);
});

test('mobile canvas DPR is capped above old 1.2x and antialias enabled',()=>{
  const file=readFileSync('src/GameCanvas.jsx','utf8');
  assert.match(file,/\[1\.4,1\.9\]/);
  assert.match(file,/antialias:true/);
});
