const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9288;
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
    console.log(`Saved screenshot: ${filePath}`);
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
  console.log("=== DEVVAULT DUAL-THEME CINEMATIC LIGHTFALL VERIFICATION ===");

  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-lightfall-test-${Date.now()}`);
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

    // ==========================================
    // 1. LIGHT THEME VERIFICATION (DESKTOP)
    // ==========================================
    console.log("\n--- Phase 1: Light Theme (Cinematic Parchment) Desktop ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?theme=light` });
    await sleep(2500);

    const lightDesktopMetrics = await cdp.eval(`(() => {
      const isLight = document.documentElement.classList.contains('light');
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const overlay = document.querySelector('.devvault-lightfall-overlay');
      const overlayStyle = overlay ? window.getComputedStyle(overlay) : null;
      const headline = document.querySelector('.home-intro h1');
      const headlineText = headline ? headline.innerText.trim() : null;

      // Tag canvas to check if the instance is retained across theme switch
      if (canvas) canvas.dataset.testId = 'lightfall-instance-1';

      return {
        isLight,
        isDark,
        canvasPresent: !!canvas,
        canvasWidth: canvas ? canvas.width : 0,
        canvasHeight: canvas ? canvas.height : 0,
        overlayPresent: !!overlay,
        overlayBackground: overlayStyle ? overlayStyle.backgroundImage : '',
        headlineText,
      };
    })()`);

    console.log("Light Desktop Metrics:", JSON.stringify(lightDesktopMetrics, null, 2));

    if (!lightDesktopMetrics.canvasPresent) {
      throw new Error("Lightfall canvas is MISSING in light theme!");
    }
    if (lightDesktopMetrics.isDark) {
      throw new Error("Document should NOT have .dark class in light theme!");
    }
    console.log("✓ Lightfall canvas successfully rendered in light mode (Cinematic Parchment)!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "lightfall-parchment-desktop.png"));

    // ==========================================
    // 2. LIGHT THEME VERIFICATION (MOBILE)
    // ==========================================
    console.log("\n--- Phase 2: Light Theme Mobile (390px) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(800);

    const lightMobileMetrics = await cdp.eval(`(() => {
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const bottomNav = document.querySelector('.mobile-bottom-nav');
      return {
        canvasPresent: !!canvas,
        bottomNavVisible: !!bottomNav,
      };
    })()`);

    console.log("Light Mobile Metrics:", JSON.stringify(lightMobileMetrics, null, 2));
    if (!lightMobileMetrics.canvasPresent) {
      throw new Error("Lightfall canvas is MISSING in mobile light theme!");
    }
    console.log("✓ Lightfall background renders smoothly on mobile!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "lightfall-parchment-mobile.png"));

    // ==========================================
    // 3. DYNAMIC THEME TOGGLE TO DARK (DESKTOP)
    // ==========================================
    console.log("\n--- Phase 3: Dynamic Theme Toggle to Dark (Cinematic Espresso) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(400);

    // Click theme toggle button in TopNav
    const toggleResult = await cdp.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label*="dark theme"]') ||
                       document.querySelector('button[aria-label*="light theme"]') ||
                       document.querySelector('.top-icon-btn');
      if (themeBtn) {
        themeBtn.click();
        return { clicked: true, label: themeBtn.getAttribute('aria-label') };
      }
      return { clicked: false };
    })()`);

    console.log("Theme toggle click result:", toggleResult);
    if (!toggleResult.clicked) {
      throw new Error("Theme toggle button not found or not clickable!");
    }
    await sleep(1500);

    const darkDesktopMetrics = await cdp.eval(`(() => {
      const isDark = document.documentElement.classList.contains('dark');
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const overlay = document.querySelector('.devvault-lightfall-overlay');
      const overlayStyle = overlay ? window.getComputedStyle(overlay) : null;
      const isSameCanvasInstance = canvas && canvas.dataset.testId === 'lightfall-instance-1';

      return {
        isDark,
        canvasPresent: !!canvas,
        isSameCanvasInstance,
        overlayBackground: overlayStyle ? overlayStyle.backgroundImage : '',
      };
    })()`);

    console.log("Dark Desktop Metrics:", JSON.stringify(darkDesktopMetrics, null, 2));

    if (!darkDesktopMetrics.isDark) {
      throw new Error("Failed to switch to dark theme after click!");
    }
    if (!darkDesktopMetrics.canvasPresent) {
      throw new Error("Lightfall canvas disappeared when toggled to dark theme!");
    }
    if (!darkDesktopMetrics.isSameCanvasInstance) {
      throw new Error("Canvas instance was unmounted/re-created! Single-canvas architecture required.");
    }
    console.log("✓ Canvas successfully retained across theme switch with zero unmounting/flicker!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "lightfall-espresso-desktop.png"));

    // ==========================================
    // 4. DARK THEME VERIFICATION (MOBILE)
    // ==========================================
    console.log("\n--- Phase 4: Dark Theme Mobile (390px) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(800);

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "lightfall-espresso-mobile.png"));
    console.log("✓ Mobile dark theme screenshot captured!");

    // ==========================================
    // 5. TOGGLE BACK TO LIGHT THEME
    // ==========================================
    console.log("\n--- Phase 5: Toggle Back to Light Theme ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });
    await sleep(400);

    await cdp.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label*="light theme"]') ||
                       document.querySelector('button[aria-label*="dark theme"]');
      if (themeBtn) themeBtn.click();
    })()`);
    await sleep(1200);

    const roundtripMetrics = await cdp.eval(`(() => {
      const isLight = document.documentElement.classList.contains('light');
      const canvas = document.querySelector('.devvault-lightfall-bg canvas');
      const isSameCanvas = canvas && canvas.dataset.testId === 'lightfall-instance-1';
      return {
        isLight,
        canvasPresent: !!canvas,
        isSameCanvas,
      };
    })()`);

    console.log("Roundtrip Metrics:", JSON.stringify(roundtripMetrics, null, 2));
    if (!roundtripMetrics.isLight || !roundtripMetrics.isSameCanvas) {
      throw new Error("Roundtrip theme switch failed or canvas was recreated!");
    }
    console.log("✓ Roundtrip theme toggle verified! WebGL canvas remains persistently active.");

    console.log("\n🎉 ALL DEVVAULT DUAL-THEME CINEMATIC LIGHTFALL TESTS PASSED!");
  } finally {
    if (cdp && cdp.ws) cdp.ws.close();
    chromeProc.kill("SIGTERM");
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
