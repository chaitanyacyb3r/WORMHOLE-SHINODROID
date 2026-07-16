/**
 * Shinodroid -- AI Triage Engine (Phase 1)
 *
 * Runs LAST in the pipeline (type: "ai"), after all static/dynamic engines
 * have produced their findings. Uses a local Ollama model to generate a
 * comprehensive, documentation-grade security analysis report.
 *
 * Output:
 *   1. Visual analysis dashboards (Mermaid charts: severity pie, engine coverage,
 *      category breakdown, pipeline flow, attack trees, kill chain)
 *   2. Detailed executive summary with risk context
 *   3. Per-finding deep analysis (exploit scenarios, impact, remediation)
 *   4. Threat model with Mermaid attack flow diagrams
 *   5. OWASP MASVS compliance mapping for all findings
 *   6. Prioritized remediation roadmap with Gantt chart
 *   7. Full markdown report saved to the scan output directory
 *
 * Connects to Ollama at http://127.0.0.1:11434 (default).
 * Model: minimax-m2.7:cloud (configurable via OLLAMA_MODEL env var).
 *
 * Graceful degradation: if Ollama is not running or the model is not
 * available, the engine returns skipped=true and the pipeline continues.
 */

import { createFinding } from "./_engine-interface.mjs";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { ComplianceMapper } from "../src/utils/compliance-map.mjs";

// -- Configuration ------------------------------------------------------------

const OLLAMA_BASE = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "minimax-m2.7:cloud";
const REQUEST_TIMEOUT_MS = 180_000; // 3 min per LLM call (detailed analysis needs time)
const MAX_FINDINGS_PER_BATCH = 20;  // Process findings in batches of this size

// -- Ollama REST helper -------------------------------------------------------

/**
 * Send a chat completion request to Ollama's /api/chat endpoint.
 * Returns the assistant's response text, or null on failure.
 */
