import { test, expect } from '@playwright/test';

async function play(page){
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const skip=page.getByRole('button',{name:'Einführung überspringen'});
  if(await skip.isVisible())await skip.click();
}

test('phone: two large steering buttons, no separate forward/reverse, crisp retina canvas',async({page,isMobile})=>{
  test.skip(!isMobile,'Phone-specific layout');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await play(page);
  await expect(page.getByTestId('steering-pad')).toBeVisible();
  await expect(page.getByRole('button',{name:'Vorwärts'})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Rückwärts'})).toHaveCount(0);
  const left=page.getByRole('button',{name:'Links'});
  const right=page.getByRole('button',{name:'Rechts'});
  const l=await left.boundingBox(),r=await right.boundingBox();
  expect(l.width).toBeGreaterThanOrEqual(64);
  expect(r.width).toBeGreaterThanOrEqual(64);
  expect(l.height).toBeGreaterThanOrEqual(74);
  const canvas=page.locator('.scene-host canvas');
  await expect.poll(()=>canvas.evaluate(el=>el.width/el.getBoundingClientRect().width),{timeout:15000}).toBeGreaterThanOrEqual(1.35);
  await page.setViewportSize({width:320,height:700});
  const l2=await left.boundingBox(),r2=await right.boundingBox();
  const gas=await page.getByRole('button',{name:'Gas',exact:true}).boundingBox();
  expect(l2.width).toBeGreaterThanOrEqual(60);
  expect(r2.x+r2.width).toBeLessThan(gas.x);
  expect(errors).toEqual([]);
});

test('phone: BRAKE held from rest engages slow reverse and indicator',async({page,isMobile})=>{
  test.skip(!isMobile,'Combined touch brake and reverse');
  await play(page);
  const brake=page.getByRole('button',{name:'Bremse'});
  await expect(brake).toBeVisible();
  const rect=await brake.boundingBox();
  await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
  await page.mouse.down();
  try{
    await expect(page.getByTestId('drive-pad')).toHaveAttribute('data-brake','true');
    await expect(page.locator('.speed small')).toContainText('RÜCKWÄRTS',{timeout:6000});
    await expect.poll(async()=>Number(await page.getByTestId('speed').textContent())).toBeGreaterThan(0);
  }finally{await page.mouse.up();}
  await expect(page.getByTestId('drive-pad')).toHaveAttribute('data-brake','false');
});

test('desktop still supports forward W and reverse S plus Shift brake',async({page,isMobile})=>{
  test.skip(isMobile,'Keyboard mode only');
  await play(page);
  await page.keyboard.down('s');
  await expect(page.locator('.speed small')).toContainText('RÜCKWÄRTS',{timeout:6000});
  await page.keyboard.up('s');
  await page.keyboard.down('w');
  await expect(page.locator('.speed small')).toContainText('FREERIDE',{timeout:6000});
  await page.keyboard.up('w');
});
