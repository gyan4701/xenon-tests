const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeadPage = require('../../pages/LeadPage'); // Named LeadPage as per requirement, but implements Account test logic

test.describe('TC056 - Verify Account Owner Reassignment with Mandatory Reassignment Reason (Positive Scenario)', () => {
  const ACCOUNT_NAME = 'Global Tech Corp';
  const NEW_OWNER = 'Pam Beesly';
  const REASSIGNMENT_REASON = 'Territory realignment Q4 2024';

  test('Account owner and reassignment reason updated successfully', async ({ authenticatedPage }) => {
    const leadPage = new LeadPage(authenticatedPage);

    // 1. Login is handled by the fixture

    // 2. Navigate to the 'Accounts' tab (Menu: Accounts)
    await leadPage.navigateToAppItem('Accounts');
    await expect(leadPage.page).toHaveURL(/.*\/Account\/.*list/);

    // 3. Search for Account Name: 'Global Tech Corp'
    // 4. Click on the 'Global Tech Corp' Account record link to open its detail page
    await leadPage.searchAndOpenRecord(ACCOUNT_NAME);
    await expect(leadPage.getRecordPageTitle()).toContain(ACCOUNT_NAME);

    // 5. Click the 'Edit' button on the Account detail page
    // 6. Locate the 'Account Owner' lookup field
    // 7. Click the lookup icon next to the 'Account Owner' field
    // 8. Search for 'Pam Beesly' in the lookup window and select her as the new owner
    // 9. Locate the 'Reassignment Reason' text area field
    // 10. Enter 'Territory realignment Q4 2024' into the 'Reassignment Reason' field
    // 11. Click the 'Save' button
    await leadPage.editRecordOwnerAndReason(NEW_OWNER, REASSIGNMENT_REASON);
    const successMessage = await leadPage.getSuccessMessage();
    await expect(successMessage).toContain('"' + ACCOUNT_NAME + '" was saved.');

    // 12. Verify the Account detail page reloads with the new owner
    await leadPage.page.waitForLoadState('networkidle');
    await expect(leadPage.getRecordPageTitle()).toContain(ACCOUNT_NAME);

    // 13. Verify the 'Account Owner' field displays: 'Pam Beesly'
    const displayedOwner = await leadPage.getDisplayedOwnerName();
    await expect(displayedOwner).toBe(NEW_OWNER);

    // 14. Verify the 'Reassignment Reason' field displays: 'Territory realignment Q4 2024'
    const displayedReason = await leadPage.getDisplayedReassignmentReason();
    await expect(displayedReason).toBe(REASSIGNMENT_REASON);
  });
});