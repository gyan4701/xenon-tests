const { test, expect } =
  require('@playwright/test')

test(
  'Open Google and print title',

  async ({ page }) => {

    // Open Google

    await page.goto(
      'https://www.google.com'
    )

    // Wait for page load

    await page.waitForLoadState(
      'domcontentloaded'
    )

    // Get title

    const title =
      await page.title()

    // Print title

    console.log(
      'Page Title:',
      title
    )

    // Validation

    await expect(page)
      .toHaveTitle(/Google/)
  }
)
