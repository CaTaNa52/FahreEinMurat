import { test, expect } from '@playwright/test';

const open=async page=>{
  await page.goto('/');
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
};

test('first run introduces actual home, garage, challenges and driving controls; skip persists',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await open(page);
  const tutorial=page.getByRole('dialog',{name:'Spieleinführung'});
  await expect(tutorial).toBeVisible();
  await expect(tutorial).toContainText('Hier ist dein Zuhause');
  await tutorial.getByRole('button',{name:'WEITER'}).click();
  await expect(tutorial).toContainText('Hier ist deine Murat-Garage');
  await tutorial.getByRole('button',{name:'WEITER'}).click();
  await expect(tutorial).toContainText('Auf der Karte warten Challenges');
  await tutorial.getByRole('button',{name:'WEITER'}).click();
  await expect(tutorial).toContainText('So steuerst du deinen Scooter');
  await tutorial.getByRole('button',{name:'LOSFAHREN'}).click();
  await expect(tutorial).toHaveCount(0);
  await page.reload();
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(tutorial).toHaveCount(0);
  await page.getByRole('button',{name:'Einführung erneut ansehen'}).click();
  await expect(tutorial).toContainText('Hier ist dein Zuhause');
  await tutorial.getByRole('button',{name:'Einführung überspringen'}).click();
  await expect(tutorial).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('introduction skip allows immediate driving and opens normally on mobile',async({page})=>{
  await open(page);
  const tutorial=page.getByRole('dialog',{name:'Spieleinführung'});
  await expect(tutorial).toBeVisible();
  await tutorial.getByRole('button',{name:'Einführung überspringen'}).click();
  await expect(tutorial).toHaveCount(0);
  const gas=page.getByRole('button',{name:'Gas',exact:true});
  await expect(gas).toBeVisible();
  await page.keyboard.down('w');
  await page.waitForTimeout(350);
  await page.keyboard.up('w');
  await expect.poll(async()=>Number(await page.getByTestId('speed').textContent())).toBeGreaterThan(0);
});
