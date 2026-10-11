import { test, expect } from '@playwright/test';

const PROFILE_KEY='fahre-ein-murat-profile-v2';
const open=async page=>{
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const skip=page.getByRole('button',{name:'Einführung überspringen'});
  if(await skip.isVisible())await skip.click();
};

test('regression: entering Zuhause with missing rider fields never crashes',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(key=>{
    if(!sessionStorage.getItem('__homeRegressionSeeded')){
      localStorage.setItem(key,JSON.stringify({coins:1000,garage:null,rider:null,owned:null}));
      sessionStorage.setItem('__homeRegressionSeeded','1');
    }
  },PROFILE_KEY);
  await open(page);
  await page.getByRole('button',{name:'Zuhause öffnen'}).click();
  const home=page.getByRole('dialog',{name:'Zuhause'});
  await expect(home).toBeVisible();
  await expect(home.locator('canvas')).toBeVisible();
  const helmet=home.locator('.picker-section').filter({hasText:/^Helm(?!farbe)/i});
  await helmet.getByRole('button',{name:'Abnehmen'}).click();
  await expect(helmet.getByRole('button',{name:'Abnehmen'})).toHaveClass(/selected/);
  const watch=home.locator('.picker-section').filter({hasText:'Armbanduhr'});
  await watch.getByRole('button',{name:/Anziehen/}).click();
  await expect(watch.getByRole('button',{name:/Anziehen/})).toHaveClass(/selected/);
  await home.getByRole('button',{name:'Helmfarbe #ff733d'}).click();
  const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),PROFILE_KEY);
  assertProfile(saved);
  await home.getByRole('button',{name:'Schließen'}).click();
  await page.reload();
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await page.getByRole('button',{name:'Zuhause öffnen'}).click();
  await expect(page.getByRole('dialog',{name:'Zuhause'}).getByRole('button',{name:'Helmfarbe #ff733d'}))
    .toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('dialog',{name:'Zuhause'}).locator('canvas')).toBeVisible();
  expect(errors).toEqual([]);
});

function assertProfile(saved){
  expect(saved.coins).toBe(700);
  expect(saved.rider.helmet).toBe(false);
  expect(saved.rider.watch).toBe(true);
  expect(saved.rider.helmetColor).toBe('#ff733d');
  expect(saved.garage.model).toBe('city');
}

test('regression: garage → Zuhause → garage changes keep both 3D studios alive',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  for(const room of ['Garage öffnen','Zuhause öffnen','Garage öffnen']){
    await page.getByRole('button',{name:room}).click();
    const dialog=page.getByRole('dialog',{name:room==='Zuhause öffnen'?'Zuhause':'Murat Garage'});
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('canvas')).toBeVisible();
    await dialog.getByRole('button',{name:'Modell rechts drehen'}).click();
    await dialog.getByRole('button',{name:'Schließen'}).click();
  }
  expect(errors).toEqual([]);
});
