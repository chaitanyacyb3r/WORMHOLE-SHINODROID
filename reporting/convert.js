#!/usr/bin/env node
/**
 * md-to-pdf — Markdown + Mermaid → Beautiful PDF
 * ------------------------------------------------
 * Usage: node convert.js input.md [output.pdf]
 */

const fs   = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { marked } = require("marked");

// ─────────────────────────────────────────────
// 0. CLI args
// ─────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node convert.js <input.md> [output.pdf]");
  process.exit(1);
}

const inputFile  = path.resolve(args[0]);
const outputFile = args[1]
  ? path.resolve(args[1])
  : inputFile.replace(/\.md$/i, ".pdf");

if (!fs.existsSync(inputFile)) {
  console.error("File not found: " + inputFile);
  process.exit(1);
}

const markdownText = fs.readFileSync(inputFile, "utf8");

// ─────────────────────────────────────────────
// 1. Markdown → HTML
//    mermaid blocks become <pre class="mermaid">
// ─────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const renderer = new marked.Renderer();
renderer.code = function (code, language) {
  if (language === "mermaid") {
    return `<div class="mermaid-wrapper"><pre class="mermaid">${escapeHtml(code)}</pre></div>`;
  }
  return `<pre><code class="language-${language || ""}">${escapeHtml(code)}</code></pre>`;
};
marked.setOptions({ renderer });
const bodyHtml = marked.parse(markdownText);

