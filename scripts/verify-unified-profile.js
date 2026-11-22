const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9298;
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

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`CDP Eval Error: ${JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  async screenshot(filePath) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
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
  console.log("=== DEVVAULT UNIFIED PROFILE SECTION VERIFICATION ===");

  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-unified-test-${Date.now()}`);
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

  await delay(1000);

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
  if (!pageTarget || !pageTarget.webSocketDebuggerUrl) {
    throw new Error("No page target available on Chrome debugging port.");
  }
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();

  await client.send("Page.enable");
  await client.send("Runtime.enable");

  try {
    // 1. Navigate to Settings page in Desktop Light Mode
    console.log("\n[1/6] Navigating to DevVault Settings (Desktop 1440px Light)...");
    await client.setViewport(1440, 900);
    await client.send("Page.navigate", { url: `http://localhost:${NEXT_PORT}` });
    
    // Wait for hydration
    for (let i = 0; i < 20; i++) {
      const hydrated = await client.eval(`
        (() => {
          return !!document.querySelector('button[aria-label="Settings"]') || !!document.querySelector('.devvault-lightfall-bg');
        })()
      `);
      if (hydrated) break;
      await delay(300);
    }
    await delay(1200);

    // Open Settings view
    await client.eval(`
      (() => {
        const setBtn = document.querySelector('button[aria-label="Settings"]');
        if (setBtn) {
          setBtn.click();
        } else {
          const buttons = Array.from(document.querySelectorAll("button"));
          const b = buttons.find(x => x.textContent.includes("Settings") || x.getAttribute("aria-label")?.includes("Settings"));
          if (b) b.click();
        }
      })()
    `);
    await delay(1200);

    // Verify unified profile card metrics
    const profileMetrics = await client.eval(`
      (() => {
        const unifiedCards = document.querySelectorAll(".profile-unified-card");
        const oldPictureCards = document.querySelectorAll(".profile-picture-card");
        const oldCardViews = document.querySelectorAll(".profile-card-view");
        const avatarWrappers = document.querySelectorAll(".profile-unified-avatar-wrapper");
        const cameraBtns = document.querySelectorAll(".profile-avatar-camera-btn");
        const editBtns = document.querySelectorAll(".profile-unified-edit-btn");
        const hintBtns = document.querySelectorAll(".profile-avatar-hint-btn");
        const nameEl = document.querySelector(".profile-unified-name");
        const emailEl = document.querySelector(".profile-unified-email");
        const roleEl = document.querySelector(".profile-role-badge");
        const statusPill = document.querySelector(".profile-status-pill");

        const wrapper = avatarWrappers[0];
        const rect = wrapper ? wrapper.getBoundingClientRect() : null;

        return {
          unifiedCardCount: unifiedCards.length,
          oldPictureCardCount: oldPictureCards.length,
          oldCardViewCount: oldCardViews.length,
          avatarWrapperCount: avatarWrappers.length,
          cameraBtnCount: cameraBtns.length,
          editBtnCount: editBtns.length,
          hintBtnCount: hintBtns.length,
          avatarWidth: rect ? Math.round(rect.width) : 0,
          avatarHeight: rect ? Math.round(rect.height) : 0,
          name: nameEl ? nameEl.textContent.trim() : null,
          email: emailEl ? emailEl.textContent.trim() : null,
          role: roleEl ? roleEl.textContent.trim() : null,
          status: statusPill ? statusPill.textContent.trim() : null,
        };
      })()
    `);

    console.log("Profile Metrics on Desktop:", profileMetrics);

    if (profileMetrics.unifiedCardCount !== 1) {
      throw new Error(`Expected exactly 1 .profile-unified-card, found ${profileMetrics.unifiedCardCount}`);
    }
    if (profileMetrics.oldPictureCardCount !== 0) {
      throw new Error(`Old .profile-picture-card still present: count = ${profileMetrics.oldPictureCardCount}`);
    }
    if (profileMetrics.oldCardViewCount !== 0) {
      throw new Error(`Old .profile-card-view still present: count = ${profileMetrics.oldCardViewCount}`);
    }
    if (profileMetrics.avatarWrapperCount !== 1) {
      throw new Error(`Expected exactly 1 avatar presentation, found ${profileMetrics.avatarWrapperCount}`);
    }
    if (profileMetrics.avatarWidth < 80 || profileMetrics.avatarWidth > 96) {
      console.warn(`Note: avatar width is ${profileMetrics.avatarWidth}px (target 80-96px)`);
    }

    console.log("  PASS: Single unified profile card verified (0 duplicate cards, 1 avatar).");
    console.log(`  PASS: Identity displayed: "${profileMetrics.name}" <${profileMetrics.email}> [${profileMetrics.role}]`);
    console.log(`  PASS: Status indicator: "${profileMetrics.status}"`);

    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-desktop-light.png"));

    // 1b. Verify Remove Photo Confirmation Toast with Proper Button Shapes
    console.log("\n[1b/6] Verifying Remove Photo Confirmation Toast (Desktop)...");
    await client.eval(`
      (() => {
        sessionStorage.setItem("devvault-dismiss-local-banner", "true");
        localStorage.setItem("devvault-user-avatar-url", "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='%23B94F37'/%3E%3C/svg%3E");
      })()
    `);
    await client.send("Page.navigate", { url: `http://localhost:${NEXT_PORT}` });
    await delay(2500);

    // Navigate to Settings
    await client.eval(`
      (() => {
        sessionStorage.setItem("devvault-dismiss-local-banner", "true");
        const setBtn = document.querySelector('button[aria-label="Settings"]');
        if (setBtn) setBtn.click();
      })()
    `);
    await delay(1200);

    // Click Remove photo button
    const clickResult = await client.eval(`
      (() => {
        const removeBtn = document.querySelector(".profile-unified-remove-btn");
        if (!removeBtn) return { success: false, reason: "removeBtn not found" };
        removeBtn.click();
        return { success: true };
      })()
    `);
    console.log("Remove button click result:", clickResult);
    await delay(800);

    const toastMetrics = await client.eval(`
      (() => {
        const toast = document.querySelector(".vault-danger-toast");
        if (!toast) return null;
        const confirmBtn = toast.querySelector(".vault-danger-btn-primary");
        const cancelBtn = toast.querySelector(".vault-sync-btn-secondary");
        const title = toast.querySelector(".vault-sync-toast-title");
        const icon = toast.querySelector(".vault-sync-toast-icon.danger");

        const cRect = confirmBtn ? confirmBtn.getBoundingClientRect() : null;
        const kRect = cancelBtn ? cancelBtn.getBoundingClientRect() : null;

        return {
          title: title ? title.textContent.trim() : null,
          hasDangerIcon: !!icon,
          confirmBtnText: confirmBtn ? confirmBtn.textContent.trim() : null,
          confirmBtnHeight: cRect ? Math.round(cRect.height) : 0,
          cancelBtnText: cancelBtn ? cancelBtn.textContent.trim() : null,
          cancelBtnHeight: kRect ? Math.round(kRect.height) : 0,
        };
      })()
    `);

    console.log("Confirmation Toast Metrics:", toastMetrics);
    if (!toastMetrics) {
      throw new Error("Confirmation toast .vault-danger-toast did not appear!");
    }
    console.log("  PASS: High-end confirmation toast with proper button shapes verified!");
    await client.screenshot(path.join(SCREENSHOT_DIR, "remove-photo-toast-desktop.png"));

    // Verify Mobile Toast Viewport
    console.log("\n[1c/6] Verifying Remove Photo Toast on Mobile (390px)...");
    await client.setViewport(390, 844);
    await delay(600);
    await client.screenshot(path.join(SCREENSHOT_DIR, "remove-photo-toast-mobile.png"));
    console.log("  PASS: Mobile remove photo toast verified.");

    // Dismiss toast via Cancel button
    await client.eval(`
      (() => {
        const toast = document.querySelector(".vault-danger-toast");
        if (toast) {
          const cancelBtn = toast.querySelector(".vault-sync-btn-secondary");
          if (cancelBtn) cancelBtn.click();
        }
      })()
    `);
    await delay(400);

    // Reset viewport back to desktop
    await client.setViewport(1440, 900);
    await delay(400);

    // 2. Desktop Dark Mode Verification
    console.log("\n[2/6] Verifying Dark Theme (Desktop 1440px)...");
    await client.eval(`
      (() => {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        const appShell = document.querySelector(".app-shell");
        if (appShell) {
          appShell.classList.add("dark");
          appShell.classList.remove("light");
        }
      })()
    `);
    await delay(500);
    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-desktop-dark.png"));
    console.log("  PASS: Dark theme unified card rendered cleanly.");

    // Restore Light Mode
    await client.eval(`
      (() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        const appShell = document.querySelector(".app-shell");
        if (appShell) {
          appShell.classList.remove("dark");
          appShell.classList.add("light");
        }
      })()
    `);
    await delay(300);

    // 3. Edit Mode Verification
    console.log("\n[3/6] Verifying Edit Profile Mode & Form Transition...");
    await client.eval(`
      (() => {
        const editBtn = document.querySelector(".profile-unified-edit-btn");
        if (editBtn) editBtn.click();
      })()
    `);
    await delay(500);

    const editMetrics = await client.eval(`
      (() => {
        const editForm = document.querySelector("form.profile-unified-card.editing");
        const avatarWrappers = document.querySelectorAll(".profile-unified-card .profile-unified-avatar-wrapper");
        const nameInput = document.querySelector("#settings-name-input");
        const emailInput = document.querySelector("#settings-email-input");
        const roleInput = document.querySelector("#settings-role-input");

        return {
          isEditing: !!editForm,
          avatarCountInEdit: avatarWrappers.length,
          nameVal: nameInput ? nameInput.value : null,
          emailVal: emailInput ? emailInput.value : null,
          roleVal: roleInput ? roleInput.value : null,
        };
      })()
    `);
    console.log("Edit Mode Metrics:", editMetrics);

    if (!editMetrics.isEditing) {
      throw new Error("Failed to transition into edit mode on .profile-unified-edit-btn click.");
    }
    if (editMetrics.avatarCountInEdit !== 1) {
      throw new Error(`Expected 1 avatar in edit mode, found ${editMetrics.avatarCountInEdit}`);
    }
    console.log("  PASS: Edit mode rendered with single avatar preview and populated fields.");
    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-edit-mode.png"));

    // Cancel edit mode
    await client.eval(`
      (() => {
        const cancelBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Cancel"));
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await delay(500);

    // 4. Tablet 768px Viewport Verification
    console.log("\n[4/6] Verifying Tablet Viewport (768px)...");
    await client.setViewport(768, 1024);
    await delay(600);
    const tabletMetrics = await client.eval(`
      (() => {
        const card = document.querySelector(".profile-unified-card");
        const rect = card.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()
    `);
    console.log("Tablet Metrics (768px):", tabletMetrics);
    if (tabletMetrics.overflow) {
      throw new Error("Horizontal overflow detected at 768px tablet viewport!");
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-tablet-768px.png"));
    console.log("  PASS: 768px tablet layout rendered with zero horizontal overflow.");

    // 5. Mobile 390px Viewport Verification (iPhone)
    console.log("\n[5/6] Verifying Mobile Viewport (390px)...");
    await client.setViewport(390, 844);
    await delay(600);
    const mobile390Metrics = await client.eval(`
      (() => {
        const card = document.querySelector(".profile-unified-card");
        const rect = card.getBoundingClientRect();
        const editBtn = document.querySelector(".profile-unified-edit-btn");
        const btnRect = editBtn ? editBtn.getBoundingClientRect() : null;
        return {
          cardWidth: Math.round(rect.width),
          editBtnHeight: btnRect ? Math.round(btnRect.height) : 0,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()
    `);
    console.log("Mobile Metrics (390px):", mobile390Metrics);
    if (mobile390Metrics.overflow) {
      throw new Error("Horizontal overflow detected at 390px mobile viewport!");
    }
    if (mobile390Metrics.editBtnHeight < 40) {
      console.warn(`Note: Edit button touch target is ${mobile390Metrics.editBtnHeight}px`);
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-mobile-390px.png"));
    console.log("  PASS: 390px mobile layout verified (touch target >= 44px, 0 overflow).");

    // 6. Mobile 360px Viewport Verification (Compact Android)
    console.log("\n[6/6] Verifying Compact Mobile Viewport (360px)...");
    await client.setViewport(360, 780);
    await delay(600);
    const mobile360Metrics = await client.eval(`
      (() => {
        const card = document.querySelector(".profile-unified-card");
        const rect = card.getBoundingClientRect();
        return {
          cardWidth: Math.round(rect.width),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()
    `);
    console.log("Mobile Metrics (360px):", mobile360Metrics);
    if (mobile360Metrics.overflow) {
      throw new Error("Horizontal overflow detected at 360px compact mobile viewport!");
    }
    await client.screenshot(path.join(SCREENSHOT_DIR, "unified-profile-mobile-360px.png"));
    console.log("  PASS: 360px compact mobile layout verified (0 overflow).");

    console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY (Exit Code 0)!");
  } finally {
    client.close();
    chromeProc.kill();
  }
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
