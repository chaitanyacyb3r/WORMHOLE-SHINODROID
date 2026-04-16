import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, "print.html");
const outputPath = path.join(__dirname, "Shinodroid-Pitch-Deck-2026.pdf");

(async () => {
  console.log("🚀 Launching Chromium...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log("📄 Loading pitch deck...");
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "networkidle0",
    timeout: 30000,
  });

  // Wait for fonts
  await page.evaluateHandle("document.fonts.ready");
  await new Promise((r) => setTimeout(r, 2000));

  console.log("🖨️  Generating PDF...");
  await page.pdf({
    path: outputPath,
    width: "1920px",
    height: "1080px",
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
  });

  await browser.close();
  console.log(`\n✅ PDF saved to: ${outputPath}`);
})();
