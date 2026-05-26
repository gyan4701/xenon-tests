import { test, expect } from '@playwright/test';

test('Login to Sauce Demo and validate Products page', async ({ page }) => {
  await page.goto('https://www.saucedemo.com/');

  await page.locator('#user-name').fill('standard_user');
  await page.locator('#password').fill('secret_sauce');

  await page.locator('#login-button').click();

  await expect(page).toHaveURL(/inventory/);

  await expect(page.locator('.title')).toHaveText('Products');

  await page.screenshot({
    path: 'screenshots/login-success.png',
    fullPage: true
  });
});
