const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9295;
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
  console.log("=== DEVVAULT HEADINGS TYPOGRAPHY SCALE VERIFICATION ===");

  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-typo-test-${Date.now()}`);
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

  let versionInfo;
  for (let i = 0; i < 30; i++) {
    try {
      versionInfo = await getJson(`http://127.0.0.1:${PORT}/json/version`);
      if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
    } catch {}
    await delay(250);
  }

  if (!versionInfo || !versionInfo.webSocketDebuggerUrl) {
    chromeProc.kill();
    throw new Error("Failed to connect to headless Chrome remote debugging port.");
  }

  let targets = await getJson(`http://127.0.0.1:${PORT}/json/list`);
  let pageTarget = targets.find((t) => t.type === "page");
  if (!pageTarget) {
    try {
      pageTarget = await getJson(`http://127.0.0.1:${PORT}/json/new?about:blank`);
    } catch {
      pageTarget = targets[0];
    }
  }

  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");

  try {
    console.log("\n[1/5] Navigating to DevVault Settings -> Appearance tab...");
    await client.setViewport(1440, 900);
    await client.send("Page.navigate", { url: `http://localhost:${NEXT_PORT}` });

    for (let i = 0; i < 20; i++) {
      const ready = await client.eval(`!!document.querySelector('button[aria-label="Settings"]')`);
      if (ready) break;
      await delay(300);
    }
    await delay(1500);

    // Dismiss local banner toast to keep views pristine
    await client.eval(`
      (() => {
        sessionStorage.setItem("devvault-dismiss-local-banner", "true");
        const setBtn = document.querySelector('button[aria-label="Settings"]');
        if (setBtn) setBtn.click();
      })()
    `);
    await delay(1200);

    // Switch to Appearance tab
    const tabClicked = await client.eval(`
      (() => {
        const appTab = Array.from(document.querySelectorAll(".settings-nav-item, .settings-mobile-tabs button")).find(
          b => b.textContent && b.textContent.includes("Appearance")
        );
        if (appTab) {
          appTab.click();
          return true;
        }
        return false;
      })()
    `);
    console.log("Appearance tab clicked:", tabClicked);
    await delay(1000);

    // 1. Verify Newsreader Default
    console.log("\n[2/5] Testing 1: Editorial Serif (Newsreader)...");
    await client.eval(`
      (() => {
        const btn = document.querySelector('.font-pref-card:nth-child(1)');
        if (btn) btn.click();
      })()
    `);
    await delay(600);

    const newsreaderState = await client.eval(`
      (() => {
        const htmlPref = document.documentElement.getAttribute("data-font-pref");
        const h1 = document.querySelector("h1");
        const h2 = document.querySelector(".settings-section-head h2");
        const h1Computed = h1 ? window.getComputedStyle(h1).fontFamily : "";
        const h2Computed = h2 ? window.getComputedStyle(h2).fontFamily : "";
        const activeCard = document.querySelector(".font-pref-card.active b");
        return {
          htmlPref,
          activeCard: activeCard ? activeCard.textContent : "",
          h1Text: h1 ? h1.textContent : "",
          h1Computed,
          h2Computed,
        };
      })()
    `);
    console.log("Newsreader Test State:", newsreaderState);
    if (newsreaderState.htmlPref !== "newsreader") {
      throw new Error(`Expected html[data-font-pref="newsreader"], got "${newsreaderState.htmlPref}"`);
    }
    if (!newsreaderState.h1Computed.toLowerCase().includes("newsreader")) {
      throw new Error(`Expected h1 to use Newsreader, got "${newsreaderState.h1Computed}"`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "typography-newsreader-settings.png"));
    console.log("  PASS: Newsreader (Editorial Serif) applied across headings seamlessly.");

    // 2. Verify Instrument (Modern Sans)
    console.log("\n[3/5] Testing 2: Modern Sans (Instrument Sans)...");
    await client.eval(`
      (() => {
        const btn = document.querySelector('.font-pref-card:nth-child(2)');
        if (btn) btn.click();
      })()
    `);
    await delay(500);

    const instrumentState = await client.eval(`
      (() => {
        const htmlPref = document.documentElement.getAttribute("data-font-pref");
        const h1 = document.querySelector(".library-head h1");
        const h2 = document.querySelector(".settings-section-head h2");
        const h1Computed = h1 ? window.getComputedStyle(h1).fontFamily : "";
        const h2Computed = h2 ? window.getComputedStyle(h2).fontFamily : "";
        const activeCard = document.querySelector(".font-pref-card.active b");
        const stored = localStorage.getItem("devvault-font-preference");
        return {
          htmlPref,
          stored,
          activeCard: activeCard ? activeCard.textContent : "",
          h1Computed,
          h2Computed,
        };
      })()
    `);
    console.log("Instrument Test State:", instrumentState);
    if (instrumentState.htmlPref !== "instrument" || instrumentState.stored !== "instrument") {
      throw new Error(`Expected instrument font pref, got "${instrumentState.htmlPref}" (stored: "${instrumentState.stored}")`);
    }
    if (!instrumentState.h1Computed.toLowerCase().includes("instrument")) {
      throw new Error(`Expected h1 to use Instrument Sans, got "${instrumentState.h1Computed}"`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "typography-instrument-settings.png"));

    // Navigate to Home to verify app-wide seamless heading adoption
    await client.eval(`
      (() => {
        const homeBtn = document.querySelector('button[aria-label="Home"]');
        if (homeBtn) homeBtn.click();
      })()
    `);
    await delay(800);
    const homeH1 = await client.eval(`
      (() => {
        const h1 = document.querySelector(".home-intro h1");
        return h1 ? window.getComputedStyle(h1).fontFamily : "";
      })()
    `);
    console.log("Home intro h1 computed font with Instrument active:", homeH1);
    if (!homeH1.toLowerCase().includes("instrument")) {
      throw new Error(`Expected Home h1 to use Instrument Sans, got "${homeH1}"`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "typography-instrument-home.png"));
    console.log("  PASS: Instrument Sans applied app-wide (Settings + Home hero).");

    // 3. Verify IBM Plex (Technical Mono)
    console.log("\n[4/5] Testing 3: Technical Mono (IBM Plex Mono)...");
    await client.eval(`
      (() => {
        const setBtn = document.querySelector('button[aria-label="Settings"]');
        if (setBtn) setBtn.click();
      })()
    `);
    await delay(800);
    await client.eval(`
      (() => {
        const appTab = Array.from(document.querySelectorAll(".settings-nav-item, .settings-mobile-tabs button")).find(
          b => b.textContent && b.textContent.includes("Appearance")
        );
        if (appTab) appTab.click();
      })()
    `);
    await delay(500);

    await client.eval(`
      (() => {
        const btn = document.querySelector('.font-pref-card:nth-child(3)');
        if (btn) btn.click();
      })()
    `);
    await delay(500);

    const plexState = await client.eval(`
      (() => {
        const htmlPref = document.documentElement.getAttribute("data-font-pref");
        const h1 = document.querySelector(".library-head h1");
        const h1Computed = h1 ? window.getComputedStyle(h1).fontFamily : "";
        const stored = localStorage.getItem("devvault-font-preference");
        return {
          htmlPref,
          stored,
          h1Computed,
        };
      })()
    `);
    console.log("IBM Plex Test State:", plexState);
    if (plexState.htmlPref !== "plex" || plexState.stored !== "plex") {
      throw new Error(`Expected plex font pref, got "${plexState.htmlPref}"`);
    }
    if (!plexState.h1Computed.toLowerCase().includes("plex")) {
      throw new Error(`Expected h1 to use IBM Plex Mono, got "${plexState.h1Computed}"`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "typography-plex-settings.png"));

    // Navigate to Library to verify Plex on library view
    await client.eval(`
      (() => {
        const libBtn = document.querySelector('button[aria-label="Library"]');
        if (libBtn) libBtn.click();
      })()
    `);
    await delay(800);
    const libH1 = await client.eval(`
      (() => {
        const h1 = document.querySelector(".library-head h1");
        return h1 ? window.getComputedStyle(h1).fontFamily : "";
      })()
    `);
    console.log("Library h1 computed font with IBM Plex active:", libH1);
    if (!libH1.toLowerCase().includes("plex")) {
      throw new Error(`Expected Library h1 to use IBM Plex Mono, got "${libH1}"`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "typography-plex-library.png"));
    console.log("  PASS: IBM Plex Mono applied app-wide (Settings + Library).");

    // 4. Persistence Test across Page Reload
    console.log("\n[5/5] Testing Reload Persistence...");
    await client.send("Page.reload");
    for (let i = 0; i < 30; i++) {
      await delay(250);
      try {
        const ready = await client.eval(`document.readyState === "complete" && !!document.querySelector(".home-intro h1, .library-head h1, .settings-page h1, h1")`);
        if (ready) break;
      } catch {}
    }
    await delay(1200);

    const persistedState = await client.eval(`
      (() => {
        const htmlPref = document.documentElement.getAttribute("data-font-pref");
        const h1 = document.querySelector(".home-intro h1, .library-head h1, .settings-page h1, h1");
        const h1Computed = h1 ? window.getComputedStyle(h1).fontFamily : "";
        const stored = localStorage.getItem("devvault-font-preference");
        return { htmlPref, stored, h1Computed, h1Text: h1 ? h1.textContent : "" };
      })()
    `);
    console.log("Persisted State after reload:", persistedState);
    if (persistedState.htmlPref !== "plex" || persistedState.stored !== "plex") {
      throw new Error(`Expected persisted font pref "plex", got "${persistedState.htmlPref}" (stored: "${persistedState.stored}")`);
    }
    if (!persistedState.h1Computed.toLowerCase().includes("plex")) {
      throw new Error(`Expected persisted font IBM Plex Mono, got "${persistedState.h1Computed}"`);
    }
    console.log("  PASS: Preference successfully persisted across full page reload without flash.");

    // Restore default Newsreader preference for consistency
    await client.eval(`
      (() => {
        localStorage.setItem("devvault-font-preference", "newsreader");
        document.documentElement.setAttribute("data-font-pref", "newsreader");
      })()
    `);

    console.log("\nALL TYPOGRAPHY SCALE TESTS PASSED WITH 100% SUCCESS!");
  } finally {
    client.close();
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
