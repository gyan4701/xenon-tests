const readline =
  require('readline')

const { chromium } =
  require('playwright')

function askQuestion(question) {

  const rl =
    readline.createInterface({

      input: process.stdin,

      output: process.stdout
    })

  return new Promise(resolve => {

    rl.question(
      question,

      answer => {

        rl.close()

        resolve(answer)
      }
    )
  })
}

(async () => {

  // Ask user input

  const expectedTitle =
    await askQuestion(

      'Enter expected page title: '
    )

  // Launch browser

  const browser =
    await chromium.launch({

      headless: false
    })

  const page =
    await browser.newPage()

  // Open Google

  await page.goto(
    'https://www.google.com'
  )

  // Fetch actual title

  const actualTitle =
    await page.title()

  console.log(
    '\nActual Title:',
    actualTitle
  )

  console.log(
    'Expected Title:',
    expectedTitle
  )

  // Validation

  if (
    actualTitle
      .toLowerCase()
      .includes(
        expectedTitle
          .toLowerCase()
      )
  ) {

    console.log(
      '\n✅ TEST PASSED'
    )

  } else {

    console.log(
      '\n❌ TEST FAILED'
    )
  }

  // Close browser

  await browser.close()

})()