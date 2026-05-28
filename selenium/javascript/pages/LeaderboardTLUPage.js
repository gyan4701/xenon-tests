const locators = require('../locators/LeaderboardTLULocators');

class LeaderboardTLUPage {
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigates to the Leaderboard TLU page.
   * @param {string} leaderboardUrl - Optional direct URL for the leaderboard. If not provided, it clicks a navigation item.
   */
  async navigateToLeaderboardTLU(leaderboardUrl = null) {
    if (leaderboardUrl) {
      await this.page.goto(leaderboardUrl);
      await this.page.waitForLoadState('networkidle');
    } else {
      await this.page.click(locators.leaderboardNavMenuItem);
      await this.page.waitForLoadState('networkidle');
    }
    console.log('Navigated to Leaderboard TLU page.');
  }

  /**
   * Applies the specified annual filter for a given grade.
   * @param {string} grade - The grade to filter by (e.g., 'TE1 Grade').
   * @param {string} filterType - The filter type, expected to be 'Annual'.
   */
  async applyAnnualFilterForGrade(grade, filterType) {
    // Select filter type (e.g., 'Annual')
    await this.page.locator(locators.annualFilterDropdown).selectOption({ label: filterType });
    console.log(`Applied filter type: ${filterType}`);

    // Select grade (e.g., 'TE1 Grade')
    await this.page.locator(locators.gradeFilterDropdown).selectOption({ label: grade });
    console.log(`Applied grade filter: ${grade}`);

    // Wait for the page to update after filter application
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1000); // Give a moment for UI rendering, adjust as needed
  }

  /**
   * Clicks on the first record displayed in the leaderboard table.
   * @param {string} [targetEmployee=null] - Optional. If provided, could be used to find a specific record if locator supports it, but for TC001 we click the first generic one.
   */
  async clickFirstRecord(targetEmployee = null) {
    await this.page.locator(locators.firstRecordLink).first().click();
    await this.page.waitForLoadState('networkidle');
    console.log(`Clicked on the first record in the leaderboard. Target employee (if any): ${targetEmployee}`);
  }

  /**
   * Retrieves the TLUs count displayed on the UI.
   * @returns {Promise<number>} The TLUs count from the UI.
   */
  async getUITLUsCount() {
    const uiText = await this.page.locator(locators.uiTLUCountDisplay).textContent();
    const uiCount = parseInt(uiText.replace(/[^0-9]/g, ''), 10);
    console.log(`Retrieved UI TLUs Count: ${uiCount}`);
    return isNaN(uiCount) ? 0 : uiCount;
  }

  /**
   * Simulates retrieving the TLUs count from a database based on employee ID.
   * This is a placeholder for actual database integration.
   * @param {string} employeeId - The ID of the employee for database lookup.
   * @returns {Promise<number>} A simulated database TLUs count.
   */
  async getDatabaseTLUsCount(employeeId) {
    console.log(`Simulating database lookup for Employee ID: ${employeeId}`);
    // In a real scenario, this would involve API calls or direct DB queries.
    // For this test, we return a mock value based on the employeeId or a constant.
    if (employeeId === 'EMP001') return 150; // Example mock
    return 100; // Default mock value
  }

  /**
   * Performs manual TLUs calculation based on provided test records, filter type, and grade.
   * @param {Array<Object>} testRecords - An array of records, each with 'grade' and 'annualValue'.
   * @param {string} filterType - The type of filter applied (e.g., 'Annual').
   * @param {string} gradeToFilter - The grade to filter by (e.g., 'TE1 Grade').
   * @returns {number} The manually calculated TLUs count.
   */
  calculateManualTLUs(testRecords, filterType, gradeToFilter) {
    if (!Array.isArray(testRecords) || testRecords.length === 0) {
      console.warn('No test records provided for manual calculation, returning a default mock value.');
      return 100; // Default mock value if no records or invalid input
    }

    let totalTLUs = 0;
    for (const record of testRecords) {
      // Assuming 'annualValue' is relevant for 'Annual' filterType and matches 'gradeToFilter'
      if (record.grade === gradeToFilter && filterType === 'Annual') {
        totalTLUs += (record.annualValue || 0);
      }
    }
    console.log(`Manually calculated TLUs: ${totalTLUs} for grade: ${gradeToFilter}, filter: ${filterType}`);
    return totalTLUs;
  }
}