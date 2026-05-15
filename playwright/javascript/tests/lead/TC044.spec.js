const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeadPage = require('../../pages/LeadPage');

test.describe('TC044 - Verify Lead creation fails when "Email" field is left blank due to "Email_Required" validation rule.', () => {
  test('Lead creation fails with Email_Required validation error', async ({ authenticatedPage }) => {
    const leadPage = new LeadPage(authenticatedPage);

    const testLeadLastName = 'TestLead_' + Date.now();
    const testLeadCompany = 'TestCompany_' + Date.now();
    const testLeadStatus = 'New'; // Assuming 'New' is a valid picklist value for Status

    await leadPage.navigateToLeads();
    await leadPage.createLeadWithoutEmail(testLeadLastName, testLeadCompany, testLeadStatus);

    const errorMessage = await leadPage.getErrorMessage();
    expect(errorMessage).not.toBeNull();
    expect(errorMessage).toContain('Email_Required'); // Expecting the validation rule name or a message indicating email is required
    expect(errorMessage).toContain('Email'); // Ensure the message refers to the Email field
  });
});