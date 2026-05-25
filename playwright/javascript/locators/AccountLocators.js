module.exports = {
  // Existing Locators
  appLauncherButton: "button.slds-icon-waffle",
  appLauncherSearchInput: "input.app-launcher__global-search-input",
  globalSearchInput: "input.search-container__input",
  accountRecordNameHeader: "h1 .slds-page-header__title",
  modalTitle: "h2.slds-modal__header_title",

  // New Locators for TC003
  accountsNavItem: "nav-app[aria-label='Accounts'] a[title='Accounts'], a[data-label='Accounts']",
  searchResultLink: (accountName) => `//a[@title="${accountName}"]`,
  tcvAmountDisplayField: "lightning-output-field[field-name='TCV_Amount__c'] lightning-formatted-number",
  editButton: "button[name='Edit']",
  tcvAmountEditField: "lightning-input-field[field-name='TCV_Amount__c'] input[type='text']",
  saveButton: "button[name='SaveEdit']"
};