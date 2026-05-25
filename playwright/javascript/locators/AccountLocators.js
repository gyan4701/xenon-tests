module.exports = {
  appLauncherButton: "button.slds-icon-waffle",
  appLauncherSearchInput: "input.app-launcher__global-search-input",
  accountsAppLauncherLink: "a[data-label='Accounts']",
  globalSearchInput: "input.search-container__input",
  searchResultLink: (accountName) => `a[title="${accountName}"]`,
  accountNameHeader: "h1 .slds-page-header__title",
  tcvAmountDisplayValue: "lightning-output-field[field-name='TCV_Amount__c'] lightning-formatted-text",
  editButton: "button[name='Edit']",
  tcvAmountEditInput: "lightning-input-field[field-name='TCV_Amount__c'] input[type='text']"
};