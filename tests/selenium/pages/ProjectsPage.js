// Selenium Page Object: ProjectsPage (UI-03, UI-04, FR-PRJ-01, FR-PRJ-02, FR-PRJ-03)
const { By, until } = require('selenium-webdriver');

class ProjectsPage {
  constructor(driver) {
    this.driver = driver;
    this.newProjectBtn = By.css('[data-testid="new-project-btn"]');
    this.projectNameInput = By.css('[data-testid="project-name"]');
    this.projectDescInput = By.css('[data-testid="project-desc"]');
    this.projectSubmitBtn = By.css('[data-testid="project-submit"]');
    this.editProjectBtn = By.css('[data-testid="edit-project-btn"]');
    this.editProjectNameInput = By.css('[data-testid="edit-project-name"]');
    this.editProjectDescInput = By.css('[data-testid="edit-project-desc"]');
    this.editProjectStatusSelect = By.css('[data-testid="edit-project-status"]');
    this.editProjectSubmitBtn = By.css('[data-testid="edit-project-submit"]');
    this.addMemberBtn = By.css('[data-testid="add-member-btn"]');
    this.memberEmailInput = By.css('[data-testid="member-email"]');
    this.memberRoleSelect = By.css('[data-testid="member-role"]');
    this.addMemberSubmitBtn = By.css('[data-testid="add-member-submit"]');
    this.accessDeniedBanner = By.css('[data-testid="access-denied"]');
    this.projectSelector = By.css('[data-testid="project-selector"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/projects`);
  }

  async isNewProjectButtonVisible() {
    const elements = await this.driver.findElements(this.newProjectBtn);
    return elements.length > 0 && (await elements[0].isDisplayed());
  }

  async isAccessDenied() {
    const elements = await this.driver.findElements(this.accessDeniedBanner);
    return elements.length > 0 && (await elements[0].isDisplayed());
  }

  async createProject(name, description = '') {
    const btn = await this.driver.wait(until.elementLocated(this.newProjectBtn), 5000);
    await btn.click();

    const nameInput = await this.driver.wait(until.elementLocated(this.projectNameInput), 5000);
    await nameInput.sendKeys(name);

    if (description) {
      const descInput = await this.driver.findElement(this.projectDescInput);
      await descInput.sendKeys(description);
    }

    await this.driver.findElement(this.projectSubmitBtn).click();
  }

  async addMember(email, role = 'DEV') {
    const btn = await this.driver.wait(until.elementLocated(this.addMemberBtn), 5000);
    await btn.click();

    const emailInput = await this.driver.wait(until.elementLocated(this.memberEmailInput), 5000);
    await emailInput.sendKeys(email);

    const roleSelect = await this.driver.findElement(this.memberRoleSelect);
    await roleSelect.sendKeys(role);

    await this.driver.findElement(this.addMemberSubmitBtn).click();
  }

  async getProjectCard(projectName) {
    const cardLocator = By.css(`[data-testid="project-card-${projectName}"]`);
    return await this.driver.wait(until.elementLocated(cardLocator), 5000);
  }
}

module.exports = ProjectsPage;
