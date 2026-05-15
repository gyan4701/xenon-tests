import { test, expect } from '@playwright/test';

test(
  'Login to Sauce Demo and validate all major button clicks',

  async ({ page }) => {

    // Open application

    await page.goto(
      'https://www.saucedemo.com/'
    );

    // Login

    await page
      .locator('#user-name')
      .fill('standard_user');

    await page
      .locator('#password')
      .fill('secret_sauce');

    await page
      .locator('#login-button')
      .click();

    // Validate successful login

    await expect(page)
      .toHaveURL(/inventory/);

    await expect(
      page.locator('.title')
    ).toHaveText('Products');

    console.log(
      '✅ Login successful'
    );

    // ---------------------------------
    // Validate Add To Cart Buttons
    // ---------------------------------

    const addToCartButtons =
      page.locator(
        'button[data-test^="add-to-cart"]'
      );

    const buttonCount =
      await addToCartButtons.count();

    console.log(
      `Found ${buttonCount} Add To Cart buttons`
    );

    for (
      let i = 0;
      i < buttonCount;
      i++
    ) {

      const button =
        addToCartButtons.nth(i);

      const buttonText =
        await button.textContent();

      console.log(
        `Clicking: ${buttonText}`
      );

      await button.click();

      // Validate button changed

      await expect(button)
        .toHaveText(/Remove/);
    }

    console.log(
      '✅ All Add To Cart buttons validated'
    );

    // ---------------------------------
    // Validate Cart Button
    // ---------------------------------

    await page
      .locator('.shopping_cart_link')
      .click();

    await expect(page)
      .toHaveURL(/cart/);

    console.log(
      '✅ Cart page opened'
    );

    // ---------------------------------
    // Continue Shopping
    // ---------------------------------

    await page
      .locator('#continue-shopping')
      .click();

    await expect(page)
      .toHaveURL(/inventory/);

    console.log(
      '✅ Continue Shopping button validated'
    );

    // ---------------------------------
    // Open Menu
    // ---------------------------------

    await page
      .locator('#react-burger-menu-btn')
      .click();

    await expect(
      page.locator('.bm-menu')
    ).toBeVisible();

    console.log(
      '✅ Menu button validated'
    );

    // ---------------------------------
    // Logout
    // ---------------------------------

    await page
      .locator('#logout_sidebar_link')
      .click();

    await expect(page)
      .toHaveURL(
        'https://www.saucedemo.com/'
      );

    console.log(
      '✅ Logout successful'
    );

    // ---------------------------------
    // Screenshot
    // ---------------------------------

    await page.screenshot({

      path:
        'screenshots/full-validation.png',

      fullPage: true
    });

    console.log(
      '✅ Screenshot captured'
    );
  }
);
