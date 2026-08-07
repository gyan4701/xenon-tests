// @ts-check
//
// Create a Salesforce Account — Execute Agent / sfAuth.js version.
//
// WHAT CHANGED FROM THE ORIGINAL, AND WHY
//
// 1. No login code at all. The Execute Agent runs `mcp-executor/sfAuth.js` before the
//    suite: it performs the SOAP login + frontdoor.jsp handoff, writes a Playwright
//    storageState, and writes the resolved Lightning origin beside it. The service
//    injects that storageState AND sets it as Playwright's `baseURL`. So the ~150 lines
//    of LoginUtil / TOTP / session-repair / origin-resolution are not merely unnecessary
//    here — LoginUtil lived in `server/utils`, which has been retired, so that import
//    would fail outright. Navigate to RELATIVE paths and the session is already there.
//
// 2. Self-contained. Only `@playwright/test` is imported: no fixture, no page object, no
//    locators module. A suite assembled from several files cannot fail this one on a
//    missing import.
//
// 3. Selectors verified against THIS org, not assumed. Every locator below is a
//    scan-verified Knowledge Base fact for `Account:create` (match_count 1 on the real
//    page). That matters most for the address block — see the note above it.
//
// 4. Failures are self-diagnosing. A Lightning save can be blocked by a required field
//    that is not visibly required until you try, so this script reads the error dialog
//    and names the offending fields instead of timing out on an unrelated assertion.

import { test, expect } from '@playwright/test';

const ACCOUNT_NAME = `Auto Account ${Date.now()}`;

/**
 * Fill a text input, failing loudly when it is absent.
 *
 * The original used a `fillIfVisible` helper that skipped any field it could not see and
 * logged "Skipped". Against this org that silently skipped FIVE fields (see the address
 * note below) and the run still reported success — an Account was created with none of
 * the data the test claimed to enter. A field that should be there and is not is a
 * finding, so `optional` has to be requested explicitly.
 */
async function fillField(page, selector, value, label, { optional = false } = {}) {
  const field = page.locator(selector);
  if ((await field.count()) === 0) {
    if (optional) return false;
    throw new Error(`Field "${label}" (${selector}) is not on this Account layout.`);
  }
  await field.first().fill(value);
  return true;
}

/**
 * Set a Lightning picklist.
 *
 * A Lightning combobox is a LISTBOX, not a typeahead. Clicking it and typing sends
 * first-letter jumps, so a multi-word value selects nothing, raises no error, and leaves
 * the field empty — measured on a real run where the form looked filled and the save was
 * rejected for the very fields the script had "set". `selectOption()` is equally wrong:
 * it is for a native <select>, which Lightning does not render. Click the option.
 */
async function selectPicklist(page, comboboxSelector, optionLabel, label) {
  const combobox = page.locator(comboboxSelector).first();
  await expect(combobox, `picklist "${label}" not found`).toBeVisible({ timeout: 15000 });
  await combobox.click();
  const option = page.getByRole('option', { name: optionLabel, exact: true });
  await expect(
    option,
    `"${optionLabel}" is not an option for "${label}" on this org. ` +
      `Picklist values are org configuration — check the field in Setup, and note that a ` +
      `DEPENDENT picklist only offers values valid for its controlling field.`,
  ).toBeVisible({ timeout: 10000 });
  await option.click();
}

/**
 * Wait for the save to resolve, and explain it when it fails.
 *
 * Lightning reports a blocked save two ways at once: "Complete this field." beneath each
 * offending input, and a "We hit a snag." dialog listing them. Neither is an exception,
 * so a script that just waits for the record page times out with no clue why.
 *
 * Note the dialog lists a compound field by its COMPOUND label — an empty Last Name on a
 * Lead shows up as "Name" — so the names below are what Salesforce calls them, which is
 * exactly why printing them beats guessing.
 */
