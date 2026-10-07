// TC035 (OH-8, AC1): start a job requisition and choose to create it from a Job.
//
// SELF-HEAL DEMO: the Create button's locator below is deliberately broken. It looks for a
// link (a[aria-label="Create"]) where Oracle renders a button, so the first run fails at
// that click. Self-Heal reads the label "Create" from the broken locator and tries the
// button by role/label/text; Rerun Failed then passes. Nothing is saved, so no requisition
// or draft is created (a draft starts only after Basic info). A run takes 1-2 minutes.
//
// For Xenon's Execute agent, pulled from GitHub: Xenon signs in to Oracle first and sets
// the pod as baseURL, so there are no login steps and URLs are relative.
const { test, expect } = require('@playwright/test');

test('Start a job requisition from a Job', async ({ page }) => {
  // Hiring > Requisitions
  await page.goto('/fscmUI/redwood/recruiting-hiring/hiring/landing');
  await expect(page.getByRole('heading', { name: 'Recruiting Activity Center' })).toBeVisible({ timeout: 90000 });
  const listSearch = page.getByPlaceholder('Search by requisition title, number, or description');
  const requisitionsTab = page.getByText('Requisitions', { exact: true }).first();
  await expect(async () => {
    if (!(await listSearch.isVisible())) await requisitionsTab.click({ timeout: 5000 });
    await expect(listSearch).toBeVisible({ timeout: 10000 });
  }).toPass({ timeout: 90000 });

  // Create (BROKEN ON PURPOSE: Oracle's Create is a button, not a link)
  await page.locator('a[aria-label="Create"]').click();

  // Step 1 How to start: create from a Job
  await expect(page.getByRole('heading', { name: 'Step 1 of 12 How to start', exact: true })).toBeVisible({ timeout: 60000 });
  const using = page.getByRole('combobox', { name: 'Create Requisition Using', exact: true });
  await expect(using).toBeVisible({ timeout: 30000 });
  await using.focus();
  await page.keyboard.press('ArrowDown');
  const job = page
    .locator('[role="row"], [role="option"], tbody tr, [role="listbox"] li')
    .filter({ hasText: /^\s*Job\s*$/ })
    .filter({ visible: true })
    .first();
  await expect(job).toBeVisible({ timeout: 30000 });
  await job.click();

  // Creating from a Job asks for the Business Unit and the Job next
  await expect(page.getByRole('combobox', { name: 'Business Unit', exact: true })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('combobox', { name: 'Job', exact: true })).toBeVisible({ timeout: 30000 });
  console.log('STARTED: Create Requisition Using = Job');
});
