const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeadPage = require('../../pages/LeadPage'); // Reusing LeadPage for Account actions as per instructions

test.describe('TC056 - Verify Account Owner Reassignment with Mandatory Reassignment Reason (Positive Scenario)', () => {
  const ACCOUNT_NAME = 'Global Tech Corp';
  const NEW_OWNER = 'Pam Beesly';
  const REASSIGNMENT_REASON = 'Territory realignment Q4 2024';

  test('Account ' + ACCOUNT_NAME + ' owner successfully reassigned to ' + NEW_OWNER + ' with reassignment reason', async ({ authenticatedPage }) => {
    const leadPage = new LeadPage(authenticatedPage);

    // 1. Login to Salesforce (handled by auth.fixture)

    // 2. Navigate to the 'Accounts' tab
    await leadPage.navigateToAccountsTab();

    // 3. Search for Account Name and 4. Click on the record link
    await leadPage.searchAndOpenAccount(ACCOUNT_NAME);

    // 5-11. Edit Account, reassign owner, enter reason, and save
    await leadPage.editAccountOwner(NEW_OWNER, REASSIGNMENT_REASON);

    // 12. Verify the Account detail page reloads with the new owner
    // A toast message typically appears on successful save
    const successMessage = await leadPage.getSuccessMessage();
    expect(successMessage).toContain('Account "' + ACCOUNT_NAME + '" was saved.');

    // 13. Verify the 'Account Owner' field displays: 'Pam Beesly'
    const actualOwner = await leadPage.getAccountOwner();
    expect(actualOwner).toContain(NEW_OWNER, 'Account owner should be updated to ' + NEW_OWNER);

    // 14. Verify the 'Reassignment Reason' field displays: 'Territory realignment Q4 2024'
    const actualReassignmentReason = await leadPage.getReassignmentReason();
    expect(actualReassignmentReason).toBe(REASSIGNMENT_REASON, 'Reassignment Reason should be ' + REASSIGNMENT_REASON);

    // Additional verification based on expected results:
    // Data persisted is implicitly verified by checking displayed values
    // Reassignment_Reason_Mandatory validation rule satisfied - implicitly verified by successful save with the field filled.
  });
});