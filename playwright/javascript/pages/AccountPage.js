const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Accounts object page via the App Launcher.
   */
  async navigateToAccountsObject() {
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible' });
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.waitForTimeout(500); // Allow search results to populate
    await this.page.click(locators.accountsNavItem);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Searches for an account using the global search bar and navigates to its record page.
   * @param {string} accountName - The name of the account to search for.
   */
  async searchAndSelectAccount(accountName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' });
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.press(locators.globalSearchInput, 'Enter');
    await this.page.waitForLoadState('networkidle');
    
    // Wait for search results to load and click the correct account link
    const accountLink = this.page.locator(locators.searchResultLink(accountName));
    await accountLink.waitFor({ state: 'visible' });
    await accountLink.click();
    await this.page.waitForSelector(locators.accountRecordNameHeader, { state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Retrieves the displayed TCV Amount from the Account detail page.
   * @returns {Promise<string>} The TCV Amount text.
   */
  async getTCVAmountDisplayValue() {
    const tcvField = this.page.locator(locators.tcvAmountDisplayField);
    await tcvField.waitFor({ state: 'visible' });
    return await tcvField.textContent();
  }

  /**
   * Clicks the 'Edit' button on the Account record page.
   */
  async clickEditButton() {
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.modalTitle, { state: 'visible' }); // Wait for edit modal to appear
  }

  /**
   * Checks if the TCV Amount field is editable in the edit modal.
   * @returns {Promise<boolean>} True if the field is editable, false otherwise.
   */
  async isTCVAmountFieldEditableInModal() {
    const tcvEditField = this.page.locator(locators.tcvAmountEditField);
    await tcvEditField.waitFor({ state: 'visible' });
    const isDisabled = await tcvEditField.isDisabled();
    const isReadOnly = await tcvEditField.getAttribute('readonly');
    // A field is considered non-editable if it's disabled or has the readonly attribute
    return !isDisabled && isReadOnly === null; 
  }

  /**
   * Attempts to type a value into the TCV Amount field in the edit modal.
   * @param {string} value - The value to attempt to type.
   */
  async attemptToTypeIntoTCVAmountField(value) {
    const tcvEditField = this.page.locator(locators.tcvAmountEditField);
    await tcvEditField.waitFor({ state: 'visible' });
    await tcvEditField.fill(value);
  }

  /**
   * Clicks the Save button in the edit modal.
   */
  async clickSaveButton() {
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('networkidle');
  }
}