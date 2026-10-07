// Selenium WebDriver Builder Helper
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function createDriver(browser = 'chrome', headless = true) {
  const options = new chrome.Options();
  if (headless) {
    options.addArguments('--headless');
  }
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  options.addArguments('--window-size=1280,800');

  const driver = await new Builder()
    .forBrowser(browser)
    .setChromeOptions(options)
    .build();

  return driver;
}

module.exports = {
  createDriver
};
