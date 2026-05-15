const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const AccountPage = require('../../pages/AccountPage');

test.describe('TC003 - Verify Standard User (Non-Account Manager/Executive) can view TCV field but cannot edit it', () => {
  const accountName = 'Gamma Services - TCV Test';
  const expectedTCVValue = '$25,000.00';
  const attemptNewTCVValue = '30000.00';

  test('Standard User can view TCV field but cannot edit it', async ({ authenticatedPage }) => {
    const accountPage = new AccountPage(authenticatedPage);

    // 1. Login to Salesforce with 'Std_User' (Standard User) credentials. (Handled by fixture)

    // 2. Navigate to the 'Accounts' tab
    await accountPage.navigateToAccounts();

    // 3. Search for the Account 'Gamma Services - TCV Test' (ID: 'ACC-TCV-003') using the global search bar.
    // 4. Click on the Account 'Gamma Services - TCV Test' to open its record page.
    await accountPage.searchAndOpenAccount(accountName);

    // 5. Verify that the 'TCV Amount' field (API Name: 'TCV_Amount__c') is visible on the Account detail page, displaying '$25,000.00'.
    const tcvAmountOnDetailPage = await accountPage.getTCVAmountValueOnDetailPage();
    expect(tcvAmountOnDetailPage).toBe(expectedTCVValue, 'TCV Amount field should be visible and display correct value.');

    // 6. Click the 'Edit' button located in the highlight panel of the Account record page.
    await accountPage.clickEditButton();

    // 7. Locate the 'TCV Amount' field in the edit modal.
    const tcvAmountEditField = await accountPage.getTCVAmountEditFieldLocator();

    // 8. Attempt to enter or modify the value in the 'TCV Amount' field (e.g., try typing '30000.00').
    // Expected Results:
    // 2. The 'TCV Amount' field is displayed in a read-only state within the edit modal.
    // 3. The user is unable to type or select a new value for the 'TCV Amount' field.

    // Check if the input field is disabled or read-only
    const isDisabled = await tcvAmountEditField.isDisabled();
    const isReadOnly = await tcvAmountEditField.getAttribute('readonly') !== null;
    const pointerEvents = await tcvAmountEditField.evaluate(el => window.getComputedStyle(el).getPropertyValue('pointer-events'));
    const initialValueInEditModal = await tcvAmountEditField.inputValue();

    expect(isDisabled || isReadOnly || pointerEvents === 'none').toBeTruthy();
    expect(isDisabled || isReadOnly || pointerEvents === 'none').toBe(true, 'TCV Amount field in edit modal should be read-only or disabled.');

    // Attempt to fill and verify its value doesn't change
    await tcvAmountEditField.focus();
    await tcvAmountEditField.fill(attemptNewTCVValue).catch(() => {}); // Expect this to fail or not change value if read-only
    await tcvAmountEditField.blur();
    const valueAfterAttempt = await tcvAmountEditField.inputValue();
    expect(valueAfterAttempt).toBe(initialValueInEditModal.replace(/\$|,/g, ''), 'TCV Amount field value should not be modifiable.'); // Remove $ and , for direct comparison if it's an input value

    // Additional check: Try to force clear and fill (should still not work)
    await tcvAmountEditField.evaluate(input => input.value = ''); // Clear via JS
    await tcvAmountEditField.fill(attemptNewTCVValue, { force: true }).catch(() => {});
    const valueAfterForceAttempt = await tcvAmountEditField.inputValue();
    expect(valueAfterForceAttempt).toBe(initialValueInEditModal.replace(/\$|,/g, ''), 'TCV Amount field should resist forced modification.');

    // The save button scenario is implicit - if the field is not editable, it cannot be saved with a new value.
    // Since we confirmed it's not editable, the save button can't change it.
    // We're not editing other fields, so we don't need to click save for this test case specifically.
  });
});