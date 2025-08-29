// tests/test_e2e.js

const { remote } = require("webdriverio");
const { assert } = require("chai");
const fs = require("fs");
const { addContext } = require("mochawesome/addContext");
const path = require("path");

// Crée le dossier screenshots si nécessaire
const screenshotsDir = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

const opts = {
  hostname: process.env.APPIUM_HOST || "127.0.0.1",
  port: parseInt(process.env.APPIUM_PORT, 10) || 4723,
  path: process.env.APPIUM_PATH || "/wd/hub",
  logLevel: "info",
  capabilities: {
    platformName: "Android",
    deviceName: process.env.DEVICE_NAME || "emulator-5554",
    automationName: "UiAutomator2",
    app:
      process.env.APP_PATH ||
      path.resolve(__dirname, "../mda_test_release_1_0_3.apk"),
    appPackage: process.env.APP_PACKAGE || "com.example.app",
    appActivity: process.env.APP_ACTIVITY || "com.example.app.MainActivity",
    autoGrantPermissions: true,
    newCommandTimeout: 300,
    noReset: false,
  },
};

describe("Flutter Release E2E Mobile Android", function () {
  this.timeout(600000); // 10 min
  let driver;

  async function takeScreenshot(name) {
    const base64 = await driver.takeScreenshot();
    const filepath = path.join(screenshotsDir, `${name}.png`);
    fs.writeFileSync(filepath, base64, "base64");
    addContext(this, { title: "Screenshot", value: filepath });
  }

  // -------------------------
  // Hooks
  // -------------------------
  before(async () => {
    driver = await remote(opts);
  });

  after(async () => {
    if (driver) await driver.deleteSession();
  });

  beforeEach(async () => {
    await driver.reset(); // reset app avant chaque test
  });

  afterEach(async function () {
    const testName = this.currentTest.title.replace(/\s+/g, "_");
    await takeScreenshot.bind(this)(testName);
  });

  // -------------------------
  // Scénarios Login
  // -------------------------
  describe("Scénarios Login", () => {
    it("Login avec admin valide", async function () {
      const username = await driver.$(
        '//*[@resource-id="com.example.app:id/username_input"]'
      );
      const password = await driver.$(
        '//*[@resource-id="com.example.app:id/password_input"]'
      );
      const loginBtn = await driver.$('//*[@text="Login"]');

      await username.setValue("admin");
      await password.setValue("admin123");
      await loginBtn.click();

      const dashboard = await driver.$('//*[contains(@text, "Dashboard")]');
      assert.isNotNull(await dashboard.isExisting());
    });

    it("Login avec mauvais mot de passe", async function () {
      const username = await driver.$(
        '//*[@resource-id="com.example.app:id/username_input"]'
      );
      const password = await driver.$(
        '//*[@resource-id="com.example.app:id/password_input"]'
      );
      const loginBtn = await driver.$('//*[@text="Login"]');

      await username.setValue("admin");
      await password.setValue("wrongPassword");
      await loginBtn.click();

      const errorMsg = await driver.$(
        '//*[contains(@text, "Invalid credentials")]'
      );
      assert.isNotNull(await errorMsg.isExisting());
    });
  });

  // -------------------------
  // Scénarios Register
  // -------------------------
  describe("Scénarios Register", () => {
    it("Register utilisateur valide", async function () {
      const username = await driver.$(
        '//*[@resource-id="com.example.app:id/register_username"]'
      );
      const email = await driver.$(
        '//*[@resource-id="com.example.app:id/register_email"]'
      );
      const password = await driver.$(
        '//*[@resource-id="com.example.app:id/register_password"]'
      );
      const submit = await driver.$('//*[@text="Register"]');

      await username.setValue("newUser");
      await email.setValue("newuser@test.com");
      await password.setValue("password123");
      await submit.click();

      const successMsg = await driver.$(
        '//*[contains(@text, "Registration successful")]'
      );
      assert.isNotNull(await successMsg.isExisting());
    });

    it("Register avec email déjà existant", async function () {
      const username = await driver.$(
        '//*[@resource-id="com.example.app:id/register_username"]'
      );
      const email = await driver.$(
        '//*[@resource-id="com.example.app:id/register_email"]'
      );
      const password = await driver.$(
        '//*[@resource-id="com.example.app:id/register_password"]'
      );
      const submit = await driver.$('//*[@text="Register"]');

      await username.setValue("admin");
      await email.setValue("admin@test.com");
      await password.setValue("1234");
      await submit.click();

      const errorMsg = await driver.$(
        '//*[contains(@text, "Email already exists")]'
      );
      assert.isNotNull(await errorMsg.isExisting());
    });
  });

  // -------------------------
  // Fonctionnalités critiques
  // -------------------------
  describe("Fonctionnalités critiques", () => {
    beforeEach(async () => {
      // Login admin avant chaque test critique
      const username = await driver.$(
        '//*[@resource-id="com.example.app:id/username_input"]'
      );
      const password = await driver.$(
        '//*[@resource-id="com.example.app:id/password_input"]'
      );
      const loginBtn = await driver.$('//*[@text="Login"]');

      await username.setValue("admin");
      await password.setValue("admin123");
      await loginBtn.click();
    });

    it("Paiement utilisateur", async function () {
      const paymentAmount = await driver.$(
        '//*[@resource-id="com.example.app:id/payment_amount"]'
      );
      const submit = await driver.$('//*[@text="Pay"]');

      await paymentAmount.setValue("100");
      await submit.click();

      const successMsg = await driver.$(
        '//*[contains(@text, "Payment successful")]'
      );
      assert.isNotNull(await successMsg.isExisting());
    });

    it("Transfert d'argent", async function () {
      const recipient = await driver.$(
        '//*[@resource-id="com.example.app:id/transfer_recipient"]'
      );
      const amount = await driver.$(
        '//*[@resource-id="com.example.app:id/transfer_amount"]'
      );
      const submit = await driver.$('//*[@text="Transfer"]');

      await recipient.setValue("guest");
      await amount.setValue("50");
      await submit.click();

      const successMsg = await driver.$(
        '//*[contains(@text, "Transfer completed")]'
      );
      assert.isNotNull(await successMsg.isExisting());
    });
  });
});
