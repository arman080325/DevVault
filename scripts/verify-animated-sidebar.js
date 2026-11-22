const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9255;
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
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(filePath, Buffer.from(res.data, "base64"));
    console.log(`[Screenshot] Saved: ${path.basename(filePath)}`);
  }

  async setViewport(width, height) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("=== DevVault Final Animated Sidebar & Responsive Breakpoint Suite ===");

  const userDataDir = path.join(process.env.TEMP || "C:\\temp", "chrome_sidebar_audit_" + Date.now());
  const chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "http://localhost:3000",
  ]);

  await sleep(2500);

  try {
    const pages = await getJson(`http://127.0.0.1:${PORT}/json`);
    const page = pages.find((p) => p.type === "page") || pages[0];

    const cdp = new CDPClient(page.webSocketDebuggerUrl);
    await cdp.connect();
    console.log("[CDP] Connected successfully.");

    await cdp.send("Page.enable");
    await cdp.send("DOM.enable");
    await cdp.send("Runtime.enable");

    // Wait for Next.js app to mount
    await sleep(2000);

    // =========================================================================
    // 1. Comprehensive Breakpoint Matrix Audit
    // Required: 1440, 1280, 1024, 800, 768, 767, 761, 760, 430, 390, 360
    // =========================================================================
    console.log("\n--- Section 1: Responsive Breakpoint Matrix Audit ---");
    const testWidths = [1440, 1280, 1024, 800, 768, 767, 761, 760, 430, 390, 360];
    const breakpointResults = [];

    for (const width of testWidths) {
      await cdp.setViewport(width, 800);
      await sleep(350);

      const audit = await cdp.eval(`
        (() => {
          const sidebar = document.querySelector('.sidebar-desktop-container');
          const menuBtn = document.querySelector('.mobile-menu-trigger');
          const mobileNav = document.querySelector('.mobile-nav');
          const isDesktop = sidebar ? getComputedStyle(sidebar).display !== 'none' : false;
          const isMobileTrigger = menuBtn ? getComputedStyle(menuBtn).display !== 'none' : false;
          const isMobileNav = mobileNav ? getComputedStyle(mobileNav).display !== 'none' : false;
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          const hasOverflow = scrollW > innerW;

          return {
            width: innerW,
            isDesktop,
            isMobileTrigger,
            isMobileNav,
            hasOverflow,
            scrollW,
            status: (isDesktop && !isMobileTrigger) || (!isDesktop && isMobileTrigger) ? 'OK' : 'MISMATCH',
          };
        })()
      `);

      breakpointResults.push(audit);
      console.log(`[Breakpoint ${width}px] DesktopSidebar: ${audit.isDesktop ? 'VISIBLE' : 'HIDDEN'} | MobileMenuTrigger: ${audit.isMobileTrigger ? 'VISIBLE' : 'HIDDEN'} | Overflow: ${audit.hasOverflow ? 'YES (FAIL)' : 'NONE (PASS)'} -> ${audit.status}`);
    }

    const allBreakpointsValid = breakpointResults.every(r => r.status === 'OK' && !r.hasOverflow);
    console.log(`[Breakpoint Consistency Verdict]: ${allBreakpointsValid ? '100% PERFECT (PASS)' : 'FAILED'}`);

    // =========================================================================
    // 2. Desktop Hover Expansion, Collapse & Anti-Flicker Debounce
    // =========================================================================
    console.log("\n--- Section 2: Desktop Hover Expansion & Collapse ---");
    await cdp.setViewport(1440, 900);
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 800, y: 400 });
    await sleep(600);

    const initialCollapsed = await cdp.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar-desktop-container');
        if (!sidebar) return null;
        return {
          width: Math.round(sidebar.getBoundingClientRect().width),
          hasWordmark: Boolean(sidebar.querySelector('.brand-wordmark')),
          hasCompactCapture: Boolean(sidebar.querySelector('.sidebar-capture-compact')),
        };
      })()
    `);
    console.log("[Desktop Initial Collapsed]", initialCollapsed);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "sidebar-desktop-collapsed-1440px.png"));

    // Trigger hover expansion
    console.log("Hovering cursor into sidebar...");
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 36, y: 150 });
    await cdp.eval(`
      (() => {
        const s = document.querySelector('.sidebar-desktop-container');
        if (s) {
          s.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
          s.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      })()
    `);
    await sleep(600); // 0.25s animation

    const expandedState = await cdp.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar-desktop-container');
        if (!sidebar) return null;
        const appCol = document.querySelector('.app-column');
        return {
          width: Math.round(sidebar.getBoundingClientRect().width),
          appColumnLeft: appCol ? Math.round(appCol.getBoundingClientRect().left) : null,
          hasWordmark: Boolean(sidebar.querySelector('.brand-wordmark')),
          hasFullCapture: Boolean(sidebar.querySelector('.sidebar-capture')),
          hasCollections: Boolean(sidebar.querySelector('.sidebar-collection')),
          labels: Array.from(sidebar.querySelectorAll('.sidebar-nav-label')).map(el => el.textContent.trim()),
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()
    `);
    console.log("[Desktop Hover Expanded]", expandedState);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "sidebar-desktop-expanded-1440px.png"));

    // Move cursor out to test collapse
    console.log("Moving cursor out of sidebar (testing 150ms debounce)...");
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 800, y: 400 });
    await cdp.eval(`
      (() => {
        const s = document.querySelector('.sidebar-desktop-container');
        if (s) {
          s.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }));
          s.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
        }
      })()
    `);
    await sleep(600); // 150ms debounce + 0.25s animation

    const reCollapsedState = await cdp.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar-desktop-container');
        return sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null;
      })()
    `);
    console.log("[Desktop Smoothly Re-collapsed]", `${reCollapsedState}px`);

    // =========================================================================
    // 3. Keyboard Navigation & Accessibility Focus
    // =========================================================================
    console.log("\n--- Section 3: Keyboard Focus Expansion & Accessibility ---");
    // Trigger focus on a sidebar button
    await cdp.eval(`
      (() => {
        const homeBtn = document.querySelector('.sidebar-desktop-container button[aria-label="Home"]');
        if (homeBtn) homeBtn.focus();
      })()
    `);
    await sleep(400);

    const keyboardExpanded = await cdp.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar-desktop-container');
        return {
          dataExpanded: sidebar ? sidebar.getAttribute('data-expanded') : null,
          width: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
          focusedElement: document.activeElement ? document.activeElement.getAttribute('aria-label') : null,
        };
      })()
    `);
    console.log("[Keyboard Focus Expansion]", keyboardExpanded);

    // Blur focus outside sidebar
    await cdp.eval(`
      (() => {
        const searchInput = document.querySelector('.global-search');
        if (searchInput) searchInput.focus();
      })()
    `);
    await sleep(400);

    const keyboardCollapsed = await cdp.eval(`
      (() => {
        const sidebar = document.querySelector('.sidebar-desktop-container');
        return {
          dataExpanded: sidebar ? sidebar.getAttribute('data-expanded') : null,
          width: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
        };
      })()
    `);
    console.log("[Keyboard Blur Collapse]", keyboardCollapsed);

    // =========================================================================
    // 4. Client-side Navigation & Collection Shortcut
    // =========================================================================
    console.log("\n--- Section 4: Client-side Navigation & Collections ---");
    // Click Library
    await cdp.eval(`
      (() => {
        const libBtn = document.querySelector('.sidebar-desktop-container button[aria-label="Library"]');
        if (libBtn) libBtn.click();
      })()
    `);
    await sleep(500);
    const libCheck = await cdp.eval(`
      (() => {
        const active = document.querySelector('.sidebar-desktop-container .sidebar-nav-button.active');
        return { activeLabel: active ? active.getAttribute('aria-label') : null };
      })()
    `);
    console.log("[Navigated to Library]", libCheck);

    // Click Explore
    await cdp.eval(`
      (() => {
        const expBtn = document.querySelector('.sidebar-desktop-container button[aria-label="Explore"]');
        if (expBtn) expBtn.click();
      })()
    `);
    await sleep(500);
    const expCheck = await cdp.eval(`
      (() => {
        const active = document.querySelector('.sidebar-desktop-container .sidebar-nav-button.active');
        return { activeLabel: active ? active.getAttribute('aria-label') : null };
      })()
    `);
    console.log("[Navigated to Explore]", expCheck);

    // Return to Home
    await cdp.eval(`
      (() => {
        const homeBtn = document.querySelector('.sidebar-desktop-container button[aria-label="Home"]');
        if (homeBtn) homeBtn.click();
      })()
    `);
    await sleep(500);

    // Quick Capture action
    await cdp.eval(`
      (() => {
        const save = document.querySelector('.sidebar-desktop-container .sidebar-capture-compact, .sidebar-desktop-container .sidebar-capture');
        if (save) save.click();
      })()
    `);
    await sleep(400);
    const modalCheck = await cdp.eval(`Boolean(document.querySelector('[role="dialog"], .quick-capture-modal'))`);
    console.log("[Quick Capture Modal Opened]", modalCheck ? "PASS" : "FAIL");
    await cdp.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await sleep(400);

    // =========================================================================
    // 5. Mobile Drawer Lifecycle (Trigger, Backdrop, Escape, Scroll Lock)
    // =========================================================================
    console.log("\n--- Section 5: Mobile Drawer Lifecycle ---");
    await cdp.setViewport(390, 844);
    await sleep(400);

    // Open via hamburger trigger
    await cdp.eval(`
      (() => {
        const trigger = document.querySelector('.mobile-menu-trigger');
        if (trigger) trigger.click();
      })()
    `);
    await sleep(500);

    const drawerOpen = await cdp.eval(`
      (() => {
        const drawer = document.querySelector('[role="dialog"][aria-label="Mobile Navigation"]');
        return {
          drawerPresent: Boolean(drawer),
          bodyOverflow: document.body.style.overflow,
          hasCloseButton: Boolean(document.querySelector('[aria-label="Close menu"]')),
        };
      })()
    `);
    console.log("[Mobile Drawer Open & Scroll Lock]", drawerOpen);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "sidebar-mobile-drawer-390px.png"));

    // Close via Escape
    await cdp.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
    await sleep(500);

    const drawerClosed = await cdp.eval(`
      (() => {
        const drawer = document.querySelector('[role="dialog"][aria-label="Mobile Navigation"]');
        return {
          drawerClosed: !drawer,
          bodyOverflowRestored: document.body.style.overflow === '' || document.body.style.overflow === 'unset',
        };
      })()
    `);
    console.log("[Mobile Drawer Closed & Scroll Restored]", drawerClosed);

    // =========================================================================
    // 6. Theme Switching & Lightfall Compatibility
    // =========================================================================
    console.log("\n--- Section 6: Theme Switching & Lightfall WebGL ---");
    await cdp.setViewport(1440, 900);
    await sleep(400);

    // Toggle to Dark Theme
    await cdp.eval(`
      (() => {
        const themeBtn = document.querySelector('.top-icon-btn[aria-label*="theme"], .top-icon-btn[title*="theme"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(1500);

    // Hover sidebar in dark mode
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 36, y: 150 });
    await cdp.eval(`
      (() => {
        const s = document.querySelector('.sidebar-desktop-container');
        if (s) {
          s.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }));
          s.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        }
      })()
    `);
    await sleep(600);

    const darkAudit = await cdp.eval(`
      (() => {
        const canvas = document.querySelector('.devvault-lightfall-bg canvas');
        const overlay = document.querySelector('.devvault-lightfall-overlay');
        const sidebar = document.querySelector('.sidebar-desktop-container');
        return {
          isDark: document.documentElement.classList.contains('dark'),
          canvasActive: Boolean(canvas),
          overlayActive: Boolean(overlay),
          sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
          sidebarWidth: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : null,
        };
      })()
    `);
    console.log("[Dark Theme & Lightfall]", darkAudit);
    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "sidebar-dark-expanded-1440px.png"));

    // Toggle back to Light Theme
    await cdp.eval(`
      (() => {
        const themeBtn = document.querySelector('.top-icon-btn[aria-label*="theme"], .top-icon-btn[title*="theme"]');
        if (themeBtn) themeBtn.click();
      })()
    `);
    await sleep(1000);

    const lightAudit = await cdp.eval(`
      (() => {
        const canvas = document.querySelector('.devvault-lightfall-bg canvas');
        return {
          isDark: document.documentElement.classList.contains('dark'),
          lightfallRemoved: !canvas,
        };
      })()
    `);
    console.log("[Light Theme Isolation]", lightAudit);

    cdp.close();
    console.log("\n=== Complete Animated Sidebar & Responsive Suite Finished! ===");
  } catch (err) {
    console.error("[Test Failure]", err);
  } finally {
    chromeProcess.kill();
  }
}

main();
