#!/usr/bin/env node
/**
 * md-to-pdf — Markdown + Mermaid → Beautiful PDF
 * ------------------------------------------------
 * Usage: node convert.js input.md [output.pdf]
 */

const fs = require("fs");
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

const inputFile = path.resolve(args[0]);
const outputFile = args[1]
  ? path.resolve(args[1])
  : inputFile.replace(/\.md$/i, ".pdf");

if (!fs.existsSync(inputFile)) {
  console.error("File not found: " + inputFile);
  process.exit(1);
}

const markdownText = fs.readFileSync(inputFile, "utf8").replace(/^\uFEFF/, "");

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
// marked v12+: code() receives a single token object {text, lang, escaped}
renderer.code = function (token) {
  const text = token.text ?? token;          // v12 passes object; fallback for older
  const lang = token.lang ?? arguments[1];   // v12: token.lang; older: 2nd arg
  if (lang === "mermaid") {
    return `<div class="mermaid-wrapper"><pre class="mermaid">${escapeHtml(text)}</pre></div>`;
  }
  return `<pre><code class="language-${lang || ""}">${escapeHtml(text)}</code></pre>`;
};
marked.setOptions({
  renderer,
  mangle: false,   // don't mangle email addresses
  headerIds: false,   // no auto id attrs on headings
});
const bodyHtml = marked.parse(markdownText, { breaks: false });

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

  /* Force SVG background to white — headless Chrome can render
     Mermaid's internal background rect as dark in PDF mode */
  .mermaid-wrapper svg > rect:first-child,
  .mermaid-wrapper svg rect.background {
    fill: #ffffff !important;
  }

  /* Ensure pie legend text is always dark and readable */
  .mermaid-wrapper svg text,
  .mermaid-wrapper svg .legend text,
  .mermaid-wrapper svg .pieOuterText {
    fill: #1e1b4b !important;
  }

  /* Percentage labels inside slices — white for contrast on vivid colors */
  .mermaid-wrapper svg .slice text,
  .mermaid-wrapper svg .pieTitleText ~ g text {
    fill: #ffffff !important;
  }

  /* ── Cover page ── */
  .cover-page {
    background: linear-gradient(145deg, #0f0c29, #1e1b4b, #312e81);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    page-break-after: always;
    break-after: page;
    margin: 0;
    padding: 0;
  }
  .cover-inner {
    text-align: center;
    color: #ffffff;
    padding: 60px 40px;
    max-width: 600px;
  }
  .cover-logo {
    font-size: 2.4em;
    font-weight: 800;
    letter-spacing: 0.06em;
    color: #a5b4fc;
    text-transform: uppercase;
    margin-bottom: 20px;
  }
  .cover-divider {
    width: 80px;
    height: 4px;
    background: linear-gradient(90deg, #6366f1, #a855f7);
    margin: 0 auto 28px;
    border-radius: 2px;
  }
  .cover-title {
    font-size: 3.2em;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.02em;
    line-height: 1.1;
    margin-bottom: 12px;
  }
  .cover-sub {
    font-size: 1.3em;
    color: #c7d2fe;
    font-weight: 400;
    margin-bottom: 36px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .cover-tags {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 48px;
  }
  .cover-tags span {
    background: rgba(99,102,241,0.25);
    border: 1px solid rgba(165,180,252,0.4);
    color: #c7d2fe;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 500;
    letter-spacing: 0.05em;
  }
  .cover-confidential {
    font-size: 0.75em;
    color: #818cf8;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .cover-contact {
    font-size: 0.95em;
    color: #a5b4fc;
    font-weight: 500;
  }

  @media print {
    body { font-size: 13px; }
    .page { padding: 24px 32px; }
    h1, h2 { page-break-after: avoid; }
    pre, table, .mermaid-wrapper { page-break-inside: avoid; }
    .mermaid-wrapper { overflow: visible; }
    .cover-page { min-height: 100vh; }
  }
  /* ── Sequence diagram specific overrides ─────────────────────────── */
  /* Force white background — the SVG background rect sits at various
     levels depending on Mermaid version, so we target all of them */
  .mermaid-wrapper svg > rect,
  .mermaid-wrapper svg > g > rect:first-child,
  .mermaid-wrapper svg > g > rect.background {
    fill: #ffffff !important;
  }

  /* Actor / participant boxes (top + bottom) */
  .mermaid-wrapper svg .actor {
    fill: #eef2ff !important;
    stroke: #4f46e5 !important;
    stroke-width: 2px !important;
  }
  .mermaid-wrapper svg text.actor,
  .mermaid-wrapper svg .actor > text {
    fill: #1e1b4b !important;
    font-weight: 600 !important;
  }

  /* Lifeline vertical lines */
  .mermaid-wrapper svg .lifelineRect,
  .mermaid-wrapper svg line.lifeline-line,
  .mermaid-wrapper svg line[class*="lifeline"] {
    stroke: #6366f1 !important;
    stroke-width: 2px !important;
  }

  /* Message signal lines (solid ->> and dashed -->>) */
  .mermaid-wrapper svg .messageLine0,
  .mermaid-wrapper svg .messageLine1,
  .mermaid-wrapper svg line.messageLine0,
  .mermaid-wrapper svg line.messageLine1 {
    stroke: #312e81 !important;
    stroke-width: 2.5px !important;
  }

  /* Arrowhead markers (fill the polygon/path inside <marker>) */
  .mermaid-wrapper svg defs marker path,
  .mermaid-wrapper svg defs marker polygon {
    fill: #312e81 !important;
    stroke: #312e81 !important;
  }

  /* Message label text on arrows */
  .mermaid-wrapper svg .messageText,
  .mermaid-wrapper svg text.messageText {
    fill: #1e1b4b !important;
    stroke: none !important;
  }

  /* Note boxes */
  .mermaid-wrapper svg rect.note,
  .mermaid-wrapper svg .note rect {
    fill: #fef9c3 !important;
    stroke: #d97706 !important;
  }
  .mermaid-wrapper svg text.noteText,
  .mermaid-wrapper svg .note text {
    fill: #713f12 !important;
  }

  /* Activation boxes on lifelines */
  .mermaid-wrapper svg rect.activation0,
  .mermaid-wrapper svg rect.activation1,
  .mermaid-wrapper svg rect.activation2 {
    fill: #e0e7ff !important;
    stroke: #4f46e5 !important;
  }

</style>
</head>
<body>
<div class="cover-page">
  <div class="cover-inner">
    <div class="cover-logo">WORMHOLE // Shinodroid</div>
    <div class="cover-divider"></div>
    <div class="cover-title">Pitch Deck</div>
    <div class="cover-sub">Seed Round &nbsp;&bull;&nbsp; 2026</div>
    <div class="cover-tags">
      <span>Android Security Intelligence</span>
      <span>India-First SaaS</span>
      <span>AI-Powered Reports</span>
    </div>
    <div class="cover-confidential">CONFIDENTIAL &nbsp;&mdash;&nbsp; For authorised recipients only</div>
    <div class="cover-contact">support@wormhole.co.in</div>
  </div>
</div>
<div class="page">
${bodyHtml}
</div>

<script>
  mermaid.initialize({
    startOnLoad: true,
    theme: 'base',
    themeVariables: {
      // ── Pie chart slice colors — vivid and clearly distinct ──────────
      pie1:  '#ef4444',   // red
      pie2:  '#f97316',   // orange
      pie3:  '#eab308',   // yellow-amber
      pie4:  '#22c55e',   // green
      pie5:  '#3b82f6',   // blue
      pie6:  '#a855f7',   // purple
      pie7:  '#ec4899',   // pink
      pie8:  '#14b8a6',   // teal
      pie9:  '#f43f5e',   // rose
      pie10: '#84cc16',   // lime
      pie11: '#06b6d4',   // cyan
      pie12: '#8b5cf6',   // violet
      // ── Pie text ─────────────────────────────────────────────────────
      pieSectionTextColor: '#ffffff',
      pieSectionTextSize:  '14px',
      pieLegendTextColor:  '#1e1b4b',
      pieLegendTextSize:   '13px',
      // ── General theme ────────────────────────────────────────────────
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
      // ── Sequence diagram specific variables ────────────────────────
      signalColor:          '#312e81',   // arrow lines
      signalTextColor:      '#1e1b4b',   // text labels on arrows (dark — bg is white)
      actorLineColor:       '#6366f1',   // lifeline vertical lines
      activationBkgColor:   '#e0e7ff',   // activation box fill
      activationBorderColor:'#4f46e5',   // activation box border
      labelBoxBorderColor:  '#4f46e5',
      sequenceNumberColor:  '#ffffff',
    },
    flowchart:  { curve: 'basis', padding: 20, useMaxWidth: true },
    sequence:   { actorMargin: 60, useMaxWidth: true },
    gantt:      { useMaxWidth: true },
    pie:        { useMaxWidth: true, textPosition: 0.75 },
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
    svg.querySelectorAll("[clip-path]").forEach((el) => el.removeAttribute("clip-path"));
    svg.querySelectorAll("clipPath").forEach((el) => el.remove());
    svg.querySelectorAll("[style]").forEach((el) => {
      if (el.style.clipPath) el.style.clipPath = "none";
    });
    svg.style.overflow = "visible";
    if (svg.parentElement) svg.parentElement.style.overflow = "visible";

    // ── Step 2: Measure the REAL bounding box ────────────────────────
    // Three methods because getBBox() silently ignores <foreignObject>
    // elements — which is EXACTLY what Mermaid uses for HTML-label nodes
    // (htmlLabels:true). Without methods B and C, node labels get clipped.
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    function expand(x, y, w, h) {
      if (w <= 0 || h <= 0) return;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    // Method A: getBBox() on the SVG root — works for path, rect, text, g
    try { const b = svg.getBBox(); expand(b.x, b.y, b.width, b.height); } catch (e) { }

    // Method B: foreignObject explicit attributes.
    // Mermaid always sets x/y/width/height on <foreignObject> nodes.
    svg.querySelectorAll("foreignObject").forEach((fo) => {
      expand(
        parseFloat(fo.getAttribute("x") || "0"),
        parseFloat(fo.getAttribute("y") || "0"),
        parseFloat(fo.getAttribute("width") || "0"),
        parseFloat(fo.getAttribute("height") || "0")
      );
    });

    // Method C: getBoundingClientRect → SVG coordinate space.
    // Catches subgraph title labels and any element missed by A+B.
    try {
      const svgR = svg.getBoundingClientRect();
      if (svgR.width > 0 && svgR.height > 0) {
        const vbParts = (svg.getAttribute("viewBox") || "").split(/\s+/).map(Number);
        const vbW = (vbParts[2] > 0 ? vbParts[2] : svgR.width);
        const scale = vbW / svgR.width;
        svg.querySelectorAll("g, rect, text, foreignObject").forEach((el) => {
          try {
            const r = el.getBoundingClientRect();
            if (r.width <= 0 || r.height <= 0) return;
            expand(
              (r.left - svgR.left) * scale,
              (r.top - svgR.top) * scale,
              r.width * scale,
              r.height * scale
            );
          } catch (e) { }
        });
      }
    } catch (e) { }

    // Fallback: if all three methods failed, use SVG dimension attributes
    if (minX === Infinity) {
      minX = 0; minY = 0;
      maxX = parseFloat(svg.getAttribute("width")) || 800;
      maxY = parseFloat(svg.getAttribute("height")) || 400;
    }

    // ── Step 2b: Force background rect to white ─────────────────────
    // CSS !important can't always override Mermaid's inline SVG fills in
    // headless Chrome. We find the largest rect (almost certainly the
    // diagram background) and force it to white via JS setAttribute.
    let largestArea = 0;
    let bgRect = null;
    svg.querySelectorAll("rect").forEach((rect) => {
      const w = parseFloat(rect.getAttribute("width") || "0");
      const h = parseFloat(rect.getAttribute("height") || "0");
      const area = w * h;
      if (area > largestArea) { largestArea = area; bgRect = rect; }
    });
    if (bgRect && largestArea > 10000) {
      bgRect.setAttribute("fill", "#ffffff");
      bgRect.style.fill = "#ffffff";
      bgRect.removeAttribute("stroke");
    }

    // ── Step 3: Set viewBox with generous padding ────────────────────
    const pad = 50;
    svg.setAttribute(
      "viewBox",
      `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
    );
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    // ── Step 4: Remove hardcoded dimensions → CSS takes over ─────────
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.style.display = "block";
    svg.style.width = "100%";
    svg.style.maxWidth = "100%";
    svg.style.height = "auto";
    svg.style.overflow = "visible";
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

  // Extra settle time — complex diagrams need time after SVG appears
  // for all foreignObject text elements to be fully measured.
  await new Promise((r) => setTimeout(r, 2500));

  // Run the SVG fix inside the browser context
  await page.evaluate(svgFix);

  console.log("Diagrams fixed. Generating PDF...");

  await page.pdf({
    path: outputFile,
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
    displayHeaderFooter: true,
    headerTemplate: `<div style="font-size:9px;color:#6366f1;width:100%;display:flex;justify-content:space-between;padding:0 18mm;font-family:sans-serif;font-weight:600;letter-spacing:0.04em;"><span>WORMHOLE // Shinodroid</span><span style="color:#aaa;font-weight:400;">Pitch Deck 2026 &nbsp;|&nbsp; Confidential</span></div>`,
    footerTemplate: `<div style="font-size:9px;color:#aaa;width:100%;text-align:center;font-family:sans-serif;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  });

  await browser.close();
  console.log("PDF saved -> " + outputFile);
})();
