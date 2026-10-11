import test from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile, loadProfile, chooseUpgrade, PROFILE_KEY } from '../src/customization.js';

test('repeatable rewards can fund garage upgrades and persist locally',()=>{
  const storage=new Map();
  let player=initialProfile();
  for(let i=0;i<3;i++)player={...player,coins:player.coins+1000};
  assert.equal(player.coins,3000);
  const sport=chooseUpgrade(player,'garage','model','sport');
  assert.equal(sport.paid,650);
  assert.equal(sport.profile.coins,2350);
  player=chooseUpgrade(sport.profile,'garage','model','city').profile;
  const again=chooseUpgrade(player,'garage','model','sport');
  assert.equal(again.paid,0);
  player=chooseUpgrade(again.profile,'rider','watch',true).profile;
  assert.equal(player.coins,2050);
  storage.set(PROFILE_KEY,JSON.stringify(player));
  const loaded=loadProfile({getItem:k=>storage.get(k)??null});
  assert.equal(loaded.coins,2050);
  assert.equal(loaded.garage.model,'sport');
  assert.equal(loaded.rider.watch,true);
});
test('insufficient funds never change the model',()=>{
  const current=initialProfile();
  const result=chooseUpgrade(current,'garage','model','classic');
  assert.ok(result.error);
  assert.deepEqual(result.profile,current);
});
test('legacy wallet remains intact on first profile migration',()=>{
  const old={getItem:key=>key==='fahre-ein-murat-wallet-v1'?JSON.stringify({coins:4200,completed:['slalom']}):null};
  assert.equal(loadProfile(old).coins,4200);
});

test('missing, null or damaged rider profile never loses default helmet/pants',()=>{
  const storage={getItem:key=>key===PROFILE_KEY?JSON.stringify({coins:321,rider:null,garage:null,owned:null}):null};
  const loaded=loadProfile(storage);
  assert.equal(loaded.coins,321);
  assert.equal(loaded.rider.helmet,true);
  assert.equal(loaded.rider.pants,'#1f2832');
  assert.equal(loaded.garage.model,'city');
  assert.deepEqual(loaded.owned,[]);
  const patched=chooseUpgrade(loaded,'rider','helmet',false);
  assert.equal(patched.profile.rider.helmet,false);
  assert.equal(patched.profile.garage.model,'city');
});

test('upgrades can be applied to a legacy profile with missing fields',()=>{
  const broken={coins:800,garage:null,rider:undefined,owned:undefined};
  const result=chooseUpgrade(broken,'rider','watch',true);
  assert.equal(result.error,undefined);
  assert.equal(result.profile.rider.watch,true);
  assert.equal(result.profile.rider.helmet,true);
  assert.equal(result.profile.coins,500);
});
