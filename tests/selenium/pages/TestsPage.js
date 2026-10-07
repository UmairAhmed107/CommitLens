// Selenium Page Object: TestsPage (UI-07, UI-08, FR-TST-01 to FR-TST-05)
const { By, until } = require('selenium-webdriver');

class TestsPage {
  constructor(driver) {
    this.driver = driver;
    this.addBtn = By.css('[data-testid="test-add-btn"]');
    this.titleInput = By.css('[data-testid="test-modal-title"], [data-testid="test-title"]');
    this.expectedInput = By.css('[data-testid="test-modal-expected"], [data-testid="test-expected"]');
    this.prioritySelect = By.css('[data-testid="test-modal-priority"], [data-testid="test-priority"]');
    this.submitBtn = By.css('[data-testid="test-modal-submit"], [data-testid="test-submit"]');
    this.table = By.css('[data-testid="test-table"]');
    this.filterPriority = By.css('[data-testid="test-filter-priority"]');
    this.filterStatus = By.css('[data-testid="test-filter-status"]');
    this.filterNeedsRerun = By.css('[data-testid="test-filter-needs-rerun"]');
    this.searchInput = By.css('[data-testid="test-search"]');
    this.runStatusSelect = By.css('[data-testid="run-status"], [data-testid="record-modal-status"]');
    this.runNotesInput = By.css('[data-testid="run-notes"], [data-testid="record-modal-notes"]');
    this.runSubmitBtn = By.css('[data-testid="run-submit"], [data-testid="record-modal-submit"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/tests`);
    await this.driver.wait(until.elementLocated(this.table), 5000);
  }

  async createTestCase(title, { expected = '', priority = 'Medium', requirementIds = [] } = {}) {
    await this.driver.findElement(this.addBtn).click();
    await this.driver.wait(until.elementLocated(this.titleInput), 3000);

    await this.driver.findElement(this.titleInput).sendKeys(title);
    if (expected) {
      await this.driver.findElement(this.expectedInput).sendKeys(expected);
    }
    await this.driver.findElement(this.prioritySelect).sendKeys(priority);

    for (const reqId of requirementIds) {
      const checkbox = await this.driver.findElement(By.css(`[data-testid="req-checkbox-${reqId}"]`));
      await checkbox.click();
    }

    await this.driver.findElement(this.submitBtn).click();
  }

  async recordResult(testId, status, notes = '') {
    const recordBtn = By.css(`[data-testid="record-${testId}"]`);
    await this.driver.findElement(recordBtn).click();
    await this.driver.wait(until.elementLocated(this.runStatusSelect), 3000);

    const statusSelect = await this.driver.findElement(this.runStatusSelect);
    await statusSelect.sendKeys(status);

    if (notes) {
      const notesEl = await this.driver.findElement(this.runNotesInput);
      await notesEl.sendKeys(notes);
    }

    await this.driver.findElement(this.runSubmitBtn).click();
  }

  async getStatusBadge(testId) {
    const badgeLocator = By.css(`[data-testid="status-${testId}"]`);
    return await this.driver.wait(until.elementLocated(badgeLocator), 5000);
  }

  async getRequirementLink(reqId) {
    const linkLocator = By.css(`[data-testid="link-${reqId}"]`);
    return await this.driver.wait(until.elementLocated(linkLocator), 5000);
  }
}

module.exports = TestsPage;
