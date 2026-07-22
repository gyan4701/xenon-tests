// Story 1 — Create a Task (Activity Management).  EXPECTED: PASS.
//
// Runs in the Xenon Execute Agent: the executor logs into NetSuite (nsAuth) and
// injects the session (storageState) + baseURL, so this script does NOT script
// login — it navigates straight to the record URL and starts already authed.
//
// Verified against the live instance: the only field we must set is Title
// (#title). NetSuite defaults the other required fields (Assigned To, Priority,
// Status, Start/Due Date) to the current user / today, so the record saves.
// No type-ahead lookups are needed, so this is reliable headed AND headless.
import { test, expect } from '@playwright/test';

// Reusable save + verify: success = the record saved (id in the URL or a saved/
// duplicate banner). Fails fast on NetSuite's server-error page.
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

test('Create a follow-up Task with a title', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);

  await page.goto('/app/crm/calendar/task.nl');
  await page.waitForSelector('#title', { timeout: 30000 });

  await page.fill('#title', `Xenon Follow-up ${stamp}`);
  await page.fill('#message', 'Created by the Xenon Execute Agent demo.');

  await saveAndVerify(page);
});
