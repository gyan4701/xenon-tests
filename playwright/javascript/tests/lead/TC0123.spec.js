const { test, expect } = require('@playwright/test');

test('Create Salesforce Lead', async ({ page }) => {

  // Open Salesforce
  await page.goto('https://login.salesforce.com');

  // Login
  await page.fill('#username', 'your_username');
  await page.fill('#password', 'your_password');
  await page.click('#Login');

  // Wait for homepage
  await page.waitForLoadState('networkidle');

  // Open Leads tab
  await page.click('//a[@title="Leads"]');

  // Click New button
  await page.click('//a[@title="New"]');

  // Enter Lead Details
  await page.fill('//label[contains(text(),"Last Name")]/following::input[1]', 'Patil');

  await page.fill('//label[contains(text(),"Company")]/following::input[1]', 'ABC Technologies');

  // Save Lead
  await page.click('//button[@name="SaveEdit"]');

  // Verify Lead Created
  const toastMessage = page.locator(
    '//span[contains(@class,"toastMessage")]'
  );

  await expect(toastMessage).toContainText('Lead');

});
