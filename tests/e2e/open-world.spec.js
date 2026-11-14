import {test,expect} from '@playwright/test';
const enter=async(page,query='')=>{
  await page.addInitScript(()=>localStorage.setItem('aliasaf-scooter-tutorial-seen-v1','1'));
  await page.goto('/'+query);
  await page.getByRole('button',{name:/JETZT FAHREN/}).click();
  await expect(page.locator('.scene-host canvas')).toBeVisible({timeout:25000});
};

test('open-world HUD shows the minimap and a healthy scooter',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page);
  await expect(page.getByTestId('minimap')).toBeVisible();
  await expect(page.getByTestId('damage')).toContainText('WIE NEU');
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('walk into the police station, talk to the officer and leave again',async({page})=>{
  test.setTimeout(120000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await enter(page,'?spawn=station');
  const door=page.getByRole('button',{name:'Polizeiwache betreten'});
  await expect(door).toBeVisible({timeout:20000});
  await door.click();
  await expect(page.getByTestId('station-status')).toBeVisible({timeout:10000});
  await expect(page.locator('.speed small')).toContainText('ZU FUSS');
  // Walk from the door towards the reception desk.
  await page.keyboard.down('a');
  await expect(page.getByRole('button',{name:'Polizeiwache verlassen'})).toBeVisible({timeout:10000});
  await page.keyboard.up('a');
  await page.getByRole('button',{name:'Polizeiwache verlassen'}).click();
  await expect(page.getByTestId('station-status')).toBeHidden({timeout:10000});
  await expect(page.locator('.speed small')).toContainText('FREERIDE');
  expect(errors).toEqual([]);
});
