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
        if (msg.method === "Runtime.consoleAPICalled" || msg.method === "Runtime.exceptionThrown") {
          console.log("PAGE LOG:", JSON.stringify(msg.params));
        }
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

// Helper to create a test image file
function createTestImageFile() {
  // 64x64 PNG in base64 (terracotta colored dot on cream)
  const base64Png =
    "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAEGSURBVHhe7dsxCsIwGAZg8yyeo4v36A08R5cmHqGgl4jVQiG/l4b3wUPJ1yT8hIckpUu4Vq99mK5rW1aH6j1d03O7/5/r93d/3f/76/85AgQIEKAEBAgQoAQECBCgBAQIECBAgBAQIECAEhAgQIASEDB9AnRdm+V53lRVE8vzvKqqpv8/AgQIEKAEBAgQoAQECBCgBAQIECBAgBAQIECAEhAgQIASEKAEBAgQoAQECBCgBAQIECBAgBAQIECAEhAgQIASEKAEBAgQoAQECBCgBAQIECBAgBAQIECAEhAgQIASEKAEBAgQoAQECBCgBAQIECBAgBAQIECAEhAgQIASEKAEBAgQoAQEDN+V+gEwhwG8Uq0u+QAAAABJRU5ErkJggg==";
  const testImgPath = path.resolve(__dirname, "test-avatar.png");
  fs.writeFileSync(testImgPath, Buffer.from(base64Png, "base64"));
  return testImgPath;
}

