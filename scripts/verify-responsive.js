const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const SCREENSHOT_DIR = path.resolve(__dirname, "../docs/screenshots");

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 740 },
  { name: "mobile-375", width: 375, height: 812 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

console.log("=== DevVault Responsive Verification Engine ===");

for (const vp of VIEWPORTS) {
  const outFile = path.join(SCREENSHOT_DIR, `${vp.name}.png`);
  console.log(`Testing viewport ${vp.name} (${vp.width}x${vp.height})...`);
  
  try {
    const userDir = path.join(process.env.TEMP || "C:\\temp", `chrome_shot_${vp.name}`);
    execFileSync(
      CHROME_PATH,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--hide-scrollbars",
        `--user-data-dir=${userDir}`,
        `--window-size=${vp.width},${vp.height}`,
        "--virtual-time-budget=2500",
        `--screenshot=${outFile}`,
        "http://localhost:3000",
      ],
      { timeout: 15000 }
    );
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    const stats = fs.statSync(outFile);
    console.log(`  ✓ ${vp.name}.png captured (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (err) {
    console.error(`  ✗ Failed on ${vp.name}:`, err.message);
  }
}

console.log("Responsive viewport screenshots complete!");
