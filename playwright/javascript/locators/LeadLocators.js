module.exports = {
  // App Launcher and Navigation
  appLauncherIcon: 'button[title="App Launcher"], div.slds-icon-waffle',
  leadsMenuItem: 'one-app-launcher-menu-item >> text=Leads',
  leadsPageHeader: 'div.slds-page-header__title',

  // Lead Creation Form elements
  newButton: 'button[name="New"]',
  saveButton: 'button[name="SaveEdit"], button[name="Save"]',
  lastNameInput: 'lightning-input-field[field-name="LastName"] input',
  companyInput: 'lightning-input-field[field-name="Company"] input',
  statusComboboxButton: 'lightning-combobox[field-name="Status"] button',
  statusComboboxOption: (statusValue) => `lightning-base-combobox-item[data-value="${statusValue}"]`,
  emailInput: 'lightning-input-field[field-name="Email"] input[type="email"]',

  // Error/Validation Messages
  toastMessage: 'span.toastMessage',
  emailFieldErrorMessage: 'lightning-input-field[field-name="Email"] div.slds-form-element__help',
  formErrorBanner: 'div.force-form-error-block, div.forceVisualMessageQueue' // General form error messages
};