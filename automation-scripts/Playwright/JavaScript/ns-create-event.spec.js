// Story 3 — Create a calendar Event (Activity Management).
// EXPECTED: FAIL on a locator, then Xenon SELF-HEALS it and the rerun passes.
//
// The intentional defect: the Title field is targeted with the WRONG id
// `#event_title`, which does not exist on the form, so the fill times out with a
// LOCATOR_FAILURE. NetSuite's real id is `#title` (label "Title"), so self-heal's
// multi-candidate locator block (getByLabel('Title') / getByRole('textbox',
// {name:'Title'}) / #title) resolves it and the rerun saves.
//
// Everything else is verified and correct: Start/End time (#starttime/#endtime,
// the extra required fields on Event), Save (#btn_multibutton_submitter), the
// relative record URL. NetSuite defaults Status / Event Access / Organizer /
// Date, so once the title heals, the event saves. No type-ahead lookups.
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

test('Create a calendar Event with a title and time window', async ({ page }) => {
  const stamp = Date.now().toString().slice(-6);

  await page.goto('/app/crm/calendar/event.nl');
  await page.waitForSelector('#title', { timeout: 30000 });

  // ---- INTENTIONAL LOCATOR DEFECT (self-heal target) -------------------------
  // Real id is #title (label "Title"); #event_title does not exist. Short 8s
  // timeout so the LOCATOR_FAILURE surfaces quickly in the demo (no 2-min wait)
  // before Xenon self-heals it to #title.
  await page.fill('#event_title', `Xenon Kickoff ${stamp}`, { timeout: 8000 });
  // ---------------------------------------------------------------------------

  // Extra required fields on Event: start/end time (date/status/organizer default).
  await page.fill('#starttime', '9:00 am');
  await page.fill('#endtime', '9:30 am');

  await saveAndVerify(page);
});
