import { test, expect } from './auth.fixture';
import { LeadPage } from './LeadPage';
import { locators } from './LeadLocators';

test.describe('Lead Module - BDM User', () => {
  test('TC026 - Verify absence of \'Delete\' option for Lead records', async ({ user: page }) => {
    const leadPage = new LeadPage(page);

    // Step 2: Navigate to the 'Leads' tab from the App Launcher.
    await leadPage.navigateToLeadsTab();

    // Step 3: Click on the name of an existing Lead record (e.g., 'Sample Lead for Deletion Test') to open its detail page.
    await leadPage.openLeadRecord(locators.leadRecordName);

    // Step 4: Observe the action buttons at the top right of the record detail page (e.g., 'Edit', 'Clone').
    // Expected output 1: The 'Delete' button is not visible on the Lead record detail page.
    await leadPage.expectDeleteButtonNotVisible();

    // Step 5: Click on the dropdown arrow next to the action buttons (if present) to reveal additional actions.
    await leadPage.clickShowMoreActionsDropdown();

    // Expected output 2: The 'Delete' option is not available in the dropdown action menu.
    await leadPage.expectDeleteOptionNotInDropdown();
  });
});
