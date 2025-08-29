require("dotenv").config(); // 🔹 Charger les variables d'environnement
const { remote } = require("webdriverio");
const { assert } = require("chai");
const fs = require("fs");
const path = require("path");
const { addContext } = require("mochawesome/addContext");

// -------------------------
// Dossier screenshots
// -------------------------
const screenshotsDir = path.resolve(__dirname, "../screenshots");
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir);

// -------------------------
// Retry automatique sur éléments
// -------------------------
async function waitForElement(
  driver,
  selector,
  timeout = 15000,
  interval = 500
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const el = await driver.$(selector);
      if (await el.isExisting()) return el;
    } catch {}
    await driver.pause(interval);
  }
  throw new Error(`Element not found: ${selector}`);
}

// -------------------------
// Action avec log + screenshot
// -------------------------
async function action(driver, testContext, actionName, selector, callback) {
  console.log(`[ACTION] ${actionName}`);
  const el = await waitForElement(driver, selector);
  await callback(el);

  const screenshotName = `${Date.now()}_${actionName.replace(/\s+/g, "_")}`;
  const filepath = path.join(screenshotsDir, `${screenshotName}.png`);
  const base64 = await driver.takeScreenshot();
  fs.writeFileSync(filepath, base64, "base64");
  console.log(`[SCREENSHOT] ${screenshotName} -> ${filepath}`);
  addContext(testContext, { title: actionName, value: filepath });
}

// -------------------------
// Configuration dynamique
// -------------------------
const PLATFORM = process.env.PLATFORM || "Android";
const APP_PACKAGE = process.env.ANDROID_APP_PACKAGE;

let capabilities = {};
if (PLATFORM === "Android") {
  capabilities = {
    platformName: "Android",
    deviceName: process.env.ANDROID_DEVICE,
    automationName: "UiAutomator2",
    app: path.resolve(__dirname, "../" + process.env.ANDROID_APP_PATH),
    appPackage: APP_PACKAGE,
    appActivity: process.env.ANDROID_APP_ACTIVITY,
    autoGrantPermissions: true,
    newCommandTimeout: 300,
    noReset: false,
  };
} else if (PLATFORM === "iOS") {
  capabilities = {
    platformName: "iOS",
    deviceName: process.env.IOS_DEVICE,
    platformVersion: process.env.IOS_PLATFORM_VERSION,
    automationName: "XCUITest",
    app: path.resolve(__dirname, "../" + process.env.IOS_APP_PATH),
    bundleId: process.env.IOS_BUNDLE_ID,
    newCommandTimeout: 300,
    noReset: false,
  };
}

const opts = {
  hostname: process.env.APPIUM_HOST,
  port: parseInt(process.env.APPIUM_PORT, 10),
  path: process.env.APPIUM_PATH,
  logLevel: "debug",
  capabilities,
};

