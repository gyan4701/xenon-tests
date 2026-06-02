const locators = require('../locators/LeadLocators');

class LeadPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to a specific app via the App Launcher.
   * @param {string} appName The name of the app to navigate to (e.g., 'Sales').
   */
  async navigateToApp(appName) {
    await this.page.click(locators.appLauncherButton);
    await this.page.waitForSelector(locators.appLauncherSearchInput, { state: 'visible' });
    await this.page.fill(locators.appLauncherSearchInput, appName);
    await this.page.locator(`a[data-label="${appName}"]`).first().click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigates to a specific tab.
   * @param {string} tabName The name of the tab to navigate to (e.g., 'Accounts', 'Leads').
   */
  async navigateToTab(tabName) {
    await this.page.locator(`one-app-nav-bar-item-root a[title="${tabName}"]`).click();
    await this.page.waitForLoadState('networkidle');
    // Wait for the list view or detail page to load
    await this.page.waitForSelector('h1.slds-page-header__title, .forceList span.count', { state: 'visible' });
  }

  /**
   * Searches for a record by name in a list view and opens its detail page.
   * This method is generic and would work for Accounts or Leads.
   * @param {string} recordName The name of the record to search for.
   */
  async searchAndOpenRecord(recordName) {
    await this.page.waitForSelector(locators.searchRecordInput, { state: 'visible' });
    await this.page.fill(locators.searchRecordInput, recordName);
    await this.page.press(locators.searchRecordInput, 'Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.click(locators.searchResultLink(recordName));
    await this.page.waitForSelector(locators.recordPageTitle, { state: 'visible' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Clicks the 'Edit' button on a record detail page.
   */
  async clickEditButton() {
    await this.page.waitForSelector(locators.editButton, { state: 'visible' });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.saveButton, { state: 'visible' }); // Wait for edit form to load
  }

  /**
   * Clicks the 'Save' button on a record edit form.
   */
  async clickSaveButton() {
    await this.page.waitForSelector(locators.saveButton, { state: 'visible' });
    await this.page.click(locators.saveButton);
    // A save operation might lead to an error or a success toast/updated detail page
    // We'll rely on the test to assert the outcome.
  }

  /**
   * Selects a value from a picklist field.
   * @param {string} fieldLocator The CSS locator for the picklist button.
   * @param {string} value The value to select.
   */
  async selectPicklistValue(fieldLocator, value) {
    await this.page.waitForSelector(fieldLocator, { state: 'visible' });
    await this.page.click(fieldLocator);
    await this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`).click();
  }

  /**
   * Fills a generic input field.
   * @param {string} fieldLocator The CSS locator for the input field.
   * @param {string} value The value to enter.
   */
  async fillInputField(fieldLocator, value) {
    await this.page.waitForSelector(fieldLocator, { state: 'visible' });
    await this.page.fill(fieldLocator, value);
  }

  /**
   * Attempts to set the 'Customer Status' picklist. Note: This field is typically on Account, not Lead.
   * This method uses a placeholder locator. 
   * @param {string} status The status to select (e.g., 'Churned').
   */
  async setCustomerStatus(status) {
    console.warn("Warning: 'Customer Status' is an Account-specific field, not found in Lead metadata. Using placeholder locator.");
    await this.selectPicklistValue(locators.customerStatusCombobox, status);
  }

  /**
   * Attempts to set the 'Churn Date' field. Note: This field is typically on Account, not Lead.
   * This method uses a placeholder locator.
   * @param {string} date The date to enter (e.g., 'MM/DD/YYYY').
   */
  async setChurnDate(date) {
    console.warn("Warning: 'Churn Date' is an Account-specific field, not found in Lead metadata. Using placeholder locator.");
    await this.fillInputField(locators.churnDateField, date);
  }

  /**
   * Retrieves the error message for a specified field or a generic error message.
   * @param {string} fieldName The API name or a descriptive name of the field to check for errors.
   * @returns {Promise<string>} The error message text, or empty string if not found.
   */
  async getFieldError(fieldName) {
    let errorLocator = this.page.locator(locators.fieldLevelError(fieldName)).first();
    if (!(await errorLocator.isVisible({ timeout: 5000 }))) {
      // Fallback to a more generic error message if specific field error isn't found
      errorLocator = this.page.locator(locators.genericFieldErrorMessage).first();
    }
    if (await errorLocator.isVisible({ timeout: 3000 })) {
      return await errorLocator.textContent();
    }
    return '';
  }

  /**
   * Checks if an error message is visible for a specified field.
   * @param {string} fieldName The API name or a descriptive name of the field.
   * @returns {Promise<boolean>} True if an error message is visible, false otherwise.
   */
  async isFieldErrorVisible(fieldName) {
    let errorLocator = this.page.locator(locators.fieldLevelError(fieldName)).first();
    if (!(await errorLocator.isVisible({ timeout: 5000 }))) {
      errorLocator = this.page.locator(locators.genericFieldErrorMessage).first();
    }
    return await errorLocator.isVisible({ timeout: 3000 });
  }
}

module.exports = LeadPage;