import test from 'node:test';
import assert from 'node:assert/strict';
import { zoomAt, clampView, fitWorld, MAP_ZOOM } from '../src/mapView.js';
import { WORLD } from '../src/worldLayout.js';

const worldAt=(v,sx,sy,w,h)=>[v.x+(sx-w/2)/v.scale,v.z+(sy-h/2)/v.scale];
test('zooming keeps the spot under the finger in place',()=>{
  const view={scale:2,x:10,z:-40},before=worldAt(view,300,120,800,600);
  const zoomed=zoomAt(view,1.5,300,120,800,600);
  assert.equal(zoomed.scale,3);
  const after=worldAt(zoomed,300,120,800,600);
  assert.ok(Math.abs(after[0]-before[0])<1e-9&&Math.abs(after[1]-before[1])<1e-9);
});
test('zoom is limited and the view never leaves the world',()=>{
  let view={scale:2,x:0,z:0};
  for(let i=0;i<30;i++)view=zoomAt(view,2,400,300,800,600);
  assert.equal(view.scale,MAP_ZOOM.max);
  for(let i=0;i<30;i++)view=zoomAt(view,.5,400,300,800,600);
  assert.equal(view.scale,MAP_ZOOM.min);
  assert.deepEqual(clampView({scale:1,x:9999,z:-9999}),{scale:1,x:WORLD/2,z:-WORLD/2});
});
test('"whole map" fits the world on a phone and on a monitor',()=>{
  for(const [w,h] of [[390,844],[1280,720]]){
    const v=fitWorld(w,h);
    assert.ok(WORLD*v.scale<=Math.max(Math.min(w,h),WORLD*MAP_ZOOM.min));
    assert.equal(v.x,0);
  }
});
