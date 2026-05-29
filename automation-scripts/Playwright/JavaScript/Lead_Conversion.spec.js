// @ts-check
import { test, expect } from '@playwright/test';
import LoginUtil from '../../../../server/utils/loginUtil';

test('Convert Salesforce Lead to Account Contact Opportunity', async ({ page }) => {
  test.setTimeout(180000);

  const username = process.env.SF_USERNAME;
  const password = process.env.SF_PASSWORD;
  const secret = process.env.SF_TOTP_SECRET;

  // Recommended:
  // $env:SF_LEAD_NAME="Auto Lead 1780055711862"
  const leadNameToConvert = process.env.SF_LEAD_NAME || '';

  const convertedOpportunityName = `Converted Opportunity ${Date.now()}`;

  const hasSessionCookie = async () => {
    const state = await page.context().storageState().catch(() => ({}));

    return (state.cookies || []).some((cookie) =>
      /sid|session|auth/i.test(cookie.name)
    );
  };

  const ensureSalesforceSession = async () => {
    const currentUrl = page.url();

    if (/login|challenge|verification|identity/i.test(currentUrl)) {
      throw new Error(
        `Salesforce session is not authenticated. Current URL: ${currentUrl}`
      );
    }

    const usernameInputVisible = await page
      .locator('#username, input[name="username"]')
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (usernameInputVisible) {
      throw new Error(
        'Salesforce redirected to login page. Stored session is expired or invalid.'
      );
    }
  };

  const resolveSalesforceOrigin = async () => {
    const configuredInstance =
      process.env.SF_INSTANCE_URL ||
      process.env.SALESFORCE_INSTANCE_URL;

    if (configuredInstance) {
      const origin = new URL(configuredInstance).origin;
      console.log(`✅ Using Salesforce origin from env: ${origin}`);
      return origin;
    }

    const state = await page.context().storageState().catch(() => ({}));
    const cookies = state.cookies || [];

    const lightningCookie = cookies.find((cookie) =>
      /lightning\.force\.com/i.test(cookie.domain)
    );

    if (lightningCookie?.domain) {
      const origin = `https://${lightningCookie.domain.replace(/^\./, '')}`;
      console.log(`✅ Using Salesforce origin from lightning cookie: ${origin}`);
      return origin;
    }

    const mySalesforceCookie = cookies.find((cookie) =>
      /my\.salesforce\.com/i.test(cookie.domain)
    );

    if (mySalesforceCookie?.domain) {
      const domain = mySalesforceCookie.domain.replace(/^\./, '');
      const lightningDomain = domain.replace(
        '.my.salesforce.com',
        '.lightning.force.com'
      );

      const origin = `https://${lightningDomain}`;
      console.log(`✅ Using Salesforce origin from my.salesforce cookie: ${origin}`);
      return origin;
    }

    const forceCookie = cookies.find((cookie) =>
      /force\.com/i.test(cookie.domain)
    );

    if (forceCookie?.domain) {
      const domain = forceCookie.domain.replace(/^\./, '');

      const origin = domain.includes('lightning.force.com')
        ? `https://${domain}`
        : `https://${domain.replace('.my.salesforce.com', '.lightning.force.com')}`;

      console.log(`✅ Using Salesforce origin from force.com cookie: ${origin}`);
      return origin;
    }

    const salesforceCookie = cookies.find((cookie) =>
      /salesforce\.com/i.test(cookie.domain)
    );

    if (salesforceCookie?.domain) {
      const domain = salesforceCookie.domain.replace(/^\./, '');

      const origin = domain.includes('my.salesforce.com')
        ? `https://${domain.replace('.my.salesforce.com', '.lightning.force.com')}`
        : `https://${domain}`;

      console.log(`✅ Using Salesforce origin from salesforce.com cookie: ${origin}`);
      return origin;
    }

    const currentUrl = page.url();

    if (currentUrl && currentUrl !== 'about:blank') {
      try {
        const origin = new URL(currentUrl).origin;

        if (!/login\.salesforce\.com/i.test(origin)) {
          console.log(`✅ Using Salesforce origin from current page: ${origin}`);
          return origin;
        }
      } catch (error) {
        // Ignore and throw clear error below.
      }
    }

    throw new Error(
      [
        'Could not resolve Salesforce org origin quickly.',
        '',
        'Recommended fix: add SF_INSTANCE_URL to your .env file:',
        'SF_INSTANCE_URL=https://enterprise-platform-3896.lightning.force.com',
        '',
        `Current URL: ${currentUrl}`,
      ].join('\n')
    );
  };

  const clickFirstVisible = async (locators, timeout = 30000) => {
    const deadline = Date.now() + timeout;

    for (const locator of locators) {
      const remaining = Math.max(deadline - Date.now(), 1000);

      try {
        await expect(locator.first()).toBeVisible({
          timeout: Math.min(remaining, 8000),
        });

        await locator.first().click();
        return true;
      } catch (error) {
        // Try next locator.
      }
    }

    throw new Error(`None of the provided locators became visible within ${timeout}ms.`);
  };

  const fillIfVisible = async (locator, value, label) => {
    if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) {
      await locator.fill(value);
      console.log(`⌨️ Filled ${label}`);
      return true;
    }

    console.log(`ℹ️ Skipped ${label}; field not visible on this layout`);
    return false;
  };

  const extractVisibleErrors = async () => {
    const errorLocators = [
      page.locator('.slds-form-element__help'),
      page.locator('.slds-has-error'),
      page.locator('.pageLevelErrors'),
      page.locator('.forcePageError'),
      page.locator('[data-aura-class*="forcePageError"]'),
      page.locator('[role="alert"]'),
      page.locator('.slds-notify_alert'),
      page.locator('.slds-text-color_error'),
    ];

    const messages = [];

    for (const locator of errorLocators) {
      const count = await locator.count().catch(() => 0);

      for (let i = 0; i < count; i += 1) {
        const item = locator.nth(i);

        if (await item.isVisible({ timeout: 500 }).catch(() => false)) {
          const text = await item.innerText().catch(() => '');

          if (text && text.trim()) {
            messages.push(text.trim());
          }
        }
      }
    }

    return Array.from(new Set(messages));
  };

  const getVisibleConvertContainer = async () => {
    const candidates = [
      page
        .locator('section[role="dialog"], div[role="dialog"]')
        .filter({ hasText: /Convert|convert|Opportunity|Account|Contact/i })
        .first(),

      page
        .locator('lightning-quick-action-panel')
        .filter({ hasText: /Convert|convert|Opportunity|Account|Contact/i })
        .first(),

      page
        .locator('.slds-modal')
        .filter({ hasText: /Convert|convert|Opportunity|Account|Contact/i })
        .first(),

      page
        .locator('.modal-container')
        .filter({ hasText: /Convert|convert|Opportunity|Account|Contact/i })
        .first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 5000 }).catch(() => false)) {
        return candidate;
      }
    }

    return null;
  };

  const clickFinalConvertButtonFromContainer = async (convertContainer) => {
    const candidateButtons = [
      convertContainer.getByRole('button', { name: /^Convert$/ }),
      convertContainer.locator('button:has-text("Convert")'),
      convertContainer.locator('input[type="button"][value="Convert"]'),
      convertContainer.locator('input[type="submit"][value="Convert"]'),
    ];

    for (const locator of candidateButtons) {
      const count = await locator.count().catch(() => 0);

      // Prefer last visible button because modal footer action is usually near the end.
      for (let i = count - 1; i >= 0; i -= 1) {
        const button = locator.nth(i);

        const visible = await button.isVisible({ timeout: 1000 }).catch(() => false);
        const enabled = await button.isEnabled({ timeout: 1000 }).catch(() => false);

        if (visible && enabled) {
          await button.scrollIntoViewIfNeeded().catch(() => {});
          await button.click();
          console.log('🔘 Clicked final Convert button in Lightning dialog');
          return true;
        }
      }
    }

    return false;
  };

  const waitForLeadConversionResult = async () => {
    console.log('⏳ Waiting for Lead conversion result...');

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(5000);

    const successLocator = page
      .locator(
        [
          'text=/Your lead has been converted/i',
          'text=/Lead converted/i',
          'text=/has been converted/i',
          'text=/converted successfully/i',
          'text=/was converted/i',
          '.forceToastMessage:has-text("converted")',
          '.slds-notify_toast:has-text("converted")',
          'a:has-text("Go to Leads")',
          'button:has-text("Go to Leads")',
        ].join(', ')
      )
      .first();

    const navigatedToConvertedRecord =
      /\/lightning\/r\/(Account|Contact|Opportunity)\//i.test(page.url());

    const conversionSuccessVisible = await successLocator
      .isVisible({ timeout: 30000 })
      .catch(() => false);

    const stillOnLeadButConvertedText = await page
      .locator('text=/Converted|converted/i')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (
      navigatedToConvertedRecord ||
      conversionSuccessVisible ||
      stillOnLeadButConvertedText
    ) {
      console.log('✅ Lead conversion completed or success state detected');
      return true;
    }

    const visibleErrors = await extractVisibleErrors();

    await page.screenshot({
      path: `./reports/salesforce-lead-conversion-failed-${Date.now()}.png`,
      fullPage: true,
    });

    throw new Error(
      [
        `Lead conversion confirmation was not detected. Current URL: ${page.url()}`,
        visibleErrors.length
          ? `Visible errors:\n${visibleErrors.join('\n')}`
          : '',
        '',
        'Tip: pass a fresh unconverted Lead using:',
        '$env:SF_LEAD_NAME="Auto Lead <timestamp>"',
      ]
        .filter(Boolean)
        .join('\n')
    );
  };

  // ── 1. Authenticate using existing saved state or TOTP login ───────────────
  const savedState = await page.context().storageState().catch(() => ({}));
  const hasSavedSession = (savedState.cookies || []).some((cookie) =>
    /sid|session|auth/i.test(cookie.name)
  );

  if (!hasSavedSession && (!username || !password || !secret)) {
    test.skip(
      true,
      'SF credentials missing: set SF_USERNAME, SF_PASSWORD, SF_TOTP_SECRET, or create storageState.json using saveAuthState.spec.js'
    );
  }

  const loginUtil = new LoginUtil(page);

  if (!(await hasSessionCookie())) {
    console.log('🔐 No active stored Salesforce session found. Logging in with TOTP...');
    await loginUtil.loginWithTotp({ username, password, secret });

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);
  } else {
    console.log('▶ Using existing authenticated session from storageState.json');
  }

  const onLoginPage =
    (await page.locator('#username').isVisible({ timeout: 3000 }).catch(() => false)) ||
    (await page.locator('input[name="username"]').isVisible({ timeout: 3000 }).catch(() => false));

  if (onLoginPage) {
    console.log('⚠️ Stored session is invalid. Performing fresh TOTP login...');

    if (!username || !password || !secret) {
      throw new Error(
        'Session appears invalid and SF credentials are not set. Set SF_USERNAME, SF_PASSWORD, SF_TOTP_SECRET or refresh storageState.json.'
      );
    }

    await loginUtil.loginWithTotp({ username, password, secret });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000);
  }

  console.log('✅ Logged in successfully, proceeding to convert Lead');

  const salesforceOrigin = await resolveSalesforceOrigin();
  console.log(`🌐 Salesforce origin resolved as: ${salesforceOrigin}`);

  // ── 2. Navigate to Lead list page ─────────────────────────────────────────
  console.log('📂 Opening Leads list page...');

  await page.goto(`${salesforceOrigin}/lightning/o/Lead/list?filterName=Recent`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });

  await ensureSalesforceSession();

  await expect(page).toHaveURL(/\/lightning\/o\/Lead\/list/i, {
    timeout: 60000,
  });

  await page.waitForTimeout(3000);
  console.log('✅ Leads list page opened');

  // ── 3. Open Lead record ───────────────────────────────────────────────────
  console.log('🔎 Opening Lead record...');

  if (leadNameToConvert) {
    console.log(`🔍 Looking for Lead by name: ${leadNameToConvert}`);

    let leadLinkByName = page
      .locator(`a[title="${leadNameToConvert}"], a:has-text("${leadNameToConvert}")`)
      .first();

    if (!(await leadLinkByName.isVisible({ timeout: 10000 }).catch(() => false))) {
      const searchInput = page
        .locator(
          'input[name="Lead-search-input"], input[placeholder*="Search this list"], input[aria-label*="Search"]'
        )
        .first();

      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill(leadNameToConvert);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(5000);
      }

      leadLinkByName = page
        .locator(`a[title="${leadNameToConvert}"], a:has-text("${leadNameToConvert}")`)
        .first();
    }

    await expect(leadLinkByName).toBeVisible({ timeout: 30000 });
    await leadLinkByName.click();
  } else {
    console.log('ℹ️ SF_LEAD_NAME not provided. Opening first visible Lead from Recent list.');

    const firstLeadLink = page
      .locator(
        'table tbody th a, table tbody td a[href*="/lightning/r/Lead/"], a[href*="/lightning/r/Lead/"]'
      )
      .first();

    await expect(firstLeadLink).toBeVisible({ timeout: 60000 });
    await firstLeadLink.click();
  }

  await expect(page).toHaveURL(/\/lightning\/r\/Lead\//i, {
    timeout: 60000,
  });

  await page.waitForTimeout(3000);
  console.log('✅ Lead record opened');

  await page.screenshot({
    path: `./reports/salesforce-lead-before-conversion-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 4. Start Lead conversion ──────────────────────────────────────────────
  console.log('🔁 Starting Lead conversion...');

  const leadUrl = page.url();
  const leadIdMatch = leadUrl.match(/\/Lead\/([a-zA-Z0-9]{15,18})\//);
  const leadId = leadIdMatch?.[1];

  if (!leadId) {
    throw new Error(`Could not extract Lead Id from URL: ${leadUrl}`);
  }

  console.log(`🆔 Lead Id detected: ${leadId}`);

  await clickFirstVisible(
    [
      page.getByRole('button', { name: /^Convert$/ }),
      page.getByRole('link', { name: /^Convert$/ }),
      page.locator('button[name="Convert"]'),
      page.locator('a[title="Convert"]'),
      page.locator('button:has-text("Convert")'),
    ],
    60000
  );

  await page.waitForTimeout(3000);

  await page.screenshot({
    path: `./reports/salesforce-after-click-convert-${Date.now()}.png`,
    fullPage: true,
  });

  // ── 5. Try Lightning Convert dialog first ─────────────────────────────────
  console.log('🔎 Checking for Lightning Convert dialog...');

  const lightningConvertContainer = await getVisibleConvertContainer();

  if (lightningConvertContainer) {
    console.log('✅ Lightning Convert dialog detected');

    const opportunityNameInput = lightningConvertContainer
      .locator(
        [
          'input[name*="OpportunityName"]',
          'input[aria-label*="Opportunity Name"]',
          'input[placeholder*="Opportunity"]',
          'input[name*="opp"]',
        ].join(', ')
      )
      .first();

    if (await opportunityNameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await opportunityNameInput.fill(convertedOpportunityName);
      console.log(`⌨️ Filled Opportunity Name: ${convertedOpportunityName}`);
    } else {
      console.log('ℹ️ Opportunity Name field not visible in Lightning Convert dialog');
    }

    const clickedFinalConvert = await clickFinalConvertButtonFromContainer(
      lightningConvertContainer
    );

    if (!clickedFinalConvert) {
      const visibleErrors = await extractVisibleErrors();

      throw new Error(
        [
          'Lightning Convert dialog was visible, but final Convert button was not found.',
          visibleErrors.length
            ? `Visible errors:\n${visibleErrors.join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      );
    }
  } else {
    // ── 5B. Fallback: use Salesforce classic lead conversion URL ─────────────
    console.log(
      '⚠️ Lightning Convert dialog not detected. Falling back to classic leadconvert.jsp flow...'
    );

    await page.goto(`${salesforceOrigin}/lead/leadconvert.jsp?id=${leadId}&retURL=%2F${leadId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });

    await ensureSalesforceSession();

    await page.waitForTimeout(3000);

    await page.screenshot({
      path: `./reports/salesforce-classic-lead-convert-page-${Date.now()}.png`,
      fullPage: true,
    });

    const alreadyConvertedText = page
      .locator('text=/already converted|has been converted|converted lead/i')
      .first();

    if (await alreadyConvertedText.isVisible({ timeout: 3000 }).catch(() => false)) {
      throw new Error(
        'This Lead appears to be already converted. Please pass an unconverted lead using SF_LEAD_NAME.'
      );
    }

    const opportunityNameInput = page
      .locator(
        [
          'input[name="oppname"]',
          'input[id*="oppname"]',
          'input[name*="Opportunity"]',
          'input[aria-label*="Opportunity"]',
        ].join(', ')
      )
      .first();

    if (await opportunityNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await opportunityNameInput.fill(convertedOpportunityName);
      console.log(
        `⌨️ Filled Opportunity Name on classic convert page: ${convertedOpportunityName}`
      );
    } else {
      console.log('ℹ️ Opportunity Name field not visible on classic convert page');
    }

    const noOpportunityCheckbox = page
      .locator(
        [
          'input[name="nooppti"]',
          'input[id*="nooppti"]',
          'input[type="checkbox"][name*="opportunity"]',
        ].join(', ')
      )
      .first();

    if (await noOpportunityCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
      const checked = await noOpportunityCheckbox.isChecked().catch(() => false);

      if (checked) {
        await noOpportunityCheckbox.uncheck({ force: true });
        console.log('✅ Unchecked "Do not create Opportunity"');
      }
    }

    await clickFirstVisible(
      [
        page.locator('input[type="submit"][value="Convert"]'),
        page.locator('input[type="button"][value="Convert"]'),
        page.getByRole('button', { name: /^Convert$/ }),
        page.locator('button:has-text("Convert")'),
      ],
      60000
    );

    console.log('🔘 Clicked Convert button on classic convert page');
  }

  // ── 6. Verify conversion result ───────────────────────────────────────────
  await waitForLeadConversionResult();

  await page.screenshot({
    path: `./reports/salesforce-lead-converted-${Date.now()}.png`,
    fullPage: true,
  });

  console.log('✅ Lead successfully converted');
});
