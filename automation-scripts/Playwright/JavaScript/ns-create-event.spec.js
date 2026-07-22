// Story 3 — Create a calendar Event (Activity Management).
// EXPECTED: FAIL on a locator, then Xenon SELF-HEALS it and the rerun passes.
//
// The intentional defect: the Title field is targeted by aria-label
// (`[aria-label="Title"]`), but NetSuite does NOT set an aria-label on it, so the
// fill fails with a LOCATOR_FAILURE. Self-heal humanizes the selector to the
// label "Title" and resolves it via getByRole('textbox', {name:'Title'}), then
// the rerun fills the title and the Event saves.
//
// Everything else is verified and correct: Save (#btn_multibutton_submitter) and
// the relative record URL. NetSuite defaults Status / Event Access / Organizer /
// Date / Start Time / End Time, so once the title heals, the event saves. No
// type-ahead lookups.
import { test, expect } from '@playwright/test';

// Fail fast (8s) on the intentional locator defect so the demo doesn't wait out
// the default timeout before Xenon self-heals.
test.use({ actionTimeout: 8000 });

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
  await page.goto('/app/crm/calendar/event.nl');
  await page.waitForSelector('#title', { timeout: 30000 });

  // ---- INTENTIONAL LOCATOR DEFECT (self-heal target) -------------------------
  // The Title field is targeted by aria-label, but NetSuite does NOT set an
  // aria-label on it, so `[aria-label="Title"]` matches nothing and the fill
  // fails with a LOCATOR_FAILURE. Xenon's self-heal humanizes the selector to
  // the label "Title" and resolves it via getByRole('textbox', {name:'Title'}),
  // then the rerun fills the title and the Event saves.
  await page.fill('[aria-label="Title"]', 'Xenon Kickoff Event');
  // ---------------------------------------------------------------------------

  // NOTE: Start/End time, Status, Event Access, Organizer, and Date all DEFAULT
  // to valid values on a new Event, so Title is the only field we set. (Filling
  // the time text inputs leaves a picker state that blocks Save.)

  await saveAndVerify(page);
});
