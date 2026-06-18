const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeadPage = require('../../pages/LeadPage');

test.describe('TC056 - Verify Lead Owner Reassignment with Mandatory Reassignment Reason (Positive Scenario)', () => {
  const leadName = 'Global Tech Corp Lead'; // Adapted from Account Name to Lead Name
  const newOwnerName = 'Pam Beesly';
  const reassignmentReasonText = 'Territory realignment Q4 2024';

  test('Lead owner reassignment and reason are successfully updated', async ({ authenticatedPage }) => {
    const leadPage = new LeadPage(authenticatedPage);

    // 1. Login to Salesforce (handled by auth fixture)

    // 2. Navigate to the 'Leads' tab
    await leadPage.navigateToLeads();

    // Pre-requisite: Create a lead or ensure one exists named 'Global Tech Corp Lead'
    // For this test, we assume 'Global Tech Corp Lead' already exists.
    // In a real scenario, you'd have a setup step to create this lead.

    // 3. Search for Lead Name: 'Global Tech Corp Lead'
    // 4. Click on the 'Global Tech Corp Lead' Lead record link to open its detail page
    await leadPage.searchAndOpenLead(leadName);

    // 5-11. Click Edit, reassign owner, enter reason, and Save
    await leadPage.reassignLeadOwnerWithReason(newOwnerName, reassignmentReasonText);

    // 12. Verify the Lead detail page reloads with the new owner
    // 13. Verify the 'Lead Owner' field displays: 'Pam Beesly'
    const actualOwner = await leadPage.getLeadOwnerName();
    expect(actualOwner).toBe(newOwnerName);

    // 14. Verify the 'Reassignment Reason' field displays: 'Territory realignment Q4 2024'
    const actualReassignmentReason = await leadPage.getReassignmentReasonText();
    expect(actualReassignmentReason).toBe(reassignmentReasonText);

    // Additional verification of success message (Expected Result 1)
    const isSuccess = await leadPage.isSuccessMessageVisible();
    expect(isSuccess).toBeTruthy();

    console.log(`Successfully reassigned Lead '${leadName}' to '${newOwnerName}' with reason: '${reassignmentReasonText}'`);
  });
});