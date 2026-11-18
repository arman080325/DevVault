const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9230;
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
  const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_qa_fast_${Date.now()}`);
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
  console.log("      DevVault Phase 01.7: Comprehensive Frontend Verification Engine           ");
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

    // Load DevVault ONCE and wait for complete hydration
    console.log("\n[Loading DevVault Application at http://localhost:3000]");
    await client.send("Page.navigate", { url: "http://localhost:3000" });
    const ready = await client.waitFor(`Boolean(document.querySelector('.capture-bar'))`, 10000);
    if (!ready) throw new Error("Application failed to load or hydrate in 10s");
    await sleep(2000);
    console.log("  ✓ Application loaded and fully hydrated.");

    // =========================================================================
    // Flow G: Zero Horizontal Overflow Audit Across All 8 Viewports
    // =========================================================================
    console.log("\n--- Audit 1: Zero Horizontal Page Overflow Across 8 Viewports ---");
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
        "Overflow Audit",
        `${vp.name} (${vp.width}x${vp.height})`,
        !metrics.overflow,
        `scrollWidth: ${metrics.scrollWidth}px, innerWidth: ${metrics.innerWidth}px`
      );
    }

    // =========================================================================
    // Flow A: Mobile Quick Capture on 360, 375, 390, 440 Viewports
    // =========================================================================
    console.log("\n--- Flow A: Mobile Quick Capture Bottom Sheet & Duplicate Detection ---");
    const mobileViewports = [
      { name: "360x740", width: 360, height: 740 },
      { name: "375x812", width: 375, height: 812 },
      { name: "390x844", width: 390, height: 844 },
      { name: "440x956", width: 440, height: 956 },
    ];

    for (const mv of mobileViewports) {
      await client.setViewport(mv.width, mv.height);
      await sleep(200);

      // Open quick capture via hero capture-bar or mobile-capture button
      await client.eval(`document.querySelector('.capture-bar, .mobile-capture')?.click()`);
      await client.waitFor(`Boolean(document.querySelector('.capture-modal'))`, 3000);
      await sleep(200);

      const modalAudit = await client.eval(`(() => {
        const modal = document.querySelector('.capture-modal');
        const header = document.querySelector('.capture-sheet-header');
        const body = document.querySelector('.capture-sheet-body');
        const footer = document.querySelector('.capture-sheet-footer');
        const handle = document.querySelector('.sheet-handle');
        const saveBtn = document.querySelector('.capture-actions .save');

        return {
          exists: Boolean(modal),
          hasHeader: Boolean(header),
          hasBody: Boolean(body),
          hasFooter: Boolean(footer),
          hasHandle: Boolean(handle),
          saveBtnVisible: Boolean(saveBtn && saveBtn.offsetParent !== null),
          overflowX: modal ? modal.scrollWidth > window.innerWidth : false,
        };
      })()`);

      record(
        "Flow A: Mobile Quick Capture",
        `Bottom Sheet Structure (${mv.name})`,
        modalAudit.exists && modalAudit.hasHeader && modalAudit.hasBody && modalAudit.hasFooter && modalAudit.saveBtnVisible && !modalAudit.overflowX,
        `header: ${modalAudit.hasHeader}, body: ${modalAudit.hasBody}, footer: ${modalAudit.hasFooter}, saveVisible: ${modalAudit.saveBtnVisible}`
      );

      // Test duplicate URL warning
      await client.eval(`(() => {
        const input = document.querySelector('.url-field input');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'https://motion.dev/docs/react-layout-animations');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`);
      await sleep(200);

      const duplicateWarning = await client.eval(`(() => {
        const warn = document.querySelector('.duplicate-warning');
        return { exists: Boolean(warn), text: warn ? warn.innerText : '' };
      })()`);

      record(
        "Flow A: Mobile Quick Capture",
        `Duplicate URL Warning (${mv.name})`,
        duplicateWarning.exists,
        duplicateWarning.text
      );

      // Dynamic Title Preview with a new URL
      await client.eval(`(() => {
        const input = document.querySelector('.url-field input');
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          setter.call(input, 'https://github.com/torvalds/linux');
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()`);
      await sleep(250);

      const dynamicTitle = await client.eval(`document.querySelector('.capture-preview h3')?.innerText`);
      record(
        "Flow A: Mobile Quick Capture",
        `Dynamic URL Metadata Detection (${mv.name})`,
        Boolean(dynamicTitle && dynamicTitle.includes("torvalds/linux")),
        dynamicTitle
      );

      // Capture screenshot
      await client.captureScreenshot(`modal-mobile-${mv.name.split('x')[0]}.png`);

      // Close modal with backdrop
      await client.eval(`document.querySelector('.capture-backdrop')?.click()`);
      await client.waitFor(`!document.querySelector('.capture-modal')`, 2000);
      const isClosed = await client.eval(`!document.querySelector('.capture-modal')`);
      record("Flow A: Mobile Quick Capture", `Backdrop Dismissal (${mv.name})`, isClosed);
    }

    // =========================================================================
    // Flow B: Library Search, Clear, Filters, Sort & View Mode Toggle
    // =========================================================================
    console.log("\n--- Flow B: Library Search, Filtering, Sorting & View Toggle ---");
    await client.setViewport(1440, 900);
    // Navigate client-side to Library
    await client.eval(`(() => {
      const libBtn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Library'));
      libBtn?.click();
    })()`);
    await client.waitFor(`Boolean(document.querySelector('.library-search input'))`, 3000);
    await sleep(200);

    // Search query test
    await client.eval(`(() => {
      const input = document.querySelector('.library-search input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'motion');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    })()`);
    await sleep(200);

    const searchCount = await client.eval(`document.querySelectorAll('.library-card, .recent-row').length`);
    record("Flow B: Library", "Search Filter (query='motion')", searchCount > 0, `found ${searchCount} items`);

    // Search clear button
    await client.eval(`document.querySelector('.library-search button')?.click()`);
    await sleep(200);
    const clearCount = await client.eval(`document.querySelectorAll('.library-card, .recent-row').length`);
    record("Flow B: Library", "Search Clear Button", clearCount >= 5, `restored ${clearCount} items`);

    // Source filter test: GitHub
    await client.eval(`(() => {
      const btn = Array.from(document.querySelectorAll('.filters button')).find(b => b.innerText.includes('GitHub'));
      btn?.click();
    })()`);
    await client.waitFor(`document.querySelectorAll('.library-card, .recent-row').length === 1`, 2000);
    const githubOnly = await client.eval(`document.querySelectorAll('.library-card, .recent-row').length === 1`);
    record("Flow B: Library", "Source Filter (GitHub)", githubOnly, "isolated 1 GitHub resource");

    // "More" Filter Menu: Instagram
    await client.eval(`document.querySelector('.more-filter')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.dropdown-popover'))`, 2000);
    const moreOpened = await client.eval(`Boolean(document.querySelector('.dropdown-popover'))`);
    record("Flow B: Library", "More Filter Popover Open", moreOpened);

    await client.eval(`(() => {
      const igBtn = Array.from(document.querySelectorAll('.dropdown-popover button')).find(b => b.innerText.includes('Instagram'));
      igBtn?.click();
    })()`);
    await client.waitFor(`document.querySelectorAll('.library-card, .recent-row').length === 1`, 2000);
    const igFiltered = await client.eval(`document.querySelectorAll('.library-card, .recent-row').length === 1`);
    record("Flow B: Library", "Source Filter (More -> Instagram)", igFiltered, "isolated 1 Instagram resource");

    // Reset Filter to All
    await client.eval(`(() => {
      const allBtn = Array.from(document.querySelectorAll('.filters button')).find(b => b.innerText.trim() === 'All');
      allBtn?.click();
    })()`);
    await client.waitFor(`document.querySelectorAll('.library-card, .recent-row').length >= 5`, 2000);

    // Sort Dropdown test
    await client.eval(`document.querySelector('.sort-btn')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.sort-view .dropdown-popover'))`, 2000);
    const sortMenuOpen = await client.eval(`Boolean(document.querySelector('.sort-view .dropdown-popover'))`);
    record("Flow B: Library", "Sort Order Dropdown Open", sortMenuOpen);

    await client.eval(`(() => {
      const titleSort = Array.from(document.querySelectorAll('.sort-view .dropdown-popover button')).find(b => b.innerText.includes('Title'));
      titleSort?.click();
    })()`);
    await sleep(200);

    const isAlphabetical = await client.eval(`(() => {
      const titles = Array.from(document.querySelectorAll('.library-card h3')).map(h => h.innerText.toLowerCase());
      for (let i = 1; i < titles.length; i++) {
        if (titles[i].localeCompare(titles[i - 1]) < 0) return false;
      }
      return titles.length > 1;
    })()`);
    record("Flow B: Library", "Sort by Title (A-Z)", isAlphabetical);

    // View Mode Toggle (Grid to List)
    await client.eval(`document.querySelector('.sort-view div[role="group"] button:nth-child(2)')?.click()`);
    await sleep(200);
    const isList = await client.eval(`Boolean(document.querySelector('.library-results.list'))`);
    record("Flow B: Library", "Toggle List View", isList);

    await client.eval(`document.querySelector('.sort-view div[role="group"] button:nth-child(1)')?.click()`);
    await sleep(200);
    const isGrid = await client.eval(`Boolean(document.querySelector('.library-results.grid'))`);
    record("Flow B: Library", "Toggle Grid View", isGrid);

    // Bookmark Toggle & Visual Feedback
    const bookmarkBefore = await client.eval(`Boolean(document.querySelector('.library-card:first-child .card-foot button.active'))`);
    await client.eval(`document.querySelector('.library-card:first-child .card-foot button')?.click()`);
    await sleep(350);
    const bookmarkAfter = await client.eval(`Boolean(document.querySelector('.library-card:first-child .card-foot button.active'))`);
    record("Flow B: Library", "Card Bookmark Active Styling Feedback", bookmarkBefore !== bookmarkAfter);

    // =========================================================================
    // Flow C: Resource Detail Drawer & Note Editing
    // =========================================================================
    console.log("\n--- Flow C: Resource Detail Drawer, Notes Editor & Mark Explored ---");
    // Click card to open drawer
    await client.eval(`document.querySelector('.library-card:first-child .card-art-button')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.detail-panel'))`, 3000);
    await sleep(350);

    const drawerOpen = await client.eval(`Boolean(document.querySelector('.detail-panel'))`);
    record("Flow C: Detail Drawer", "Open Resource Detail Drawer", drawerOpen);

    // Bookmark toggle inside drawer header
    const drawerBookmarkBefore = await client.eval(`Boolean(document.querySelector('.detail-head button[aria-label*="bookmark" i].active'))`);
    await client.eval(`document.querySelector('.detail-head button[aria-label*="bookmark" i]')?.click()`);
    await sleep(350);
    const drawerBookmarkAfter = await client.eval(`Boolean(document.querySelector('.detail-head button[aria-label*="bookmark" i].active'))`);
    record("Flow C: Detail Drawer", "Drawer Bookmark Active State Synchronized", drawerBookmarkBefore !== drawerBookmarkAfter);

    // Notes editing
    await client.eval(`(() => {
      const editBtn = Array.from(document.querySelectorAll('.detail-section button')).find(b => b.innerText.includes('Edit note'));
      editBtn?.click();
    })()`);
    await client.waitFor(`Boolean(document.querySelector('.detail-notes-edit textarea'))`, 2000);

    const editModeActive = await client.eval(`Boolean(document.querySelector('.detail-notes-edit textarea'))`);
    record("Flow C: Detail Drawer", "Notes Edit Mode Activated", editModeActive);

    const testNoteText = "Verified in Phase 01.7 QA Audit: Smooth layout transitions in React.";
    await client.eval(`(() => {
      const textarea = document.querySelector('.detail-notes-edit textarea');
      if (textarea) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, '${testNoteText}');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.detail-notes-actions .save-note')?.click();
      }
    })()`);
    await sleep(300);

    const updatedNote = await client.eval(`document.querySelector('.detail-section p')?.innerText`);
    record("Flow C: Detail Drawer", "Notes Saved & Displayed Reactively", updatedNote === testNoteText);

    // Mark Explored toggle
    const statusTextBefore = await client.eval(`document.querySelector('.detail-actions button:last-child')?.innerText`);
    await client.eval(`document.querySelector('.detail-actions button:last-child')?.click()`);
    await sleep(200);
    const statusTextAfter = await client.eval(`document.querySelector('.detail-actions button:last-child')?.innerText`);
    record("Flow C: Detail Drawer", "Toggle 'Mark explored' to Completed", statusTextBefore !== statusTextAfter, `${statusTextBefore} -> ${statusTextAfter}`);

    // Close drawer via close button
    await client.eval(`document.querySelector('.detail-head button[aria-label="Close"]')?.click()`);
    await client.waitFor(`!document.querySelector('.detail-panel')`, 2000);
    const drawerClosed = await client.eval(`!document.querySelector('.detail-panel')`);
    record("Flow C: Detail Drawer", "Close Detail Drawer", drawerClosed);

    // =========================================================================
    // Flow D: Collections Navigation & Library Filter
    // =========================================================================
    console.log("\n--- Flow D: Collections Navigation & Cross-View Filtering ---");
    await client.eval(`(() => {
      const colBtn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Collections'));
      colBtn?.click();
    })()`);
    await client.waitFor(`Boolean(document.querySelector('.collection-large'))`, 3000);
    await sleep(200);

    await client.eval(`document.querySelector('.collection-large:first-child')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.library-search input'))`, 3000);
    await sleep(200);

    const filteredByCollection = await client.eval(`(() => {
      const searchVal = document.querySelector('.library-search input')?.value;
      const onLibraryPage = Boolean(document.querySelector('.library-page'));
      return { onLibraryPage, searchVal };
    })()`);
    record(
      "Flow D: Collections",
      "Collection Card Navigates & Filters Library",
      filteredByCollection.onLibraryPage && Boolean(filteredByCollection.searchVal),
      `search query set to: "${filteredByCollection.searchVal}"`
    );

    // =========================================================================
    // Flow E: Settings Interactions (Profile, Appearance, Defaults, Export)
    // =========================================================================
    console.log("\n--- Flow E: Settings Interactions & Vault Management ---");
    await client.eval(`(() => {
      const setBtn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Settings'));
      setBtn?.click();
    })()`);
    await client.waitFor(`Boolean(document.querySelector('#profile'))`, 3000);
    await sleep(200);

    // Theme toggle
    await client.eval(`document.querySelector('#appearance button[role="switch"]')?.click()`);
    await sleep(200);
    const isDarkTheme = await client.eval(`document.documentElement.classList.contains('dark')`);
    record("Flow E: Settings", "Toggle Dark Theme", isDarkTheme);

    await client.eval(`document.querySelector('#appearance button[role="switch"]')?.click()`);
    await sleep(200);
    const isLightTheme = await client.eval(`document.documentElement.classList.contains('light') || !document.documentElement.classList.contains('dark')`);
    record("Flow E: Settings", "Restore Light Theme", isLightTheme);

    // Profile Edit
    await client.eval(`document.querySelector('.profile-setting button')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.profile-setting input'))`, 2000);

    const profileFormOpen = await client.eval(`Boolean(document.querySelector('.profile-setting form, .profile-setting input'))`);
    record("Flow E: Settings", "Profile Edit Mode Activated", profileFormOpen);

    await client.eval(`(() => {
      const input = document.querySelector('.profile-setting input');
      if (input) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'DevVault Architect');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('.profile-setting button[type="submit"]')?.click();
      }
    })()`);
    await sleep(250);
    const profileSaved = await client.eval(`document.querySelector('.profile-setting b')?.innerText`);
    record("Flow E: Settings", "Profile Name Saved Reactively", profileSaved === "DevVault Architect");

    // Default Status cycle
    await client.eval(`document.querySelector('.select-button')?.click()`);
    await sleep(200);
    const statusCycled = await client.eval(`document.querySelector('.select-button')?.innerText`);
    record("Flow E: Settings", "Default Status Cycled", statusCycled.includes("Exploring"));

    // Data Export
    await client.eval(`document.querySelector('.outline-button')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('.save-toast'))`, 2000);
    const exportToast = await client.eval(`document.querySelector('.save-toast b')?.innerText`);
    record("Flow E: Settings", "Vault Export Handler Triggered", Boolean(exportToast));

    // =========================================================================
    // Flow F: Keyboard Shortcuts (C, Escape, Ctrl+K)
    // =========================================================================
    console.log("\n--- Flow F: Keyboard Shortcuts ---");
    // Return to Home
    await client.eval(`(() => {
      const homeBtn = Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('Home'));
      homeBtn?.click();
    })()`);
    await client.waitFor(`Boolean(document.querySelector('.capture-bar'))`, 3000);
    await sleep(200);

    // Shortcut: C to open Quick Capture
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", text: "c", key: "c" });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", text: "c", key: "c" });
    await client.waitFor(`Boolean(document.querySelector('.capture-modal'))`, 2000);
    const modalOpenedByKbd = await client.eval(`Boolean(document.querySelector('.capture-modal'))`);
    record("Flow F: Keyboard Shortcuts", "Key 'C' Opens Quick Capture Modal", modalOpenedByKbd);

    // Shortcut: Escape to close Quick Capture
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape" });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape" });
    await client.waitFor(`!document.querySelector('.capture-modal')`, 2000);
    const modalClosedByEsc = await client.eval(`!document.querySelector('.capture-modal')`);
    record("Flow F: Keyboard Shortcuts", "Key 'Escape' Closes Quick Capture Modal", modalClosedByEsc);

    // Shortcut: Ctrl+K to focus search in Library
    await client.send("Input.dispatchKeyEvent", { type: "keyDown", key: "k", modifiers: 2 });
    await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "k", modifiers: 2 });
    await client.waitFor(`Boolean(document.querySelector('.library-search input'))`, 3000);
    await sleep(300);
    const searchFocused = await client.eval(`document.activeElement === document.querySelector('.library-search input')`);
    record("Flow F: Keyboard Shortcuts", "Key 'Ctrl+K' Navigates & Focuses Search", searchFocused);

    // =========================================================================
    // Final Screenshot Suite
    // =========================================================================
    console.log("\n--- Generating Fresh Phase 01.7 Verification Screenshots ---");
    const screenshotTargets = [
      { name: "mobile-360.png", w: 360, h: 740, url: "http://localhost:3000" },
      { name: "mobile-375.png", w: 375, h: 812, url: "http://localhost:3000" },
      { name: "mobile-390.png", w: 390, h: 844, url: "http://localhost:3000" },
      { name: "mobile-440.png", w: 440, h: 956, url: "http://localhost:3000" },
      { name: "tablet-768.png", w: 768, h: 1024, url: "http://localhost:3000" },
      { name: "desktop-1440.png", w: 1440, h: 900, url: "http://localhost:3000" },
      { name: "desktop-library.png", w: 1440, h: 900, url: "http://localhost:3000?tab=library" },
      { name: "desktop-explore.png", w: 1440, h: 900, url: "http://localhost:3000?tab=explore" },
      { name: "desktop-collections.png", w: 1440, h: 900, url: "http://localhost:3000?tab=collections" },
      { name: "desktop-settings.png", w: 1440, h: 900, url: "http://localhost:3000?tab=settings" },
      { name: "desktop-dark-1440.png", w: 1440, h: 900, url: "http://localhost:3000?theme=dark" },
      { name: "modal-desktop.png", w: 1440, h: 900, url: "http://localhost:3000?modal=capture" },
    ];

    for (const st of screenshotTargets) {
      await client.setViewport(st.w, st.h);
      await client.send("Page.navigate", { url: st.url });
      await sleep(700);
      await client.captureScreenshot(st.name);
      console.log(`  ✓ Captured ${st.name} (${st.w}x${st.h})`);
    }

    client.close();
  } finally {
    try {
      proc.kill();
    } catch {}
    await sleep(400);
    try {
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
      }
    } catch {}
  }

  // Summary
  console.log("\n================================================================================");
  console.log("                        FINAL VERIFICATION SUMMARY                              ");
  console.log("================================================================================");
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total Verification Checks : ${total}`);
  console.log(`Passed Checks             : ${passed}`);
  console.log(`Failed Checks             : ${failed}`);
  console.log(`Overall Pass Rate         : ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.error("\nFailed Checks:");
    testResults
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`  - [${r.suite}] ${r.testName}: ${r.details}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ALL AUDIT CHECKS & FLOWS PASSED WITH 100% SUCCESS!");
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL SUITE ERROR:", err);
  process.exit(1);
});
