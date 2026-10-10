import { test, expect } from '@playwright/test';
test('Start screen opens a rendered, playable 3D scene', async ({ page, isMobile }) => {
 const exceptions = [];
 page.on('pageerror', e => exceptions.push(e.message));
 await page.goto('/');
 await expect(page.getByRole('button', { name: /JETZT FAHREN/ })).toBeVisible();
 await page.getByRole('button', { name: /JETZT FAHREN/ }).click();
 await expect(page.locator('canvas')).toBeVisible({ timeout: 25000 });
 await expect(page.getByTestId('speed')).toBeVisible();
 if (isMobile) {
   const gas = page.getByRole('button', { name: 'Gas', exact: true });
   const rect = await gas.boundingBox();
   expect(rect).not.toBeNull();
   await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
   await page.mouse.down();
   await page.waitForTimeout(1100);
   await page.mouse.up();
 } else {
   await page.keyboard.down('w');
   await page.waitForTimeout(1100);
   await page.keyboard.up('w');
 }
 await expect.poll(async () => Number(await page.getByTestId('speed').textContent())).toBeGreaterThan(0);
 expect(exceptions).toEqual([]);
});
