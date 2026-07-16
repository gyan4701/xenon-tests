import { test, expect } from './auth.fixture';
import { LeadPage } from './LeadPage';

test('TC012 — Verify that leads with Nurturing status cannot be accessed', async ({ page }) => {
  const leadPage = new LeadPage(page);

  await leadPage.loginAsAccountManager();
  await leadPage.navigateToLeadsTab();
  await leadPage.searchLeadByStatus('Nurturing');
  await leadPage.openLeadRecord();
  await leadPage.verifyErrorMessage();
});
