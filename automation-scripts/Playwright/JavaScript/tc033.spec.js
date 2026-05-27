const { test } = require('@playwright/test')

test('FORCE wait timeout on delayed button', async ({ page }) => {
  test.setTimeout(30000)

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Timeout Test Page</title>
      </head>
      <body>
        <h1>Self-Heal Timeout Test</h1>

        <div id="container">
          <p>The button will appear after 3 seconds.</p>
        </div>

        <script>
          setTimeout(() => {
            const button = document.createElement('button')
            button.id = 'submit-order'
            button.textContent = 'Submit Order'
            button.setAttribute('type', 'button')
            document.getElementById('container').appendChild(button)
          }, 3000)
        </script>
      </body>
    </html>
  `)

  // This will fail because the button appears after 3000ms,
  // but the wait timeout is only 500ms.
  await page.waitForSelector('#submit-order', {
    state: 'visible',
    timeout: 500,
  })

  await page.locator('#submit-order').click()
})
