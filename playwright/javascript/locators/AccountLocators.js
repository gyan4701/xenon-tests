module.exports = {
  // Existing common Salesforce locators
  modalErrorMessageList: "div.modal-body ul.errors-list",
  spinner: "div.slds-spinner_container",
  accountRecordNameHeader: "h1 .slds-page-header__title",
  globalSearchInput: "input.search-container__input",
  appLauncherButton: "button.slds-icon-waffle",
  modalTitle: "h2.slds-modal__header_title",
  appLauncherSearchInput: "input.app-launcher__global-search-input",
  accountNameHeader: "h1 .slds-page-header__title", // Reusing for general account name display

  // Specific locators for Account object
  appLauncherAccountsItem: "a[data-label='Accounts'][title='Accounts']",
  accountLinkByName: (accountName) => `a[title="${accountName}"]`,
  editButton: "button[name='Edit']",
  saveEditButton: "button[name='SaveEdit']",

  // Account Fields
  tcvAmountDetailPage: "lightning-output-field[field-name='TCV_Amount__c'] .slds-form-element__static",
  tcvAmountEditModal: "lightning-input-field[field-name='TCV_Amount__c'] input[type='text']"
};