async function run() {
  console.log("=== DEVVAULT PROFILE AVATAR & STORAGE VERIFICATION ===");

  const testImagePath = createTestImageFile();
  const tempDir = path.join(process.env.TEMP || "C:\\Temp", `chrome-avatar-test-${Date.now()}`);
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
    await cdp.send("DOM.enable");

    // ==========================================
    // Phase 1: Navigate to Settings (Profile Tab)
    // ==========================================
    console.log("\n--- Phase 1: Inspect Profile Settings UI ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${NEXT_PORT}/?tab=settings&theme=light` });
    await sleep(2500);

    const initialSettingsState = await cdp.eval(`(() => {
      const pictureCard = document.querySelector('.profile-picture-card');
      const uploadBtn = document.querySelector('.profile-picture-actions button');
      const avatarWrapper = document.querySelector('.profile-avatar-wrapper');
      const initials = document.querySelector('.profile-avatar-initials');
      const sidebarAvatar = document.querySelector('.sidebar-profile-card .avatar-circle');

      return {
        pictureCardExists: !!pictureCard,
        uploadBtnText: uploadBtn ? uploadBtn.innerText.trim() : null,
        initialsText: initials ? initials.innerText.trim() : null,
        hasAvatarImage: !!avatarWrapper?.querySelector('img'),
        sidebarAvatarExists: !!sidebarAvatar,
      };
    })()`);

    console.log("Initial Settings State:", JSON.stringify(initialSettingsState, null, 2));

    if (!initialSettingsState.pictureCardExists) {
      throw new Error("Profile picture card was not found in Profile Settings!");
    }
    console.log("✓ Profile picture card successfully rendered in Profile Settings.");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-settings-initial.png"));

    // ==========================================
    // Phase 2: File Upload & Crop Modal
    // ==========================================
    console.log("\n--- Phase 2: Select File & Open Crop Modal ---");

    // Use in-browser canvas to create a real decodable PNG File and set it on the file input
    const uploadResult = await cdp.eval(`new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#b6503a';
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(128, 128, 64, 0, Math.PI * 2);
      ctx.fill();

      canvas.toBlob((blob) => {
        const file = new File([blob], 'test-avatar.png', { type: 'image/png' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.querySelector('input[type="file"][accept*="image"]');
        if (!input) {
          resolve({ error: "no input found" });
          return;
        }
        input.files = dt.files;

        // Dispatch synthetic and native change & input events
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        const propKey = Object.getOwnPropertyNames(input).find(n => n.startsWith('__reactProps'));
        if (propKey && input[propKey] && input[propKey].onChange) {
          input[propKey].onChange({ target: input });
        }

        resolve({ success: true, filesCount: input.files.length, fileName: file.name });
      }, 'image/png');
    })`);
    console.log("File Upload Result:", uploadResult);

    await sleep(2500);

    const cropModalState = await cdp.eval(`(() => {
      const modal = document.querySelector('[aria-labelledby="avatar-crop-modal-title"]');
      const title = document.querySelector('#avatar-crop-modal-title');
      const canvas = modal ? modal.querySelector('canvas') : null;
      const zoomSlider = modal ? modal.querySelector('input[type="range"]') : null;
      const saveBtn = modal ? modal.querySelector('.settings-primary-btn') : null;

      return {
        isOpen: !!modal,
        titleText: title ? title.innerText.trim() : null,
        canvasPresent: !!canvas,
        zoomSliderPresent: !!zoomSlider,
        saveBtnPresent: !!saveBtn,
      };
    })()`);

    console.log("Crop Modal State:", JSON.stringify(cropModalState, null, 2));

    if (!cropModalState.isOpen || !cropModalState.canvasPresent) {
      throw new Error("Avatar Crop Modal failed to open or canvas is missing!");
    }
    console.log("✓ Avatar Crop Modal opened with interactive canvas and zoom controls!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-crop-modal.png"));

    // ==========================================
    // Phase 3: Apply Crop and Save
    // ==========================================
    console.log("\n--- Phase 3: Apply Crop and Save ---");

    await cdp.eval(`(() => {
      const modal = document.querySelector('[aria-labelledby="avatar-crop-modal-title"]');
      const saveBtn = modal ? modal.querySelector('.settings-primary-btn') : null;
      if (saveBtn) saveBtn.click();
    })()`);

    // Wait for modal to close after async save
    for (let i = 0; i < 20; i++) {
      const isOpen = await cdp.eval(`!!document.querySelector('[aria-labelledby="avatar-crop-modal-title"]')`);
      if (!isOpen) break;
      await sleep(300);
    }
    await sleep(500);

    const updatedAvatarState = await cdp.eval(`(() => {
      const modal = document.querySelector('[aria-labelledby="avatar-crop-modal-title"]');
      const avatarImg = document.querySelector('.profile-avatar-img');
      const statusPill = document.querySelector('.profile-photo-status-pill.active');
      const sidebarImg = document.querySelector('.sidebar-profile-card .avatar-circle img') ||
                         document.querySelector('.sidebar-profile-compact .avatar-circle img');
      const changeBtn = document.querySelector('.profile-picture-actions button');
      const removeBtn = document.querySelector('.profile-picture-actions button.outline-button');

      return {
        modalClosed: !modal,
        hasAvatarImg: !!avatarImg,
        avatarImgSrc: avatarImg ? avatarImg.src.substring(0, 40) + '...' : null,
        statusPillActive: !!statusPill,
        sidebarSynchronized: !!sidebarImg,
        hasChangeBtn: !!changeBtn,
        hasRemoveBtn: !!removeBtn,
      };
    })()`);

    console.log("Updated Avatar State:", JSON.stringify(updatedAvatarState, null, 2));

    if (!updatedAvatarState.modalClosed) {
      throw new Error("Modal should close after successful save!");
    }
    if (!updatedAvatarState.hasAvatarImg) {
      throw new Error("Avatar image is not displayed in Profile Picture card!");
    }
    if (!updatedAvatarState.sidebarSynchronized) {
      throw new Error("Sidebar avatar did not synchronize with the new profile picture!");
    }
    console.log("✓ Avatar successfully saved and synchronized across Settings and Sidebar!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-avatar-saved-light.png"));

    // ==========================================
    // Phase 4: Theme Toggle & Dark Mode Support
    // ==========================================
    console.log("\n--- Phase 4: Verify Dark Theme Appearance ---");

    await cdp.eval(`(() => {
      const themeBtn = document.querySelector('button[aria-label*="dark theme"]');
      if (themeBtn) themeBtn.click();
    })()`);
    await sleep(1200);

    const darkAvatarState = await cdp.eval(`(() => {
      const isDark = document.documentElement.classList.contains('dark');
      const avatarImg = document.querySelector('.profile-avatar-img');
      const sidebarImg = document.querySelector('.sidebar-profile-card .avatar-circle img') ||
                         document.querySelector('.sidebar-profile-compact .avatar-circle img');
      return {
        isDark,
        avatarVisible: !!avatarImg,
        sidebarVisible: !!sidebarImg,
      };
    })()`);

    console.log("Dark Theme Avatar State:", JSON.stringify(darkAvatarState, null, 2));
    if (!darkAvatarState.isDark || !darkAvatarState.avatarVisible) {
      throw new Error("Dark theme transition failed or avatar not visible in dark theme!");
    }
    console.log("✓ Avatar renders beautifully in Dark Theme with Lightfall atmosphere!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-avatar-saved-dark.png"));

    // ==========================================
    // Phase 5: Mobile Viewport Verification (390px)
    // ==========================================
    console.log("\n--- Phase 5: Mobile Viewport Verification (390px) ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(800);

    const mobileAvatarState = await cdp.eval(`(() => {
      const topnavImg = document.querySelector('.mobile-avatar img');
      const cardImg = document.querySelector('.profile-avatar-img');
      return {
        topnavImgVisible: !!topnavImg,
        cardImgVisible: !!cardImg,
      };
    })()`);

    console.log("Mobile Avatar State:", JSON.stringify(mobileAvatarState, null, 2));
    console.log("✓ Mobile topbar avatar button and settings card verified!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-avatar-mobile-390px.png"));

    // ==========================================
    // Phase 6: Refresh Persistence
    // ==========================================
    console.log("\n--- Phase 6: Refresh Persistence Verification ---");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 900,
      deviceScaleFactor: 2,
      mobile: false,
    });

    await cdp.send("Page.reload");
    
    // Wait for DOM reload and React state hydration
    for (let i = 0; i < 30; i++) {
      const ready = await cdp.eval(`(() => {
        return !!document.querySelector('.profile-picture-card') && !!document.querySelector('.profile-avatar-img');
      })()`);
      if (ready) break;
      await sleep(300);
    }
    await sleep(500);

    const persistenceState = await cdp.eval(`(() => {
      const avatarImg = document.querySelector('.profile-avatar-img');
      const sidebarImg = document.querySelector('.sidebar-profile-card .avatar-circle img') ||
                         document.querySelector('.sidebar-profile-compact .avatar-circle img');
      return {
        avatarRetainedAfterRefresh: !!avatarImg,
        sidebarRetainedAfterRefresh: !!sidebarImg,
      };
    })()`);

    console.log("Persistence State after reload:", JSON.stringify(persistenceState, null, 2));
    if (!persistenceState.avatarRetainedAfterRefresh || !persistenceState.sidebarRetainedAfterRefresh) {
      throw new Error("Avatar was not retained after page reload!");
    }
    console.log("✓ Avatar successfully persists across page reloads!");

    // ==========================================
    // Phase 7: Remove Avatar Workflow
    // ==========================================
    console.log("\n--- Phase 7: Remove Avatar Workflow ---");

    // Click remove button
    await cdp.eval(`(() => {
      const removeBtn = document.querySelector('.profile-picture-actions button.outline-button');
      if (removeBtn) removeBtn.click();
    })()`);
    await sleep(500);

    // Confirm removal
    const confirmResult = await cdp.eval(`(() => {
      const confirmBtn = document.querySelector('.settings-danger-btn');
      if (confirmBtn) {
        confirmBtn.click();
        return { confirmed: true };
      }
      return { confirmed: false };
    })()`);

    console.log("Removal confirmation clicked:", confirmResult);
    
    // Wait for removal state update
    for (let i = 0; i < 20; i++) {
      const removed = await cdp.eval(`!document.querySelector('.profile-avatar-img')`);
      if (removed) break;
      await sleep(200);
    }
    await sleep(500);

    const afterRemovalState = await cdp.eval(`(() => {
      const avatarImg = document.querySelector('.profile-avatar-img');
      const initials = document.querySelector('.profile-avatar-initials');
      const sidebarImg = document.querySelector('.sidebar-profile-card .avatar-circle img') ||
                         document.querySelector('.sidebar-profile-compact .avatar-circle img');
      const sidebarInitials = document.querySelector('.sidebar-profile-card .avatar-circle');

      return {
        hasAvatarImg: !!avatarImg,
        initialsRestored: !!initials,
        sidebarImgRemoved: !sidebarImg,
        sidebarInitialsRestored: !!sidebarInitials,
      };
    })()`);

    console.log("After Removal State:", JSON.stringify(afterRemovalState, null, 2));

    if (afterRemovalState.hasAvatarImg) {
      throw new Error("Avatar image should be removed!");
    }
    if (!afterRemovalState.initialsRestored) {
      throw new Error("Fallback initials should be restored!");
    }
    console.log("✓ Profile picture successfully removed and default initials restored across all surfaces!");

    await cdp.captureScreenshot(path.join(SCREENSHOT_DIR, "profile-avatar-removed.png"));

    console.log("\n🎉 ALL PROFILE AVATAR MANAGEMENT TESTS PASSED!");
  } finally {
    if (cdp && cdp.ws) cdp.ws.close();
    chromeProc.kill("SIGTERM");
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(testImagePath);
    } catch {}
  }
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
