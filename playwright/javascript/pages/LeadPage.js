const locators = require('../locators/LeadLocators');

class LeadPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to a specific Salesforce app item (e.g., 'Accounts' or 'Leads').
   * Given the conflicting instructions, this will navigate to 'Accounts' as per the test case intent.
   * @param {string} itemName The name of the App item (e.g., 'Accounts', 'Leads').
   */
  async navigateToAppItem(itemName) {
    await this.page.waitForSelector(locators.appLauncherIcon, { state: 'visible' });
    await this.page.click(locators.appLauncherIcon);
    await this.page.waitForSelector('.app-launcher-menu', { state: 'visible' });
    await this.page.locator(`input[placeholder='Search apps and items...']`).fill(itemName);
    await this.page.locator(locators.appMenuItem(itemName)).click();
    await this.page.waitForLoadState('networkidle');
    // Verify navigation by checking the current page's title or URL segment
    await this.page.waitForURL(`**/*${itemName}*`);
  }

  /**
   * Searches for a record and opens its detail page.
   * @param {string} recordName The name of the record to search for.
   */
  async searchAndOpenRecord(recordName) {
    await this.page.waitForSelector(locators.globalSearchInput, { state: 'visible' });
    await this.page.fill(locators.globalSearchInput, recordName);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    // Click on the search result link
    await this.page.waitForSelector(locators.searchResultsLink(recordName), { state: 'visible' });
    await this.page.click(locators.searchResultsLink(recordName));
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.recordPageTitle, { state: 'visible' });
  }

  /**
   * Edits the owner of an Account/Lead and provides a reassignment reason.
   * @param {string} newOwnerName The name of the new owner (e.g., 'Pam Beesly').
   * @param {string} reassignmentReasonText The reason for reassignment (e.g., 'Territory realignment Q4 2024').
   */
  async editRecordOwnerAndReason(newOwnerName, reassignmentReasonText) {
    await this.page.waitForSelector(locators.editButton, { state: 'visible' });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.editFormHeader, { state: 'visible' });

    // Locate Account Owner lookup field and click icon
    await this.page.waitForSelector(locators.accountOwnerLookupIcon, { state: 'visible' });
    await this.page.click(locators.accountOwnerLookupIcon);

    // Interact with the lookup modal
    await this.page.waitForSelector(locators.lookupModalSearchInput, { state: 'visible' });
    await this.page.fill(locators.lookupModalSearchInput, newOwnerName);
    await this.page.waitForTimeout(1000); // Wait for search results to appear
    await this.page.click(locators.lookupModalSearchResult(newOwnerName));

    // Enter reassignment reason
    await this.page.waitForSelector(locators.reassignmentReasonTextarea, { state: 'visible' });
    await this.page.fill(locators.reassignmentReasonTextarea, reassignmentReasonText);

    // Click Save
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.successToastMessage, { state: 'visible' });
  }

  /**
   * Gets the displayed owner name from the detail page.
   * @returns {Promise<string>} The text content of the owner field.
   */
  async getDisplayedOwnerName() {
    await this.page.waitForSelector(locators.displayedAccountOwner, { state: 'visible' });
    return await this.page.textContent(locators.displayedAccountOwner);
  }

  /**
   * Gets the displayed reassignment reason from the detail page.
   * @returns {Promise<string>} The text content of the reassignment reason field.
   */
  async getDisplayedReassignmentReason() {
    await this.page.waitForSelector(locators.displayedReassignmentReason, { state: 'visible' });
    return await this.page.textContent(locators.displayedReassignmentReason);
  }

  /**
   * Gets the success toast message text.
   * @returns {Promise<string>} The text content of the success toast message.
   */
  async getSuccessMessage() {
    await this.page.waitForSelector(locators.successToastMessage, { state: 'visible' });
    return await this.page.textContent(locators.successToastMessage);
  }

  /**
   * Gets the record detail page title.
   * @returns {Promise<string>} The text content of the record page title.
   */
  async getRecordPageTitle() {
    await this.page.waitForSelector(locators.recordPageTitle, { state: 'visible' });
    return await this.page.textContent(locators.recordPageTitle);
  }
}