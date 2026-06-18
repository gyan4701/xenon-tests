const locators = require('../locators/LeadLocators');

class LeadPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Leads tab.
   */
  async navigateToLeads() {
    await this.page.waitForSelector(locators.appLauncherIcon);
    await this.page.click(locators.appLauncherIcon);
    await this.page.getByPlaceholder('Search apps and items...').fill('Leads');
    await this.page.locator(locators.leadsTab).click();
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.listViewSearchInput, { state: 'visible' });
  }

  /**
   * Searches for a lead by name and opens its detail page.
   * @param {string} leadName - The name of the lead to search for.
   */
  async searchAndOpenLead(leadName) {
    await this.page.fill(locators.listViewSearchInput, leadName);
    await this.page.press(locators.listViewSearchInput, 'Enter');
    await this.page.waitForSelector(locators.leadRecordLink(leadName), { state: 'visible' });
    await this.page.click(locators.leadRecordLink(leadName));
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.recordPageTitle, { state: 'visible' });
  }

  /**
   * Edits the Lead record to reassign the owner and add a reassignment reason.
   * @param {string} newOwnerName - The name of the new owner (e.g., 'Pam Beesly').
   * @param {string} reassignmentReason - The reason for reassignment (e.g., 'Territory realignment Q4 2024').
   */
  async reassignLeadOwnerWithReason(newOwnerName, reassignmentReason) {
    await this.page.click(locators.editButton);
    await this.page.waitForSelector(locators.editFormHeader, { state: 'visible' });

    // Click the lookup icon next to the 'Owner ID' field
    await this.page.locator(locators.ownerIdLookupField).locator('button[title="Search"]', {hasText: 'Search'}).click();

    // Wait for and interact with the lookup modal
    await this.page.waitForSelector(locators.lookupModalSearchInput, { state: 'visible' });
    await this.page.fill(locators.lookupModalSearchInput, newOwnerName);
    await this.page.waitForSelector(locators.lookupModalResult(newOwnerName), { state: 'visible' });
    await this.page.click(locators.lookupModalResult(newOwnerName));

    // Enter reassignment reason (assuming a custom text area field exists)
    await this.page.fill(locators.reassignmentReasonTextArea, reassignmentReason);

    // Click Save button
    await this.page.click(locators.saveButton);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(locators.successToastMessage, { state: 'visible' });
  }

  /**
   * Retrieves the displayed Lead Owner name from the detail page.
   * @returns {Promise<string>} The Lead Owner name.
   */
  async getLeadOwnerName() {
    await this.page.waitForSelector(locators.leadOwnerDisplay, { state: 'visible' });
    return await this.page.textContent(locators.leadOwnerDisplay);
  }

  /**
   * Retrieves the displayed Reassignment Reason text from the detail page.
   * @returns {Promise<string>} The Reassignment Reason text.
   */
  async getReassignmentReasonText() {
    await this.page.waitForSelector(locators.reassignmentReasonDisplay, { state: 'visible' });
    return await this.page.textContent(locators.reassignmentReasonDisplay);
  }

  /**
   * Checks if the success toast message is visible.
   * @returns {Promise<boolean>} True if the success message is visible, false otherwise.
   */
  async isSuccessMessageVisible() {
    return await this.page.locator(locators.successToastMessage).isVisible();
  }
}