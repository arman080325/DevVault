const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9275;
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
          const { res, rej } = this.callbacks.get(msg.id);
          this.callbacks.delete(msg.id);
          if (msg.error) rej(msg.error);
          else res(msg.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((res, rej) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { res, rej });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
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
    return res.result?.value;
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await this.send("Emulation.setVisibleSize", { width, height });
  }

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buffer);
    console.log(`    [Screenshot saved] docs/screenshots/${filename}`);
  }

  async waitFor(fnExpression, timeout = 6000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const ok = await this.eval(fnExpression);
        if (ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
    return false;
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startChrome() {
  const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_settings_qa_${Date.now()}`);
  const proc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDir}`,
    "--no-sandbox",
    "--disable-gpu",
    "--hide-scrollbars",
  ]);

  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        return { proc, userDir };
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("Failed to start Chrome with debugging port");
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("      DevVault: Settings Layout & Special Capture Button Verification Engine     ");
  console.log("================================================================================");

  const { proc, userDir } = await startChrome();
  const testResults = [];

  function record(suite, testName, passed, details = "") {
    testResults.push({ suite, testName, passed, details });
    const mark = passed ? "✓ PASS" : "✗ FAIL";
    console.log(`  [${mark}] ${suite} :: ${testName} ${details ? `(${details})` : ""}`);
  }

  try {
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error("No Chrome tab available");

    const client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    console.log("\n[1] Loading DevVault at http://localhost:3000");
    await client.send("Page.navigate", { url: "http://localhost:3000" });
    const ready = await client.waitFor(`Boolean(document.querySelector('.sidebar-capture'))`, 10000);
    if (!ready) throw new Error("Application failed to load or hydrate in 10s");
    await sleep(1500);

    // =========================================================================
    // Check 1: Special Touch on Save a Link Button
    // =========================================================================
    console.log("\n--- Check 1: Save a Link Button Styling & Elements ---");
    const buttonMetrics = await client.eval(`(() => {
      const btn = document.querySelector('.sidebar-capture');
      const icon = btn?.querySelector('.sidebar-capture-icon');
      const text = btn?.querySelector('.sidebar-capture-text');
      const kbd = btn?.querySelector('.sidebar-capture-kbd');
      const shimmer = btn?.querySelector('.sidebar-capture-shimmer');
      const style = btn ? window.getComputedStyle(btn) : null;
      return {
        exists: Boolean(btn),
        hasIconBox: Boolean(icon && icon.querySelector('svg')),
        hasText: text?.textContent?.trim() === 'Save a link',
        hasKbd: kbd?.textContent?.trim() === 'C',
        hasShimmer: Boolean(shimmer),
        hasBoxShadow: Boolean(style && style.boxShadow && style.boxShadow !== 'none'),
        minHeight: btn?.offsetHeight,
      };
    })()`);

    record("Capture Button", "Button Elements & Structure", buttonMetrics.exists && buttonMetrics.hasIconBox && buttonMetrics.hasText && buttonMetrics.hasKbd && buttonMetrics.hasShimmer, "Icon box + Text + Kbd 'C' + Shimmer");
    record("Capture Button", "Luminous Styling & Elevation", buttonMetrics.hasBoxShadow && buttonMetrics.minHeight >= 44, `height: ${buttonMetrics.minHeight}px, elevated shadow`);

    await client.captureScreenshot("save-link-button-desktop.png");

    // =========================================================================
    // Check 2: Navigate to Settings Page
    // =========================================================================
    console.log("\n--- Check 2: Settings Layout & Navigation ---");
    await client.eval(`(() => {
      const navButtons = Array.from(document.querySelectorAll('.sidebar nav button'));
      const settingsBtn = navButtons.find(b => b.textContent.includes('Settings')) || document.querySelector('.sidebar-bottom .profile');
      if (settingsBtn) settingsBtn.click();
    })()`);
    await sleep(600);

    const settingsReady = await client.waitFor(`Boolean(document.querySelector('.settings-layout'))`, 5000);
    record("Settings Navigation", "Settings Page Loaded", settingsReady, ".settings-layout present");

    // Check desktop nav tabs
    const navTabs = await client.eval(`(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-nav-item')).map(t => t.textContent.trim());
      const active = document.querySelector('.settings-nav-item.active')?.textContent?.trim();
      return { tabs, active };
    })()`);

    record("Settings Navigation", "All 6 Settings Categories Present", navTabs.tabs.length === 6, navTabs.tabs.join(", "));
    record("Settings Navigation", "Profile Tab Active by Default", navTabs.active === "Profile", `Active: ${navTabs.active}`);

    // =========================================================================
    // Check 3: Profile View & Edit Functionality
    // =========================================================================
    console.log("\n--- Check 3: Profile View & Edit Mode ---");
    const profileView = await client.eval(`(() => {
      const card = document.querySelector('.profile-card-view');
      const avatar = card?.querySelector('.profile-card-avatar');
      const name = card?.querySelector('.profile-card-header h3');
      const role = card?.querySelector('.profile-role-badge');
      const email = card?.querySelector('.profile-card-email');
      return {
        cardExists: Boolean(card),
        avatar: avatar?.textContent?.trim(),
        name: name?.textContent?.trim(),
        role: role?.textContent?.trim(),
        email: email?.textContent?.trim(),
      };
    })()`);

    record("Profile View", "Profile Card Rendered Cleanly", profileView.cardExists && profileView.name === "Alex Lin", `Name: ${profileView.name}, Role: ${profileView.role}`);
    await client.captureScreenshot("settings-profile-view.png");

    // Click "Edit profile"
    await client.eval(`document.querySelector('.profile-card-edit-btn')?.click()`);
    await sleep(300);

    const editFormCheck = await client.eval(`(() => {
      const form = document.querySelector('.profile-card-edit');
      const nameInput = document.querySelector('#settings-name-input');
      const emailInput = document.querySelector('#settings-email-input');
      const roleInput = document.querySelector('#settings-role-input');
      const style = nameInput ? window.getComputedStyle(nameInput) : null;
      return {
        formExists: Boolean(form),
        hasName: Boolean(nameInput),
        hasEmail: Boolean(emailInput),
        hasRole: Boolean(roleInput),
        fontSize: style?.fontSize,
        height: nameInput?.offsetHeight,
      };
    })()`);

    record(
      "Profile Edit",
      "Edit Form Layout Correctly Sized (No Squishing)",
      editFormCheck.formExists && parseFloat(editFormCheck.fontSize) >= 14 && editFormCheck.height >= 38,
      `fontSize: ${editFormCheck.fontSize}, height: ${editFormCheck.height}px`
    );
    await client.captureScreenshot("settings-profile-edit.png");

    // Modify profile name and save
    await client.eval(`(() => {
      const nameInput = document.querySelector('#settings-name-input');
      const roleInput = document.querySelector('#settings-role-input');
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(nameInput, 'Alex Lin (Lead)');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (roleInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(roleInput, 'Lead Architect');
        roleInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      document.querySelector('.profile-card-edit')?.requestSubmit();
    })()`);
    await sleep(500);

    const updatedProfile = await client.eval(`(() => {
      const name = document.querySelector('.profile-card-header h3')?.textContent?.trim();
      const role = document.querySelector('.profile-role-badge')?.textContent?.trim();
      const sidebarName = document.querySelector('.sidebar-bottom .profile b')?.textContent?.trim();
      const sidebarRole = document.querySelector('.sidebar-bottom .profile small')?.textContent?.trim();
      return { name, role, sidebarName, sidebarRole };
    })()`);

    record(
      "Profile Edit",
      "Profile Saved & Synchronized to Sidebar",
      updatedProfile.name === "Alex Lin (Lead)" && updatedProfile.sidebarName === "Alex Lin (Lead)",
      `Settings: "${updatedProfile.name}" | Sidebar: "${updatedProfile.sidebarName}"`
    );

    // =========================================================================
    // Check 4: Appearance Tab
    // =========================================================================
    console.log("\n--- Check 4: Appearance Tab & Typography Scale Cards ---");
    await client.eval(`(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-nav-item'));
      const appTab = tabs.find(t => t.textContent.includes('Appearance'));
      if (appTab) appTab.click();
    })()`);
    await sleep(300);

    const appearanceCheck = await client.eval(`(() => {
      const fontCards = document.querySelectorAll('.font-pref-card');
      const densityButtons = document.querySelectorAll('.density-toggle button');
      const themeToggle = document.querySelector('.setting-row .toggle');
      return {
        fontCardsCount: fontCards.length,
        densityCount: densityButtons.length,
        hasThemeToggle: Boolean(themeToggle),
      };
    })()`);

    record(
      "Appearance Tab",
      "Typography Scale Cards & Controls Present",
      appearanceCheck.fontCardsCount === 3 && appearanceCheck.densityCount === 2 && appearanceCheck.hasThemeToggle,
      `${appearanceCheck.fontCardsCount} font cards, density toggle, theme toggle`
    );
    await client.captureScreenshot("settings-appearance.png");

    // =========================================================================
    // Check 5: Capture Tab & Interactive Dropdowns
    // =========================================================================
    console.log("\n--- Check 5: Capture Defaults Tab & Status Dropdown ---");
    await client.eval(`(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-nav-item'));
      const capTab = tabs.find(t => t.textContent.includes('Capture'));
      if (capTab) capTab.click();
    })()`);
    await sleep(300);

    // Open default status dropdown
    await client.eval(`document.querySelector('.setting-row .select-button')?.click()`);
    await sleep(250);

    const dropdownCheck = await client.eval(`(() => {
      const menu = document.querySelector('.settings-dropdown-menu');
      const items = menu ? Array.from(menu.querySelectorAll('li')).map(l => l.textContent.trim()) : [];
      return {
        open: Boolean(menu),
        items,
      };
    })()`);

    record(
      "Capture Tab",
      "Default Status Dropdown Menu Opens with Canonical Statuses",
      dropdownCheck.open && dropdownCheck.items.length === 3,
      dropdownCheck.items.join(", ")
    );

    // Select "Exploring"
    await client.eval(`(() => {
      const items = Array.from(document.querySelectorAll('.settings-dropdown-menu li'));
      const exp = items.find(i => i.textContent.includes('Exploring'));
      if (exp) exp.click();
    })()`);
    await sleep(200);

    const updatedStatus = await client.eval(`document.querySelector('.setting-row .select-button')?.textContent?.trim()`);
    record(
      "Capture Tab",
      "Default Status Selection Updates Reactively",
      updatedStatus === "Exploring",
      `Trigger text: "${updatedStatus}"`
    );
    await client.captureScreenshot("settings-capture.png");

    // =========================================================================
    // Check 6: Data & Storage Tab
    // =========================================================================
    console.log("\n--- Check 6: Data & Storage Analytics & Actions ---");
    await client.eval(`(() => {
      const tabs = Array.from(document.querySelectorAll('.settings-nav-item'));
      const dataTab = tabs.find(t => t.textContent.includes('Data'));
      if (dataTab) dataTab.click();
    })()`);
    await sleep(300);

    const dataCheck = await client.eval(`(() => {
      const statCards = document.querySelectorAll('.vault-stat-card');
      const exportBtn = Array.from(document.querySelectorAll('.outline-button')).find(b => b.textContent.includes('Export'));
      const importBtn = Array.from(document.querySelectorAll('.outline-button')).find(b => b.textContent.includes('Import'));
      const deleteBtn = document.querySelector('.btn-danger-outline');
      return {
        statsCount: statCards.length,
        hasExport: Boolean(exportBtn),
        hasImport: Boolean(importBtn),
        hasDelete: Boolean(deleteBtn),
      };
    })()`);

    record(
      "Data Tab",
      "Storage Stats, Export & Import Controls Present",
      dataCheck.statsCount === 4 && dataCheck.hasExport && dataCheck.hasImport && dataCheck.hasDelete,
      `4 stats cards, export backup, import JSON, delete vault`
    );
    await client.captureScreenshot("settings-data.png");

    // =========================================================================
    // Check 7: Mobile Responsiveness & Navigation
    // =========================================================================
    console.log("\n--- Check 7: Mobile Settings Layout (375x812) ---");
    await client.setViewport(375, 812);
    await sleep(300);

    const mobileAudit = await client.eval(`(() => {
      const mobileTabs = document.querySelector('.settings-mobile-tabs');
      const desktopNav = document.querySelector('.settings-nav');
      const mStyle = mobileTabs ? window.getComputedStyle(mobileTabs) : null;
      const dStyle = desktopNav ? window.getComputedStyle(desktopNav) : null;
      const scrollWidth = document.documentElement.scrollWidth;
      const innerWidth = window.innerWidth;
      return {
        mobileTabsVisible: mStyle?.display !== 'none',
        desktopNavHidden: dStyle?.display === 'none',
        noOverflow: scrollWidth <= innerWidth,
        scrollWidth,
        innerWidth,
      };
    })()`);

    record(
      "Mobile Settings",
      "Mobile Segmented Tabs Visible & Desktop Nav Hidden",
      mobileAudit.mobileTabsVisible && mobileAudit.desktopNavHidden,
      `mobileTabs: ${mobileAudit.mobileTabsVisible}, desktopNavHidden: ${mobileAudit.desktopNavHidden}`
    );
    record(
      "Mobile Settings",
      "Zero Horizontal Overflow on Mobile",
      mobileAudit.noOverflow,
      `scrollWidth: ${mobileAudit.scrollWidth}px, innerWidth: ${mobileAudit.innerWidth}px`
    );

    await client.captureScreenshot("settings-mobile.png");

    console.log("\n================================================================================");
    const passCount = testResults.filter((r) => r.passed).length;
    const failCount = testResults.filter((r) => !r.passed).length;
    console.log(`Settings & Button QA Complete: ${passCount} PASSED, ${failCount} FAILED out of ${testResults.length} checks`);
    console.log("================================================================================\n");

    client.close();
    proc.kill();
  } catch (err) {
    console.error("Test execution failed:", err);
    try {
      proc.kill();
    } catch {}
    process.exit(1);
  }
}

runTestSuite();
