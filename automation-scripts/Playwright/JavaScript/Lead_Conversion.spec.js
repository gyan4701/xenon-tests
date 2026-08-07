// @ts-check
//
// Convert a Salesforce Lead to Account + Contact + Opportunity — Execute Agent version.
//
// Same design as the other two: no login (sfAuth.js supplies the session and baseURL),
// self-contained, fail-loud helpers, every locator measured against THIS org.
//
// TWO STRUCTURAL CHANGES FROM THE ORIGINAL
//
// 1. It creates the Lead it converts.
//    The original took the Lead from `SF_LEAD_NAME`, or fell back to "the first Lead in
//    the Recent list". Both are hidden dependencies on state the test does not control:
//    conversion is destructive and one-way, so a named Lead works exactly once, and the
//    Recent-list fallback converts whatever someone happened to open last — possibly a
//    real record. Creating the Lead makes the test repeatable and removes the env var.
//
// 2. Convert is a MENU ITEM here, not a button.
//    On this org's Lead page the action bar shows Edit / Send to Account Engagement /
//    Delete / Show more actions, and Convert lives inside "Show more actions" alongside
//    Clone and New Note. The original tried five locators — getByRole('button'),
//    getByRole('link'), button[name="Convert"], a[title="Convert"],
//    button:has-text("Convert") — and every one of them would have missed it, because
//    it is a `menuitem`. Measured, not assumed.
//
import { test, expect } from '@playwright/test';

const STAMP = Date.now();
const LEAD_LAST_NAME = `Convert Lead ${STAMP}`;
const LEAD_COMPANY = `Convert Co ${STAMP}`;

function control(page, role, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole(role, { name: new RegExp(`^\\*?${escaped}$`) });
}

/**
 * Set a Lightning picklist by clicking its option, retrying the whole interaction.
 *
 * A Lightning combobox is a LISTBOX, not a typeahead — typing sends first-letter jumps
 * and commits nothing. Two races also apply: Lightning re-renders shortly after the
 * fields appear, so a click can be swallowed, and a dropdown that did open can be
 * dismissed a moment later. So the unit of retry is the whole open-and-choose and the
 * exit condition is the committed VALUE, which also means a click that selects nothing
 * fails here rather than at Save.
 */
async function selectPicklist(page, label, optionLabel) {
  const combobox = control(page, 'combobox', label).first();
  await expect(combobox, `picklist "${label}" not found`).toBeVisible({ timeout: 15000 });
  await combobox.scrollIntoViewIfNeeded();

  const option = page.getByRole('option', { name: optionLabel, exact: true });
  let optionsSeen = [];

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await combobox.click();
    const found = await option
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (found) {
      await option.click();
      for (let poll = 0; poll < 10; poll += 1) {
        const asInput = await combobox.inputValue().catch(() => null);
        const value = asInput || (await combobox.innerText().catch(() => '')) || '';
        if (value.includes(optionLabel)) return;
        await page.waitForTimeout(500);
      }
    } else {
      const texts = await page.getByRole('option').allInnerTexts();
      const trimmed = texts.map((/** @type {string} */ t) => t.trim()).filter(Boolean);
      if (trimmed.length > 0) optionsSeen = trimmed;
    }

    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);
  }

  throw new Error(
    `Could not set "${label}" to "${optionLabel}" after 4 attempts.\n` +
      (optionsSeen.length
        ? `Options actually offered: ${optionsSeen.join(' | ')}\n`
        : `The dropdown never opened.\n`) +
      `Picklist values are org configuration, and a DEPENDENT picklist only offers ` +
      `values valid for its controlling field.`,
  );
}

/**
 * Create the Lead this test will convert, and return its record URL.
 *
 * The field set is the one this org's page layout requires — which is larger than the
 * schema's: Email, Title, Primary Lead Source, Business Unit and Service Line are all
 * `required=false` in the object metadata and all mandatory on the create screen.
 * Service Line is dependent on Business Unit and must be set after it.
 */
async function createLead(page) {
  await page.goto('/lightning/o/Lead/new');

  // Wait on the ELEMENT, never waitForLoadState('networkidle') — Lightning holds
  // streaming connections open for the page's lifetime, so the network never goes idle.
  const lastName = control(page, 'textbox', 'Last Name');
  await expect(lastName).toBeVisible({ timeout: 60000 });

  await lastName.fill(LEAD_LAST_NAME);
  await control(page, 'textbox', 'Company').fill(LEAD_COMPANY);
  await control(page, 'textbox', 'Email').fill(`convert.${STAMP}@example.com`);
  await control(page, 'textbox', 'Title').fill('Automation Lead');
  await selectPicklist(page, 'Lead Status', 'New');
  await selectPicklist(page, 'Primary Lead Source', 'Marketing');
  await selectPicklist(page, 'Business Unit', 'Tech BU');
  await selectPicklist(page, 'Service Line', 'Salesforce');

  await page.getByRole('button', { name: 'Save', exact: true }).click();

  const snag = page.getByRole('dialog', { name: 'We hit a snag.' });
  const saved = page.waitForURL(/\/lightning\/r\/(?:Lead\/)?00Q\w+\/view/i, { timeout: 60000 });
  const blocked = await Promise.race([
    saved.then(() => null),
    snag
      .waitFor({ state: 'visible', timeout: 60000 })
      .then(() => snag)
      .catch(() => null),
  ]);
  if (blocked) {
    const fields = await snag.getByRole('link').allInnerTexts();
    throw new Error(
      `Could not create the Lead to convert. Salesforce is asking for: ` +
        `${fields.join(', ') || '(none listed)'}. These are required by this org's page ` +
        `layout or a validation rule, not by the object schema.`,
    );
  }
  return page.url();
}

