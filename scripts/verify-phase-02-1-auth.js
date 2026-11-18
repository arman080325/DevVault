const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9276;
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

  async setViewport(width, height, isMobile = false) {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: isMobile ? 2 : 1,
      mobile: isMobile,
    });
    await this.send("Emulation.setVisibleSize", { width, height });
  }

  async captureScreenshot(filename) {
    const res = await this.send("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), buffer);
    console.log(`    [Screenshot saved] docs/screenshots/${filename}`);
  }

  async waitFor(fnExpression, timeout = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const ok = await this.eval(fnExpression);
        if (ok) return ok;
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function startChrome() {
  const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_auth_qa_${Date.now()}`);
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

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runAudit() {
  console.log("================================================================================");
  console.log("      DevVault Phase 02.1: Authentication UI & Supabase Integration QA         ");
  console.log("================================================================================");

  let chromeInstance = null;
  let client = null;

  try {
    chromeInstance = await startChrome();
    const listRes = await fetch(`http://127.0.0.1:${PORT}/json/list`);
    const tabs = await listRes.json();
    const wsUrl = tabs[0]?.webSocketDebuggerUrl;
    if (!wsUrl) throw new Error("No Chrome tab available");

    client = new CDPClient(wsUrl);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");

    // --- SUITE 1: Unauthenticated Home & Discoverability ---
    console.log("\n[Suite 1] Unauthenticated Entry Points Discoverability (Desktop)");
    await client.setViewport(1440, 900, false);
    await client.send("Page.navigate", { url: "http://localhost:3000" });
    const ready = await client.waitFor(`Boolean(document.querySelector('.top-signin-btn'))`, 12000);
    if (!ready) throw new Error("Application failed to load or hydrate in 12s");
    await sleep(1000);

    const el = await client.eval(`(() => {
      const topSignIn = document.querySelector('.top-signin-btn');
      const sidebarSignIn = document.querySelector('.sidebar-signin-btn');
      const banner = document.querySelector('.vault-migration-banner');
      return {
        hasTopSignIn: Boolean(topSignIn),
        topSignInText: topSignIn ? topSignIn.innerText.trim() : null,
        hasSidebarSignIn: Boolean(sidebarSignIn),
        sidebarSignInText: sidebarSignIn ? sidebarSignIn.innerText.trim() : null,
        hasBanner: Boolean(banner),
        bannerTitle: banner ? banner.querySelector('b')?.innerText : null
      };
    })()`);

    assert(el.hasTopSignIn, "Top navigation contains prominent Sign In button");
    assert(el.topSignInText && el.topSignInText.includes("Sign In"), `Top navigation button displays 'Sign In' (found: '${el.topSignInText}')`);
    assert(el.hasSidebarSignIn, "Sidebar bottom displays discoverable Sign In trigger");
    assert(el.sidebarSignInText && el.sidebarSignInText.includes("Sign In"), `Sidebar trigger displays 'Sign In' (found: '${el.sidebarSignInText}')`);
    assert(el.hasBanner, "Unauthenticated user sees 'Local Vault Active' welcome banner");

    await client.captureScreenshot("auth-unauthenticated-home.png");

    // --- SUITE 2: Open Sign In Modal & Inspect Layout ---
    console.log("\n[Suite 2] Sign In Modal Verification (Desktop)");
    await client.eval(`document.querySelector('.top-signin-btn')?.click()`);
    await client.waitFor(`Boolean(document.querySelector('[role="dialog"]'))`, 3000);
    await sleep(500);

    const m = await client.eval(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      const title = document.querySelector('#auth-modal-title')?.innerText;
      const emailInput = document.querySelector('#auth-email');
      const passwordInput = document.querySelector('#auth-password');
      const rememberMe = document.querySelector('#auth-remember');
      const submitBtn = modal?.querySelector('button[type="submit"]')?.innerText;
      const togglePassword = modal?.querySelector('button[aria-label="Show password"], button[aria-label="Hide password"]');
      return {
        isOpen: Boolean(modal),
        title,
        hasEmail: Boolean(emailInput),
        hasPassword: Boolean(passwordInput),
        hasRememberMe: Boolean(rememberMe),
        submitBtnText: submitBtn?.trim(),
        hasPasswordToggle: Boolean(togglePassword),
      };
    })()`);

    assert(m.isOpen, "AuthModal opened successfully on Sign In click");
    assert(m.title && m.title.toLowerCase().includes("sign in"), `Modal title displays 'Sign in to your vault' (found: '${m.title}')`);
    assert(m.hasEmail, "Email address input is rendered");
    assert(m.hasPassword, "Password input is rendered");
    assert(m.hasRememberMe, "Remember session checkbox is present");
    assert(m.hasPasswordToggle, "Show/Hide password toggle button is present");
    assert(m.submitBtnText && m.submitBtnText.includes("Sign In"), `Submit button displays 'Sign In to Vault' (found: '${m.submitBtnText}')`);

    await client.captureScreenshot("auth-login-desktop.png");

    // Test Show/Hide password toggle
    await client.eval(`(() => {
      const btn = document.querySelector('button[aria-label="Show password"]');
      if (btn) btn.click();
    })()`);
    await sleep(200);

    const tr = await client.eval(`(() => {
      const input = document.querySelector('#auth-password');
      return { typeAfterShow: input ? input.type : null };
    })()`);
    assert(tr.typeAfterShow === "text", "Password toggle switches input to 'text'");

    // Toggle back to password
    await client.eval(`(() => {
      const btn = document.querySelector('button[aria-label="Hide password"]');
      if (btn) btn.click();
    })()`);
    await sleep(200);
    const trHide = await client.eval(`(() => {
      const input = document.querySelector('#auth-password');
      return { typeAfterHide: input ? input.type : null };
    })()`);
    assert(trHide.typeAfterHide === "password", "Password toggle switches input back to 'password'");

    // --- SUITE 3: Switch to Create Account & Inspect ---
    console.log("\n[Suite 3] Create Account Modal Verification (Desktop)");
    await client.eval(`(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const switchBtn = buttons.find(b => b.innerText.includes('Create an account'));
      if (switchBtn) switchBtn.click();
    })()`);
    await sleep(400);

    const s = await client.eval(`(() => {
      const title = document.querySelector('#auth-modal-title')?.innerText;
      const nameInput = document.querySelector('#auth-fullname');
      const emailInput = document.querySelector('#auth-email');
      const passwordInput = document.querySelector('#auth-password');
      const confirmInput = document.querySelector('#auth-confirm-password');
      const submitBtn = document.querySelector('button[type="submit"]')?.innerText;
      return {
        title,
        hasName: Boolean(nameInput),
        hasEmail: Boolean(emailInput),
        hasPassword: Boolean(passwordInput),
        hasConfirm: Boolean(confirmInput),
        submitBtnText: submitBtn?.trim(),
      };
    })()`);

    assert(s.title && s.title.toLowerCase().includes("create"), `Modal title switched to 'Create your personal vault' (found: '${s.title}')`);
    assert(s.hasName, "Full name input field is present");
    assert(s.hasConfirm, "Confirm password input field is present");
    assert(s.submitBtnText && s.submitBtnText.includes("Create"), `Submit button displays 'Create My Vault' (found: '${s.submitBtnText}')`);

    await client.captureScreenshot("auth-signup-desktop.png");

    // --- SUITE 4: Client-Side Validation Feedback ---
    console.log("\n[Suite 4] Form Validation & Inline Errors");
    await client.eval(`document.querySelector('button[type="submit"]')?.click()`);
    await sleep(300);

    const vc = await client.eval(`(() => {
      const errors = Array.from(document.querySelectorAll('.text-red-500')).map(e => e.innerText);
      return {
        errorCount: errors.length,
        errors
      };
    })()`);
    assert(vc.errorCount >= 2, `Triggers inline validation errors on empty submission (${vc.errors.join(", ")})`);

    // Test Password Mismatch Validation
    await client.eval(`(() => {
      function setVal(input, val) {
        if (!input) return;
        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(input, val);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      setVal(document.querySelector('#auth-fullname'), 'Test User');
      setVal(document.querySelector('#auth-email'), 'test@example.com');
      setVal(document.querySelector('#auth-password'), 'password123');
      setVal(document.querySelector('#auth-confirm-password'), 'password999');
      document.querySelector('button[type="submit"]')?.click();
    })()`);
    await sleep(300);

    const mismatchOk = await client.eval(`(() => {
      const err = Array.from(document.querySelectorAll('.text-red-500')).find(e => e.innerText.includes('match'));
      return Boolean(err);
    })()`);
    assert(mismatchOk, "Detects and warns on password mismatch ('Passwords do not match.')");

    // --- SUITE 5: Responsive Mobile Testing (360px, 375px, 390px, 430px) ---
    console.log("\n[Suite 5] Responsive Mobile Viewport Audits");
    const mobileViewports = [
      { name: "mobile-360", width: 360, height: 740 },
      { name: "mobile-375", width: 375, height: 812 },
      { name: "mobile-390", width: 390, height: 844 },
      { name: "mobile-430", width: 430, height: 932 },
    ];

    for (const vp of mobileViewports) {
      await client.setViewport(vp.width, vp.height, true);
      await sleep(300);

      const ov = await client.eval(`(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
        };
      })()`);

      assert(!ov.hasHorizontalOverflow, `No horizontal overflow at ${vp.width}px (${ov.scrollWidth}px vs ${ov.clientWidth}px)`);
      if (vp.name === "mobile-375") {
        await client.captureScreenshot("auth-signup-mobile.png");

        // Switch back to sign-in on mobile
        await client.eval(`(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const switchBtn = buttons.find(b => b.innerText === 'Sign in');
          if (switchBtn) switchBtn.click();
        })()`);
        await sleep(300);
        await client.captureScreenshot("auth-login-mobile.png");
      }
    }

    // --- SUITE 6: Settings Page Cloud Sync Status ---
    console.log("\n[Suite 6] Settings Profile & Cloud Storage Integration");
    await client.setViewport(1440, 900, false);
    // Close modal
    await client.eval(`document.querySelector('button[aria-label="Close authentication dialog"]')?.click()`);
    await sleep(300);

    // Navigate to Settings
    await client.eval(`(() => {
      const settingsLinks = Array.from(document.querySelectorAll('a, button'));
      const link = settingsLinks.find(l => l.innerText.includes('Settings'));
      if (link) link.click();
    })()`);
    await sleep(800);

    const settingsCheck = await client.eval(`(() => {
      const cloudCard = document.querySelector('.profile-cloud-card');
      const statusBadge = cloudCard?.querySelector('.cloud-status-badge');
      const signInBtn = cloudCard?.querySelector('button');
      return {
        hasCloudCard: Boolean(cloudCard),
        status: statusBadge?.innerText.trim(),
        buttonText: signInBtn?.innerText.trim()
      };
    })()`);

    assert(settingsCheck.hasCloudCard, "Settings Profile displays Cloud Sync status card");
    assert(settingsCheck.status && settingsCheck.status.toLowerCase().includes("local"), `Status badge indicates local storage: '${settingsCheck.status}'`);
    assert(settingsCheck.buttonText && settingsCheck.buttonText.includes("Sign In"), `Cloud Sync card offers direct 'Sign In' action: '${settingsCheck.buttonText}'`);

    await client.captureScreenshot("auth-settings-profile.png");

    console.log("\n================================================================================");
    console.log(` Audit Complete: ${passedChecks}/${totalChecks} assertions passed`);
    console.log("================================================================================\n");

  } finally {
    if (client) client.close();
    if (chromeInstance && chromeInstance.proc) {
      try {
        chromeInstance.proc.kill("SIGKILL");
      } catch {}
    }
  }
}

runAudit().catch((err) => {
  console.error("FATAL ERROR IN AUDIT:", err);
  process.exit(1);
});
