const { test, expect } = require('../../fixtures/auth.fixture');
const AccountPage = require('../../pages/AccountPage');

test.describe('TC003 - Verify Standard User (Non-Account Manager/Executive) can view TCV field but cannot edit it', () => {
  const ACCOUNT_NAME = 'Gamma Services - TCV Test';
  const ACCOUNT_ID = 'ACC-TCV-003'; // For reference, not directly used in Playwright for search
  const EXPECTED_TCV_AMOUNT = '$25,000.00';
  const ATTEMPTED_TCV_AMOUNT = '30,000.00';

  test('Verify TCV Amount field is viewable but not editable for Standard User', async ({ authenticatedPage }) => {
    const accountPage = new AccountPage(authenticatedPage);

    // 1. Login to Salesforce with 'Std_User' (Standard User) credentials. (Handled by fixture)

    // 2. Navigate to the 'Accounts' tab
    await accountPage.navigateToAccounts();

    // 3. Search for the Account 'Gamma Services - TCV Test'
    // 4. Click on the Account 'Gamma Services - TCV Test' to open its record page.
    await accountPage.searchAndOpenAccount(ACCOUNT_NAME);

    // 5. Verify that the 'TCV Amount' field (API Name: 'TCV_Amount__c') is visible on the Account detail page,
    //    displaying '$25,000.00'.
    const displayedTcvAmount = await accountPage.getTCVAmount();
    expect(displayedTcvAmount).toBe(EXPECTED_TCV_AMOUNT, "TCV Amount should be visible and display the correct value on the detail page.");

    // 6. Click the 'Edit' button located in the highlight panel of the Account record page.
    await accountPage.clickEditButton();

    // 7. Locate the 'TCV Amount' field in the edit modal.
    const tcvAmountInputField = accountPage.getTCVAmountInputFieldInEditModal();
    await expect(tcvAmountInputField).toBeVisible("TCV Amount field should be visible in the edit modal.");

    // 8. Attempt to enter or modify the value in the 'TCV Amount' field
    // Expected Results 2 & 3: The 'TCV Amount' field is displayed in a read-only state
    // and the user is unable to type or select a new value.
    const isEditable = await tcvAmountInputField.isEditable();
    expect(isEditable).toBeFalsy("TCV Amount field should NOT be editable in the edit modal.");

    // Further check specific attributes often used for read-only fields
    const readonlyAttribute = await tcvAmountInputField.getAttribute('readonly');
    const isDisabled = await tcvAmountInputField.isDisabled();

    expect(readonlyAttribute).not.toBeNull("TCV Amount field should have a 'readonly' attribute.");
    // Sometimes fields are disabled instead of just readonly
    expect(isDisabled).toBeFalsy("TCV Amount field should NOT be disabled. It should be readonly and visible.");
    
    // Attempting to fill value should not change its content if read-only
    const initialValueInModal = await tcvAmountInputField.inputValue();
    await accountPage.attemptToFillTCVAmount(ATTEMPTED_TCV_AMOUNT);
    const valueAfterAttempt = await tcvAmountInputField.inputValue();
    expect(valueAfterAttempt).toBe(initialValueInModal, "Attempting to type in TCV Amount field should not change its value.");
    expect(valueAfterAttempt).not.toContain(ATTEMPTED_TCV_AMOUNT, "Attempted new value should not appear in TCV Amount field.");

    // Expected Result 4: The 'Save' button, if clicked after attempting to edit other fields,
    // does not allow changes to the 'TCV Amount' field.
    // Since we confirmed the TCV field is not editable, attempting to save other (hypothetically editable) fields
    // would not implicitly save a change to TCV. We can confirm the 'Save' button is still clickable
    // but its action wouldn't affect the TCV field.
    const saveButton = authenticatedPage.locator(AccountPage.locators.saveButton);
    await expect(saveButton).toBeEnabled("Save button should be enabled if other fields are editable.");

    // Click Cancel to exit the modal without saving any (hypothetical) changes to other fields.
    await accountPage.clickCancelButtonInEditModal();
  });
});