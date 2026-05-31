// @ts-check
const { test, expect } = require('@playwright/test');

test('SELF HEAL DEMO - Create Salesforce Lead with broken New locator', async ({ page }) => {
  test.setTimeout(120000);

  const salesforceOrigin =
    process.env.SF_INSTANCE_URL ||
    process.env.SALESFORCE_INSTANCE_URL ||
    'https://enterprise-platform-3896.lightning.force.com';

  const leadLastName = `Self Heal Lead ${Date.now()}`;
  const leadCompany = `Self Heal Company ${Date.now()}`;
  const leadEmail = `self.heal.lead.${Date.now()}@example.com`;
  const leadPhone = '123-456-7890';

  console.log('🚀 Starting Salesforce Lead self-heal locator demo...');
  console.log(`🌐 Salesforce Origin: ${salesforceOrigin}`);

  // ── 1. Open Leads page using existing storageState ────────────────────────
  await page.goto(`${salesforceOrigin}/lightning/o/Lead/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log(`📍 Current URL: ${currentUrl}`);

  if (/login|challenge|verification|identity/i.test(currentUrl)) {
    throw new Error(
      [
        'Salesforce stored session is expired or not loaded.',
        'This is not a locator self-heal error.',
        'Refresh storageState.json first, then rerun this demo.',
        `Current URL: ${currentUrl}`,
      ].join('\n')
    );
  }

  const usernameVisible = await page
    .locator('#username, input[name="username"]')
    .first()
    .isVisible({ timeout: 3000 })
    .catch(() => false);

  if (usernameVisible) {
    throw new Error(
      [
        'Salesforce login screen is visible.',
        'This is not a locator self-heal error.',
        'Refresh storageState.json first, then rerun this demo.',
      ].join('\n')
    );
  }

  await expect(page).toHaveURL(/\/lightning\/o\/Lead\/list/i, {
    timeout: 60000,
  });

  console.log('✅ Leads list page opened using stored session');

  // ── 2. Intentional locator failure for self-heal demo ─────────────────────
  console.log('➕ Opening New Lead form using intentionally broken locator...');

  /*
    SELF-HEAL DEMO FAILURE:

    This locator is intentionally wrong:
      div[aria-label="New"]

    Salesforce has a real New button/link, but it is not a div with aria-label="New".

    This locator is intentionally designed for your selfHealService:
    - extractSelectorLabel() extracts label: New
    - inferRoleFromSelector() infers a clickable role
    - buildLocatorCandidateExpressions() generates candidates like:
        page.getByRole('button', { name: /^New$/i })
        page.getByRole('link', { name: /^New$/i })
        page.getByText('New', { exact: true })
        page.locator('[title="New"]')
        page.locator('[aria-label="New"]')

    IMPORTANT:
    Keep this as a single-line Playwright action.
    Your deterministic self-heal service replaces one failing line.
  */
  await page.locator('div[aria-label="New"]').click({ timeout: 10000 });

  // After self-heal, the above line should be replaced with a working locator,
  // and the New Lead form should become visible.
  const lastNameInput = page
    .locator('input[name="lastName"], input[name="LastName"]')
    .first();

  await expect(lastNameInput).toBeVisible({
    timeout: 60000,
  });

  console.log('✅ New Lead form is visible after healed locator');

  // ── 3. Fill Lead details ──────────────────────────────────────────────────
  console.log(`📝 Filling Lead details: ${leadLastName}`);

  const firstNameInput = page
    .locator('input[name="firstName"], input[name="FirstName"]')
    .first();

  if (await firstNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await firstNameInput.fill('SelfHeal');
    console.log('⌨️ Filled First Name');
  }

  await lastNameInput.fill(leadLastName);
  console.log('⌨️ Filled Last Name');

  const companyInput = page.locator('input[name="Company"]').first();

  await expect(companyInput).toBeVisible({
    timeout: 30000,
  });

  await companyInput.fill(leadCompany);
  console.log('⌨️ Filled Company');

  const emailInput = page.locator('input[name="Email"]').first();

  if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await emailInput.fill(leadEmail);
    console.log('⌨️ Filled Email');
  }

  const phoneInput = page.locator('input[name="Phone"]').first();

  if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await phoneInput.fill(leadPhone);
    console.log('⌨️ Filled Phone');
  }

  const titleInput = page.locator('input[name="Title"]').first();

  if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await titleInput.fill('Self Heal Demo Lead');
    console.log('⌨️ Filled Title');
  }

  const descriptionInput = page.locator('textarea[name="Description"]').first();

  if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await descriptionInput.fill('Created by MCP Executor self-heal locator demo');
    console.log('⌨️ Filled Description');
  }

  await page.screenshot({
    path: `./reports/self-heal-lead-form-filled-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 4. Save Lead ──────────────────────────────────────────────────────────
  console.log('💾 Saving Lead...');

  const saveButton = page
    .locator('button[name="SaveEdit"], button:has-text("Save")')
    .first();

  await expect(saveButton).toBeVisible({
    timeout: 30000,
  });

  await saveButton.click();

  console.log('🔘 Clicked Save button');

  // ── 5. Verify Lead creation ───────────────────────────────────────────────
  console.log('🔎 Verifying Lead creation...');

  await expect(page).toHaveURL(/\/lightning\/r\/Lead\//i, {
    timeout: 60000,
  });

  const createdLeadTitle = page
    .locator('lightning-formatted-name, lightning-formatted-text[slot="primaryField"]')
    .filter({ hasText: leadLastName })
    .first();

  const createdLeadAnyText = page
    .getByText(leadLastName, { exact: false })
    .first();

  if (await createdLeadTitle.isVisible({ timeout: 10000 }).catch(() => false)) {
    await expect(createdLeadTitle).toContainText(leadLastName, {
      timeout: 60000,
    });
  } else {
    await expect(createdLeadAnyText).toBeVisible({
      timeout: 60000,
    });
  }

  await page.screenshot({
    path: `./reports/self-heal-lead-created-${Date.now()}.png`,
    fullPage: true,
  });

  console.log(`✅ Lead successfully created after self-heal: ${leadLastName} / ${leadCompany}`);
});
