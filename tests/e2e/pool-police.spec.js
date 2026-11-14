import {test,expect} from '@playwright/test';
const enter=async(page,spawn)=>{
  await page.addInitScript(()=>localStorage.setItem('aliasaf-scooter-tutorial-seen-v1','1'));
  await page.goto('/?spawn='+spawn);
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const skip=page.getByRole('button',{name:'Einführung überspringen'});
  if(await skip.isVisible().catch(()=>false))await skip.click();
};

test('slide down the water slide and land swimming in the pool',async({page})=>{
  // Software-rendered CI GPUs run the ~40 m slide at a few FPS; game time is frame-clamped.
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'pool');
  const slideButton=page.getByRole('button',{name:'Rutschen'});
  await expect(slideButton).toBeVisible({timeout:15000});
  await slideButton.click();
  await expect(page.getByTestId('slide-status')).toBeVisible({timeout:5000});
  await expect(page.getByTestId('swim-status')).toBeVisible({timeout:90000});
  await expect(page.getByTestId('swim-status')).toContainText('Tiefe');
  expect(errors).toEqual([]);
});

test('drive into the pool, swim and climb back out to the scooter',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'poolside');
  await page.keyboard.down('w');
  await expect(page.getByTestId('swim-status')).toBeVisible({timeout:15000});
  await page.keyboard.up('w');
  const out=page.getByRole('button',{name:'Aus dem Becken klettern'});
  await expect(out).toBeEnabled({timeout:5000});
  await out.click();
  await expect(page.getByTestId('swim-status')).toBeHidden({timeout:5000});
  // Back on the scooter: driving changes the speed again.
  await page.keyboard.down('s');
  await expect.poll(async()=>Number(await page.getByTestId('speed').textContent()),{timeout:8000}).toBeGreaterThan(0);
  await page.keyboard.up('s');
  expect(errors).toEqual([]);
});

test('police station spawn renders without errors',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'police');
  await page.waitForTimeout(1500);
  await expect(page.locator('.scene-host canvas')).toBeVisible();
  expect(errors).toEqual([]);
});
