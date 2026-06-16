module.exports = {
  // Reused existing LeadPage locators (though applied to Account-like context)
  recordPageTitle: "div.flexipageHeader.oneActionsFlippable.forceActionsContainer.noButton.showTitle .slds-page-header__title span.s-truncate.uiOutputText",
  genericFieldErrorMessage: ".slds-form-element__help, .forceFormMessage.forceRecordEditError, .field-error, .slds-notify--error .toastMessage",
  appLauncherIcon: "div.appLauncher.slds-context-bar__icon-action button",
  editFormHeader: "section.slds-modal.uiPanel.forceModal.auraPanel.forceModalHost.uiModal--medium h2.slds-text-heading--medium",
  successToastMessage: "div.slds-notify--success .toastMessage",

  // Global navigation and search
  globalSearchInput: "input[aria-label='Search']",
  searchResultsLink: (name) => `a[title="${name}"]`, // Generic for record links by title
  appMenuItem: (name) => `a.slds-context-bar__label-action[title="${name}"]`,

  // Actions on Record Detail Page
  editButton: "button[name='Edit']",

  // Fields (using Lead metadata patterns, adapted for Account functionality as per test description)
  accountOwnerLookup: "lightning-lookup[field-name='OwnerId'] input",
  accountOwnerLookupIcon: "lightning-lookup[field-name='OwnerId'] button[title='Search']",
  lookupModalSearchInput: ".modal-body input[placeholder='Search...']",
  lookupModalSearchResult: (name) => `li.slds-listbox__item span.slds-truncate[title="${name}"]`,
  reassignmentReasonTextarea: "textarea[aria-label='Reassignment Reason']", // Assuming a custom field for the text area

  // Buttons within forms/modals
  saveButton: "button[name='SaveEdit']",

  // Verification elements on detail page
  displayedAccountOwner: "lightning-output-field[field-name='OwnerId'] a",
  displayedReassignmentReason: "lightning-output-field[field-name='Reassignment_Reason__c'] lightning-formatted-text" // Assuming custom field API name for verification
};