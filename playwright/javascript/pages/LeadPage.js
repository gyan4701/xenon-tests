import { Page, expect } from '@playwright/test';
import { locators } from './LeadLocators';

export class LeadPage {
  constructor(public page: Page) {}

  async navigateToLeadsTab() {
    // Step 2: Navigate to the 'Leads' tab from the App Launcher.
    await this.page.locator(locators.leadsTab).click();
    await this.page.waitForLoadState('networkidle');
    await expect(this.page.locator('h1.slds-page-header__title')).toHaveText('Leads'); // Verify navigation
  }

  async openLeadRecord(leadName: string) {
    // Step 3: Click on the name of an existing Lead record to open its detail page.
    await this.page.getByText(leadName, { exact: true }).click();
    await this.page.waitForLoadState('domcontentloaded');
    await expect(this.page.locator('h1.slds-page-header__title')).toHaveText(leadName); // Verify record page loaded
  }

  async expectDeleteButtonNotVisible() {
    // Expected output 1: The 'Delete' button is not visible on the Lead record detail page.
    // We look for a button with the role 'button' and name 'Delete'.
    await expect(this.page.getByRole('button', { name: 'Delete' })).not.toBeVisible();
  }

  async clickShowMoreActionsDropdown() {
    // Step 5: Click on the dropdown arrow next to the action buttons to reveal additional actions.
    await this.page.locator(locators.showMoreActionsDropdown).click();
    // No specific wait needed, usually opens a dropdown/menu instantly
  }

  async expectDeleteOptionNotInDropdown() {
    // Expected output 2: The 'Delete' option is not available in the dropdown action menu.
    // We look for a menu item with the role 'menuitem' and name 'Delete' within the dropdown.
    await expect(this.page.getByRole('menuitem', { name: 'Delete' })).not.toBeVisible();
  }
}
