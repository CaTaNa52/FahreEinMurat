import { test, expect } from '@playwright/test';

const center=async locator=>{
  const r=await locator.boundingBox();
  expect(r).not.toBeNull();
  return {x:r.x+r.width/2,y:r.y+r.height/2};
};
async function start(page){
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('canvas')).toBeVisible({timeout:25000});
  const intro=page.getByRole('button',{name:'Einführung überspringen'});
  if(await intro.isVisible())await intro.click();
  await expect(page.getByTestId('drive-pad')).toBeVisible();
}

test('mobile: slide one held thumb from GAS to WHEELIE, back to GAS, then BREMSE',async({page,isMobile})=>{
  test.skip(!isMobile,'One-thumb gesture is primarily for phones');
  await start(page);
  const pad=page.getByTestId('drive-pad');
  const gas=await center(page.getByRole('button',{name:'Gas',exact:true}));
  const wheelie=await center(page.getByRole('button',{name:'Wheelie halten'}));
  const brake=await center(page.getByRole('button',{name:'Bremse'}));
  await page.mouse.move(gas.x,gas.y);
  await page.mouse.down();
  await expect(pad).toHaveAttribute('data-gas','true');
  await page.mouse.move(wheelie.x,wheelie.y,{steps:8});
  await expect(pad).toHaveAttribute('data-gas','true');
  await expect(pad).toHaveAttribute('data-wheelie','true');
  await page.mouse.move(gas.x,gas.y,{steps:8});
  await expect(pad).toHaveAttribute('data-wheelie','false');
  await expect(pad).toHaveAttribute('data-gas','true');
  await page.mouse.move(brake.x,brake.y,{steps:8});
  await expect(pad).toHaveAttribute('data-brake','true');
  await expect(pad).toHaveAttribute('data-gas','false');
  await page.mouse.up();
  await expect(pad).toHaveAttribute('data-brake','false');
});

test('mobile: second finger steers without releasing first-finger gas',async({page,isMobile})=>{
  test.skip(!isMobile,'Multitouch only applies on phones');
  await start(page);
  const pad=page.getByTestId('drive-pad');
  const gas=await center(page.getByRole('button',{name:'Gas',exact:true}));
  const left=await center(page.getByRole('button',{name:'Links'}));
  const cdp=await page.context().newCDPSession(page);
  const a={x:Math.round(gas.x),y:Math.round(gas.y),id:1};
  const b={x:Math.round(left.x),y:Math.round(left.y),id:2};
  try{
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a]});
    await expect(pad).toHaveAttribute('data-gas','true');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[a,b]});
    await expect(page.getByRole('button',{name:'Links'})).toHaveClass(/held/);
    await expect(pad).toHaveAttribute('data-gas','true');
    // CDP's touchEnd terminates the full synthetic touch sequence.
    // A separate unit test covers releasing only the second pointer.
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await expect(page.getByRole('button',{name:'Links'})).not.toHaveClass(/held/);
    await expect(pad).toHaveAttribute('data-gas','false');
  } finally {
    await cdp.detach();
  }
});
