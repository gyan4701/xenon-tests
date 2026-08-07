// @ts-check
//
// Create a Salesforce Lead — Execute Agent / sfAuth.js version.
//
// Same design as create-account.spec.js: no login (sfAuth.js supplies the session and
// baseURL), self-contained (only @playwright/test), fail-loud helpers. Lead is the
// harder object, and every value below is checked against THIS org rather than assumed:
//
//   * Its Lead Status picklist is NOT stock Salesforce. There is no "Open - Not
//     Contacted" here — the values are New / Nurture / ICP Qualification / Sales
//     Qualification / Working / Qualified / Dead End / Unqualified. A stock value
//     produces a save that is rejected for a field the script believes it set.
//   * The page layout requires MORE than the schema does. Email, Title, Primary Lead
//     Source and Business Unit are all `required=false` in the object metadata and all
//     mandatory on this create screen. Layout beats schema; only the rendered form knows.
//   * The address block's State/Province and Country are PICKLISTS on this org, so
//     .fill() can never work on them.
//
import { test, expect } from '@playwright/test';

const STAMP = Date.now();
const LEAD_LAST_NAME = `Auto Lead ${STAMP}`;
const LEAD_COMPANY = `Auto Company ${STAMP}`;
const LEAD_EMAIL = `auto.lead.${STAMP}@example.com`;

/**
 * Locate a form control by role and exact label, tolerating the required marker.
 *
 * Lightning prefixes a required field's accessible name with `*` — and ADDS the marker
 * to further fields after a failed save, so a name that matched before Save can stop
 * matching after it. Measured on TC067: `getByRole('combobox', {name: 'Lead Status',
 * exact: true})` worked to set the value and then reported "element(s) not found"
 * reading it back, because the name had become "*Lead Status".
 *
 * Anchoring the regex is not pedantry either. Playwright's default (exact: false) name
 * matching is a SUBSTRING match, so a bare 'Title' also matches "Referee Title" and
 * 'Company' also matches "Company Size" — both real fields on this layout.
 */
function control(page, role, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole(role, { name: new RegExp(`^\\*?${escaped}$`) });
}

/** Fill a text control, failing loudly when it is absent. */
async function fillField(page, role, label, value, { optional = false } = {}) {
  const field = control(page, role, label);
  if ((await field.count()) === 0) {
    if (optional) return false;
    throw new Error(`Field "${label}" (${role}) is not on this Lead layout.`);
  }
  await field.first().fill(value);
  return true;
}

/**
 * Set a Lightning picklist by clicking its option.
 *
 * A Lightning combobox is a LISTBOX, not a typeahead. Clicking it and typing sends
 * first-letter jumps, so a multi-word value selects nothing, raises no error, and leaves
 * the field empty. `selectOption()` is equally wrong — that is for a native <select>,
 * which Lightning does not render.
 */
async function selectPicklist(page, label, optionLabel) {
  const combobox = control(page, 'combobox', label).first();
  await expect(combobox, `picklist "${label}" not found`).toBeVisible({ timeout: 15000 });

  // Open it, and CONFIRM it opened before looking for the value.
  //
  // Measured intermittently on Salutation, the first control touched after page load:
  // Lightning re-renders the form once more just after the fields appear, and a click
  // that lands during that re-render is swallowed — no error, no dropdown. The failure
  // then surfaces as `"Mr." is not an option`, which sends the reader to check the org's
  // picklist configuration for a value that is perfectly valid.
  //
  // So the retry is on OPENING, and it is a separate step from selecting: only once a
  // listbox is confirmed on screen does a missing option genuinely mean the value is
  // wrong for this org.
  for (let attempt = 1; ; attempt += 1) {
    await combobox.click();
    const opened = await page
      .getByRole('option')
      .first()
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
    if (attempt === 3) {
      throw new Error(`Picklist "${label}" did not open after ${attempt} attempts.`);
    }
  }

  const option = page.getByRole('option', { name: optionLabel, exact: true });
  await expect(
    option,
    `"${optionLabel}" is not an option for "${label}" on this org. Picklist values are ` +
      `org configuration, and a DEPENDENT picklist only offers values valid for its ` +
      `controlling field — Business Unit, Primary Lead Source, Service Line and Practice ` +
      `all carry a "View all dependencies" link on this layout.`,
  ).toBeVisible({ timeout: 10000 });
  await option.click();
}

/**
 * Wait for the save to resolve, and explain it when it fails.
 *
 * Lightning reports a blocked save as "Complete this field." beneath each offending
 * input plus a "We hit a snag." dialog listing them. Neither is an exception, so a
 * script that only waits for the record page times out with no clue why. Lead is exactly
 * where this pays: its layout-required set is larger than its schema-required set, and
 * setting one field can make another become required.
 */
