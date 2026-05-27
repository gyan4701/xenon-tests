module.exports = {
  // Existing locator
  firstRecordLink: "div.slds-table--header-fixed_container tbody tr.slds-hint-parent a, lightning-datatable tbody tr:nth-child(1) a",

  // New locators based on test case steps and environment contract
  leaderboardNavMenuItem: process.env.LOCATOR_NAV_LEADERBOARD || "a[title='Leaderboard'], nav-item a[data-label='Leaderboard']",
  gradeFilterDropdown: process.env.LOCATOR_GRADE_FILTER_DROPDOWN || "label:has-text('Grade') ~ div select, lightning-combobox[label='Grade']",
  annualFilterDropdown: process.env.LOCATOR_ANNUAL_FILTER_DROPDOWN || "label:has-text('Filter Type') ~ div select, lightning-combobox[label='Filter Type']",
  uiTLUCountDisplay: process.env.LOCATOR_UI_TLU_COUNT || "div.tlu-summary-value, span.tlu-count-display, p.tlu-total"
};