async function ollamaChat(systemPrompt, userPrompt, log) {
    const url = `${OLLAMA_BASE}/api/chat`;
    const body = {
        model: OLLAMA_MODEL,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        stream: false,
        options: {
            temperature: 0.3,
            num_predict: 8192,
        },
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!res.ok) {
            const errText = await res.text().catch(() => "unknown error");
            log?.("warn", `  Ollama returned ${res.status}: ${errText.substring(0, 200)}`);
            return null;
        }

        const data = await res.json();
        return data?.message?.content || null;
    } catch (err) {
        if (err.name === "AbortError") {
            log?.("warn", `  Ollama request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
        } else {
            log?.("warn", `  Ollama request failed: ${err.message}`);
        }
        return null;
    }
}

// -- System prompt ------------------------------------------------------------

const SYSTEM_PROMPT = `You are Shinodroid AI, a principal-level Android application security analyst
with 20+ years of experience in mobile penetration testing, OWASP MASVS auditing,
and vulnerability research. You are writing a professional security assessment report
that will be read by developers, security teams, and management.

Your analysis must be:
- THOROUGH: Cover every finding in detail, not just surface-level descriptions
- TECHNICAL: Include exact class names, method signatures, attack vectors, and PoC steps
- ACTIONABLE: Every finding must have specific, implementable remediation steps
- CONTEXTUAL: Explain the real-world impact for THIS specific application
- STRUCTURED: Use clear sections, severity ratings, and OWASP MASVS references

When analyzing findings, reason through:
1. What is the vulnerability? (precise technical description)
2. Why does it matter for this app? (context-specific impact assessment)
3. How could an attacker exploit it? (step-by-step attack scenario)
4. What is the blast radius? (what data/systems are at risk)
5. How should it be fixed? (specific code changes, not generic advice)
6. What OWASP MASVS requirement does this violate?`;

// -- Mermaid diagram generators (programmatic, not LLM) ----------------------

/**
 * Build all Mermaid diagrams from raw finding data.
 * These are generated programmatically for accuracy (not by the LLM).
 */
function buildMermaidDiagrams(appName, findings, engines) {
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
        sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;
    }

    // Category counts
    const catCounts = {};
    for (const f of findings) {
        catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    }

    // Engine counts
    const engCounts = {};
    for (const f of findings) {
        engCounts[f.engine] = (engCounts[f.engine] || 0) + 1;
    }

    // 1. Severity distribution pie chart
    const severityPie = `\`\`\`mermaid
pie title Finding Severity Distribution
${sevCounts.critical > 0 ? `    "Critical (${sevCounts.critical})" : ${sevCounts.critical}` : ""}
${sevCounts.high > 0 ? `    "High (${sevCounts.high})" : ${sevCounts.high}` : ""}
${sevCounts.medium > 0 ? `    "Medium (${sevCounts.medium})" : ${sevCounts.medium}` : ""}
${sevCounts.low > 0 ? `    "Low (${sevCounts.low})" : ${sevCounts.low}` : ""}
${sevCounts.info > 0 ? `    "Info (${sevCounts.info})" : ${sevCounts.info}` : ""}
\`\`\``;

    // 2. Engine coverage pie chart
    const enginePie = `\`\`\`mermaid
pie title Findings by Analysis Engine
${Object.entries(engCounts).map(([eng, cnt]) => `    "${eng} (${cnt})" : ${cnt}`).join("\n")}
\`\`\``;

    // 3. Category breakdown (Pie Chart to prevent label overlapping)
    const topCats = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    const categoryChart = `\`\`\`mermaid
pie title Findings by Category
${topCats.map(([cat, cnt]) => `    "${cat.substring(0, 30).replace(/"/g, "'")}${cat.length > 30 ? '...' : ''} (${cnt})" : ${cnt}`).join("\n")}
\`\`\``;

    // 4. Scan pipeline flow diagram
    const pipelineFlow = `\`\`\`mermaid
flowchart LR
    APK["APK Upload"] --> STATIC["Static Analysis"]
    APK --> DYNAMIC["Dynamic Analysis"]
    STATIC --> |"MobSF"| FINDINGS[("Findings DB")]
    STATIC --> |"Androwarn"| FINDINGS
    STATIC --> |"Firebase"| FINDINGS
    DYNAMIC --> |"Frida Scripts"| FINDINGS
    DYNAMIC --> |"Logcat"| FINDINGS
    FINDINGS --> AI["AI Triage Engine"]
    AI --> REPORT["Security Report"]
    AI --> DASHBOARD["Dashboard"]

    style APK fill:#4a90d9,color:#fff
    style AI fill:#e74c3c,color:#fff
    style REPORT fill:#2ecc71,color:#fff
    style FINDINGS fill:#f39c12,color:#fff
\`\`\``;

    // 5. Risk matrix (quadrant chart)
    const riskMatrix = `\`\`\`mermaid
quadrantChart
    title Risk Assessment Matrix
    x-axis "Low Likelihood" --> "High Likelihood"
    y-axis "Low Impact" --> "High Impact"
    quadrant-1 "Critical Risk"
    quadrant-2 "Monitor"
    quadrant-3 "Accept"
    quadrant-4 "Mitigate"
${findings.slice(0, 12).map((f, i) => {
        const x = f.severity === "critical" ? 0.85 : f.severity === "high" ? 0.7 : f.severity === "medium" ? 0.45 : 0.25;
        const y = f.severity === "critical" ? 0.9 : f.severity === "high" ? 0.75 : f.severity === "medium" ? 0.5 : 0.3;
        const jitter = (i * 0.04) % 0.15;
        return `    "F${i + 1}": [${Math.min(x + jitter, 0.95).toFixed(2)}, ${Math.min(y + jitter, 0.95).toFixed(2)}]`;
    }).join("\n")}
\`\`\``;

    return `## Visual Analysis Dashboard

### Severity Distribution

${severityPie}

### Findings by Engine

${enginePie}

### Category Breakdown

${categoryChart}

### Risk Assessment Matrix

> F1-F${Math.min(findings.length, 12)} represent the top findings by severity. Quadrant placement indicates risk priority.

${riskMatrix}

### Analysis Pipeline

${pipelineFlow}

---

`;
}

// -- Prompt builders ----------------------------------------------------------

function buildExecutiveSummaryPrompt(appName, packageName, findings) {
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
        sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;
    }

    const categories = [...new Set(findings.map(f => f.category))];
    const engines = [...new Set(findings.map(f => f.engine))];

    return `Write a detailed executive summary for this Android security assessment.

APPLICATION: ${appName}
PACKAGE: ${packageName || "unknown"}
ANALYSIS ENGINES: ${engines.join(", ")}
TOTAL FINDINGS: ${findings.length}
SEVERITY BREAKDOWN: Critical=${sevCounts.critical}, High=${sevCounts.high}, Medium=${sevCounts.medium}, Low=${sevCounts.low}, Info=${sevCounts.info}
CATEGORIES: ${categories.join(", ")}

TOP FINDINGS BY SEVERITY:
${findings.slice(0, 20).map((f, i) =>
        `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} (${f.category}) [Engine: ${f.engine}]`
    ).join("\n")}

Write the executive summary as a comprehensive narrative (NOT JSON). Include:
1. Overall security posture assessment (1 paragraph)
2. Risk rating with justification (Critical/High/Medium/Low)
3. Key attack surface areas identified
4. Most impactful vulnerabilities that need immediate attention
5. Areas where the application demonstrates good security practices (if any)
6. Compliance status against OWASP MASVS Level 1

Write in professional report language. Be specific to this application, not generic.`;
}

