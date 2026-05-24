const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Accounts tab via the App Launcher.
   */
  async navigateToAccounts() {
    await this.page.waitForSelector(locators.appLauncherButton, { state: 'visible', timeout: 30000 });
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible', timeout: 10000 });
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.click(locators.appLauncherItem('Accounts'));
    await this.page.waitForLoadState('networkidle');
    // Ensure the Accounts list view is loaded
    await this.page.waitForSelector("//h1[contains(., 'Accounts') and contains(@class, 'slds-page-header__title') or @title='Accounts']", { state: 'visible', timeout: 30000 });
  }

  /**
   * Searches for an account using the global search bar and opens its record page.
   * @param {string} accountName The name of the account to search for.
   */
  async searchAndOpenAccount(accountName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible', timeout: 30000 });
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.press(locators.globalSearchInput, 'Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.searchResultLink(accountName), { state: 'visible', timeout: 30000 });
    await this.page.click(locators.searchResultLink(accountName));
    await this.page.waitForSelector(locators.accountRecordNameHeader, { state: 'visible', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Retrieves the displayed TCV Amount from the Account detail page.
   * @returns {Promise<string>} The text content of the TCV Amount field.
   */
  async getTCVAmount() {
    await this.page.waitForSelector(locators.tcvAmountDisplay, { state: 'visible', timeout: 10000 });
    return await this.page.textContent(locators.tcvAmountDisplay);
  }

  /**
   * Clicks the 'Edit' button on the Account record page.
   */
  async clickEditButton() {
    await this.page.waitForSelector(locators.editButton, { state: 'visible', timeout: 10000 });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.modalTitle, { state: 'visible', timeout: 10000 });
  }

  /**
   * Returns the Playwright Locator for the TCV Amount input field in the edit modal.
   * This allows the test to perform assertions on its state (e.g., isEditable, getAttribute('readonly')).
   * @returns {import('@playwright/test').Locator} The TCV Amount input field locator.
   */
  getTCVAmountInputFieldInEditModal() {
    return this.page.locator(locators.tcvAmountEditInput);
  }

  /**
   * Attempts to fill a value into the TCV Amount field in the edit modal.
   * Note: This method is used to simulate an attempt, and assertions should check if it was successful.
   * @param {string} value The value to attempt to enter.
   */
  async attemptToFillTCVAmount(value) {
    const tcvInputField = this.getTCVAmountInputFieldInEditModal();
    // Ensure field is ready for interaction, even if read-only
    await tcvInputField.waitFor({ state: 'visible', timeout: 5000 });
    await tcvInputField.fill(value);
  }

  /**
   * Clicks the 'Cancel' button in the edit modal.
   */
  async clickCancelButtonInEditModal() {
    await this.page.click(locators.cancelButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clicks the 'Save' button in the edit modal.
   */
  async clickSaveButtonInEditModal() {
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('networkidle');
    // Wait for the modal to disappear and the page to update
    await this.page.waitForSelector(locators.modalTitle, { state: 'hidden', timeout: 15000 });
  }
}