// ─────────────────────────────────────────────
// 2. Build HTML page
// ─────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Document</title>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; }

  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 15px;
    line-height: 1.75;
    color: #1a1a2e;
    background: #ffffff;
    margin: 0;
    padding: 0;
  }

  .page {
    max-width: 860px;
    margin: 0 auto;
    padding: 48px 56px;
  }

  h1 { font-size: 2em;   border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-top: 0; color: #1e1b4b; }
  h2 { font-size: 1.5em; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;  color: #312e81; margin-top: 2em; }
  h3 { font-size: 1.2em; color: #3730a3; margin-top: 1.6em; }
  h4 { font-size: 1em;   color: #4338ca; }

  p  { margin: 0.75em 0; }
  ul, ol { padding-left: 1.6em; }
  li { margin: 0.3em 0; }

  a  { color: #4f46e5; text-decoration: none; }
  a:hover { text-decoration: underline; }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1.2em 0;
    font-size: 0.9em;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 6px rgba(0,0,0,0.08);
  }
  thead { background: #4f46e5; color: white; }
  th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e5e7eb; }
  tbody tr:nth-child(even) { background: #f8f7ff; }

  code {
    font-family: "Fira Code", "Cascadia Code", "JetBrains Mono", monospace;
    font-size: 0.85em;
    background: #f1f5f9;
    color: #6d28d9;
    padding: 1px 5px;
    border-radius: 4px;
  }

  pre {
    background: #1e1b4b;
    color: #e2e8f0;
    padding: 16px 20px;
    border-radius: 10px;
    overflow-x: auto;
    font-size: 0.85em;
    line-height: 1.6;
    margin: 1.2em 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  pre code { background: transparent; color: inherit; padding: 0; font-size: inherit; }

  blockquote {
    border-left: 4px solid #4f46e5;
    background: #f5f3ff;
    margin: 1em 0;
    padding: 12px 20px;
    border-radius: 0 8px 8px 0;
    color: #4c1d95;
    font-style: italic;
  }

  hr { border: none; border-top: 2px solid #e0e7ff; margin: 2em 0; }

  /* ── Mermaid wrapper ── */
  .mermaid-wrapper {
    margin: 1.5em 0;
    padding: 20px;
    background: #fafafe;
    border: 1px solid #e0e7ff;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
    display: block;
    width: 100%;
    /* Allow content to be visible while we measure it */
    overflow: visible;
  }

  .mermaid { display: block; }

  /* Scale SVGs responsively */
  .mermaid-wrapper svg {
    display: block !important;
    max-width: 100% !important;
    height: auto !important;
  }

  @media print {
    body { font-size: 13px; }
    .page { padding: 24px 32px; }
    h1, h2 { page-break-after: avoid; }
    pre, table, .mermaid-wrapper { page-break-inside: avoid; }
    .mermaid-wrapper { overflow: visible; }
  }
</style>
</head>
<body>
<div class="page">
${bodyHtml}
</div>

<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      primaryColor:        '#eef2ff',
      primaryTextColor:    '#1e1b4b',
      primaryBorderColor:  '#4f46e5',
      lineColor:           '#6366f1',
      secondaryColor:      '#f5f3ff',
      secondaryTextColor:  '#1e1b4b',
      tertiaryColor:       '#e0e7ff',
      tertiaryTextColor:   '#1e1b4b',
      background:          '#ffffff',
      mainBkg:             '#eef2ff',
      nodeBorder:          '#4f46e5',
      clusterBkg:          '#f5f3ff',
      clusterBorder:       '#4f46e5',
      titleColor:          '#1e1b4b',
      edgeLabelBackground: '#f5f3ff',
      actorBkg:            '#eef2ff',
      actorTextColor:      '#1e1b4b',
      actorBorder:         '#4f46e5',
      labelBoxBkgColor:    '#eef2ff',
      labelTextColor:      '#1e1b4b',
      loopTextColor:       '#1e1b4b',
      noteBkgColor:        '#fef9c3',
      noteTextColor:       '#713f12',
      fillType0:           '#eef2ff',
      fillType1:           '#f5f3ff',
    },
    flowchart:  { curve: 'basis', padding: 20, useMaxWidth: true },
    sequence:   { actorMargin: 60, useMaxWidth: true },
    gantt:      { useMaxWidth: true },
    pie:        { useMaxWidth: true },
    mindmap:    { useMaxWidth: true },
    timeline:   { useMaxWidth: true },
    gitGraph:   { useMaxWidth: true },
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize:   14,
    securityLevel: 'loose',
  });
</script>
</body>
</html>`;

// ─────────────────────────────────────────────
// 3. Find Chrome / Edge
// ─────────────────────────────────────────────
function findChrome() {
  const candidates = {
    win32: [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      (process.env.LOCALAPPDATA || "") + "\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      (process.env.LOCALAPPDATA || "") + "\\Microsoft\\Edge\\Application\\msedge.exe",
    ],
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    linux: [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/snap/bin/chromium",
    ],
  };
  const list = candidates[process.platform] || candidates.linux;
  for (const p of list) {
    if (fs.existsSync(p)) {
      console.log("Found browser: " + p);
      return p;
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 4. The core SVG fix (runs inside the browser)
//
// WHY diagrams get clipped:
//   Mermaid renders subgraph titles and some elements that overflow the
//   calculated SVG boundary. It then applies clipPath elements inside the
//   SVG that hard-clip everything to the original bounding box — so any
//   text that sticks out (like a long subgraph title) gets cut off.
//
// THE FIX:
//   1. Remove ALL clipPath definitions and clip-path references from the SVG
//   2. Use getBBox() to measure the TRUE bounding box of all content
//      (including any text that was previously clipped)
//   3. Rebuild the viewBox from that real bounding box + generous padding
//   4. Remove hardcoded width/height so CSS can scale it to fit the page
// ─────────────────────────────────────────────
const svgFix = () => {
  document.querySelectorAll(".mermaid-wrapper svg").forEach((svg) => {

    // ── Step 1: Nuke all clip-paths ──────────────────────────────────
    // Remove clip-path attribute from every element that has one
    svg.querySelectorAll("[clip-path]").forEach((el) => {
      el.removeAttribute("clip-path");
    });
    // Remove the <clipPath> definition elements themselves
    svg.querySelectorAll("clipPath").forEach((el) => el.remove());
    // Also clear any inline style clip-path
    svg.querySelectorAll("[style]").forEach((el) => {
      if (el.style.clipPath) el.style.clipPath = "none";
    });

    // ── Step 2: Measure the REAL bounding box ────────────────────────
    // getBBox() returns the tight bounding box of all rendered content
    // AFTER clip-paths have been removed, so it includes previously
    // hidden overflow like long subgraph titles.
    let bx = 0, by = 0, bw = 0, bh = 0;
    try {
      const bbox = svg.getBBox();
      bx = bbox.x;
      by = bbox.y;
      bw = bbox.width;
      bh = bbox.height;
    } catch (e) {
      // getBBox can fail for hidden elements; fall back to attributes
      bw = parseFloat(svg.getAttribute("width"))  || 800;
      bh = parseFloat(svg.getAttribute("height")) || 400;
    }

    // ── Step 3: Set viewBox with generous padding ────────────────────
    const pad = 16;
    svg.setAttribute(
      "viewBox",
      `${bx - pad} ${by - pad} ${bw + pad * 2} ${bh + pad * 2}`
    );
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // ── Step 4: Remove hardcoded dimensions → CSS takes over ─────────
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.display  = "block";
    svg.style.width    = "100%";
    svg.style.maxWidth = "100%";
    svg.style.height   = "auto";
  });
};

// ─────────────────────────────────────────────
// 5. Launch Puppeteer, render, export PDF
// ─────────────────────────────────────────────
(async () => {
  console.log("Launching headless Chrome...");

  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  const executablePath = findChrome();
  if (executablePath) launchOptions.executablePath = executablePath;

  let browser;
  try {
    browser = await puppeteer.launch(launchOptions);
  } catch (err) {
    console.error("Could not launch Chrome. Run: npx puppeteer browsers install chrome");
    process.exit(1);
  }

  const page = await browser.newPage();

  // Large viewport gives Mermaid room to fully render all nodes and edges
  await page.setViewport({ width: 1600, height: 1200, deviceScaleFactor: 1 });

  // Load page and wait for all network requests (CDN) to complete
  await page.setContent(html, { waitUntil: "networkidle0" });

  // Wait until every <pre class="mermaid"> has been replaced with <svg>
  await page.waitForFunction(() => {
    const nodes = document.querySelectorAll("pre.mermaid");
    if (nodes.length === 0) return true;
    return [...nodes].every((el) => el.querySelector("svg") !== null);
  }, { timeout: 30000 });

  // Extra settle time — some complex diagrams (mindmap, sequence) need
  // a moment after the SVG appears before all text elements are measured
  await new Promise((r) => setTimeout(r, 1000));

  // Run the SVG fix inside the browser context
  await page.evaluate(svgFix);

  console.log("Diagrams fixed. Generating PDF...");

  await page.pdf({
    path: outputFile,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:9px;color:#aaa;width:100%;text-align:right;padding-right:18mm;font-family:sans-serif;">${path.basename(inputFile)}</div>`,
    footerTemplate: `<div style="font-size:9px;color:#aaa;width:100%;text-align:center;font-family:sans-serif;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  console.log("PDF saved -> " + outputFile);
})();
