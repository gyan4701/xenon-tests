const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  async navigateToAccounts() {
    await this.page.waitForSelector(locators.appLauncherButton, { state: 'visible' });
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible' });
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.click(locators.accountsAppTile);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' }); // Wait for page content to load
  }

  async searchAndOpenAccount(accountName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' });
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.press(locators.globalSearchInput, 'Enter');
    // Wait for search results to load and click on the specific record
    await this.page.waitForSelector(locators.recordLinkByName(accountName), { state: 'visible' });
    await this.page.click(locators.recordLinkByName(accountName));
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(locators.accountRecordNameHeader, { state: 'visible' });
    await this.page.waitForLoadState('networkidle'); // Ensure all details are loaded
  }

  async getTCVAmountValueOnDetailPage() {
    await this.page.waitForSelector(locators.tcvAmountViewField, { state: 'visible' });
    return await this.page.textContent(locators.tcvAmountViewField);
  }

  async clickEditButton() {
    await this.page.waitForSelector(locators.editButton, { state: 'visible' });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.tcvAmountEditField, { state: 'visible' }); // Wait for edit modal to appear
  }

  async getTCVAmountEditFieldLocator() {
    await this.page.waitForSelector(locators.tcvAmountEditField, { state: 'visible' });
    return this.page.locator(locators.tcvAmountEditField);
  }

  async attemptToTypeIntoTCVAmountField(newValue) {
    const tcvField = this.page.locator(locators.tcvAmountEditField);
    await tcvField.focus(); // Focus on the field
    // Attempt to fill, this will either work or not if read-only
    await tcvField.fill(newValue, { timeout: 1000, force: true }).catch(() => {}); // Catch error if element is not editable
    return await tcvField.inputValue();
  }

  async clickSaveButton() {
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(locators.accountRecordNameHeader, { state: 'visible' }); // Wait for detail page to reload
  }
}