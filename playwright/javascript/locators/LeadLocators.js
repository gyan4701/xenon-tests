module.exports = {
  // --- Generic Salesforce UI Locators ---
  appLauncherButton: 'div.slds-context-bar__icon-action button[aria-label="App Launcher"]',
  appLauncherSearchInput: 'input.slds-input[placeholder="Search apps and items..."]',
  accountsTabLink: 'one-app-nav-bar-item-root a[title="Accounts"]',
  leadsTabLink: 'one-app-nav-bar-item-root a[title="Leads"]',
  
  // --- Record Page Locators (assuming detail page context) ---
  recordPageTitle: 'div.flexipageHeader.oneActionsFlippable.forceActionsContainer.noButton.showTitle .slds-page-header__title span.s-truncate.uiOutputText',
  editButton: 'button[name="Edit"]',
  saveButton: 'button[name="SaveEdit"]',
  searchRecordInput: 'input.slds-input[placeholder="Search this list..."]',
  searchResultLink: (recordName) => `a[title="${recordName}"]`,

  // --- Lead Object Field Locators (from provided metadata) ---
  lastNameInput: 'lightning-input-field[field-name="LastName"] input, input[name="LastName"]',
  companyInput: 'lightning-input-field[field-name="Company"] input, input[name="Company"]',
  statusCombobox: 'lightning-combobox[field-name="Status"] button',
  statusComboboxOption: (value) => `lightning-base-combobox-item[data-value="${value}"]`,

  // --- Placeholder Locators for Account-specific fields (NOT in Lead metadata) ---
  // These locators are structured based on common Salesforce Lightning patterns,
  // but the fields 'Customer Status' and 'Churn Date' are typically found on the Account object,
  // not the Lead object, as per the provided metadata.
  customerStatusCombobox: 'lightning-combobox[data-test-id="customerStatus-picklist"] button, lightning-combobox[field-name="Customer_Status__c"] button',
  customerStatusOption: (value) => `lightning-base-combobox-item[data-value="${value}"]`,
  churnDateField: 'lightning-datepicker[data-test-id="churnDate-input"] input, lightning-datepicker[field-name="Churn_Date__c"] input',
  
  // --- Error Message Locator ---
  // Generic field-level error message. Salesforce can show these in different places.
  fieldLevelError: (fieldName) => `div.field-group div.slds-form-element__help, .slds-form-element[data-api-name*="${fieldName}"] .slds-has-error .slds-form-element__help-text`,
  // A more generic error message for when the field-name isn't easily tied
  genericFieldErrorMessage: '.slds-form-element__help, .forceFormMessage.forceRecordEditError, .field-error, .slds-notify--error .toastMessage'
};