module.exports = {
  // General Salesforce UI Locators
  appLauncherButton: "button.slds-icon-waffle",
  appLauncherSearchInput: "input.app-launcher__global-search-input",
  appLauncherItem: (itemName) => `div.app-launcher__tile-body p:has-text("${itemName}")`,
  globalSearchInput: "input.search-container__input",
  searchResultLink: (recordName) => `a[title="${recordName}"]`,
  spinner: "div.slds-spinner_container",
  modalTitle: "h2.slds-modal__header_title",

  // Account Detail Page Locators
  accountRecordNameHeader: "h1 .slds-page-header__title",
  tcvAmountDisplay: "lightning-output-field[field-name='TCV_Amount__c'] lightning-formatted-number",
  editButton: "button[name='Edit']",
  saveButton: "button[name='SaveEdit']",
  cancelButton: "button[name='cancel']",

  // Account Edit Modal Locators
  tcvAmountEditInput: "lightning-input-field[field-name='TCV_Amount__c'] input[type='text']"
};