test('Convert Salesforce Lead to Account, Contact and Opportunity', async ({ page }) => {
  test.setTimeout(240000);

  // --- Arrange: a Lead of our own ------------------------------------------
  const leadUrl = await createLead(page);
  const leadId = (leadUrl.match(/\/lightning\/r\/(?:Lead\/)?(00Q\w+)\//) || [])[1];
  if (!leadId) throw new Error(`Could not read the Lead id from ${leadUrl}`);

  // --- Open the Convert action ---------------------------------------------
  // Convert is under "Show more actions" on this org, NOT on the action bar. Opening the
  // overflow menu first is required; there is no Convert button to fall back to.
  await page.getByRole('button', { name: /more actions/i }).first().click();
  await page.getByRole('menuitem', { name: 'Convert', exact: true }).click({ timeout: 15000 });

  const dialog = page.getByRole('dialog', { name: 'Convert Lead' });
  await expect(dialog, 'the Convert Lead dialog did not open').toBeVisible({ timeout: 30000 });

  // --- Check the defaults are what we expect -------------------------------
  // Salesforce prefills all three sections: Create New Account (named after the Lead's
  // Company), Create New Contact (the Lead's name) and Create New Opportunity. Asserting
  // them is the point of the test — a conversion that silently skipped the Opportunity
  // still "succeeds", so the run has to prove all three were requested.
  await expect(dialog.getByRole('radio', { name: 'Create New Account' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Create New Contact' })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Create New Opportunity' })).toBeChecked();

  // The account name is prefilled from the Lead's Company. The trailing `*` in the
  // accessible name is Lightning's required marker.
  await expect(dialog.getByRole('textbox', { name: /^Account Name/ })).toHaveValue(LEAD_COMPANY);

  // "Don't create an opportunity upon conversion" must stay unchecked, or the conversion
  // produces only an Account and a Contact and the Opportunity assertion below fails
  // with no explanation of why.
  const skipOpportunity = dialog.getByRole('checkbox', {
    name: /Don't create an opportunity upon conversion/,
  });
  if (await skipOpportunity.isChecked()) {
    await skipOpportunity.uncheck();
  }

  // --- Convert --------------------------------------------------------------
  await dialog.getByRole('button', { name: 'Convert', exact: true }).click();

  // --- Verify ---------------------------------------------------------------
  // Salesforce shows a confirmation panel listing the three records it created. Waiting
  // for that, rather than for a URL change, is what distinguishes a real conversion from
  // a dialog that closed on an error.
  const outcome = page.getByText(/Your lead has been converted/i).first();
  const stillOpen = dialog.getByRole('button', { name: 'Convert', exact: true });

  await expect(
    outcome,
    'No conversion confirmation appeared. If the dialog is still open, Salesforce ' +
      'rejected the conversion — a validation rule on Account, Contact or Opportunity, ' +
      'or a duplicate rule matching an existing record, are the usual causes.',
  ).toBeVisible({ timeout: 90000 });

  await expect(stillOpen).toHaveCount(0);

  // The panel renders one section per record it created, so the presence of all three is
  // the assertion that matches what this test claims. "The dialog closed" does not: a
  // conversion with "Don't create an opportunity" ticked closes just as cleanly and
  // produces two records instead of three.
  //
  // These MUST be expect().toBeVisible() rather than count()/evaluateAll(). The panel
  // streams: the "Your lead has been converted" heading paints first and the three
  // sections arrive a moment later. Measured — a version of this check that read the DOM
  // immediately saw a panel containing nothing but that heading, and reported zero
  // records created on a conversion that had produced all three. Only expect() retries.
  const panel = page.getByRole('dialog').filter({ hasText: 'Your lead has been converted' });
  for (const record of ['Account', 'Contact', 'Opportunity']) {
    await expect(
      panel.getByRole('heading', { name: record, exact: true }),
      `The conversion succeeded but produced no ${record}. Salesforce lists one section ` +
        `per record created, and this one is absent.`,
    ).toBeVisible({ timeout: 30000 });
  }

  // Finally, the Lead itself is gone as a Lead: Salesforce REDIRECTS a converted Lead's
  // URL to the Contact it produced. Measured — an earlier version of this test asserted
  // a "Converted" flag on the Lead page and failed on a conversion that had fully
  // succeeded, because that page is never rendered again.
  await page.goto(`/lightning/r/Lead/${leadId}/view`);
  await expect(page).toHaveURL(/\/lightning\/r\/Contact\/003\w+\/view/i, { timeout: 60000 });
});