function buildDetailedAnalysisPrompt(findings, batchIndex) {
    const findingDescriptions = findings.map((f, i) => {
        const complianceInfo = f.compliance?.masvs?.length
            ? `Pre-Mapped MASVS: ${f.compliance.masvs.map(m => m.id).join(", ")}
Mobile Top 10: ${f.compliance.mobile_top10 || "N/A"}
GDPR: ${f.compliance.gdpr || "N/A"}
DPDPA 2023: ${f.compliance.dpdpa || "N/A"}
PCI-DSS: ${f.compliance.pci_dss || "N/A"}`
            : "Compliance: Not yet mapped";

        return `--- FINDING ${batchIndex + i + 1} ---
Title: ${f.title}
Severity: ${f.severity}
Category: ${f.category}
Engine: ${f.engine}
Description: ${(f.description || "").substring(0, 500)}
Current Recommendation: ${(f.recommendation || "").substring(0, 200)}
OWASP Category: ${f.owasp_category || "Not mapped"}
${complianceInfo}`;
    }).join("\n\n");

    return `Perform a detailed security analysis of each finding below. For EACH finding, provide:

${findingDescriptions}

For EACH finding above, write a detailed analysis section containing:
1. **Technical Description**: What exactly is the vulnerability? Include relevant Android APIs, classes, or patterns involved.
2. **Attack Scenario**: Step-by-step exploit walkthrough. How would a real attacker weaponize this?
3. **Impact Assessment**: What data, functionality, or users are at risk? Rate the business impact.
4. **OWASP MASVS Mapping**: Which MASVS requirement (MSTG-xxx-N) does this violate? Which MASVS level (L1/L2) requires this?
5. **Remediation**: Specific, implementable fixes. Include code patterns or configuration changes where applicable.
6. **Verification**: How to verify the fix was applied correctly.

Use markdown formatting. Label each finding clearly with its number and title.`;
}

function buildThreatModelPrompt(appName, findings) {
    const criticalAndHigh = findings
        .filter(f => f.severity === "critical" || f.severity === "high")
        .slice(0, 10);

    const categories = [...new Set(findings.map(f => f.category))];

    return `You are building a threat model for the Android application "${appName}".

Vulnerability categories found: ${categories.join(", ")}

Critical and High severity findings:
${criticalAndHigh.map((f, i) =>
        `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} -- ${(f.description || "").substring(0, 150)}`
    ).join("\n")}

Generate the following TWO Mermaid diagrams:

### 1. Attack Tree Diagram
Create a Mermaid flowchart (top-down) showing how an attacker could chain these vulnerabilities.
The root node should be the attacker's ultimate goal (e.g., "Compromise User Data").
Branch into attack paths, each leading through one or more vulnerabilities.
Use descriptive node labels. Color critical nodes red, high nodes orange.

Example format:
\`\`\`mermaid
flowchart TD
    ROOT["Attacker Goal: Compromise App"]
    ROOT --> PATH1["Via Network"]
    ROOT --> PATH2["Via Storage"]
    PATH1 --> V1["SSL Pinning Bypass"]
    style V1 fill:#e74c3c,color:#fff
\`\`\`

### 2. Kill Chain Diagram
Create a Mermaid flowchart (left-to-right) showing the cyber kill chain stages
and which findings map to each stage:
- Reconnaissance
- Weaponization
- Delivery
- Exploitation
- Installation
- Command & Control
- Actions on Objective

Example format:
\`\`\`mermaid
flowchart LR
    R["Reconnaissance"] --> W["Weaponization"]
    W --> D["Delivery"]
    subgraph Exploitation
        E1["Finding 1"]
        E2["Finding 2"]
    end
\`\`\`

Generate both diagrams with proper Mermaid syntax. Use the ACTUAL finding titles from above.
Wrap each diagram in \`\`\`mermaid code blocks.`;
}

