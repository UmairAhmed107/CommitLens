// Selenium Page Object: RequirementsPage (UI-05, UI-06)
const { By, until } = require('selenium-webdriver');

class RequirementsPage {
  constructor(driver) {
    this.driver = driver;
    this.addBtn = By.css('[data-testid="req-add-btn"]');
    this.titleInput = By.css('[data-testid="req-modal-title"]');
    this.descInput = By.css('[data-testid="req-modal-desc"]');
    this.prioritySelect = By.css('[data-testid="req-modal-priority"]');
    this.submitBtn = By.css('[data-testid="req-modal-submit"]');
    this.filterPriority = By.css('[data-testid="req-filter-priority"]');
    this.table = By.css('[data-testid="req-table"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/requirements`);
    await this.driver.wait(until.elementLocated(this.table), 5000);
  }

  async createRequirement(title, description, priority = 'High') {
    await this.driver.findElement(this.addBtn).click();
    await this.driver.wait(until.elementLocated(this.titleInput), 3000);

    await this.driver.findElement(this.titleInput).sendKeys(title);
    if (description) {
      await this.driver.findElement(this.descInput).sendKeys(description);
    }
    await this.driver.findElement(this.prioritySelect).sendKeys(priority);
    await this.driver.findElement(this.submitBtn).click();
  }

  async filterByPriority(priority) {
    const select = await this.driver.findElement(this.filterPriority);
    await select.sendKeys(priority);
  }
}

module.exports = RequirementsPage;
