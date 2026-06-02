const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeadPage = require('../../pages/LeadPage');

test.describe('TC055 - Verify Churn Date is Mandatory when Account Customer Status is Churned (Negative Scenario)', () => {
  test('Should display an error when Churn Date is blank for a Churned Account', async ({ authenticatedPage }) => {
    const leadPage = new LeadPage(authenticatedPage);
    const accountName = 'ACME Solutions';
    const expectedErrorMessage = 'Churn Date is mandatory when Customer Status is Churned.';

    // --- IMPORTANT NOTE REGARDING TEST EXECUTION ---
    // The test case description, manual steps, and expected results clearly refer to the 'Account' object
    // and fields like 'Customer Status' and 'Churn Date'. However, the provided metadata is exclusively
    // for the 'Lead' object, which does NOT contain these fields. 
    // This test will simulate the actions as if they were on an Account, using generic navigation and
    // placeholder methods/locators from LeadPage, but cannot functionally validate the Account-specific
    // validation rule on a Lead record. The assertions will check for generic error messages.
    // For a fully functional test, 'Account' object metadata (including 'Customer Status' and 'Churn Date')
    // would be required.
    // --- END IMPORTANT NOTE ---

    // 1. Login to Salesforce with 'Sales User' credentials (Handled by auth.fixture)

    // 2. Navigate to the 'Accounts' tab (Menu: Accounts)
    // Simulating navigation to Accounts, though current page object is LeadPage.
    await leadPage.navigateToTab('Accounts');

    // 3. Search for Account Name: 'ACME Solutions'
    await leadPage.searchAndOpenRecord(accountName);
    await expect(leadPage.page.locator(leadPage.page.locator(leadPage.locators.recordPageTitle))).toHaveText(accountName);

    // 4. Click the 'Edit' button on the Account detail page
    await leadPage.clickEditButton();

    // 5. Locate the 'Customer Status' picklist field & Select 'Churned'
    // Using placeholder method, acknowledging it's an Account field.
    await leadPage.setCustomerStatus('Churned');

    // 6. Locate the 'Churn Date' field and ensure it is left blank (no action needed if not filling)
    // Using placeholder method to explicitly leave it blank (or ensure it's empty)
    await leadPage.setChurnDate(''); 

    // 7. Click the 'Save' button
    await leadPage.clickSaveButton();

    // 8. Verify an error message is displayed on the 'Churn Date' field
    // Asserting a generic error message as specific field errors might vary or not be directly linked to Lead field names.
    await expect(leadPage.isFieldErrorVisible('Churn_Date__c')).toBeTruthy({ timeout: 10000 });
    const actualErrorMessage = await leadPage.getFieldError('Churn_Date__c');
    await expect(actualErrorMessage).toContain(expectedErrorMessage); 

    // 9. Verify Account record for 'ACME Solutions' is not saved with 'Customer Status' as 'Churned'.
    // This would typically involve navigating back to the detail page and asserting the Customer Status field value.
    // Due to the negative scenario (save failure), the page should remain on the edit form or show an error toast.
    // We verify this by checking if the 'Save' button is still visible or an error banner is present.
    await expect(leadPage.page.locator(leadPage.locators.saveButton)).toBeVisible();

    // Optionally, close the edit modal if it's still open to clean up, or click 'Cancel'
    await leadPage.page.locator('button[name="CancelEdit"]').click();
    await leadPage.page.waitForLoadState('networkidle');
  });
});