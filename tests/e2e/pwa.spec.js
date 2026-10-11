import { test, expect } from '@playwright/test';

test('PWA is installable and blocks accidental text selection on touchscreens',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect(page.getByTestId('install-prompt')).toBeVisible();
  const manifest=await page.evaluate(async()=>await (await fetch('/manifest.webmanifest')).json());
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some(icon=>icon.sizes==='512x512')).toBe(true);
  expect(await page.evaluate(()=>getComputedStyle(document.body).userSelect)).toBe('none');
  await page.getByRole('button',{name:'App-Installation anzeigen'}).click();
  await expect(page.getByTestId('install-prompt').getByRole('status')).toBeVisible();
  await page.getByRole('button',{name:'Installationshinweis schließen'}).click();
  await expect(page.getByTestId('install-prompt')).toHaveCount(0);
  await page.getByRole('button',{name:'App-Installation öffnen'}).click();
  await expect(page.getByTestId('install-prompt')).toBeVisible();
  expect(errors).toEqual([]);
});

test('native install prompt is triggered only by user click (never silently)',async({page})=>{
  await page.goto('/');
  await expect(page.getByTestId('install-prompt')).toBeVisible();
  await page.evaluate(()=>{
    const e=new Event('beforeinstallprompt',{cancelable:true});
    e.prompt=()=>{window.__installPromptCalled=true;return Promise.resolve();};
    e.userChoice=Promise.resolve({outcome:'accepted'});
    window.dispatchEvent(e);
  });
  await expect(page.getByRole('button',{name:'App jetzt installieren'})).toBeVisible();
  expect(await page.evaluate(()=>window.__installPromptCalled||false)).toBe(false);
  await page.getByRole('button',{name:'App jetzt installieren'}).click();
  await expect.poll(()=>page.evaluate(()=>!!window.__installPromptCalled)).toBe(true);
  await expect(page.getByTestId('install-prompt')).toHaveCount(0);
});

test('service worker serves all lazy chunks so the game opens offline',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller),{timeout:18000}).toBe(true);
  await page.evaluate(async()=>{
    await navigator.serviceWorker.ready;
    const keys=await caches.keys();
    if(!keys.some(key=>key.startsWith('murat-pwa-')))throw Error('PWA cache missing');
  });
  await page.context().setOffline(true);
  try{
    await page.reload({waitUntil:'domcontentloaded'});
    await expect(page.getByRole('button',{name:/JETZT FAHREN/})).toBeVisible();
    await page.getByRole('button',{name:/JETZT FAHREN/}).click();
    await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  }finally{await page.context().setOffline(false);}
  expect(errors).toEqual([]);
});