function buildRemediationRoadmapPrompt(findings) {
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
        sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;
    }

    const criticals = findings.filter(f => f.severity === "critical" || f.severity === "high");

    return `Create a prioritized remediation roadmap for this Android application based on the ${findings.length} findings (${sevCounts.critical} critical, ${sevCounts.high} high, ${sevCounts.medium} medium, ${sevCounts.low} low).

Critical and High findings that need immediate attention:
${criticals.slice(0, 15).map((f, i) =>
        `${i + 1}. [${f.severity.toUpperCase()}] ${f.title} (${f.category})`
    ).join("\n")}

Create a remediation roadmap with these sections:
1. **Phase 1 - Immediate (Week 1)**: Critical and high-severity issues that pose active exploitation risk
2. **Phase 2 - Short-term (Weeks 2-4)**: Medium-severity issues and defense-in-depth improvements
3. **Phase 3 - Long-term (Month 2+)**: Low-severity hardening and security architecture improvements

For each phase, list:
- Specific findings to address (by title)
- Estimated effort (hours/days)
- Dependencies between fixes
- Testing requirements after remediation

Also include:

### Remediation Timeline (Gantt Chart)
Generate a Mermaid Gantt chart showing the remediation timeline:
\`\`\`mermaid
gantt
    title Remediation Timeline
    dateFormat YYYY-MM-DD
    section Phase 1 - Critical
    ...
\`\`\`

### MASVS Compliance State Diagram
Generate a Mermaid state diagram showing MASVS-L1 compliance:
\`\`\`mermaid
stateDiagram-v2
    [*] --> NETWORK: MSTG-NETWORK
    NETWORK --> PASS: Compliant
    NETWORK --> FAIL: Non-compliant
    ...
\`\`\`

Include a **MASVS Compliance Checklist** showing which MASVS-L1 requirements are met vs. failed based on the findings.

Write in professional report format with markdown.`;
}

// -- Report assembly ----------------------------------------------------------

function buildReportHeader(appName, packageName, findings, engines) {
    const now = new Date().toISOString().split("T")[0];
    const sevCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    for (const f of findings) {
        sevCounts[f.severity] = (sevCounts[f.severity] || 0) + 1;
    }

    return `# Shinodroid AI Security Analysis Report

> **Application:** ${appName}
> **Package:** ${packageName || "N/A"}
> **Date:** ${now}
> **Model:** ${OLLAMA_MODEL}
> **Engines:** ${engines.join(", ")}
> **Total Findings:** ${findings.length}

| Severity | Count |
|----------|-------|
| Critical | ${sevCounts.critical} |
| High | ${sevCounts.high} |
| Medium | ${sevCounts.medium} |
| Low | ${sevCounts.low} |
| Info | ${sevCounts.info} |

---

`;
}

// -- Post-processing: ensure Mermaid fencing ----------------------------------

/**
 * LLMs often output Mermaid code without proper ```mermaid fences, or with
 * the fences stripped during response parsing. This function scans the
 * markdown for unfenced Mermaid blocks and wraps them properly.
 */
function ensureMermaidFencing(markdown) {
    // Mermaid diagram start keywords
    const MERMAID_STARTS = [
        "flowchart ", "flowchart\n",
        "graph ", "graph\n",
        "sequenceDiagram", "classDiagram",
        "stateDiagram", "erDiagram",
        "gantt", "pie ",
        "pie\n", "xychart",
        "quadrantChart", "mindmap",
        "timeline", "gitGraph",
        "journey",
    ];

    // Split into lines and process
    const lines = markdown.split("\n");
    const result = [];
    let inCodeBlock = false;
    let inMermaidBlock = false;
    let mermaidBuffer = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Track existing code blocks
        if (trimmed.startsWith("```")) {
            if (!inCodeBlock) {
                inCodeBlock = true;
                if (trimmed.includes("mermaid")) {
                    // Already properly fenced
                }
            } else {
                inCodeBlock = false;
            }
            result.push(line);
            continue;
        }

        // If inside a code block, pass through
        if (inCodeBlock) {
            result.push(line);
            continue;
        }

        // Check if this line starts a Mermaid block (unfenced)
        if (!inMermaidBlock && MERMAID_STARTS.some(s => trimmed.startsWith(s))) {
            inMermaidBlock = true;
            mermaidBuffer = [line];
            continue;
        }

        // If in an unfenced Mermaid block, collect lines until we hit
        // a blank line followed by non-mermaid content, or a markdown heading
        if (inMermaidBlock) {
            if (trimmed === "" && i + 1 < lines.length) {
                const nextTrimmed = lines[i + 1].trim();
                // End of Mermaid if next line is a heading, horizontal rule, or new section
                if (nextTrimmed.startsWith("#") || nextTrimmed.startsWith("---") ||
                    nextTrimmed.startsWith(">") || nextTrimmed.startsWith("*") ||
                    nextTrimmed.startsWith("-") || nextTrimmed.startsWith("1.") ||
                    nextTrimmed.startsWith("| ")) {
                    // Close the Mermaid block
                    result.push("```mermaid");
                    result.push(...mermaidBuffer);
                    result.push("```");
                    result.push("");
                    inMermaidBlock = false;
                    mermaidBuffer = [];
                    continue;
                }
            }
            // classDef or style lines are still Mermaid
            mermaidBuffer.push(line);
            continue;
        }

        result.push(line);
    }

    // Flush any remaining Mermaid block
    if (inMermaidBlock && mermaidBuffer.length > 0) {
        result.push("```mermaid");
        result.push(...mermaidBuffer);
        result.push("```");
    }

    return result.join("\n");
}


