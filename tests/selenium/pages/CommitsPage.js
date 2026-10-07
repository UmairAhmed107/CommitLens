// Selenium Page Object: CommitsPage (UI-11, UI-12)
const { By, until } = require('selenium-webdriver');

class CommitsPage {
  constructor(driver) {
    this.driver = driver;
    this.reductionSummary = By.css('[data-testid="commit-reduction-summary"]');
    this.commitFiles = By.css('[data-testid="commit-files"]');
    this.impactedReqs = By.css('[data-testid="commit-impacted-reqs"]');
    this.recommendedTests = By.css('[data-testid="commit-recommended-tests"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/commits`);
    await this.driver.wait(until.elementLocated(this.reductionSummary), 5000);
  }

  async getReductionSummaryText() {
    const el = await this.driver.wait(until.elementLocated(this.reductionSummary), 5000);
    return await el.getText();
  }

  async isUnmappedFilePresent(filename) {
    const selector = By.css(`[data-testid="unmapped-${filename}"]`);
    try {
      const el = await this.driver.findElement(selector);
      return el !== null;
    } catch {
      return false;
    }
  }
}

module.exports = CommitsPage;
