const locators = require('../locators/LeadLocators');

class LeadPage {
  constructor(page) {
    this.page = page;
  }

  async navigateToLeads() {
    await this.page.click(locators.appLauncherIcon);
    await this.page.waitForSelector(locators.leadsMenuItem, { state: 'visible' });
    await this.page.click(locators.leadsMenuItem);
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector(locators.newButton, { state: 'visible', timeout: 30000 });
  }

  async createLeadWithoutEmail(lastName, company, status) {
    await this.page.click(locators.newButton);
    await this.page.waitForSelector(locators.lastNameInput, { state: 'visible', timeout: 15000 });
    await this.page.fill(locators.lastNameInput, lastName);
    await this.page.fill(locators.companyInput, company);

    await this.page.click(locators.statusComboboxButton);
    await this.page.waitForSelector(locators.statusComboboxOption(status), { state: 'visible' });
    await this.page.click(locators.statusComboboxOption(status));

    // Intentionally leave Email field blank

    await this.page.click(locators.saveButton);
  }

  async getErrorMessage() {
    // Prioritize toast message first for global validation rules
    if (await this.page.locator(locators.toastMessage).isVisible({ timeout: 10000 })) {
      return await this.page.textContent(locators.toastMessage);
    }
    // Fallback to field-level error message if toast not found or not specific enough
    if (await this.page.locator(locators.emailFieldErrorMessage).isVisible({ timeout: 5000 })) {
        return await this.page.textContent(locators.emailFieldErrorMessage);
    }
    // Fallback to general form error banner
    if (await this.page.locator(locators.formErrorBanner).isVisible({ timeout: 5000 })) {
        return await this.page.textContent(locators.formErrorBanner);
    }
    return null;
  }
}

module.exports = LeadPage;