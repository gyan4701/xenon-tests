const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const AccountPage = require('../../pages/AccountPage');

test.describe('TC003 - Verify Standard User (Non-Account Manager/Executive) can view TCV field but cannot edit it', () => {
  const ACCOUNT_NAME = 'Gamma Services - TCV Test';
  const TCV_EXPECTED_VALUE = '$25,000.00';
  const ATTEMPTED_EDIT_VALUE = '30,000.00';

  test('Standard User can view TCV field but cannot edit it', async ({ authenticatedPage }) => {
    const accountPage = new AccountPage(authenticatedPage);

    // 1. Navigate to the 'Accounts' tab
    await accountPage.navigateToAccountsObject();

    // 2. Search for and navigate to the Account 'Gamma Services - TCV Test'
    await accountPage.searchAndSelectAccount(ACCOUNT_NAME);

    // 3. Verify that the 'TCV Amount' field is visible and displays '$25,000.00'
    const tcvAmountOnDisplay = await accountPage.getTCVAmountDisplayValue();
    expect(tcvAmountOnDisplay).toBe(TCV_EXPECTED_VALUE);

    // 4. Click the 'Edit' button
    await accountPage.clickEditButton();

    // 5. Verify the 'TCV Amount' field is displayed in a read-only state within the edit modal
    const isTCVEditable = await accountPage.isTCVAmountFieldEditableInModal();
    expect(isTCVEditable).toBe(false, 'TCV Amount field should be read-only in the edit modal.');

    // 6. Attempt to enter or modify the value in the 'TCV Amount' field (should not change if read-only)
    const tcvEditFieldLocator = authenticatedPage.locator(require('../locators/AccountLocators').tcvAmountEditField);
    const initialValueInModal = await tcvEditFieldLocator.inputValue();
    await accountPage.attemptToTypeIntoTCVAmountField(ATTEMPTED_EDIT_VALUE);
    const valueAfterAttemptedEdit = await tcvEditFieldLocator.inputValue();

    // Verify the value did not change after attempt to type (because it's read-only)
    expect(valueAfterAttemptedEdit).toBe(initialValueInModal, 'TCV Amount field value should not change after attempting to type.');
    
    // If Save button is present and clickable after other edits, it should not affect TCV. For this test,
    // we confirm the field itself is uneditable, which implies changes cannot be saved for it.
    // No need to click save as we expect it to be uneditable.
  });
});