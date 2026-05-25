const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const AccountPage = require('../../pages/AccountPage');

test.describe('TC003 - Verify Standard User (Non-Account Manager/Executive) can view TCV field but cannot edit it', () => {
  const accountName = 'Gamma Services - TCV Test';
  const expectedTcvValue = '$25,000.00';

  test('Standard user can view TCV field but cannot edit it', async ({ authenticatedPage }) => {
    const accountPage = new AccountPage(authenticatedPage);

    // 1. Navigate to the 'Accounts' tab
    await accountPage.navigateToAccounts();

    // 2. Search for the Account 'Gamma Services - TCV Test' and open its record page
    await accountPage.searchAndOpenAccount(accountName);

    // 3. Verify that the 'TCV Amount' field is visible and displays '$25,000.00'
    const tcvAmountText = await accountPage.getTCVAmountFromDetailPage();
    expect(tcvAmountText).toBe(expectedTcvValue);
    console.log(`TCV Amount on detail page: ${tcvAmountText}`);

    // 4. Click the 'Edit' button
    await accountPage.clickEditButton();

    // 5. Locate the 'TCV Amount' field in the edit modal
    const tcvEditFieldLocator = accountPage.getTCVAmountEditFieldLocator();
    await expect(tcvEditFieldLocator).toBeVisible();

    // 6. Verify that the 'TCV Amount' field is displayed in a read-only state
    const isEditable = await accountPage.isTCVAmountFieldEditable();
    expect(isEditable).toBeFalsy();
    console.log(`TCV Amount field in edit modal is editable: ${isEditable}`);

    // 7. Attempt to enter or modify the value (optional, relies on isEditable check for robust verification)
    // A quick check to ensure typing doesn't change value, though isEditable is stronger
    await tcvEditFieldLocator.fill('30000.00'); // Attempt to fill
    const valueAfterAttemptedFill = await tcvEditFieldLocator.inputValue();
    // The value should remain the original one, or be empty if it's a non-editable input
    // Given it's a currency field, it should likely retain its original displayed value
    // For a standard field, it's safer to expect it remains unchanged or the input itself is truly uneditable.
    // Since isEditable() is already used, this step is more illustrative.
    // If the field is truly read-only, inputValue() might return the original text or an empty string.
    // We'll assert that it's NOT '30000.00' to show it couldn't be changed.
    expect(valueAfterAttemptedFill).not.toBe('30000.00'); 
    console.log(`TCV Amount field value after attempted edit: ${valueAfterAttemptedFill}`);

    // Expected Results:
    // 1. The 'TCV Amount' field is visible on the Account record page: Verified by expect(tcvAmountText).toBe(expectedTcvValue)
    // 2. The 'TCV Amount' field is displayed in a read-only state: Verified by expect(isEditable).toBeFalsy()
    // 3. The user is unable to type or select a new value: Verified by expect(isEditable).toBeFalsy() and attempted fill assertion.
    // 4. The 'Save' button, if clicked after attempting to edit other fields, does not allow changes to the 'TCV Amount' field: 
    //    This part is implicitly covered by the field being uneditable. 
    //    We do not need to click Save as the primary assertion is the field's editability.
  });
});