// -- PDF via reporting/convert.js --------------------------------------------

/**
 * Delegate PDF generation to the dedicated reporting/convert.js tool.
 * That converter has:
 *   - Full Chrome/Edge detection
 *   - SVG clip-path removal (prevents clipped Mermaid diagrams)
 *   - Professional Mermaid theme (indigo, A4, page numbers)
 *   - Correct waitForFunction — waits until every <pre class="mermaid">
 *     has been replaced with an <svg> before printing
 *
 * @param {string} mdPath   - Absolute path to the markdown report
 * @param {string} pdfPath  - Desired output PDF path
 * @param {Function} log
 * @returns {Promise<boolean>}
 */
async function generatePdfViaReporter(mdPath, pdfPath, log) {
    try {
        const { execFile } = await import("node:child_process");
        const { promisify } = await import("node:util");
        const { fileURLToPath } = await import("node:url");
        const execFileAsync = promisify(execFile);

        // Path to the reporting converter — relative to this engine file
        const engineDir = fileURLToPath(new URL(".", import.meta.url));
        const converterPath = join(engineDir, "..", "reporting", "convert.js");

        log("info", `[AI] Generating PDF via reporting/convert.js...`);

        const { stdout, stderr } = await execFileAsync(
            process.execPath,           // use the same node binary
            [converterPath, mdPath, pdfPath],
            { timeout: 120_000 }        // 2-min timeout
        );

        if (stdout) stdout.split("\n").filter(Boolean).forEach(l => log("info", `[AI] [converter] ${l}`));
        if (stderr) stderr.split("\n").filter(Boolean).forEach(l => log("warn", `[AI] [converter] ${l}`));

        return true;
    } catch (err) {
        log("warn", `[AI] PDF generation via converter failed: ${err.message}`);
        return false;
    }
}


// -- HTML report generator ----------------------------------------------------

/**
 * Convert the markdown report to a self-contained HTML file with:
 * - Mermaid.js (CDN) for diagram rendering
 * - marked.js (CDN) for markdown rendering
 * - Professional dark-themed stylesheet
 *
 * The HTML file opens in any browser and renders all Mermaid charts.
 */
