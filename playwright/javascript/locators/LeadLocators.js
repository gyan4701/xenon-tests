module.exports = {
  // Reusable Locators (from LeadPage existing locators)
  recordPageTitle: "div.flexipageHeader.oneActionsFlippable.forceActionsContainer.noButton.showTitle .slds-page-header__title span.s-truncate.uiOutputText",
  genericFieldErrorMessage: ".slds-form-element__help, .forceFormMessage.forceRecordEditError, .field-error, .slds-notify--error .toastMessage",
  appLauncherIcon: "div.appLauncher.slds-context-bar__icon-action button",
  editFormHeader: "section.slds-modal.uiPanel.forceModal.auraPanel.forceModalHost.uiModal--medium h2.slds-text-heading--medium",
  successToastMessage: "div.slds-notify--success .toastMessage",

  // Navigation Locators
  leadsTab: "one-app-nav-bar-item-root[data-id='Lead'] a",

  // List View Locators
  listViewSearchInput: "input[aria-label='Search this list']",
  leadRecordLink: (leadName) => `a[title="${leadName}"]`, // Dynamic locator for lead record link

  // Detail and Edit Page Locators
  editButton: "button[name='Edit']",
  
  // Owner Lookup Field Locators
  ownerIdLookupField: "lightning-lookup[field-name='OwnerId']",
  ownerIdInput: "lightning-lookup[field-name='OwnerId'] input",
  ownerIdLookupIcon: "lightning-lookup[field-name='OwnerId'] button[title='Search']", // Assuming a search icon button
  
  // Lookup Modal Locators
  lookupModal: ".slds-lookup__menu",
  lookupModalSearchInput: "input.lookup__search-input, input[placeholder='Search...']",
  lookupModalResult: (ownerName) => `lightning-base-combobox-item[data-value] span.slds-truncate:has-text("${ownerName}")`, // Dynamic locator for lookup result

  // Reassignment Reason Field (Assumed custom text area field based on test steps)
  // NOTE: The provided Lead metadata lists 'Ownership_Change_Reason__c' as a picklist, 
  // but the test steps specify a 'Reassignment Reason' text area. 
  // This locator assumes a custom text area field with API Name 'Reassignment_Reason__c'.
  reassignmentReasonTextArea: "lightning-textarea[field-name='Reassignment_Reason__c'] textarea",
  
  // Action Buttons
  saveButton: "button[name='SaveEdit']",

  // Verification Locators
  leadOwnerDisplay: "lightning-output-field[field-name='OwnerId'] lightning-formatted-text",
  reassignmentReasonDisplay: "lightning-output-field[field-name='Reassignment_Reason__c'] lightning-formatted-text" // Assumed display for custom field
};