async function expectSaveSucceeded(page) {
  const snag = page.getByRole('dialog', { name: 'We hit a snag.' });
  const recordPage = page.waitForURL(/\/lightning\/r\/(?:Account\/)?001\w+\/view/i, { timeout: 60000 });

  const blocked = await Promise.race([
    recordPage.then(() => null),
    snag
      .waitFor({ state: 'visible', timeout: 60000 })
      .then(() => snag)
      .catch(() => null),
  ]);

  if (blocked) {
    const fields = await snag.getByRole('link').allInnerTexts();
    throw new Error(
      `Save was rejected. Salesforce is asking for: ${fields.join(', ') || '(none listed)'}.\n` +
        `These are required by this org's page layout or a validation rule. Some only ` +
        `become required once other fields are set, so the list can grow between attempts.`,
    );
  }
}

test('Create Salesforce Account', async ({ page }) => {
  test.setTimeout(180000);

  // The session is pre-authenticated and baseURL is set by the executor, so this is a
  // relative path. Going straight to the create screen also skips the list view and the
  // "New" button entirely — fewer steps, fewer things to break.
  await page.goto('/lightning/o/Account/new');

  // Wait on the ELEMENT, never `waitForLoadState('networkidle')`. Lightning holds
  // streaming connections open for the page's lifetime, so the network never goes idle
  // and that wait can only ever time out on a page that is perfectly usable.
  const accountName = page.locator('[name="Name"]');
  await expect(accountName).toBeVisible({ timeout: 60000 });

  // --- Account details -----------------------------------------------------
  // `[name="Name"]` rather than getByLabel('Account Name'): the on-screen label is
  // "*Account Name" (Lightning prefixes required fields with the marker), and it ADDS
  // that marker to other fields after a failed save — so a name-based locator that
  // matched before Save can stop matching after it. The name attribute does not move.
  await accountName.fill(ACCOUNT_NAME);

  await fillField(page, '[name="Phone"]', '123-456-7890', 'Phone');
  await fillField(page, '[name="Website"]', 'https://testaccount.example.com', 'Website');

  // --- Billing address -----------------------------------------------------
  // Lightning's compound Address field uses street / city / province / country /
  // postalCode as its input names — NOT BillingStreet / BillingCity / BillingState /
  // BillingCountry / BillingPostalCode, which is what the original script targeted. All
  // five silently did nothing on this org. State and Country are also PICKLISTS here
  // (state/country picklists are enabled), so `.fill()` could never have worked on them.
  await fillField(page, '[name="street"]', '123 Main Street', 'Billing Street');
  await fillField(page, '[name="city"]', 'Mumbai', 'Billing City');
  await fillField(page, '[name="postalCode"]', '400001', 'Billing Zip/Postal Code');
  await selectPicklist(page, '[name="country"]', 'India', 'Billing Country');
  await selectPicklist(page, '[name="province"]', 'Maharashtra', 'Billing State/Province');

  // Industry and Type are NOT on this org's Account create layout — there is no locator
  // for either in a full scan of the form. The original script guarded both with
  // "skip if not visible", so it always skipped them and always reported success.
  // Number Of Employees IS present but is a combobox here, not the numeric input the
  // original filled; add it with selectPicklist() if you want it.

  // --- Save ----------------------------------------------------------------
  // [name="SaveEdit"] is the scan-verified Save. Do not use getByRole('button', {name:
  // 'Save'}) without scoping — "Save & New" is beside it.
  await page.locator('[name="SaveEdit"]').click();
  await expectSaveSucceeded(page);

  // --- Verify on the RECORD page -------------------------------------------
  // The URL is /lightning/r/<recordId>/view — Lightning does NOT put the object name in
  // it on a save redirect (it does when you navigate from a list view, hence the
  // optional group). `001` is Account's key prefix, so this stays object-specific
  // without depending on a path segment that is only sometimes there. Measured: a
  // regex requiring /r/Account/ timed out on a save that had SUCCEEDED.
  // Never assert a saved value on a form control: the create screen is a modal that
  // closes on success, so an assertion against its inputs can only pass when the save
  // FAILED. Assert on the record page instead, scoped to the highlights panel — a bare
  // page.getByText(ACCOUNT_NAME) matches both the header and the details field and
  // fails strict mode with "resolved to 2 elements".
  await expect(page).toHaveURL(/\/lightning\/r\/(?:Account\/)?001\w+\/view/i);
  await expect(
    page.locator('lightning-formatted-text[slot="primaryField"]'),
  ).toHaveText(ACCOUNT_NAME, { timeout: 30000 });
});
