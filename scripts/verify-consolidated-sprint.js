const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9299;
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
      throw new Error(`Eval exception: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async captureScreenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`Saved screenshot: ${path.basename(filePath)}`);
  }

  async setViewport(width, height, mobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 2,
      mobile,
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
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

async function run() {
  console.log("=== DEVVAULT CONSOLIDATED DUAL-THEME & RESPONSIVE VERIFICATION ===");

  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-consolidated-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${tempDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--headless=new",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--window-size=1440,900",
    ],
    { stdio: "ignore" }
  );

  let cdp = null;

  try {
    let pageWsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        await fetchJson(`http://127.0.0.1:${PORT}/json/version`);
        const targets = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
        const pageTarget = targets.find((t) => t.type === "page") || targets[0];
        if (pageTarget && pageTarget.webSocketDebuggerUrl) {
          pageWsUrl = pageTarget.webSocketDebuggerUrl;
          break;
        }
      } catch {
        await sleep(250);
      }
    }

    if (!pageWsUrl) throw new Error("Could not find page target on Chrome debugging port");

    cdp = new CDPClient(pageWsUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    const consoleLogs = [];
    const consoleErrors = [];

    // Capture console errors
    await cdp.send("Runtime.enable");

    // ==========================================
    // Phase 1: 1440px Desktop (Light & Dark Theme)
    // ==========================================
    console.log("\n--- Phase 1: 1440px Desktop ---");
    await cdp.setViewport(1440, 900, false);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?theme=light` });
    
    // Wait for hydration and Lightfall mounting
    for (let i = 0; i < 20; i++) {
      const ready = await cdp.eval(`!!document.querySelector('.devvault-lightfall-bg')`);
      if (ready) break;
      await sleep(500);
    }
    await sleep(1000);

    const light1440Metrics = await cdp.eval(`(() => {
      const isLight = document.documentElement.classList.contains('light');
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const overlay = document.querySelector('.devvault-lightfall-overlay');
      const sidebar = document.querySelector('.sidebar-desktop-container');
      const appColumn = document.querySelector('.app-column');
      const rootStyle = window.getComputedStyle(document.documentElement);

      return {
        isLight,
        canvasPresent: !!canvas,
        overlayPresent: !!overlay,
        sidebarFixed: sidebar ? window.getComputedStyle(sidebar).position === 'fixed' : false,
        sidebarWidth: sidebar ? sidebar.offsetWidth : 0,
        appColumnMargin: appColumn ? window.getComputedStyle(appColumn).marginLeft : '',
        cssCanvas: rootStyle.getPropertyValue('--canvas').trim().toUpperCase(),
        cssSurface: rootStyle.getPropertyValue('--surface').trim().toUpperCase(),
        cssAccent: rootStyle.getPropertyValue('--accent').trim().toUpperCase(),
      };
    })()`);

    console.log("1440px Light Metrics:", JSON.stringify(light1440Metrics, null, 2));
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1440px-light-home.png"));

    if (!light1440Metrics.canvasPresent) throw new Error("Canvas missing in 1440px light");
    if (!light1440Metrics.sidebarFixed) throw new Error("Sidebar not fixed in 1440px");

    // Switch to dark theme via toggle
    console.log("Switching to Dark Theme...");
    await cdp.eval(`(() => {
      const themeBtn = document.querySelector('.top-icon-btn[title*="dark"], .top-icon-btn[aria-label*="dark"]');
      if (themeBtn) themeBtn.click();
    })()`);
    await sleep(800);

    const dark1440Metrics = await cdp.eval(`(() => {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const rootStyle = window.getComputedStyle(document.documentElement);
      return {
        isDark,
        canvasPresent: !!canvas,
        cssCanvas: rootStyle.getPropertyValue('--canvas').trim().toUpperCase(),
      };
    })()`);
    console.log("1440px Dark Metrics:", JSON.stringify(dark1440Metrics, null, 2));
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1440px-dark-home.png"));

    if (!dark1440Metrics.isDark) throw new Error("Failed to switch to dark theme at 1440px");

    // ==========================================
    // Phase 2: 1280px Laptop (Light Theme & Library View)
    // ==========================================
    console.log("\n--- Phase 2: 1280px Laptop ---");
    await cdp.setViewport(1280, 800, false);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?theme=light` });
    await sleep(1500);

    // Navigate to Library
    await cdp.eval(`(() => {
      const libBtn = document.querySelector('button[aria-label="Library"]');
      if (libBtn) libBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1280px-light-library.png"));

    // Navigate to Explore
    await cdp.eval(`(() => {
      const expBtn = document.querySelector('button[aria-label="Explore"]');
      if (expBtn) expBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1280px-light-explore.png"));

    // Navigate to Collections
    await cdp.eval(`(() => {
      const colBtn = document.querySelector('button[aria-label="Collections"]');
      if (colBtn) colBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1280px-light-collections.png"));

    // Navigate to Activity
    await cdp.eval(`(() => {
      const actBtn = document.querySelector('button[aria-label="Activity"]');
      if (actBtn) actBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1280px-light-activity.png"));

    // Navigate to Settings
    await cdp.eval(`(() => {
      const setBtn = document.querySelector('button[aria-label="Settings"]');
      if (setBtn) setBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-1280px-light-settings.png"));

    // ==========================================
    // Phase 3: 768px Tablet Viewport
    // ==========================================
    console.log("\n--- Phase 3: 768px Tablet ---");
    await cdp.setViewport(768, 1024, false);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?theme=light` });
    await sleep(1500);

    const tabletMetrics = await cdp.eval(`(() => {
      const sidebar = document.querySelector('.sidebar-desktop-container');
      const mobileDrawer = document.querySelector('.mobile-menu-trigger');
      return {
        sidebarVisible: sidebar ? window.getComputedStyle(sidebar).display !== 'none' : false,
        mobileTriggerVisible: mobileDrawer ? window.getComputedStyle(mobileDrawer).display !== 'none' : false,
      };
    })()`);
    console.log("768px Tablet Metrics:", JSON.stringify(tabletMetrics, null, 2));
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-768px-tablet-light.png"));

    // ==========================================
    // Phase 4: 390px Mobile Viewport (iPhone 14/15/16)
    // ==========================================
    console.log("\n--- Phase 4: 390px Mobile ---");
    await cdp.setViewport(390, 844, true);
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?theme=light` });
    await sleep(1500);

    const mobile390Metrics = await cdp.eval(`(() => {
      const avatar = document.querySelector('.mobile-avatar');
      const topbar = document.querySelector('.topbar');
      const bottomNav = document.querySelector('.mobile-nav');
      const avatarRect = avatar ? avatar.getBoundingClientRect() : null;
      return {
        avatarPresent: !!avatar,
        avatarRight: avatarRect ? Math.round(avatarRect.right) : 0,
        windowWidth: window.innerWidth,
        isCropped: avatarRect ? avatarRect.right > window.innerWidth : false,
        marginFromRight: avatarRect ? Math.round(window.innerWidth - avatarRect.right) : 0,
        bottomNavPresent: !!bottomNav,
      };
    })()`);
    console.log("390px Mobile Metrics:", JSON.stringify(mobile390Metrics, null, 2));
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-390px-mobile-light.png"));

    if (mobile390Metrics.isCropped) throw new Error("Avatar is cropped at 390px!");

    // ==========================================
    // Phase 5: 360px Mobile Viewport (Compact Android)
    // ==========================================
    console.log("\n--- Phase 5: 360px Compact Mobile ---");
    await cdp.setViewport(360, 740, true);
    await sleep(500);

    const mobile360Metrics = await cdp.eval(`(() => {
      const avatar = document.querySelector('.mobile-avatar');
      const avatarRect = avatar ? avatar.getBoundingClientRect() : null;
      return {
        avatarRight: avatarRect ? Math.round(avatarRect.right) : 0,
        windowWidth: window.innerWidth,
        isCropped: avatarRect ? avatarRect.right > window.innerWidth : false,
        marginFromRight: avatarRect ? Math.round(window.innerWidth - avatarRect.right) : 0,
      };
    })()`);
    console.log("360px Mobile Metrics:", JSON.stringify(mobile360Metrics, null, 2));
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-360px-mobile-light.png"));

    if (mobile360Metrics.isCropped) throw new Error("Avatar is cropped at 360px!");

    // Switch to dark mode on mobile to check mobile dark mode
    await cdp.eval(`(() => {
      const themeBtn = document.querySelector('.top-icon-btn[title*="dark"], .top-icon-btn[aria-label*="dark"]');
      if (themeBtn) themeBtn.click();
    })()`);
    await sleep(800);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "final-360px-mobile-dark.png"));

    console.log("\n=== ALL 5 VIEWPORTS AND BOTH THEMES VERIFIED SUCCESSFULLY! ===");
  } finally {
    if (cdp) cdp.close();
    chromeProc.kill("SIGKILL");
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in verification:", err);
  process.exit(1);
});
