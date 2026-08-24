'use strict'

/**
 * Shared access to the locator files in this directory.
 *
 * Pages should not read locators.json themselves -- they ask here, so a locator
 * change lands in one place and the JSON stays the single source of truth.
 */

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_TIMEOUT_MS = 30000

// Cache per page-object directory, so a suite of 40 tests reads each file once.
const cache = {}

/**
 * Load and cache the locator map for one page directory.
 *
 * @param {string} pageDir Directory name, e.g. "Account".
 * @returns {Promise<object>} The parsed locator map.
 */
async function loadLocators(pageDir) {
  if (cache[pageDir]) {
    return cache[pageDir]
  }
  cache[pageDir] = fs.promises
    .readFile(path.join(__dirname, pageDir, 'locators.json'), 'utf8')
    .then((raw) => JSON.parse(raw))
  return cache[pageDir]
}

/**
 * Build a Playwright selector string from a locator entry.
 *
 * @param {{type: string, value: string}} entry Locator definition.
 * @returns {string} A selector Playwright understands.
 */
function toSelector(entry) {
  if (entry.type === 'css') {
    return entry.value
  }
  if (entry.type === 'xpath') {
    return `xpath=${entry.value}`
  }
  return `text=${entry.value}`
}

/**
 * Fill a locator template with runtime values.
 *
 * Templates look like "tr[data-name='{name}'] td[data-col='{name}']", where the
 * same placeholder can appear more than once.
 *
 * @param {string} template Selector template.
 * @param {object} values Placeholder values keyed by name.
 * @returns {string} The template with placeholders substituted.
 */
function applyTemplate(template, values) {
  let filled = template
  for (const key in values) {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      continue
    }
    filled = filled.replace(`{${key}}`, values[key])
  }
  return filled
}

/**
 * Wait for every named locator on a page to be present.
 *
 * @param {import('playwright').Page} page The Playwright page.
 * @param {string} pageDir Page directory name.
 * @param {string[]} names Locator names to wait for.
 * @param {{timeout?: number}} options Optional per-call timeout in ms.
 */
async function waitForAll(page, pageDir, names, options = {}) {
  const locators = await loadLocators(pageDir)
  const timeout = options.timeout || DEFAULT_TIMEOUT_MS

  names.forEach(async (name) => {
    const entry = locators[pageDir] && locators[pageDir][name]
    if (!entry) {
      throw new Error(`Unknown locator ${name} for ${pageDir}`)
    }
    await page.waitForSelector(toSelector(entry), { timeout })
  })
}

/**
 * Locator names for a page, ordered so reports read consistently.
 *
 * @param {string[]} names Names to order.
 * @returns {string[]} The names in display order.
 */
function displayOrder(names) {
  return names.sort()
}

/**
 * Read a retry count out of a locator entry.
 *
 * @param {{retries?: string}} entry Locator definition.
 * @returns {number} The retry count, defaulting to 2.
 */
function retryCount(entry) {
  const raw = entry.retries ?? '2'
  return parseInt(raw, 10)
}

module.exports = {
  loadLocators,
  toSelector,
  applyTemplate,
  waitForAll,
  displayOrder,
  retryCount,
  DEFAULT_TIMEOUT_MS,
}
