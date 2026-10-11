import { test, expect } from '@playwright/test';

async function launch(page){
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
  const intro=page.getByRole('button',{name:'Einführung überspringen'});
  if(await intro.isVisible())await intro.click();
}

test('first/third person camera toggle works via HUD and V key',async({page})=>{
  await launch(page);
  const button=page.getByTestId('camera-toggle');
  await expect(button).toContainText('1ST');
  await button.click();
  await expect(button).toContainText('3RD');
  await page.keyboard.press('v');
  await expect(button).toContainText('1ST');
});

test('garage and home show rotating 3D models with saved custom colors',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await launch(page);
  await page.getByRole('button',{name:'Garage öffnen'}).click();
  const garage=page.getByRole('dialog',{name:'Murat Garage'});
  await expect(garage).toBeVisible();
  await expect(garage.locator('canvas')).toBeVisible();
  await garage.getByRole('button',{name:'Scooter-Farbe #ff733d'}).click();
  await expect(garage.getByRole('button',{name:'Scooter-Farbe #ff733d'})).toHaveAttribute('aria-pressed','true');
  await garage.getByRole('button',{name:'Modell rechts drehen'}).click();
  await garage.getByRole('button',{name:'Schließen'}).click();
  await page.getByRole('button',{name:'Zuhause öffnen'}).click();
  const home=page.getByRole('dialog',{name:'Zuhause'});
  await expect(home).toBeVisible();
  await expect(home.locator('canvas')).toBeVisible();
  await home.getByRole('button',{name:'Oberkörper / Jacke #4a8aff'}).click();
  await home.getByRole('button',{name:'Schließen'}).click();
  await page.reload();
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  const intro=page.getByRole('button',{name:'Einführung überspringen'});
  if(await intro.isVisible())await intro.click();
  await page.getByRole('button',{name:'Garage öffnen'}).click();
  await expect(page.getByRole('button',{name:'Scooter-Farbe #ff733d'})).toHaveAttribute('aria-pressed','true');
  expect(errors).toEqual([]);
});
