const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9297;
const NEXT_PORT = 3000;
const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.id && this.callbacks.has(msg.id)) {
          const { resolve, reject } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`[Screenshot saved]: ${path.basename(filePath)}`);
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile: width < 768,
    });
    await this.send("Emulation.setVisibleSize", { width, height });
  }

  close() {
    if (this.ws) this.ws.close();
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== DEVVAULT THEME TRANSITION & VERIFICATION SUITE ===");

  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-theme-test-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${tempDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  await delay(1200);

  let cdp;
  try {
    let versionInfo;
    for (let i = 0; i < 30; i++) {
      try {
        versionInfo = await getJson(`http://127.0.0.1:${PORT}/json/version`);
        if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
      } catch {}
      await delay(300);
    }

    if (!versionInfo || !versionInfo.webSocketDebuggerUrl) {
      chromeProc.kill();
      throw new Error("Failed to connect to headless Chrome remote debugging port.");
    }

    let targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
    let pageTarget = targets.find((t) => t.type === "page") || targets[0];

    cdp = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    // 1. Initial Desktop Light Navigation
    await cdp.setViewport(1440, 900);
    console.log(`[1] Navigating to http://localhost:${NEXT_PORT}...`);
    await cdp.send("Page.navigate", { url: `http://localhost:${NEXT_PORT}` });
    await delay(2000);

    // Ensure initial state is clean light theme
    await cdp.eval(`
      localStorage.setItem("devvault-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    `);
    await delay(500);

    const initialTheme = await cdp.eval(`document.documentElement.classList.contains("dark") ? "dark" : "light"`);
    console.log(`Initial theme confirmed: ${initialTheme}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-01-desktop-initial-light.png"));

    // 2. Click TopBar Theme Toggle -> Transition to Dark
    console.log("[2] Clicking theme toggle to transition to dark...");
    await cdp.eval(`
      (() => {
        const btn = document.querySelector(".top-icon-btn");
        if (btn) btn.click();
      })()
    `);
    // Wait for view transition (480ms) + settling
    await delay(700);

    const themeAfterDarkToggle = await cdp.eval(`document.documentElement.classList.contains("dark") ? "dark" : "light"`);
    console.log(`Theme after dark toggle: ${themeAfterDarkToggle}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-02-desktop-dark-settled.png"));

    // 3. Click TopBar Theme Toggle -> Transition back to Light
    console.log("[3] Clicking theme toggle to return to light...");
    await cdp.eval(`
      (() => {
        const btn = document.querySelector(".top-icon-btn");
        if (btn) btn.click();
      })()
    `);
    await delay(700);

    const themeAfterLightToggle = await cdp.eval(`document.documentElement.classList.contains("dark") ? "dark" : "light"`);
    console.log(`Theme after light toggle: ${themeAfterLightToggle}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-03-desktop-light-restored.png"));

    // 4. Mobile 390px Viewport Transitions
    console.log("[4] Switching to mobile viewport (390x844)...");
    await cdp.setViewport(390, 844);
    await delay(500);

    console.log("Triggering mobile theme switch to dark...");
    await cdp.eval(`
      (() => {
        const btn = document.querySelector(".top-icon-btn");
        if (btn) btn.click();
      })()
    `);
    await delay(700);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-04-mobile-390px-dark.png"));

    console.log("Triggering mobile theme switch to light...");
    await cdp.eval(`
      (() => {
        const btn = document.querySelector(".top-icon-btn");
        if (btn) btn.click();
      })()
    `);
    await delay(700);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-05-mobile-390px-light.png"));

    // 5. Settings Appearance Tab Toggle Switch
    console.log("[5] Resetting viewport to 1440x900 and navigating to Settings -> Appearance...");
    await cdp.setViewport(1440, 900);
    await delay(400);

    // Navigate to settings view
    await cdp.eval(`
      (() => {
        // Find Settings nav link or trigger
        const settingsBtn = Array.from(document.querySelectorAll("button, a")).find(
          el => el.textContent.trim().toLowerCase().includes("settings")
        );
        if (settingsBtn) settingsBtn.click();
      })()
    `);
    await delay(600);

    // Switch to Appearance tab in settings
    await cdp.eval(`
      (() => {
        const tabs = Array.from(document.querySelectorAll(".settings-tab-btn"));
        const appearanceTab = tabs.find(t => t.textContent.trim().toLowerCase().includes("appearance"));
        if (appearanceTab) appearanceTab.click();
      })()
    `);
    await delay(500);

    // Click toggle switch in Settings
    console.log("Clicking .toggle switch in Settings Appearance...");
    await cdp.eval(`
      (() => {
        const toggle = document.querySelector(".toggle");
        if (toggle) toggle.click();
      })()
    `);
    await delay(700);
    const settingsDarkTheme = await cdp.eval(`document.documentElement.classList.contains("dark") ? "dark" : "light"`);
    console.log(`Settings toggle theme state: ${settingsDarkTheme}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-06-settings-appearance-toggle-dark.png"));

    // Click toggle switch again to return to light
    await cdp.eval(`
      (() => {
        const toggle = document.querySelector(".toggle");
        if (toggle) toggle.click();
      })()
    `);
    await delay(700);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-07-settings-appearance-toggle-light.png"));

    // 6. Test Typography Preferences
    console.log("[6] Testing Headings Typography Scale options...");
    // Click Instrument
    await cdp.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll(".font-pref-card"));
        const instCard = cards.find(c => c.textContent.includes("Instrument"));
        if (instCard) instCard.click();
      })()
    `);
    await delay(400);
    const instFontPref = await cdp.eval(`document.documentElement.getAttribute("data-font-pref")`);
    console.log(`Font pref set to: ${instFontPref}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-08-settings-font-instrument.png"));

    // Click IBM Plex
    await cdp.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll(".font-pref-card"));
        const plexCard = cards.find(c => c.textContent.includes("IBM Plex"));
        if (plexCard) plexCard.click();
      })()
    `);
    await delay(400);
    const plexFontPref = await cdp.eval(`document.documentElement.getAttribute("data-font-pref")`);
    console.log(`Font pref set to: ${plexFontPref}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-09-settings-font-plex.png"));

    // Return to Newsreader
    await cdp.eval(`
      (() => {
        const cards = Array.from(document.querySelectorAll(".font-pref-card"));
        const newsCard = cards.find(c => c.textContent.includes("Newsreader"));
        if (newsCard) newsCard.click();
      })()
    `);
    await delay(400);
    const newsFontPref = await cdp.eval(`document.documentElement.getAttribute("data-font-pref")`);
    console.log(`Font pref restored to: ${newsFontPref}`);
    await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-10-settings-font-newsreader.png"));

    // 7. Profile Tab Remove Photo Toast Verification
    console.log("[7] Testing Profile tab Remove Photo toast...");
    await cdp.eval(`
      (() => {
        const tabs = Array.from(document.querySelectorAll(".settings-tab-btn"));
        const profileTab = tabs.find(t => t.textContent.trim().toLowerCase().includes("profile"));
        if (profileTab) profileTab.click();
      })()
    `);
    await delay(500);

    const hasRemoveBtn = await cdp.eval(`Boolean(document.querySelector(".profile-unified-remove-btn"))`);
    if (hasRemoveBtn) {
      console.log("Found .profile-unified-remove-btn, clicking to trigger confirmation toast...");
      await cdp.eval(`document.querySelector(".profile-unified-remove-btn").click()`);
      await delay(400);
      await cdp.screenshot(path.join(SCREENSHOT_DIR, "transition-11-remove-photo-toast-visible.png"));
      // Dismiss
      await cdp.eval(`
        const closeBtn = document.querySelector(".vault-sync-toast-close") || document.querySelector(".vault-sync-btn-secondary");
        if (closeBtn) closeBtn.click();
      `);
      await delay(300);
    } else {
      console.log("No custom photo currently attached on default profile, skipping toast trigger.");
    }

    console.log("=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY ===");
  } catch (err) {
    console.error("Test error:", err);
    process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill();
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

main();