async function expectSaveSucceeded(page) {
  const snag = page.getByRole('dialog', { name: 'We hit a snag.' });
  const recordPage = page.waitForURL(/\/lightning\/r\/(?:Lead\/)?00Q\w+\/view/i, {
    timeout: 60000,
  });

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
        `These are required by this org's page layout or a validation rule, NOT by the ` +
        `object schema — the metadata reports several of them as optional. Some only ` +
        `become required once other fields are set, so the list can grow between attempts.`,
    );
  }
}

test('Create Salesforce Lead', async ({ page }) => {
  test.setTimeout(180000);

  // Relative path: the session and baseURL come from sfAuth.js via the executor. Going
  // straight to the create screen also skips the list view and the "New" button, which
  // is where the old script spent five fallback locators.
  await page.goto('/lightning/o/Lead/new');

  // Wait on the ELEMENT, never waitForLoadState('networkidle') — Lightning holds
  // streaming connections open for the page's lifetime, so the network never goes idle
  // and that wait can only time out on a page that is perfectly usable.
  const lastName = control(page, 'textbox', 'Last Name');
  await expect(lastName).toBeVisible({ timeout: 60000 });

  // --- Name -----------------------------------------------------------------
  await selectPicklist(page, 'Salutation', 'Mr.');
  await fillField(page, 'textbox', 'First Name', 'Auto');
  await lastName.fill(LEAD_LAST_NAME);

  // --- Required by the page layout -----------------------------------------
  // Email and Title carry the required marker on this create screen even though the
  // object metadata reports both as optional. The original script treated all three of
  // Email/Title/Website as "fill if visible", so on an org where one is missing the run
  // would have reported success having skipped a mandatory field.
  await fillField(page, 'textbox', 'Company', LEAD_COMPANY);
  await fillField(page, 'textbox', 'Email', LEAD_EMAIL);
  await fillField(page, 'textbox', 'Title', 'Automation Lead');

  // "New" is this org's first Lead Status. The stock-Salesforce value the old script
  // used — "Open - Not Contacted" — does not exist here.
  await selectPicklist(page, 'Lead Status', 'New');

  // Both are required by the layout and were the two fields the snag dialog named on the
  // first real run of this flow.
  await selectPicklist(page, 'Primary Lead Source', 'Marketing');
  await selectPicklist(page, 'Business Unit', 'Tech BU');

  // Service Line is DEPENDENT on Business Unit and must be set after it. Measured: its
  // full picklist holds 27 values, but with Business Unit = "Tech BU" only 11 are
  // offered — None, Analytics, ESM, Integration, Netsuite, Oracle, Salesforce, SAP,
  // Workday, Infra, AI Services. Choosing a value that is real in the schema but invalid
  // for the controlling field leaves the field empty, exactly like typing does.
  await selectPicklist(page, 'Service Line', 'Salesforce');

  // --- Optional detail ------------------------------------------------------
  await fillField(page, 'textbox', 'Phone', '123-456-7890');
  await fillField(page, 'textbox', 'Website', 'https://testlead.example.com');
  await selectPicklist(page, 'Rating', 'Warm');

  // --- Address --------------------------------------------------------------
  // Country and State/Province are comboboxes here (state/country picklists are
  // enabled), which is why the original's .fill() on them could never have worked.
  // Country is set FIRST: State/Province is dependent on it and offers no options until
  // a country is chosen.
  await fillField(page, 'textbox', 'Street', '123 Main Street');
  await fillField(page, 'textbox', 'City', 'Mumbai');
  await fillField(page, 'textbox', 'Zip/Postal Code', '400001');
  await selectPicklist(page, 'Country', 'India');
  await selectPicklist(page, 'State/Province', 'Maharashtra');

  // --- Save -----------------------------------------------------------------
  // Scoped by exact name: "Save & New" sits beside it, and a substring match on "Save"
  // hits both.
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectSaveSucceeded(page);

  // --- Verify on the RECORD page -------------------------------------------
  // Never assert a saved value on a form control: the create screen is a modal that
  // closes on success, so an assertion against its inputs can only pass when the save
  // FAILED. The URL is /lightning/r/<recordId>/view — Lightning does not put the object
  // name in it on a save redirect (it does when you navigate from a list view, hence the
  // optional group), so this anchors on 00Q, Lead's key prefix.
  await expect(page).toHaveURL(/\/lightning\/r\/(?:Lead\/)?00Q\w+\/view/i);
  await expect(page.locator('lightning-formatted-name[slot="primaryField"]')).toContainText(
    LEAD_LAST_NAME,
    { timeout: 30000 },
  );
});
