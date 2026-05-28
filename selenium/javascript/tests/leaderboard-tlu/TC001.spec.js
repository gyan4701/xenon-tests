const { test } = require('../../fixtures/auth.fixture');
const { expect } = require('@playwright/test');
const LeaderboardTLUPage = require('../../pages/LeaderboardTLUPage');

test.describe('TC001 - TE1 & Equi Grades Annual TLUs calculation Manually', () => {
  test('Verify if manual TLUs calculation match with UI & database TLUs count', async ({ authenticatedPage }) => {
    const leaderboardTLUPage = new LeaderboardTLUPage(authenticatedPage);

    // Runtime values from environment variables
    const leaderboardUrl = process.env.LEADERBOARD_URL || '/lightning/o/Leaderboard__c/home'; // Default Salesforce URL structure if not provided
    const gradeToFilter = process.env.TEST_GRADE_TE1 || 'TE1 Grade'; // For TC001, explicitly 'TE1 Grade'
    const filterType = process.env.TEST_FILTER_TYPE || 'Annual';
    const targetEmployee = process.env.TEST_EMPLOYEE_NAME || null; // Not explicitly used for 'click on Record' in TC001, but can be passed for specific record selection if page object supports it.
    const employeeId = process.env.TEST_EMPLOYEE_ID || 'EMP001'; // Used for database lookup simulation, providing a default.
    // Example: '[{"id":1, "grade":"TE1 Grade", "annualValue":50}, {"id":2, "grade":"TE1 Grade", "annualValue":75}, {"id":3, "grade":"TE2 Grade", "annualValue":30}]'
    const testRecords = JSON.parse(process.env.TEST_RECORDS_TC001 || '[]');

    let uiTLUCount;
    let dbTLUCount;
    let manualTLUCount;

    // Step 1: Login to JadeNova (Handled by auth.fixture automatically)
    // Step 2: Navigate to Leaderboard
    await test.step('2. Navigate to Leaderboard', async () => {
      await leaderboardTLUPage.navigateToLeaderboardTLU(leaderboardUrl);
      await expect(authenticatedPage.url(), 'Leaderboard URL should be correct').toContain('Leaderboard');
    });

    // Step 3: Apply annual filter for TE1 grade
    await test.step(`3. Apply ${filterType} filter for ${gradeToFilter} grade`, async () => {
      await leaderboardTLUPage.applyAnnualFilterForGrade(gradeToFilter, filterType);
      // Add an assertion to verify filters are applied, e.g., checking selected options
      await expect(authenticatedPage.locator(process.env.LOCATOR_GRADE_FILTER_DROPDOWN || 'lightning-combobox[label="Grade"]')).toHaveValue(gradeToFilter, {timeout: 10000});
      await expect(authenticatedPage.locator(process.env.LOCATOR_ANNUAL_FILTER_DROPDOWN || 'lightning-combobox[label="Filter Type"]')).toHaveValue(filterType, {timeout: 10000});
    });

    // Step 4: Click on Record (first record)
    await test.step('4. Click on the first Record', async () => {
      await leaderboardTLUPage.clickFirstRecord(targetEmployee);
      // Add an assertion to verify navigation to record detail page, e.g., URL contains record ID
      await expect(authenticatedPage.url(), 'Should navigate to record detail page').toContain('/detail');
    });

    // Step 5: Verify if manual TLUs calculation match with UI & database TLUs count
    await test.step('5. Verify if manual TLUs calculation match with UI & database TLUs count', async () => {
      // Retrieve UI TLUs count
      uiTLUCount = await leaderboardTLUPage.getUITLUsCount();

      // Retrieve database TLUs count (placeholder)
      dbTLUCount = await leaderboardTLUPage.getDatabaseTLUsCount(employeeId);

      // Perform manual TLUs calculation
      manualTLUCount = leaderboardTLUPage.calculateManualTLUs(testRecords, filterType, gradeToFilter);

      console.log(`
Verification Results:
  Manual TLUs: ${manualTLUCount}
  UI TLUs:     ${uiTLUCount}
  DB TLUs:     ${dbTLUCount}
`);

      expect(uiTLUCount, 'UI TLUs count should match manual calculation').toBe(manualTLUCount);
      expect(dbTLUCount, 'Database TLUs count should match manual calculation').toBe(manualTLUCount);
      expect(uiTLUCount, 'UI TLUs count should match database TLUs count').toBe(dbTLUCount);
    });

    console.log('TC001 - TE1 & Equi Grades Annual TLUs calculation Manually completed successfully.');
  });
});