// -------------------------
// Tests
// -------------------------
describe(`${PLATFORM} E2E Mobile Tests`, function () {
  this.timeout(600000);
  let driver;

  before(async () => {
    driver = await remote(opts);
  });

  after(async () => {
    if (driver) await driver.deleteSession();
  });

  beforeEach(async () => {
    if (PLATFORM === "Android") {
      await driver.terminateApp(APP_PACKAGE);
      await driver.activateApp(APP_PACKAGE);
    } else if (PLATFORM === "iOS") {
      await driver.terminateApp(process.env.IOS_BUNDLE_ID);
      await driver.launchApp(process.env.IOS_BUNDLE_ID);
    }
  });

  // -------------------------
  // Login
  // -------------------------
  describe("Login", () => {
    it("Login admin valide", async function () {
      await action(
        driver,
        this,
        "Remplir username",
        `//*[@resource-id="${APP_PACKAGE}:id/username_input"]`,
        (el) => el.setValue("admin")
      );
      await action(
        driver,
        this,
        "Remplir mot de passe",
        `//*[@resource-id="${APP_PACKAGE}:id/password_input"]`,
        (el) => el.setValue("admin123")
      );
      await action(driver, this, "Cliquer Login", '//*[@text="Login"]', (el) =>
        el.click()
      );
      await action(
        driver,
        this,
        "Vérifier Dashboard",
        '//*[contains(@text, "Dashboard")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });

    it("Login avec mauvais mot de passe", async function () {
      await action(
        driver,
        this,
        "Remplir username",
        `//*[@resource-id="${APP_PACKAGE}:id/username_input"]`,
        (el) => el.setValue("admin")
      );
      await action(
        driver,
        this,
        "Remplir mauvais mot de passe",
        `//*[@resource-id="${APP_PACKAGE}:id/password_input"]`,
        (el) => el.setValue("wrongPassword")
      );
      await action(driver, this, "Cliquer Login", '//*[@text="Login"]', (el) =>
        el.click()
      );
      await action(
        driver,
        this,
        "Vérifier message erreur",
        '//*[contains(@text, "Invalid credentials")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });
  });

  // -------------------------
  // Register
  // -------------------------
  describe("Register", () => {
    it("Register utilisateur valide", async function () {
      await action(
        driver,
        this,
        "Remplir username",
        `//*[@resource-id="${APP_PACKAGE}:id/register_username"]`,
        (el) => el.setValue("newUser")
      );
      await action(
        driver,
        this,
        "Remplir email",
        `//*[@resource-id="${APP_PACKAGE}:id/register_email"]`,
        (el) => el.setValue("newuser@test.com")
      );
      await action(
        driver,
        this,
        "Remplir mot de passe",
        `//*[@resource-id="${APP_PACKAGE}:id/register_password"]`,
        (el) => el.setValue("password123")
      );
      await action(
        driver,
        this,
        "Cliquer Register",
        '//*[@text="Register"]',
        (el) => el.click()
      );
      await action(
        driver,
        this,
        "Vérifier succès",
        '//*[contains(@text, "Registration successful")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });

    it("Register avec email déjà existant", async function () {
      await action(
        driver,
        this,
        "Remplir username existant",
        `//*[@resource-id="${APP_PACKAGE}:id/register_username"]`,
        (el) => el.setValue("admin")
      );
      await action(
        driver,
        this,
        "Remplir email existant",
        `//*[@resource-id="${APP_PACKAGE}:id/register_email"]`,
        (el) => el.setValue("admin@test.com")
      );
      await action(
        driver,
        this,
        "Remplir mot de passe",
        `//*[@resource-id="${APP_PACKAGE}:id/register_password"]`,
        (el) => el.setValue("1234")
      );
      await action(
        driver,
        this,
        "Cliquer Register",
        '//*[@text="Register"]',
        (el) => el.click()
      );
      await action(
        driver,
        this,
        "Vérifier message erreur",
        '//*[contains(@text, "Email already exists")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });
  });

  // -------------------------
  // Fonctionnalités critiques
  // -------------------------
  describe("Fonctionnalités critiques", () => {
    beforeEach(async () => {
      // Login admin avant chaque test critique
      await action(
        driver,
        this,
        "Login admin",
        `//*[@resource-id="${APP_PACKAGE}:id/username_input"]`,
        (el) => el.setValue("admin")
      );
      await action(
        driver,
        this,
        "Password admin",
        `//*[@resource-id="${APP_PACKAGE}:id/password_input"]`,
        (el) => el.setValue("admin123")
      );
      await action(driver, this, "Cliquer Login", '//*[@text="Login"]', (el) =>
        el.click()
      );
    });

    it("Paiement utilisateur", async function () {
      await action(
        driver,
        this,
        "Remplir montant paiement",
        `//*[@resource-id="${APP_PACKAGE}:id/payment_amount"]`,
        (el) => el.setValue("100")
      );
      await action(driver, this, "Cliquer Pay", '//*[@text="Pay"]', (el) =>
        el.click()
      );
      await action(
        driver,
        this,
        "Vérifier succès paiement",
        '//*[contains(@text, "Payment successful")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });

    it("Transfert d'argent", async function () {
      await action(
        driver,
        this,
        "Remplir destinataire",
        `//*[@resource-id="${APP_PACKAGE}:id/transfer_recipient"]`,
        (el) => el.setValue("guest")
      );
      await action(
        driver,
        this,
        "Remplir montant transfert",
        `//*[@resource-id="${APP_PACKAGE}:id/transfer_amount"]`,
        (el) => el.setValue("50")
      );
      await action(
        driver,
        this,
        "Cliquer Transfer",
        '//*[@text="Transfer"]',
        (el) => el.click()
      );
      await action(
        driver,
        this,
        "Vérifier succès transfert",
        '//*[contains(@text, "Transfer completed")]',
        async (el) => assert.isNotNull(await el.isExisting())
      );
    });
  });
});
