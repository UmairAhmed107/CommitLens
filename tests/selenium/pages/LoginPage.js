// Selenium Page Object: LoginPage (UI-01, UI-02)
const { By, until } = require('selenium-webdriver');

class LoginPage {
  constructor(driver) {
    this.driver = driver;
    this.emailInput = By.css('[data-testid="login-email"]');
    this.passwordInput = By.css('[data-testid="login-password"]');
    this.submitButton = By.css('[data-testid="login-submit"]');
    this.errorBanner = By.css('[data-testid="login-error"]');
    this.registerLink = By.css('[data-testid="register-link"]');
  }

  async open(baseUrl = 'http://localhost:5173') {
    await this.driver.get(`${baseUrl}/login`);
    await this.driver.wait(until.elementLocated(this.emailInput), 5000);
  }

  async login(email, password) {
    const emailEl = await this.driver.findElement(this.emailInput);
    await emailEl.clear();
    await emailEl.sendKeys(email);

    const passEl = await this.driver.findElement(this.passwordInput);
    await passEl.clear();
    await passEl.sendKeys(password);

    await this.driver.findElement(this.submitButton).click();
  }

  async getErrorMessage() {
    const banner = await this.driver.wait(until.elementLocated(this.errorBanner), 5000);
    return await banner.getText();
  }
}

module.exports = LoginPage;
