import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isStandalone, isAppleMobile } from '../src/pwa.js';
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
test('PWA manifest supports standalone full-screen home screen installation',()=>{
  assert.equal(manifest.name,'Fahre Ein Murat – Scooter Open World');
  assert.equal(manifest.start_url,'/');
  assert.equal(manifest.scope,'/');
  assert.equal(manifest.display,'standalone');
  assert.ok(manifest.display_override.includes('fullscreen'));
  for(const size of [192,512]){
    const icon=manifest.icons.find(x=>x.sizes===size+'x'+size&&x.purpose==='any');
    assert.ok(icon,'Missing install icon '+size);
    const data=readFileSync('public'+icon.src);
    assert.equal(data.subarray(1,4).toString(),'PNG');
    assert.equal(data.readUInt32BE(16),size);
    assert.equal(data.readUInt32BE(20),size);
  }
  assert.ok(manifest.icons.some(x=>x.purpose==='maskable'&&x.sizes==='512x512'));
});
test('standalone detection works on Android and iOS without false positives',()=>{
  assert.equal(isStandalone({matchMedia:()=>({matches:true}),navigator:{}}),true);
  assert.equal(isStandalone({matchMedia:()=>({matches:false}),navigator:{standalone:true}}),true);
  assert.equal(isStandalone({matchMedia:()=>({matches:false}),navigator:{standalone:false}}),false);
  assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',platform:'iPhone',maxTouchPoints:5}),true);
  assert.equal(isAppleMobile({userAgent:'Mozilla/5.0 (Linux; Android 15)',platform:'Linux armv8',maxTouchPoints:5}),false);
});
test('offline worker precaches the app, not live backend data',()=>{
  const sw=readFileSync('public/sw.js','utf8');
  const vite=readFileSync('vite.config.js','utf8');
  assert.match(sw,/\bPRECACHE\b/);
  assert.match(sw,/skipWaiting/);
  assert.match(sw,/mode==='navigate'/);
  assert.match(sw,/request\.method!=='GET'/);
  assert.match(sw,/\bASSETS\b/);
  assert.match(vite,/writeBundle/);
  assert.match(vite,/Object\.keys\(bundle\)/);
  assert.match(vite,/__PRECACHE_MANIFEST__/);
  assert.match(vite,/__PRECACHE_VERSION__/);
});
