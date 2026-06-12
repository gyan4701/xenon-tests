const locators = require('../locators/LeadLocators');

class LeadPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Accounts tab via the App Launcher.
   */
  async navigateToAccountsTab() {
    await this.page.click(locators.appLauncherIcon);
    await this.page.locator('input.slds-input[placeholder="Search apps and items..."]').fill('Accounts');
    await this.page.click(locators.accountsTabLink);
    await this.page.waitForLoadState('networkidle');
    // Verify navigation by checking the header title for 'Accounts'
    await this.page.waitForSelector("h1 span.slds-page-header__title:has-text('Accounts')");
  }

  /**
   * Searches for an account by name in the list view and opens its detail page.
   * @param {string} accountName The name of the account to search for.
   */
  async searchAndOpenAccount(accountName) {
    await this.page.waitForSelector(locators.listViewSearchInput, { state: 'visible' });
    await this.page.fill(locators.listViewSearchInput, accountName);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.accountRecordLink(accountName), { state: 'visible' });
    await this.page.click(locators.accountRecordLink(accountName));
    await this.page.waitForLoadState('networkidle');
    // Verify the record page title
    await this.page.waitForSelector(locators.recordPageTitle);
    await expect(this.page.locator(locators.recordPageTitle)).toHaveText(accountName);
  }

  /**
   * Edits the account owner and enters a reassignment reason.
   * @param {string} newOwnerName The name of the new account owner.
   * @param {string} reassignmentReason The reason for the reassignment.
   */
  async editAccountOwner(newOwnerName, reassignmentReason) {
    await this.page.waitForSelector(locators.editButton, { state: 'visible' });
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.editFormHeader, { state: 'visible' });

    // Click the lookup icon next to the 'Account Owner' field
    await this.page.waitForSelector(locators.accountOwnerLookupButton, { state: 'visible' });
    await this.page.click(locators.accountOwnerLookupButton);

    // Search for the new owner in the lookup modal
    await this.page.waitForSelector(locators.lookupModalSearchInput, { state: 'visible' });
    await this.page.fill(locators.lookupModalSearchInput, newOwnerName);
    await this.page.waitForTimeout(1000); // Give time for search results to load

    // Select the new owner from the results (using XPath for robustness)
    await this.page.waitForXPath(locators.lookupModalResult(newOwnerName), { state: 'visible' });
    await this.page.locator(locators.lookupModalResult(newOwnerName)).click();

    // Enter the reassignment reason
    await this.page.waitForSelector(locators.reassignmentReasonTextArea, { state: 'visible' });
    await this.page.fill(locators.reassignmentReasonTextArea, reassignmentReason);

    // Click the Save button
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Retrieves the current Account Owner name from the detail page.
   * @returns {Promise<string>} The text content of the Account Owner field.
   */
  async getAccountOwner() {
    await this.page.waitForSelector(locators.accountOwnerDetailField, { state: 'visible' });
    return await this.page.textContent(locators.accountOwnerDetailField);
  }

  /**
   * Retrieves the Reassignment Reason from the detail page.
   * @returns {Promise<string>} The text content of the Reassignment Reason field.
   */
  async getReassignmentReason() {
    await this.page.waitForSelector(locators.reassignmentReasonDetailField, { state: 'visible' });
    return await this.page.textContent(locators.reassignmentReasonDetailField);
  }

  /**
   * Retrieves the success toast message after an operation.
   * @returns {Promise<string>} The text content of the success message.
   */
  async getSuccessMessage() {
    await this.page.waitForSelector(locators.successToastMessage, { state: 'visible' });
    return await this.page.textContent(locators.successToastMessage);
  }
}

module.exports = LeadPage;