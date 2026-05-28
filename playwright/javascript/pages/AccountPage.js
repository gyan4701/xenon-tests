const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Accounts home page via the App Launcher.
   */
  async navigateToAccountsHome() {
    await this.page.waitForSelector(locators.appLauncherButton, { state: 'visible' });
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible' });
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.waitForSelector(locators.appLauncherAccountLink, { state: 'visible' });
    await this.page.click(locators.appLauncherAccountLink);
    await this.page.waitForLoadState('networkidle');
    await this.waitForSpinnerToDisappear();
  }

  /**
   * Searches for an account using the global search bar and opens its record page.
   * @param {string} accountName - The name of the account to search for.
   */
  async searchAndOpenAccount(accountName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' });
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.press(locators.globalSearchInput, 'Enter');
    await this.page.waitForSelector(locators.listViewTable, { state: 'visible' });
    // Click on the link for the specific account in the search results
    await this.page.locator(`a[title="${accountName}"]`).first().click();
    await this.page.waitForLoadState('networkidle');
    await this.waitForSpinnerToDisappear();
    await this.page.waitForSelector(locators.accountNameHeader, { state: 'visible', timeout: 10000 });
  }

  /**
   * Retrieves the TCV Amount value displayed on the Account detail page.
   * @returns {Promise<string>} The TCV Amount as a string.
   */
  async getTcvAmountOnDetailPage() {
    const tcvField = this.page.locator(locators.tcvAmountDetailField);
    await tcvField.waitFor({ state: 'visible' });
    return await tcvField.textContent();
  }

  /**
   * Clicks the 'Edit' button on the Account record page highlight panel.
   */
  async clickEditButton() {
    await this.page.waitForSelector(locators.editButton, { state: 'visible' });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.modalHeader, { state: 'visible' }); // Wait for the edit modal to appear
  }

  /**
   * Returns the Playwright Locator for the TCV Amount field within the edit modal.
   * This locator can then be used to perform checks like isEditable().
   * @returns {Locator} The Playwright Locator object for the TCV Amount input field.
   */
  getTcvAmountFieldInEditModal() {
    return this.page.locator(locators.tcvAmountEditField);
  }

  /**
   * Waits for the Salesforce spinner to disappear.
   */
  async waitForSpinnerToDisappear() {
    await this.page.locator(locators.spinner).waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}

module.exports = AccountPage;