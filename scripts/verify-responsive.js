const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const TARGETS = [
  // 8 Core Viewports
  { name: "mobile-360", width: 360, height: 740, url: "http://localhost:3000" },
  { name: "mobile-375", width: 375, height: 812, url: "http://localhost:3000" },
  { name: "mobile-390", width: 390, height: 844, url: "http://localhost:3000" },
  { name: "mobile-430", width: 430, height: 932, url: "http://localhost:3000" },
  { name: "tablet-768", width: 768, height: 1024, url: "http://localhost:3000" },
  { name: "desktop-1024", width: 1024, height: 768, url: "http://localhost:3000" },
  { name: "desktop-1280", width: 1280, height: 800, url: "http://localhost:3000" },
  { name: "desktop-1440", width: 1440, height: 900, url: "http://localhost:3000" },

  // Dedicated Route Views
  { name: "desktop-library", width: 1440, height: 900, url: "http://localhost:3000?tab=library" },
  { name: "mobile-library", width: 375, height: 812, url: "http://localhost:3000?tab=library" },
  { name: "desktop-explore", width: 1440, height: 900, url: "http://localhost:3000?tab=explore" },
  { name: "desktop-collections", width: 1440, height: 900, url: "http://localhost:3000?tab=collections" },
  { name: "desktop-activity", width: 1440, height: 900, url: "http://localhost:3000?tab=activity" },
  { name: "desktop-settings", width: 1440, height: 900, url: "http://localhost:3000?tab=settings" },

  // Themes and Modals
  { name: "desktop-dark-1440", width: 1440, height: 900, url: "http://localhost:3000?theme=dark" },
  { name: "desktop-light-1440", width: 1440, height: 900, url: "http://localhost:3000?theme=light" },
  { name: "mobile-light-375", width: 375, height: 812, url: "http://localhost:3000?theme=light" },
  { name: "modal-desktop", width: 1440, height: 900, url: "http://localhost:3000?modal=capture" },
  { name: "modal-mobile", width: 375, height: 812, url: "http://localhost:3000?modal=capture" },
];

console.log("=== DevVault Complete Visual & Responsive Verification Engine ===");

for (const target of TARGETS) {
  const outFile = path.join(SCREENSHOT_DIR, `${target.name}.png`);
  console.log(`Capturing ${target.name} (${target.width}x${target.height}) from ${target.url}...`);

  try {
    const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_shot_${target.name}`);
    execFileSync(
      CHROME_PATH,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--user-data-dir=${userDir}`,
        `--window-size=${target.width},${target.height}`,
        "--virtual-time-budget=2500",
        `--screenshot=${outFile}`,
        target.url,
      ],
      { timeout: 20000 }
    );
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    const stats = fs.statSync(outFile);
    console.log(`  ✓ ${target.name}.png captured (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`  ✗ Failed on ${target.name}:`, err.message);
  }
}

console.log("Visual & responsive verification screenshots complete!");
