module.exports = {
  // General Salesforce UI elements
  appLauncherButton: 'button.slds-icon-waffle',
  appLauncherSearchInput: 'input.app-launcher__global-search-input',
  appLauncherAccountLink: 'a[data-label="Accounts"]',
  globalSearchInput: 'input.search-input',
  listViewTable: 'table.slds-table',
  spinner: 'div.slds-spinner',
  editButton: 'button[name="Edit"]',
  saveEditButton: 'button[name="SaveEdit"]',
  cancelButton: 'button[name="CancelEdit"]',
  modalHeader: 'div.modal-body .slds-modal__header h2.title',
  accountNameHeader: 'h1 .slds-page-header__title',

  // Account Specific Fields (API Names)
  tcvAmountDetailField: 'lightning-output-field[field-name="TCV_Amount__c"] lightning-formatted-text',
  tcvAmountEditField: 'lightning-input-field[field-name="TCV_Amount__c"] input[type="text"]'
};