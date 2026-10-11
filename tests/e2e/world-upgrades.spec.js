import {test,expect} from '@playwright/test';
const profileKey='fahre-ein-murat-profile-v2';
const enter=async page=>{
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const skip=page.getByRole('button',{name:'Einführung überspringen'});
  if(await skip.isVisible())await skip.click();
};

test('new streets, solid world props, 3D garage underglow and custom neon persist',async({page})=>{
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({
    coins:2500,garage:{},rider:{},owned:[]
  })),profileKey);
  await enter(page);
  await page.getByRole('button',{name:'Garage öffnen'}).click();
  const garage=page.getByRole('dialog',{name:'Murat Garage'});
  await expect(garage).toBeVisible();
  const glowSection=garage.locator('.picker-section').filter({hasText:'Unterbodenbeleuchtung'});
  await glowSection.getByRole('button',{name:/Neon an/}).click();
  await expect(glowSection.getByRole('button',{name:/Neon an/})).toHaveClass(/selected/);
  await garage.getByRole('button',{name:'Neon-Farbe #ff733d'}).click();
  await expect(garage.getByRole('button',{name:'Neon-Farbe #ff733d'}))
    .toHaveAttribute('aria-pressed','true');
  await garage.getByRole('button',{name:'Schließen'}).click();
  const current=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),profileKey);
  expect(current.garage.underglow).toBe(true);
  expect(current.garage.glowColor).toBe('#ff733d');
  expect(current.coins).toBe(2250);
  await expect(page.locator('.scene-host canvas')).toBeVisible();
  await page.keyboard.down('w');
  await page.waitForTimeout(280);
  await page.keyboard.up('w');
  await page.getByRole('button',{name:'Zuhause öffnen'}).click();
  await expect(page.getByRole('dialog',{name:'Zuhause'})).toBeVisible();
  await page.getByRole('dialog',{name:'Zuhause'}).getByRole('button',{name:'Schließen'}).click();
  await page.getByRole('button',{name:'Garage öffnen'}).click();
  await expect(page.getByRole('button',{name:'Neon-Farbe #ff733d'}))
    .toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});