function markdownToHtml(markdownContent, appName) {
    // Escape the markdown for embedding in a JS string
    const escapedMd = markdownContent
        .replace(/\\/g, "\\\\")
        .replace(/`/g, "\\`")
        .replace(/\$/g, "\\$");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shinodroid AI Security Report - ${appName}</title>
    <style>
        :root {
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #e6edf3;
            --text-secondary: #8b949e;
            --accent-red: #f85149;
            --accent-orange: #d29922;
            --accent-green: #3fb950;
            --accent-blue: #58a6ff;
            --accent-purple: #bc8cff;
            --border: #30363d;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            max-width: 1100px;
            margin: 0 auto;
            padding: 40px 32px;
        }

        h1 {
            font-size: 2em;
            border-bottom: 2px solid var(--accent-purple);
            padding-bottom: 12px;
            margin: 32px 0 16px;
        }

        h2 {
            font-size: 1.5em;
            color: var(--accent-blue);
            border-bottom: 1px solid var(--border);
            padding-bottom: 8px;
            margin: 32px 0 16px;
        }

        h3 {
            font-size: 1.2em;
            color: var(--accent-purple);
            margin: 24px 0 12px;
        }

        p { margin: 8px 0; }

        blockquote {
            border-left: 4px solid var(--accent-blue);
            background: var(--bg-secondary);
            padding: 12px 20px;
            margin: 16px 0;
            border-radius: 0 8px 8px 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0;
            background: var(--bg-secondary);
            border-radius: 8px;
            overflow: hidden;
        }

        th {
            background: var(--bg-tertiary);
            padding: 12px 16px;
            text-align: left;
            font-weight: 600;
            color: var(--accent-blue);
        }

        td {
            padding: 10px 16px;
            border-top: 1px solid var(--border);
        }

        tr:hover td { background: var(--bg-tertiary); }

        code {
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Cascadia Code', 'Fira Code', monospace;
            font-size: 0.9em;
        }

        pre {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 16px;
            overflow-x: auto;
            margin: 16px 0;
        }

        pre code {
            background: none;
            padding: 0;
        }

        .mermaid {
            background: #ffffff;
            border-radius: 12px;
            padding: 24px;
            margin: 20px 0;
            border: 1px solid var(--border);
            text-align: center;
            box-shadow: 0 2px 12px rgba(0,0,0,0.18);
        }

        /* Make SVG inside mermaid blocks fill the container nicely */
        .mermaid svg {
            max-width: 100% !important;
            height: auto !important;
            display: block;
            margin: 0 auto;
        }

        hr {
            border: none;
            border-top: 1px solid var(--border);
            margin: 32px 0;
        }

        ul, ol {
            padding-left: 24px;
            margin: 8px 0;
        }

        li { margin: 4px 0; }

        strong { color: var(--accent-orange); }

        a { color: var(--accent-blue); text-decoration: none; }
        a:hover { text-decoration: underline; }

        .report-header {
            text-align: center;
            padding: 32px 0;
            border-bottom: 2px solid var(--accent-purple);
            margin-bottom: 32px;
        }

        .report-header h1 {
            border: none;
            font-size: 2.2em;
            background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        @media print {
            body { background: #fff; color: #000; max-width: none; }
            .mermaid { border: 1px solid #ccc; }
            h2 { color: #1a56db; }
            h3 { color: #6b21a8; }
        }
    </style>
</head>
<body>
    <div id="report-content"></div>

    <!-- marked.js for markdown rendering -->
    <script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"><\\/script>
    <!-- Mermaid.js for diagram rendering -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"><\\/script>

    <script>
        // Initialize Mermaid — use 'base' theme with explicit vivid pie colors
        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            themeVariables: {
                // ── Pie chart slice colors — vivid and clearly distinct ──────
                pie1:  '#ef4444',   // red
                pie2:  '#f97316',   // orange
                pie3:  '#eab308',   // yellow
                pie4:  '#22c55e',   // green
                pie5:  '#3b82f6',   // blue
                pie6:  '#a855f7',   // purple
                pie7:  '#ec4899',   // pink
                pie8:  '#14b8a6',   // teal
                pie9:  '#f43f5e',   // rose
                pie10: '#84cc16',   // lime
                pie11: '#06b6d4',   // cyan
                pie12: '#8b5cf6',   // violet
                // ── General theme ───────────────────────────────────────────
                primaryColor:        '#e0e7ff',
                primaryTextColor:    '#1e1b4b',
                primaryBorderColor:  '#4f46e5',
                lineColor:           '#6366f1',
                secondaryColor:      '#f5f3ff',
                tertiaryColor:       '#e0e7ff',
                background:          '#ffffff',
                mainBkg:             '#e0e7ff',
                nodeBorder:          '#4f46e5',
                edgeLabelBackground: '#f5f3ff',
                titleColor:          '#1e1b4b',
                fontSize:            '14px',
                pieSectionTextColor: '#ffffff',
                pieSectionTextSize:  '14px',
                pieLegendTextColor:  '#1e1b4b',
                pieLegendTextSize:   '13px',
            },
            flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
            pie:        { useMaxWidth: true, textPosition: 0.75 },
            gantt:      { useMaxWidth: true },
            sequence:   { useMaxWidth: true, actorMargin: 50 },
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            securityLevel: 'loose',
        });


        // Render markdown
        const md = \`${escapedMd}\`;
        const html = marked.parse(md);
        document.getElementById('report-content').innerHTML = html;

        // Process Mermaid blocks: find all <code class="language-mermaid"> and render
        async function renderMermaid() {
            const codeBlocks = document.querySelectorAll('code.language-mermaid');
            for (let i = 0; i < codeBlocks.length; i++) {
                const pre = codeBlocks[i].parentElement;
                const mermaidCode = codeBlocks[i].textContent;
                const div = document.createElement('div');
                div.className = 'mermaid';
                div.textContent = mermaidCode;
                pre.replaceWith(div);
            }
            // Also check for <pre><code> without language class but with mermaid content
            document.querySelectorAll('pre code').forEach((block) => {
                const text = block.textContent.trim();
                const mermaidKeywords = ['flowchart ', 'graph ', 'pie ', 'gantt',
                    'sequenceDiagram', 'stateDiagram', 'xychart', 'quadrantChart',
                    'erDiagram', 'classDiagram', 'mindmap', 'timeline', 'gitGraph'];
                if (mermaidKeywords.some(k => text.startsWith(k))) {
                    const pre = block.parentElement;
                    const div = document.createElement('div');
                    div.className = 'mermaid';
                    div.textContent = text;
                    pre.replaceWith(div);
                }
            });
            await mermaid.run();
        }
        renderMermaid();
    <\\/script>
</body>
</html>`;
}

// -- Engine definition --------------------------------------------------------

export default {
    name: "AI Security Triage",
    type: "ai",
    version: "1.0.0",

    /**
     * Check if Ollama is running and the model is available.
     */
    async isAvailable() {
        if (process.env.SKIP_AI) return false;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);

            const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
                signal: controller.signal,
            });

            clearTimeout(timeout);
            if (!res.ok) return false;

            const data = await res.json();
            const models = (data?.models || []).map(m => m.name || "");

            return models.some(name =>
                name === OLLAMA_MODEL ||
                name.startsWith(OLLAMA_MODEL.split(":")[0])
            );
        } catch {
            return false;
        }
    },

    /**
     * Run comprehensive AI security analysis on all findings.
     */
    async run(apkPath, context) {
        const start = Date.now();
        const log = context.log || (() => { });
        const allFindings = context.allFindings || [];

        if (allFindings.length === 0) {
            log("info", "[AI] No findings to analyze, skipping");
            return {
                engine: "ai",
                success: true,
                skipped: true,
                findings: [],
                metadata: { reason: "No findings from other engines to analyze" },
                durationMs: Date.now() - start,
            };
        }

        const appName = context.packageName || context.fileName || "Unknown App";
        const packageName = context.packageName || null;
        const engines = [...new Set(allFindings.map(f => f.engine))];

        log("info", `[AI] Starting comprehensive analysis of ${allFindings.length} findings with ${OLLAMA_MODEL}...`);

        // Sort findings by severity (critical first)
        const sorted = [...allFindings]
            .sort((a, b) => (b.severity_order || 0) - (a.severity_order || 0));

        const reportSections = [];
        const metadata = {
            model: OLLAMA_MODEL,
            findingsAnalyzed: allFindings.length,
            sectionsGenerated: 0,
            reportPath: null,
        };

        // ---- Section 1: Report header -----------------------------------
        reportSections.push(buildReportHeader(appName, packageName, allFindings, engines));

        // ---- Section 2: Mermaid visual dashboards (programmatic) ---------
        log("info", "[AI] Generating visual analysis dashboards...");
        reportSections.push(buildMermaidDiagrams(appName, sorted, engines));
        metadata.sectionsGenerated++;

        // ---- Section 3: Executive summary (LLM call 1) ------------------
        log("info", "[AI] [1/4] Generating executive summary...");
        context.onProgress?.("[AI] Generating executive summary...");

        const execSummary = await ollamaChat(
            SYSTEM_PROMPT,
            buildExecutiveSummaryPrompt(appName, packageName, sorted),
            log,
        );

        if (execSummary) {
            reportSections.push("## Executive Summary\n\n" + execSummary + "\n\n---\n\n");
            metadata.sectionsGenerated++;
            log("ok", "[AI] Executive summary complete");
        } else {
            reportSections.push("## Executive Summary\n\n*AI analysis unavailable for this section.*\n\n---\n\n");
        }

        // ---- Section 4: Detailed per-finding analysis (LLM call 2+) -----
        log("info", "[AI] [2/4] Generating detailed finding analysis...");
        context.onProgress?.("[AI] Analyzing individual findings...");

        reportSections.push("## Detailed Finding Analysis\n\n");

        // Process in batches to avoid overwhelming the model
        for (let i = 0; i < sorted.length; i += MAX_FINDINGS_PER_BATCH) {
            const batch = sorted.slice(i, i + MAX_FINDINGS_PER_BATCH);
            const batchNum = Math.floor(i / MAX_FINDINGS_PER_BATCH) + 1;
            const totalBatches = Math.ceil(sorted.length / MAX_FINDINGS_PER_BATCH);

            log("info", `[AI]   Batch ${batchNum}/${totalBatches} (findings ${i + 1}-${i + batch.length})...`);

            const analysis = await ollamaChat(
                SYSTEM_PROMPT,
                buildDetailedAnalysisPrompt(batch, i),
                log,
            );

            if (analysis) {
                reportSections.push(analysis + "\n\n");
                metadata.sectionsGenerated++;
            } else {
                // Fallback: at least list the findings without AI enrichment
                for (const f of batch) {
                    reportSections.push(
                        `### ${f.title}\n\n` +
                        `- **Severity:** ${f.severity}\n` +
                        `- **Category:** ${f.category}\n` +
                        `- **Engine:** ${f.engine}\n` +
                        `- **Description:** ${f.description || "N/A"}\n` +
                        `- **Recommendation:** ${f.recommendation || "N/A"}\n\n`
                    );
                }
            }
        }

        reportSections.push("---\n\n");

        // ---- Section 5: Threat model with attack diagrams (LLM call) -----
        log("info", "[AI] [3/4] Generating threat model diagrams...");
        context.onProgress?.("[AI] Building threat model...");

        const threatModel = await ollamaChat(
            SYSTEM_PROMPT,
            buildThreatModelPrompt(appName, sorted),
            log,
        );

        if (threatModel) {
            reportSections.push("## Threat Model\n\n" + threatModel + "\n\n---\n\n");
            metadata.sectionsGenerated++;
            log("ok", "[AI] Threat model with attack diagrams complete");
        }

        // ---- Section 6: Remediation roadmap (LLM call) -------------------
        log("info", "[AI] [4/4] Generating remediation roadmap...");
        context.onProgress?.("[AI] Building remediation roadmap...");

        const roadmap = await ollamaChat(
            SYSTEM_PROMPT,
            buildRemediationRoadmapPrompt(sorted),
            log,
        );

        if (roadmap) {
            reportSections.push("## Remediation Roadmap\n\n" + roadmap + "\n\n---\n\n");
            metadata.sectionsGenerated++;
            log("ok", "[AI] Remediation roadmap complete");
        }
        // ---- Section 7: Compliance Mapping (programmatic) ----------------
        log("info", "[AI] Generating compliance mapping (MASVS, GDPR, DPDPA, PCI-DSS)...");
        context.onProgress?.("[AI] Building compliance mapping...");
        const complianceSection = ComplianceMapper.buildComplianceMarkdown(sorted);
        reportSections.push(complianceSection + "\n\n---\n\n");
        metadata.sectionsGenerated++;
        log("ok", "[AI] Compliance mapping complete");

        // ---- Section 8: Footer ------------------------------------------
        const elapsed = ((Date.now() - start) / 1000).toFixed(1);
        reportSections.push(
            `## Report Metadata\n\n` +
            `- **Generated by:** Shinodroid AI Engine v1.0.0\n` +
            `- **Model:** ${OLLAMA_MODEL}\n` +
            `- **Analysis time:** ${elapsed}s\n` +
            `- **Findings analyzed:** ${allFindings.length}\n` +
            `- **Sections generated:** ${metadata.sectionsGenerated}\n` +
            `- **Date:** ${new Date().toISOString()}\n`
        );

        // ---- Save report to disk ----------------------------------------
        let fullReport = reportSections.join("");

        // Post-process: ensure all Mermaid code is properly fenced
        fullReport = ensureMermaidFencing(fullReport);

        try {
            const outDir = context.outDir || ".";
            await mkdir(outDir, { recursive: true });

            // Save markdown report
            const mdPath = join(outDir, "ai-security-analysis.md");
            await writeFile(mdPath, fullReport, "utf-8");
            metadata.reportPath = mdPath;
            log("ok", `[AI] Markdown report saved to ${mdPath}`);

            // Save HTML report (for browser viewing with interactive Mermaid charts)
            const htmlPath = join(outDir, "ai-security-analysis.html");
            const htmlReport = markdownToHtml(fullReport, appName);
            await writeFile(htmlPath, htmlReport, "utf-8");
            metadata.htmlReportPath = htmlPath;
            log("ok", `[AI] HTML report saved to ${htmlPath}`);

            // Generate PDF via reporting/convert.js (Mermaid rendered as real SVGs)
            context.onProgress?.("[AI] Generating PDF via reporting engine...");
            const pdfPath = join(outDir, "ai-security-analysis.pdf");
            const pdfOk = await generatePdfViaReporter(mdPath, pdfPath, log);
            if (pdfOk) {
                metadata.pdfReportPath = pdfPath;
                log("ok", `[AI] PDF with rendered Mermaid diagrams saved to ${pdfPath}`);
            } else {
                log("warn", "[AI] PDF generation skipped — run: node reporting/convert.js <report.md> to generate manually");
            }
        } catch (writeErr) {
            log("warn", `[AI] Could not save report file: ${writeErr.message}`);
        }

        // ---- Build findings for the pipeline ----------------------------
        const aiFindings = [];

        // Summary finding
        aiFindings.push(createFinding({
            title: "AI Security Analysis Report Generated",
            severity: "info",
            category: "AI Assessment",
            description: [
                `Comprehensive AI security analysis completed using ${OLLAMA_MODEL}.`,
                `Analyzed ${allFindings.length} findings across ${engines.length} engines.`,
                `Generated ${metadata.sectionsGenerated} report sections in ${elapsed}s.`,
                metadata.reportPath ? `Full report: ${metadata.reportPath}` : "",
            ].filter(Boolean).join("\n"),
            recommendation: "Review the full AI analysis report for detailed findings, exploit scenarios, and remediation guidance.",
        }, "ai", context.scanId));

        log("ok", `[AI] Analysis complete: ${metadata.sectionsGenerated} sections, ${elapsed}s`);

        return {
            engine: "ai",
            success: true,
            findings: aiFindings,
            metadata,
            durationMs: Date.now() - start,
        };
    },
};
