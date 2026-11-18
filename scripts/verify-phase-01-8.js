const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9260;
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
  const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_qa_01_8_${Date.now()}`);
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
  console.log("      DevVault Phase 01.8: Precision Verification & Screenshot Engine           ");
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
    const ready = await client.waitFor(`Boolean(document.querySelector('.capture-bar'))`, 10000);
    if (!ready) throw new Error("Application failed to load or hydrate within 10s");
    await sleep(2000);
    console.log("  ✓ DevVault application loaded and hydrated.");

    // -------------------------------------------------------------------------
    // Audit 1: Zero Horizontal Overflow across 9 Viewports
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 1: Zero Horizontal Overflow Across 9 Specified Viewports ---");
    const viewports = [
      { name: "mobile-360", width: 360, height: 740 },
      { name: "mobile-375", width: 375, height: 812 },
      { name: "mobile-390", width: 390, height: 844 },
      { name: "mobile-430", width: 430, height: 932 },
      { name: "mobile-440", width: 440, height: 956 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "desktop-1024", width: 1024, height: 768 },
      { name: "desktop-1280", width: 1280, height: 800 },
      { name: "desktop-1440", width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await client.setViewport(vp.width, vp.height);
      await sleep(150);

      const metrics = await client.eval(`({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
        overflow: document.documentElement.scrollWidth > window.innerWidth
      })`);

      record(
        "Horizontal Overflow",
        `${vp.name} (${vp.width}x${vp.height})`,
        !metrics.overflow,
        `scrollWidth: ${metrics.scrollWidth}px, innerWidth: ${metrics.innerWidth}px`
      );
    }

    // -------------------------------------------------------------------------
    // Audit 2: Brand Identity & Emblem Verification
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 2: Vault Emblem & Brand Wordmark Verification ---");
    await client.setViewport(1440, 900);
    await sleep(200);

    const brandMetrics = await client.eval(`(() => {
      const emblem = document.querySelector('.vault-emblem');
      const dev = document.querySelector('.brand-dev');
      const vault = document.querySelector('.brand-vault');
      const hasSvg = Boolean(emblem && (emblem.tagName.toLowerCase() === 'svg' || emblem.querySelector('svg')));
      return {
        hasEmblem: Boolean(emblem),
        hasSvg,
        hasDev: Boolean(dev && dev.textContent === 'Dev'),
        hasVault: Boolean(vault && vault.textContent === 'Vault'),
      };
    })()`);

    record("Brand Identity", "Vault Emblem Rendered", brandMetrics.hasEmblem && brandMetrics.hasSvg, "Architectural chamfered vault SVG");
    record("Brand Identity", "Refined Wordmark (Dev + Vault)", brandMetrics.hasDev && brandMetrics.hasVault, "Dev + Vault Newsreader serif");

    // -------------------------------------------------------------------------
    // Audit 3: Source Platform Logos & Genuine Thumbnails
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 3: Source Platform Logos & Genuine Thumbnails ---");
    // Navigate to Library view to inspect all resources
    await client.eval(`(() => {
      const navButtons = Array.from(document.querySelectorAll('.sidebar nav button'));
      const libBtn = navButtons.find(b => b.textContent.includes('Library'));
      if (libBtn) libBtn.click();
    })()`);
    await sleep(800);

    const thumbnailMetrics = await client.eval(`(() => {
      const artCards = document.querySelectorAll('.library-card .resource-art');
      const thumbnails = document.querySelectorAll('.resource-art.has-thumbnail');
      const youtubeThumb = document.querySelector('img[src*="youtube.com/vi/SmE4Ow95En4"]');
      const githubThumb = document.querySelector('img[src*="opengraph.githubassets.com"]');
      const platformBadges = document.querySelectorAll('.resource-art-thumbnail-badge');
      return {
        artCardsCount: artCards.length,
        thumbnailCount: thumbnails.length,
        hasYouTubeThumb: Boolean(youtubeThumb),
        hasGitHubThumb: Boolean(githubThumb),
        badgeCount: platformBadges.length,
      };
    })()`);

    record("Source Thumbnails", "Library Resource Art Cards Rendered", thumbnailMetrics.artCardsCount > 0, `${thumbnailMetrics.artCardsCount} cards`);
    record("Source Thumbnails", "YouTube Dynamic Video Thumbnail", thumbnailMetrics.hasYouTubeThumb, "https://img.youtube.com/vi/SmE4Ow95En4/hqdefault.jpg");
    record("Source Thumbnails", "GitHub Dynamic Social Preview", thumbnailMetrics.hasGitHubThumb, "https://opengraph.githubassets.com/1/shadcn-ui/ui");
    record("Source Thumbnails", "Platform Floating Watermark Badges", thumbnailMetrics.badgeCount > 0, `${thumbnailMetrics.badgeCount} badges`);

    // Navigate back to Home
    await client.eval(`(() => {
      const navButtons = Array.from(document.querySelectorAll('.sidebar nav button'));
      const homeBtn = navButtons.find(b => b.textContent.includes('Home'));
      if (homeBtn) homeBtn.click();
    })()`);
    await sleep(500);

    // -------------------------------------------------------------------------
    // Audit 4: Mobile Paste-Link Button Alignment (Home Hero CaptureBar)
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 4: Mobile Paste-Link Action Button Geometry & Alignment ---");
    await client.setViewport(375, 812);
    await sleep(300);

    const mobileCaptureMetrics = await client.eval(`(() => {
      const captureBar = document.querySelector('.capture-bar');
      const action = captureBar ? captureBar.querySelector('i') : null;
      if (!captureBar || !action) return null;
      const aRect = action.getBoundingClientRect();
      const cRect = captureBar.getBoundingClientRect();
      const icon = action.querySelector('svg');
      const iRect = icon ? icon.getBoundingClientRect() : null;
      return {
        actionWidth: Math.round(aRect.width),
        actionHeight: Math.round(aRect.height),
        isCenteredX: iRect ? Math.abs((iRect.left + iRect.right) / 2 - (aRect.left + aRect.right) / 2) < 2 : false,
        isCenteredY: iRect ? Math.abs((iRect.top + iRect.bottom) / 2 - (aRect.top + aRect.bottom) / 2) < 2 : false,
        insideBar: aRect.right <= cRect.right + 2,
      };
    })()`);

    record(
      "Mobile Capture Action",
      "Square Min-44px Touch Target",
      mobileCaptureMetrics && mobileCaptureMetrics.actionWidth >= 44 && mobileCaptureMetrics.actionHeight >= 44,
      `width: ${mobileCaptureMetrics?.actionWidth}px, height: ${mobileCaptureMetrics?.actionHeight}px`
    );
    record(
      "Mobile Capture Action",
      "Centered Arrow Icon (X & Y)",
      mobileCaptureMetrics && mobileCaptureMetrics.isCenteredX && mobileCaptureMetrics.isCenteredY,
      "Icon mathematically centered in 44x44 action button"
    );

    // -------------------------------------------------------------------------
    // Audit 5: Responsive Curated Shelves Single-Column Layout
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 5: Curated Shelves Mobile Layout (No Horizontal Overflow) ---");
    const shelvesMetrics = await client.eval(`(() => {
      const cardsWrap = document.querySelector('.collection-cards');
      if (!cardsWrap) return null;
      const wrapRect = cardsWrap.getBoundingClientRect();
      const cards = cardsWrap.querySelectorAll('.collection-card');
      const cardRects = Array.from(cards).map(c => c.getBoundingClientRect());
      const allFit = cardRects.every(r => r.right <= wrapRect.right + 2);
      const isSingleCol = cards.length >= 2 ? cardRects[1].top > cardRects[0].top : true;
      return {
        cardCount: cards.length,
        allFit,
        isSingleCol,
        scrollWidth: cardsWrap.scrollWidth,
        clientWidth: cardsWrap.clientWidth,
      };
    })()`);

    record(
      "Curated Shelves",
      "Single Column on Mobile Viewports",
      shelvesMetrics && shelvesMetrics.isSingleCol,
      `${shelvesMetrics?.cardCount} cards stacked vertically`
    );
    record(
      "Curated Shelves",
      "No Horizontal Card Clipping",
      shelvesMetrics && shelvesMetrics.allFit && shelvesMetrics.scrollWidth <= shelvesMetrics.clientWidth + 2,
      `scrollWidth: ${shelvesMetrics?.scrollWidth}px, clientWidth: ${shelvesMetrics?.clientWidth}px`
    );

    // -------------------------------------------------------------------------
    // Audit 6: Quick Capture Category & Status Dropdown Interaction
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 6: Category and Status Dropdowns Interaction ---");
    await client.setViewport(1440, 900);
    await sleep(200);

    // Open Quick Capture Modal via .sidebar-capture
    await client.eval(`document.querySelector('.sidebar-capture')?.click()`);
    const modalOpen = await client.waitFor(`Boolean(document.querySelector('.capture-modal'))`, 3000);
    record("Quick Capture", "Modal Opened via Save a link", modalOpen);

    // Test Category Dropdown
    await client.eval(`document.querySelector('#category-select-trigger')?.click()`);
    await sleep(300);

    const catMenuMetrics = await client.eval(`(() => {
      const menu = document.querySelector('.capture-dropdown-menu');
      if (!menu) return { open: false };
      const items = Array.from(menu.querySelectorAll('.capture-dropdown-item')).map(i => i.textContent.trim());
      const rect = menu.getBoundingClientRect();
      return {
        open: true,
        itemCount: items.length,
        hasCybersecurity: items.some(t => t.includes('Cybersecurity')),
        hasDatabases: items.some(t => t.includes('Databases')),
        top: rect.top,
        height: rect.height,
      };
    })()`);

    record(
      "Category Dropdown",
      "Menu Opens on Click with Canonical Options",
      catMenuMetrics.open && catMenuMetrics.itemCount >= 9 && catMenuMetrics.hasCybersecurity,
      `${catMenuMetrics.itemCount} canonical categories rendered`
    );

    // Capture screenshot: dropdown-category-open.png
    await client.captureScreenshot("dropdown-category-open.png");

    // Select "Cybersecurity"
    await client.eval(`(() => {
      const items = Array.from(document.querySelectorAll('.capture-dropdown-item'));
      const cyber = items.find(i => i.textContent.includes('Cybersecurity'));
      if (cyber) cyber.click();
    })()`);
    await sleep(300);

    const catUpdated = await client.eval(`(() => {
      const menu = document.querySelector('.capture-dropdown-menu');
      const catTrigger = document.querySelector('#category-select-trigger');
      return {
        menuClosed: !menu,
        triggerText: catTrigger ? catTrigger.textContent.trim() : '',
      };
    })()`);

    record(
      "Category Dropdown",
      "Option Selection Updates State & Closes Menu",
      catUpdated.menuClosed && catUpdated.triggerText.includes("Cybersecurity"),
      `Updated trigger: "${catUpdated.triggerText}"`
    );

    // Test Status Dropdown
    await client.eval(`document.querySelector('#status-select-trigger')?.click()`);
    await sleep(300);

    const statusMenuMetrics = await client.eval(`(() => {
      const menu = document.querySelector('.capture-dropdown-menu');
      if (!menu) return { open: false };
      const items = Array.from(menu.querySelectorAll('.capture-dropdown-item')).map(i => i.textContent.trim());
      return {
        open: true,
        itemCount: items.length,
        hasExploring: items.some(t => t.includes('Exploring')),
        hasCompleted: items.some(t => t.includes('Completed')),
      };
    })()`);

    record(
      "Status Dropdown",
      "Menu Opens on Click with Canonical Statuses",
      statusMenuMetrics.open && statusMenuMetrics.itemCount >= 3 && statusMenuMetrics.hasExploring,
      `${statusMenuMetrics.itemCount} canonical statuses rendered`
    );

    // Capture screenshot: dropdown-status-open.png
    await client.captureScreenshot("dropdown-status-open.png");

    // Select "Exploring"
    await client.eval(`(() => {
      const items = Array.from(document.querySelectorAll('.capture-dropdown-item'));
      const exploring = items.find(i => i.textContent.includes('Exploring'));
      if (exploring) exploring.click();
    })()`);
    await sleep(300);

    const statusUpdated = await client.eval(`(() => {
      const menu = document.querySelector('.capture-dropdown-menu');
      const statusTrigger = document.querySelector('#status-select-trigger');
      return {
        menuClosed: !menu,
        triggerText: statusTrigger ? statusTrigger.textContent.trim() : '',
      };
    })()`);

    record(
      "Status Dropdown",
      "Option Selection Updates State & Closes Menu",
      statusUpdated.menuClosed && statusUpdated.triggerText.includes("Exploring"),
      `Updated trigger: "${statusUpdated.triggerText}"`
    );

    // Capture screenshot: desktop-quick-capture.png
    await client.captureScreenshot("desktop-quick-capture.png");

    // Close modal
    await client.eval(`document.querySelector('.capture-head button')?.click()`);
    await sleep(300);

    // -------------------------------------------------------------------------
    // Audit 7: Generate All Required 9 Screenshots
    // -------------------------------------------------------------------------
    console.log("\n--- Audit 7: Capturing Complete 9-Screenshot Acceptance Suite ---");

    // 1. desktop-home.png (1440x900)
    await client.setViewport(1440, 900);
    await sleep(300);
    await client.captureScreenshot("desktop-home.png");

    // 2. mobile-home.png (375x812)
    await client.setViewport(375, 812);
    await sleep(300);
    await client.captureScreenshot("mobile-home.png");

    // 3. mobile-curated-shelves.png (375x812 scrolled to shelves)
    await client.eval(`(() => {
      const shelves = document.querySelector('.curated-shelves');
      if (shelves) shelves.scrollIntoView({ behavior: 'instant', block: 'center' });
    })()`);
    await sleep(300);
    await client.captureScreenshot("mobile-curated-shelves.png");

    // Reset scroll
    await client.eval(`window.scrollTo(0, 0)`);
    await sleep(200);

    // 4. mobile-quick-capture.png (375x812)
    await client.eval(`document.querySelector('.mobile-capture')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.capture-modal'))`, 3000);
    await sleep(300);
    await client.captureScreenshot("mobile-quick-capture.png");

    // Close modal
    await client.eval(`document.querySelector('.capture-head button')?.click()`);
    await sleep(300);

    // 8. light-theme.png (1440x900)
    await client.setViewport(1440, 900);
    await client.eval(`(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    })()`);
    await sleep(300);
    await client.captureScreenshot("light-theme.png");

    // 9. dark-theme.png (1440x900)
    await client.setViewport(1440, 900);
    await client.eval(`(() => {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    })()`);
    await sleep(300);
    await client.captureScreenshot("dark-theme.png");

    // Reset to light theme
    await client.eval(`(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    })()`);
    await sleep(100);

    console.log("\n================================================================================");
    const passCount = testResults.filter((r) => r.passed).length;
    const failCount = testResults.filter((r) => !r.passed).length;
    console.log(`Phase 01.8 Verification Complete: ${passCount} PASSED, ${failCount} FAILED out of ${testResults.length} checks`);
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
