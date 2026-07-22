// Story 2 — Log a Phone Call (Activity Management).  EXPECTED: PASS.
//
// Login-free (the executor injects storageState + baseURL). Verified fields:
// Title (#title) and the optional Phone (#phone). NetSuite defaults the other
// required fields (Status, Organizer, Date), so the call logs with just a title.
// No type-ahead lookups — reliable headed AND headless.
import { test, expect } from '@playwright/test';

async function saveAndVerify(page) {
  await page.locator('#btn_multibutton_submitter').click();

  const saved = page
    .waitForFunction(
      () =>
        /[?&]id=\d+/.test(location.href) ||
        /has been saved|successfully saved|may have duplicates/i.test(
          (document.body && document.body.innerText) || '',
        ),
      { timeout: 60000 },
    )
    .then(() => 'saved')
    .catch(() => null);
  const nserror = page
    .waitForFunction(
      () => /An unexpected error has occurred/i.test((document.body && document.body.innerText) || ''),
      { timeout: 60000 },
    )
    .then(() => 'nserror')
    .catch(() => null);

  const result = (await Promise.race([saved, nserror])) || 'timeout';
  expect(result, `save outcome was "${result}" (expected "saved")`).toBe('saved');
}

test('Log a customer Phone Call with a subject and number', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);

  await page.goto('/app/crm/calendar/call.nl');
  await page.waitForSelector('#title', { timeout: 30000 });

  await page.fill('#title', `Xenon Discovery Call ${stamp}`);
  await page.fill('#phone', '+1-415-555-0142');
  await page.fill('#message', 'Logged by the Xenon Execute Agent demo.');

  await saveAndVerify(page);
});
