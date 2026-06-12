module.exports = {
  // Existing shared locators
  recordPageTitle: "div.flexipageHeader.oneActionsFlippable.forceActionsContainer.noButton.showTitle .slds-page-header__title span.s-truncate.uiOutputText",
  genericFieldErrorMessage: ".slds-form-element__help, .forceFormMessage.forceRecordEditError, .field-error, .slds-notify--error .toastMessage",
  appLauncherIcon: "div.appLauncher.slds-context-bar__icon-action button",
  editFormHeader: "section.slds-modal.uiPanel.forceModal.auraPanel.forceModalHost.uiModal--medium h2.slds-text-heading--medium",
  successToastMessage: "div.slds-notify--success .toastMessage",

  // Account-specific Locators for TC056
  accountsTabLink: "nav lightning-formatted-text:has-text('Accounts')",
  listViewSearchInput: "input.slds-input[placeholder='Search this list...']",
  accountRecordLink: (accountName) => `a[title="${accountName}"]`,
  editButton: "button[name='Edit']",
  accountOwnerLookupInput: "lightning-lookup[field-name='OwnerId'] input",
  accountOwnerLookupButton: "lightning-lookup[field-name='OwnerId'] button[title='Search']",
  lookupModalSearchInput: "div.modal-body input.slds-input[placeholder='Search People...']",
  lookupModalResult: (ownerName) => `//div[@class='primaryLabel slds-truncate' and contains(., '${ownerName}')]`, // XPath for robustness in modal lookup
  reassignmentReasonTextArea: "lightning-textarea[field-name='Reassignment_Reason__c'] textarea", // Assuming custom field on Account
  saveButton: "button[name='SaveEdit']",
  accountOwnerDetailField: "lightning-output-field[field-name='OwnerId'] lightning-formatted-text",
  reassignmentReasonDetailField: "lightning-output-field[field-name='Reassignment_Reason__c'] lightning-formatted-text" // Assuming custom field on Account
};