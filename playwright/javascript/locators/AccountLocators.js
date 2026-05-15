module.exports = {
  // Reusable locators
  modalErrorMessageList: "div.modal-body ul.errors-list",
  spinner: "div.slds-spinner_container",

  // Navigation locators
  appLauncherButton: "button[title='App Launcher']",
  appLauncherSearchInput: "input[placeholder='Search apps and items...']",
  accountsAppTile: "a[data-label='Accounts']",
  globalSearchInput: "input[placeholder='Search...']",

  // Account record locators
  recordLinkByName: (accountName) => `a[title="${accountName}"]`,
  accountRecordNameHeader: "h1 .slds-page-header__title",

  // TCV Amount field locators
  tcvAmountViewField: "lightning-output-field[field-name='TCV_Amount__c'] lightning-formatted-text",
  editButton: "button[name='Edit']",
  tcvAmountEditField: "lightning-input-field[field-name='TCV_Amount__c'] input[type='text']",
  saveButton: "button[name='SaveEdit']"
};