// Selenium Page Object: RepositoryPage (UI-09, FR-GIT-01 to FR-GIT-04, FR-GIT-06)
const { By, until } = require('selenium-webdriver');

class RepositoryPage {
  constructor(driver) {
    this.driver = driver;
    this.urlInput = By.css('[data-testid="repo-url"]');
    this.tokenInput = By.css('[data-testid="repo-token"]');
    this.branchInput = By.css('[data-testid="repo-branch"]');
    this.connectBtn = By.css('[data-testid="repo-connect-btn"]');
    this.syncBtn = By.css('[data-testid="repo-sync-btn"]');
    this.telemetryName = By.css('[data-testid="repo-telemetry-name"]');
    this.lastSync = By.css('[data-testid="repo-last-sync"]');
    this.commitsTable = By.css('[data-testid="commits-table"]');
    this.search = By.css('[data-testid="commit-search"]');
    this.filterBranch = By.css('[data-testid="commit-filter-branch"]');
    this.filterAuthor = By.css('[data-testid="commit-filter-author"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/repository`);
    await this.driver.wait(until.elementLocated(this.urlInput), 5000);
  }

  async connectRepository(url, token = 'demo', branch = 'main') {
    const urlEl = await this.driver.wait(until.elementLocated(this.urlInput), 5000);
    await urlEl.clear();
    await urlEl.sendKeys(url);

    if (token) {
      const tokenEl = await this.driver.findElement(this.tokenInput);
      await tokenEl.clear();
      await tokenEl.sendKeys(token);
    }

    if (branch) {
      const branchEl = await this.driver.findElement(this.branchInput);
      await branchEl.clear();
      await branchEl.sendKeys(branch);
    }

    await this.driver.findElement(this.connectBtn).click();
  }

  async triggerSync() {
    const btn = await this.driver.wait(until.elementLocated(this.syncBtn), 5000);
    await btn.click();
  }

  async isSyncButtonVisible() {
    const elements = await this.driver.findElements(this.syncBtn);
    return elements.length > 0 && (await elements[0].isDisplayed());
  }

  async getConnectedRepoName() {
    const el = await this.driver.wait(until.elementLocated(this.telemetryName), 5000);
    return await el.getText();
  }
}

module.exports = RepositoryPage;
