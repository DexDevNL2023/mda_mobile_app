exports.config = {
  path: "/wd/hub",
  port: 4723,
  capabilities: {
    platformName: process.env.PLATFORM || "Android",
    deviceName: process.env.DEVICE_NAME || "emulator-5554",
    app: process.env.APP_PATH || "./app-release.apk",
    automationName: "Flutter",
  },
};
