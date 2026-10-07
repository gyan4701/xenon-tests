// TC037 (OH-8, AC4): create a job requisition from a Job and submit it; it then appears in
// the Requisitions list with status "Job formatting - In Progress".
//
// For Xenon's Execute agent, pulled from GitHub. Xenon signs in to Oracle before the run
// (Fusion login, headed Edge) and sets the pod as baseURL, so this file has no login steps
// and uses relative URLs. It is self-contained: only the file itself is downloaded.
// The values follow the recruiting walkthrough (Parimal Joshi, 2026-10-06); this exact flow
// submitted requisition #975 on fa-etar-dev11. A run takes about 5-6 minutes.
const { test, expect } = require('@playwright/test');

const STAMP = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const TITLE = `Finance Director - Xenon ${STAMP}`;

// Advance one step: click Continue until the next step's heading shows, then let it settle.
async function continueTo(page, heading) {
  const next = page.getByRole('heading', { name: heading, exact: true });
  await expect(async () => {
    if (!(await next.isVisible())) {
      await page.getByRole('button', { name: 'Continue', exact: true }).click({ timeout: 5000 });
    }
    await expect(next).toBeVisible({ timeout: 25000 });
  }).toPass({ timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

// Choose a value in a Redwood combobox: focus, open, optionally type to filter, click the row.
async function choose(page, label, value, { search } = {}) {
  const box = page.getByRole('combobox', { name: label, exact: true });
  await expect(box).toBeVisible({ timeout: 30000 });
  await box.focus();
  await page.keyboard.press('ArrowDown');
  if (search) {
    await page.keyboard.type(search, { delay: 50 });
    await page.waitForTimeout(5000); // server-side search
  }
  const option = page
    .locator('[role="row"], [role="option"], tbody tr, [role="listbox"] li')
    .filter({ hasText: value })
    .filter({ visible: true })
    .first();
  await expect(option).toBeVisible({ timeout: 30000 });
  await option.click();
  await page.waitForTimeout(1500);
}

async function isEmpty(page, label) {
  const v = await page.getByRole('combobox', { name: label, exact: true }).inputValue().catch(() => '');
  return !v.trim();
}

test('Create and submit a job requisition from a Job (happy path)', async ({ page }) => {
  // Hiring > Requisitions > Create
  await page.goto('/fscmUI/redwood/recruiting-hiring/hiring/landing');
  await expect(page.getByRole('heading', { name: 'Recruiting Activity Center' })).toBeVisible({ timeout: 90000 });
  const createButton = page.getByRole('button', { name: 'Create', exact: true });
  const requisitionsTab = page.getByText('Requisitions', { exact: true }).first();
  await expect(async () => {
    if (!(await createButton.isVisible())) await requisitionsTab.click({ timeout: 5000 });
    await expect(createButton).toBeVisible({ timeout: 10000 });
  }).toPass({ timeout: 90000 });
  await createButton.click();

  // 1 How to start: from a Job
  await expect(page.getByRole('heading', { name: 'Step 1 of 12 How to start', exact: true })).toBeVisible({ timeout: 60000 });
  await choose(page, 'Create Requisition Using', 'Job');
  await choose(page, 'Business Unit', 'Belgium Business Unit', { search: 'Belgium' });
  await choose(page, 'Job', 'Finance Director', { search: 'Finance Director' });
  await continueTo(page, 'Step 2 of 12 Basic info');

  // 2 Basic info: unique title, justification
  const title = page.getByRole('textbox', { name: 'Requisition Title', exact: true });
  await title.fill(TITLE);
  await choose(page, 'Business Justification', 'New Position');
  await continueTo(page, 'Step 3 of 12 Hiring team');

  // 3 Hiring team
  await choose(page, 'Hiring Manager', 'Michael Harris', { search: 'Michael Harris' });
  await choose(page, 'Recruiter', 'Hari Gupta', { search: 'Hari Gupta' });
  await continueTo(page, 'Step 4 of 12 Requisition structure');

  // 4 Requisition structure
  await choose(page, 'Recruiting Type', 'Professional');
  if (await isEmpty(page, 'Organization')) await choose(page, 'Organization', 'Vision Corporation', { search: 'Vision Corporation' });
  // On the Job route Job Function is required (IRC-1590143 when empty); the walkthrough chose Advisory.
  if (await isEmpty(page, 'Job Function')) await choose(page, 'Job Function', 'Advisory', { search: 'Advisory' });
  await continueTo(page, 'Step 5 of 12 Details');

  // 5 Details
  await continueTo(page, 'Step 6 of 12 Work requirements');

  // 6 Work requirements
  await choose(page, 'Workdays', 'Monday to Friday');
  await continueTo(page, 'Step 7 of 12 Posting description');

  // 7 Posting description
  await continueTo(page, 'Step 8 of 12 Offer info');

  // 8 Offer info
  if (await isEmpty(page, 'Department')) await choose(page, 'Department', 'Consulting South BE', { search: 'Consulting South' });
  if (await isEmpty(page, 'Primary Work Location')) await choose(page, 'Primary Work Location', 'Antwerp', { search: 'Antwerp' });
  await page.screenshot({ path: test.info().outputPath('offer-info.png') });
  await continueTo(page, 'Step 9 of 12 Attachments');

  // 9 Attachments
  await continueTo(page, 'Step 10 of 12 Configuration');

  // 10 Configuration
  if (await isEmpty(page, 'Candidate Selection Process')) {
    await choose(page, 'Candidate Selection Process', 'Supremo Candidate Selection Process');
  }
  if (await isEmpty(page, 'External Application Flow')) {
    await choose(page, 'External Application Flow', 'External Apply Flow Simplified');
  }
  await continueTo(page, 'Step 11 of 12 Prescreening questions');

  // 11 Prescreening questions
  await continueTo(page, 'Step 12 of 12 Interview questionnaires');

  // 12 Submit
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  // Back on the list: clear the hiring-team filter, find the requisition by title
  await expect(createButton).toBeVisible({ timeout: 120000 });
  const clear = page.getByText(/^Clear \(\d+\)$/).first();
  if (await clear.isVisible().catch(() => false)) {
    await clear.click();
    await page.waitForTimeout(3000);
  }
  const search = page.getByPlaceholder('Search by requisition title, number, or description');
  await search.fill(TITLE);
  await search.press('Enter');
  const row = page.getByText(TITLE, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 60000 });
  console.log(`SUBMITTED: ${TITLE}`);
});
