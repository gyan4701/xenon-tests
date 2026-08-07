// @ts-check
//
// SELF-HEAL DEMO — Create a Salesforce Lead with one intentionally broken locator.
//
// The point of this script is that EXACTLY ONE thing is wrong with it, and self-heal
// can fix that one thing. Everything after the broken locator must genuinely work, or
// the demo shows a successful heal followed by a still-red test — which reads as the
// heal having failed.
//
// THE BREAK, AND WHY THIS ONE
//
// The break is the `div[aria-label="New"]` click further down.
//
// NOTE: the failing line is deliberately NOT repeated here. `try_deterministic_locator_heal`
// replaces the FIRST line matching `.locator('<selector>')` with count=1
// (self_heal_service.py:620), so a copy of it in a comment above the real code would be
// patched instead — the heal would report success, the rerun would fail identically, and
// the demo would die with self-heal looking broken. Measured while building this file.
//
// Verified against this org's Lead list view:
//   * `div[aria-label="New"]` matches 0 elements — a real failure, not a flaky one.
//   * self_heal_service extracts the label "New" from the selector's aria-label and
//     builds its ladder from it (`_extract_label`, self_heal_service.py:154).
//   * The first two rungs — getByRole('textbox', {name:'New'}) and getByLabel('New',
//     {exact:true}) — match 0 and are skipped by the heal loop.
//   * The third rung, getByRole('button', {name:'New'}), matches exactly 1. The heal
//     loop takes the first candidate that becomes visible, so this is where it lands.
//
// Uniqueness is what makes it a reliable demo rather than a coin flip. Further down the
// same ladder, getByText('New', {exact:true}) matches 23 elements on this page and
// [title="New"] matches 24 — either would blow strict mode. They sit after the button
// rung, so they are never reached, but that is measured rather than assumed.
//
// The 10s timeout keeps the demo's failure fast; nothing here needs 60s to fail.
//
import { test, expect } from '@playwright/test';

const STAMP = Date.now();
const LEAD_LAST_NAME = `Self Heal Lead ${STAMP}`;
const LEAD_COMPANY = `Self Heal Co ${STAMP}`;

function control(page, role, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole(role, { name: new RegExp(`^\\*?${escaped}$`) });
}

/**
 * Set a Lightning picklist by clicking its option, retrying the whole interaction.
 *
 * A Lightning combobox is a LISTBOX, not a typeahead — typing sends first-letter jumps
 * and commits nothing. Lightning also re-renders shortly after the fields appear, which
 * both swallows clicks and dismisses dropdowns that did open. So the unit of retry is
 * the whole open-and-choose, and the exit condition is the committed VALUE.
 *
 * This matters more here than anywhere else in the demo: a silent picklist no-op would
 * surface as a rejected Save several steps later, and in a self-heal demo that reads as
 * "the heal broke something".
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

test('SELF HEAL DEMO - Create Salesforce Lead with broken New locator', async ({ page }) => {
  test.setTimeout(180000);

  // --- 1. Open the Leads list ----------------------------------------------
  // Relative path: the session and baseURL both come from sfAuth.js via the executor.
  // The original hardcoded an SF_INSTANCE_URL default pointing at a DIFFERENT org
  // (enterprise-platform-3896), so on a machine without that env var it would have run
  // the whole demo against the wrong Salesforce — or failed at login and reported it as
  // a locator problem.
  //
  // The ~40 lines of session/login guards the original had here are gone with it: the
  // executor authenticates before the suite, so a broken session is an executor failure,
  // not something this script should be diagnosing mid-demo.
  await page.goto('/lightning/o/Lead/list?filterName=Recent');

  // Wait on the ELEMENT, never waitForLoadState('networkidle') — Lightning holds
  // streaming connections open for the page's lifetime, so the network never goes idle.
  await expect(page.getByRole('button', { name: 'New' })).toBeVisible({ timeout: 60000 });

  // --- 2. The intentional break --------------------------------------------
  /*
    SELF-HEAL DEMO FAILURE — leave this as a single-line Playwright action.

    `div[aria-label="New"]` matches nothing. The label survives inside the selector, so
    self_heal_service derives "New" and heals to getByRole('button', { name: 'New' }).

    Do NOT "fix" the div to a button: the whole demo is this line failing.
  */
  await page.locator('div[aria-label="New"]').click({ timeout: 10000 });

  // --- 3. Fill the Lead -----------------------------------------------------
  // Everything below is the field set this org's page layout REQUIRES, which is larger
  // than the schema's — Email, Title, Primary Lead Source, Business Unit and Service
  // Line are all `required=false` in the object metadata and all mandatory here.
  //
  // The original filled only First/Last/Company/Email/Phone/Title, each through a
  // "skip if not visible" helper. After a successful heal it would have reached Save and
  // been rejected for Lead Status, Primary Lead Source, Business Unit and Service Line —
  // turning a working self-heal into a failed demo.
  const lastName = control(page, 'textbox', 'Last Name');
  await expect(lastName, 'the New Lead form did not open after the heal').toBeVisible({
    timeout: 60000,
  });

  await control(page, 'textbox', 'First Name').fill('SelfHeal');
  await lastName.fill(LEAD_LAST_NAME);
  await control(page, 'textbox', 'Company').fill(LEAD_COMPANY);
  await control(page, 'textbox', 'Email').fill(`self.heal.${STAMP}@example.com`);
  await control(page, 'textbox', 'Title').fill('Self Heal Demo Lead');
  await control(page, 'textbox', 'Phone').fill('123-456-7890');

  await selectPicklist(page, 'Lead Status', 'New');
  await selectPicklist(page, 'Primary Lead Source', 'Marketing');
  await selectPicklist(page, 'Business Unit', 'Tech BU');
  // Service Line is DEPENDENT on Business Unit and must follow it: its full picklist has
  // 27 values, but only 11 are offered once Business Unit is "Tech BU".
  await selectPicklist(page, 'Service Line', 'Salesforce');

  // --- 4. Save --------------------------------------------------------------
  // Scoped by exact name: "Save & New" sits beside it and a substring match hits both.
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // A blocked save is not an exception in Lightning — it is a "We hit a snag." dialog
  // plus inline "Complete this field." text. Reading the dialog turns a silent 60s
  // timeout into a message naming the fields, which is the difference between a demo you
  // can talk over and one you have to abandon.
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
      `Save was rejected. Salesforce is asking for: ${fields.join(', ') || '(none listed)'}.\n` +
        `This is NOT a self-heal failure — the locator healed and the form was reached. ` +
        `This org's page layout requires a field the script does not set.`,
    );
  }

  // --- 5. Verify on the RECORD page ----------------------------------------
  // Never assert a saved value on a form control: the create screen is a modal that
  // closes on success, so an assertion against its inputs can only pass when the save
  // FAILED. The URL is /lightning/r/<recordId>/view — Lightning does not put the object
  // name in it on a save redirect — so this anchors on 00Q, Lead's key prefix.
  await expect(page).toHaveURL(/\/lightning\/r\/(?:Lead\/)?00Q\w+\/view/i);
  await expect(page.locator('lightning-formatted-name[slot="primaryField"]')).toContainText(
    LEAD_LAST_NAME,
    { timeout: 30000 },
  );
});
