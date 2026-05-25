const { test } = require('@playwright/test');

test('FORCE timeout on New button', async ({ page }) => {

  await page.goto('https://orgfarm-33b82f167b-dev-ed.develop.lightning.force.com/lightning/page/home');

  await page.locator('a[title="Leads"]').click();

  await page.waitForSelector('button[name="New"]', { timeout: 1000 });

  await page.click('button[name="New"]');
});
