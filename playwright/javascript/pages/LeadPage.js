import { Page, expect } from '@playwright/test';
import { locators } from './LeadLocators';

export class LeadPage {
  constructor(public page: Page) {}

  async loginAsAccountManager() {
    // Implement login logic here
  }

  async navigateToLeadsTab() {
    await this.page.locator('text=App Launcher').click();
    await this.page.locator('text=Leads').click();
    await this.page.waitForLoadState('networkidle');
  }

  async searchLeadByStatus(status: string) {
    await this.page.locator('input[placeholder="Search Leads"]').fill(status);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async openLeadRecord() {
    await this.page.locator(locators.leadStatusOption).click();
    await this.page.waitForLoadState('networkidle');
  }

  async verifyErrorMessage() {
    await expect(this.page.locator('text=' + locators.errorMessage)).toBeVisible();
  }
}
