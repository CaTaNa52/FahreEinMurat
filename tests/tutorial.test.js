import test from 'node:test';
import assert from 'node:assert/strict';
import { TUTORIAL_STEPS, TUTORIAL_KEY, hasSeenTutorial, markTutorialSeen } from '../src/tutorial.js';
test('first launch must show 4 introduction steps including home, garage, challenges and controls',()=>{
  const store=new Map();
  const storage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
  assert.equal(hasSeenTutorial(storage),false);
  assert.deepEqual(TUTORIAL_STEPS.map(step=>step.id),['home','garage','challenges','controls']);
  for(const step of TUTORIAL_STEPS)assert.ok(step.title&&step.description);
  markTutorialSeen(storage);
  assert.equal(store.get(TUTORIAL_KEY),'1');
  assert.equal(hasSeenTutorial(storage),true);
});
test('storage blocked by browser privacy settings does not crash tutorial',()=>{
  const blocked={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
  assert.equal(hasSeenTutorial(blocked),false);
  assert.doesNotThrow(()=>markTutorialSeen(blocked));
});
