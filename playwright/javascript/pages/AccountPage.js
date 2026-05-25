const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Accounts object page using the App Launcher.
   */
  async navigateToAccounts() {
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible' });
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.click(locators.appLauncherAccountsItem);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.accountNameHeader, { state: 'visible' });
  }

  /**
   * Searches for an account using the global search bar and opens its record page.
   * @param {string} accountName The name of the account to search for.
   */
  async searchAndOpenAccount(accountName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' });
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.press(locators.globalSearchInput, 'Enter');
    // Wait for search results and click on the specific account link
    await this.page.waitForSelector(locators.accountLinkByName(accountName), { state: 'visible' });
    await this.page.click(locators.accountLinkByName(accountName));
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.accountRecordNameHeader, { text: accountName, state: 'visible' });
  }

  /**
   * Retrieves the TCV Amount from the Account detail page.
   * @returns {Promise<string>} The text content of the TCV Amount field.
   */
  async getTCVAmountFromDetailPage() {
    await this.page.waitForSelector(locators.tcvAmountDetailPage, { state: 'visible' });
    return await this.page.textContent(locators.tcvAmountDetailPage);
  }

  /**
   * Clicks the 'Edit' button on the Account record page.
   */
  async clickEditButton() {
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.modalTitle, { text: 'Edit Account', state: 'visible' }); // Wait for edit modal to appear
  }

  /**
   * Checks if the TCV Amount field is editable in the edit modal.
   * @returns {Promise<boolean>} True if the field is editable, false otherwise.
   */
  async isTCVAmountFieldEditableInEditModal() {
    const tcvField = this.page.locator(locators.tcvAmountEditModal);
    // Check if the input element exists and is not disabled or readonly
    const isDisabled = await tcvField.isDisabled();
    const isReadOnly = await tcvField.getAttribute('readonly');
    return !isDisabled && isReadOnly === null; // True if not disabled and no readonly attribute
  }

  /**
   * Attempts to fill a value into the TCV Amount field in the edit modal.
   * Note: This method will attempt to fill even if the field is read-only
   * to simulate user action. Assertions should check if the value was actually changed.
   * @param {string} newValue The value to attempt to fill.
   */
  async attemptToFillTCVAmountInEditModal(newValue) {
    const tcvField = this.page.locator(locators.tcvAmountEditModal);
    // Clear and fill might not work if field is readonly/disabled, but we simulate the attempt
    await tcvField.focus();
    await tcvField.click(); // Ensure focus
    await tcvField.fill(newValue);
  }

  /**
   * Retrieves the current value of the TCV Amount field in the edit modal.
   * @returns {Promise<string>} The value attribute of the TCV Amount input field.
   */
  async getTCVAmountFromEditModal() {
    const tcvField = this.page.locator(locators.tcvAmountEditModal);
    return await tcvField.inputValue();
  }

  /**
   * Clicks the 'Save' button in the edit modal.
   */
  async clickSaveButton() {
    await this.page.click(locators.saveEditButton);
    await this.page.waitForLoadState('networkidle');
    // Wait for the modal to close or an error message to appear
    await this.page.waitForSelector(locators.modalTitle, { state: 'hidden', timeout: 10000 }).catch(() => {}); // Modal might not close if error
  }
}

module.exports = AccountPage;