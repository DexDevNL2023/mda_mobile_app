const wd = require("wd");
const { assert } = require("chai");
const config = require("../appium-flutter-config").config;
const fs = require("fs");
const { addContext } = require("mochawesome/addContext");

describe("Flutter Release E2E", function () {
  this.timeout(600000);
  let driver;

  before(async () => {
    driver = await wd.promiseChainRemote(config.path, config.port);
    await driver.init(config.capabilities);
  });

  after(async () => {
    if (driver) await driver.quit();
  });

  async function takeScreenshot(name) {
    const base64 = await driver.takeScreenshot();
    const filepath = `screenshots/${name}.png`;
    fs.writeFileSync(filepath, base64, "base64");
    addContext(this, { title: "Screenshot", value: filepath });
  }

  it("Affiche l’écran d’accueil", async function () {
    await takeScreenshot.bind(this)("home_before");
    const welcome = await driver.elementByAccessibilityId("welcome_text");
    assert.equal(await welcome.text(), "Bienvenue");
    await takeScreenshot.bind(this)("home_after");
  });

  it("Navigue vers le flux principal", async function () {
    const startBtn = await driver.elementByAccessibilityId("start_button");
    await startBtn.click();
    const mainScreen = await driver.elementByAccessibilityId("main_screen");
    assert.isNotNull(mainScreen);
    await takeScreenshot.bind(this)("main_screen");
  });
});
