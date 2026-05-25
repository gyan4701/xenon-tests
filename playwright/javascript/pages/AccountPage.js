const locators = require('../locators/AccountLocators');

class AccountPage {
  constructor(page) {
    this.page = page;
  }

  async navigateToAccounts() {
    await this.page.click(locators.appLauncherButton);
    await this.page.fill(locators.appLauncherSearchInput, 'Accounts');
    await this.page.click(locators.accountsAppLauncherLink);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' }); // Wait for page to fully load
  }

  async searchAndOpenAccount(accountName) {
    await this.page.fill(locators.globalSearchInput, accountName);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.click(locators.searchResultLink(accountName));
    await this.page.waitForSelector(locators.accountNameHeader, { state: 'visible' });
    await expect(this.page.locator(locators.accountNameHeader)).toHaveText(accountName);
  }

  async getTCVAmountFromDetailPage() {
    const tcvLocator = this.page.locator(locators.tcvAmountDisplayValue);
    await tcvLocator.waitFor({ state: 'visible' });
    return await tcvLocator.textContent();
  }

  async clickEditButton() {
    await this.page.click(locators.editButton);
    // Wait for the edit modal to appear
    await this.page.waitForSelector("h2.slds-modal__header_title:has-text('Edit Account')", { state: 'visible' });
  }

  getTCVAmountEditFieldLocator() {
    return this.page.locator(locators.tcvAmountEditInput);
  }

  async isTCVAmountFieldEditable() {
    const tcvEditField = this.getTCVAmountEditFieldLocator();
    // Check for readonly attribute or if the field is generally not editable
    const isReadonly = await tcvEditField.getAttribute('readonly');
    const isDisabled = await tcvEditField.isDisabled();
    return !(isReadonly !== null || isDisabled);
  }
}