// RAISE-A-DEFECT DEMO: fails every time, and Self-Heal refuses to "fix" it.
//
// Requirement checked: the Oracle home page's browser tab names the company
// ("Vision Corporation"), so people who keep several Oracle environments open in tabs can
// tell them apart. The pod's home page is titled "Oracle Fusion Cloud Applications" (read on
// fa-etar-dev11, 2026-10-07), so the check fails on what the APPLICATION shows, not on a
// broken script: there is no locator in this file for Self-Heal to repair. That is the case
// for Raise Defect. The run takes under a minute and creates nothing.
//
// For Xenon's Execute agent, pulled from GitHub: Xenon signs in to Oracle first and sets the
// pod as baseURL, so there are no login steps and the URL is relative.
const { test, expect } = require('@playwright/test');

const COMPANY = 'Vision Corporation';

test('Home page browser tab shows the company name', async ({ page }) => {
  await page.goto('/fscmUI/faces/FuseWelcome', { timeout: 120000 });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(5000); // the home page settles its title after loading

  const title = await page.title();
  console.log(`Home page title: "${title}"`);
  expect(title, `The home page's browser tab should name the company (${COMPANY})`).toContain(COMPANY);
});
