import test from 'node:test';
import assert from 'node:assert/strict';
import { installNoZoom, VIEWPORT } from '../src/noZoom.js';

// Minimal fake DOM: event targets that record listeners.
function target(extra = {}) {
  const map = new Map();
  return Object.assign({
    addEventListener: (t, f) => map.set(t, f), removeEventListener: t => map.delete(t),
    fire: (t, e) => map.get(t)?.(e), has: t => map.has(t),
  }, extra);
}
const event = (o = {}) => ({ cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, ...o });
const el = (selectors = []) => ({ closest: s => selectors.some(x => s.split(',').includes(x)) ? { click() { this.clicked = (this.clicked || 0) + 1; } } : null });
function setup() {
  let content = 'width=device-width';
  const meta = { setAttribute: (_, v) => { content = v; }, get content() { return content; } };
  const vv = target({ scale: 1 });
  const timers = [];
  const win = target({ visualViewport: vv, setTimeout: f => timers.push(f) });
  const doc = target({ querySelector: () => meta });
  const remove = installNoZoom(win, doc);
  return { win, doc, vv, meta, timers, remove };
}

test('viewport is locked to 100 %',()=>{
  const { meta } = setup();
  assert.equal(meta.content, VIEWPORT);
  assert.match(VIEWPORT, /maximum-scale=1/);
  assert.match(VIEWPORT, /user-scalable=no/);
});
test('pinch is blocked: Safari gesture events and two-finger moves',()=>{
  const { doc } = setup();
  const g = event(); doc.fire('gesturestart', g); assert.ok(g.prevented);
  const two = event({ touches: [{}, {}], target: el(['.studio-options']) }); doc.fire('touchmove', two); assert.ok(two.prevented);
});
test('one finger may still scroll the studio lists, but not the game',()=>{
  const { doc } = setup();
  const list = event({ touches: [{}], target: el(['.studio-options']) }); doc.fire('touchmove', list); assert.ok(!list.prevented);
  const game = event({ touches: [{}], target: el() }); doc.fire('touchmove', game); assert.ok(game.prevented);
});
test('quick double tap does not zoom, but the second tap on a button still clicks',()=>{
  const { doc } = setup();
  const button = el(['button']);
  const first = event({ touches: [], changedTouches: [{ clientX: 100, clientY: 100 }], timeStamp: 1000, target: button });
  doc.fire('touchend', first); assert.ok(!first.prevented);
  const second = event({ touches: [], changedTouches: [{ clientX: 104, clientY: 98 }], timeStamp: 1200, target: { closest: () => button.target ?? (button.btn ??= { click() { this.n = (this.n || 0) + 1; } }) } });
  doc.fire('touchend', second); assert.ok(second.prevented);
  assert.equal(button.btn.n, 1);
  const later = event({ touches: [], changedTouches: [{ clientX: 100, clientY: 100 }], timeStamp: 2000, target: el() });
  doc.fire('touchend', later); assert.ok(!later.prevented);
  // Thumbs on gas and steering at once: lifting one while the other holds is no double tap.
  const holding = event({ touches: [{}], changedTouches: [{ clientX: 100, clientY: 100 }], timeStamp: 2100, target: el() });
  doc.fire('touchend', holding); assert.ok(!holding.prevented);
});
test('ctrl + wheel zoom is blocked, plain wheel is not',()=>{
  const { win } = setup();
  const z = event({ ctrlKey: true }); win.fire('wheel', z); assert.ok(z.prevented);
  const w = event({ ctrlKey: false }); win.fire('wheel', w); assert.ok(!w.prevented);
});
test('if the page is zoomed anyway, it snaps back to 100 %',()=>{
  const { vv, meta, timers } = setup();
  vv.scale = 2.3; vv.fire('resize');
  assert.notEqual(meta.content, VIEWPORT);
  timers.shift()();
  assert.equal(meta.content, VIEWPORT);
  vv.scale = 1; vv.fire('resize');
  assert.equal(timers.length, 0);
});
test('cleanup removes every listener',()=>{
  const { doc, win, vv, remove } = setup();
  remove();
  for (const t of ['gesturestart', 'touchmove', 'touchend', 'dblclick']) assert.ok(!doc.has(t));
  assert.ok(!win.has('wheel') && !vv.has('resize'));
});
