// HCM-PERSON-SEARCH: find an employee in Person Management and open their record.
//
// For Xenon's Execute agent, pulled from GitHub. Xenon signs in to Oracle before the run
// (Fusion login, headed Edge) and sets the pod as baseURL, so this file has no login steps
// and uses relative URLs. It is self-contained: only the file itself is downloaded.
//
// Read-only: it changes nothing, so it can be run any number of times. Curtis Feitty
// (person number 101) is part of the pod's own demo data. Written for pod fa-esev-dev18.
const { test, expect } = require('@playwright/test');

const PERSON_NUMBER = '101';
const SURNAME = 'Feitty';

test('Search for an employee in Person Management and open the record', async ({ page }) => {
  // Home > My Client Groups > Person Management
  await page.goto('/fscmUI/faces/FuseWelcome');
  const clientGroups = page.getByText('My Client Groups', { exact: true }).first();
  await expect(clientGroups).toBeVisible({ timeout: 120000 });
  await clientGroups.click();
  const personManagement = page.getByText('Person Management', { exact: true }).first();
  await expect(personManagement).toBeVisible({ timeout: 90000 });
  await personManagement.click();
  await expect(page.getByRole('heading', { name: 'Person Management: Search' })).toBeVisible({ timeout: 120000 });

  // Search by person number
  const personNumber = page.getByLabel('Person Number', { exact: true });
  await expect(personNumber).toBeEditable({ timeout: 60000 });
  await personNumber.fill(PERSON_NUMBER);
  await page.getByRole('button', { name: 'Search', exact: true }).click();

  // The result row is the person
  const result = page.getByRole('link', { name: new RegExp(SURNAME) }).first();
  await expect(result).toBeVisible({ timeout: 90000 });
  await page.screenshot({ path: test.info().outputPath('search-result.png') });

  // Open the record: the person's page shows their employment and person number
  await result.click();
  await expect(page.getByText('Work Relationship').first()).toBeVisible({ timeout: 120000 });
  await expect(page.getByText(new RegExp(`Curtis.*${SURNAME}|${SURNAME},? Curtis`)).first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(PERSON_NUMBER, { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(3000); // let the header finish drawing for the screenshot
  await page.screenshot({ path: test.info().outputPath('person.png') });
  console.log(`OPENED: person ${PERSON_NUMBER} (Curtis ${SURNAME})`);
});
