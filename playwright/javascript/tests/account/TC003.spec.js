const { test, expect } = require('../../fixtures/auth.fixture');
const AccountPage = require('../../pages/AccountPage');

test.describe('Verify Standard User', () => {
  const ACCOUNT_NAME = 'Gamma Services - TCV Test';
  const EXPECTED_TCV_AMOUNT = '$25,000.00';

  test('Verify TCV Amount field is visible and read-only for Standard User', async ({ authenticatedPage }) => {
    const accountPage = new AccountPage(authenticatedPage);

    // 1. Login to Salesforce with 'Std_User' (Standard User) credentials.
    // (Handled by auth.fixture.js)

    // 2. Navigate to the 'Accounts' tab (from the App Launcher or Navigation Bar).
    await accountPage.navigateToAccountsHome();

    // 3. Search for the Account 'Gamma Services - TCV Test' and 4. Click on it to open its record page.
    await accountPage.searchAndOpenAccount(ACCOUNT_NAME);

    // 5. Verify that the 'TCV Amount' field is visible on the Account detail page, displaying '$25,000.00'.
    const actualTcvAmountOnDetailPage = await accountPage.getTcvAmountOnDetailPage();
    expect(actualTcvAmountOnDetailPage).toBe(EXPECTED_TCV_AMOUNT, 'TCV Amount field should be visible and display the correct value on the detail page.');

    // 6. Click the 'Edit' button located in the highlight panel of the Account record page.
    await accountPage.clickEditButton();

    // 7. Locate the 'TCV Amount' field in the edit modal.
    const tcvFieldInEditModal = accountPage.getTcvAmountFieldInEditModal();
    await tcvFieldInEditModal.waitFor({ state: 'visible' });

    // 8. Attempt to enter or modify the value in the 'TCV Amount' field (e.g., try typing '30000.00').
    // Expected Results:
    // 2. The 'TCV Amount' field is displayed in a read-only state within the edit modal.
    // 3. The user is unable to type or select a new value for the 'TCV Amount' field.

    // Verify that the TCV Amount field in the edit modal is not editable.
    await expect(tcvFieldInEditModal, 'TCV Amount field in edit modal should not be editable.').toBeDisabled();
    // Alternatively, or additionally, check for the 'readonly' attribute if 'disabled' is not present.
    // const isReadOnlyAttribute = await tcvFieldInEditModal.getAttribute('readonly');
    // const isDisabledAttribute = await tcvFieldInEditModal.getAttribute('disabled');
    // expect(isReadOnlyAttribute !== null || isDisabledAttribute !== null, 'TCV Amount field in edit modal should be read-only or disabled.').toBeTruthy();

    // Attempting to fill a disabled/read-only field should either do nothing or throw an error based on Playwright's behavior.
    // We primarily rely on toBeDisabled() or similar assertions.
  });
});