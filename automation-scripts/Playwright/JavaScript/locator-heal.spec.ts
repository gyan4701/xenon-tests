const { test, expect } = require('@playwright/test')

test('FORCE locator failure and validate self-heal', async ({ page }) => {
  test.setTimeout(30000)

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Locator Self-Heal Test</title>
      </head>
      <body>
        <h1>Order Page</h1>
        <p>This page has a real button, but the script below uses a wrong locator.</p>

        <button id="submit-order" type="button">
          Submit Order
        </button>

        <p id="result">Not submitted</p>

        <script>
          document.getElementById('submit-order').addEventListener('click', () => {
            document.getElementById('result').textContent = 'Submitted'
          })
        </script>
      </body>
    </html>
  `)

  // Intentional locator failure:
  // The page has a button with text "Submit Order".
  // This selector incorrectly searches for an anchor tag with a title attribute.
  await page.click('//a[@title="Submit Order"]')

  await expect(page.locator('#result')).toHaveText('Submitted')
})
