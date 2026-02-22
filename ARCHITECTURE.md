# 📐 ARCHITECTURE.md — OpenClaw Security Integrity

> **Version:** 1.0.0 &nbsp;|&nbsp; **Last Updated:** 2026-02-22 &nbsp;|&nbsp; **Maintainer:** elliot

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Component Inventory](#3-component-inventory)
4. [Data Flow](#4-data-flow)
5. [Control Flow](#5-control-flow)
6. [Module Reference](#6-module-reference)
7. [API Reference](#7-api-reference)
8. [Configuration Reference](#8-configuration-reference)
9. [Security Model](#9-security-model)
10. [Deployment & Infrastructure](#10-deployment--infrastructure)
11. [Contributing Guide](#11-contributing-guide)

---

## 1. Project Overview

### 1.1 Purpose

**OpenClaw Security Integrity** is an automated Android application security analysis platform that combines three industry tools into a single drop-and-scan pipeline:

| Tool | Analysis Type | Automation Level |
|------|--------------|------------------|
| **MobSF** (Mobile Security Framework) | Static analysis — code, permissions, manifest, cryptography | Fully automated per APK |
| **Frida** | Dynamic instrumentation — SSL pinning bypass, root detection bypass, runtime hooking | Fully automated per APK (requires emulator) |
| **BrutDroid** | Emulator provisioning — create, root, configure Android emulators | One-time manual setup |

### 1.2 Key Capabilities

- **Drop-and-scan**: Place an APK in `C:\MobSF-Scans\inbox` → get full static + dynamic reports
- **Telegram integration**: Upload APKs via Telegram bot → receive formatted security reports
- **OpenClaw agent tools**: 7 registered tools for AI-assisted security workflows
- **Graceful degradation**: If no emulator is running, dynamic analysis is skipped — static reports still generated

### 1.3 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js (ESM) | ≥22.0.0 |
| Static Analysis | MobSF | v4.4.5 (Django/Python) |
| Dynamic Analysis | Frida (frida-tools) | 16.7.19 |
| Emulator Management | BrutDroid + Android Studio | v2.0 |
| Device Communication | ADB (Android Debug Bridge) | SDK Platform-Tools |
| Bot Framework | node-telegram-bot-api | ^0.67.0 |
| File Watcher | chokidar | ^4.0.0 |
| AI Agent Platform | OpenClaw | 2026.2.17+ |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```mermaid
graph TB
    subgraph User Inputs
        A[📁 Folder Drop<br>C:\MobSF-Scans\inbox]
        B[📱 Telegram Bot<br>@mikasahackerman_bot]
        C[🤖 OpenClaw Agent<br>via plugin tools]
    end

    subgraph Watcher Service ["watcher.mjs (Node.js)"]
        D[File Watcher<br>chokidar]
        E[Telegram Handler<br>document listener]
        F[scanFile Pipeline]
    end

    subgraph Analysis Engines
        G[MobSF Server<br>localhost:8000]
        H[Dynamic Analyzer<br>dynamic-analyzer.mjs]
    end

    subgraph Emulator Stack
        I[Android Emulator<br>emulator-5554]
        J[Frida Server<br>/data/local/tmp]
        K[Frida Scripts<br>SSL-BYE / ROOTER / PintooR]
    end

    subgraph Output
        L[📊 report.json]
        M[📄 report.pdf]
        N[🔬 frida-results.json]
        O[📁 C:\MobSF-Scans\reports\app-timestamp]
    end

    A --> D
    B --> E
    C -->|mobsf_auto_scan| G
    D --> F
    E --> F
    F -->|Upload + Scan + Report| G
    F -->|APK file| H
    H -->|adb install| I
    H -->|frida -U -f| J
    J --> K
    G --> L
    G --> M
    H --> N
    L --> O
    M --> O
    N --> O
```

### 2.2 Component Interaction Map

```mermaid
graph LR
    subgraph Node.js Process
        W[watcher.mjs]
        DA[dynamic-analyzer.mjs]
    end

    subgraph External Services
        MOBSF[MobSF :8000]
        TG[Telegram API]
    end

    subgraph Local Tools
        ADB[adb]
        FRIDA[frida CLI]
    end

    subgraph OpenClaw Ecosystem
        OC[OpenClaw Gateway :18789]
        PLUGIN[extensions/mobsf/index.mjs]
    end

    W -->|HTTP REST| MOBSF
    W -->|Bot API| TG
    W -->|import| DA
    DA -->|child_process.execFile| ADB
    DA -->|child_process.spawn| FRIDA
    PLUGIN -->|HTTP REST| MOBSF
    OC -->|loads| PLUGIN
```

---

## 3. Component Inventory

### 3.1 Project File Map

```
OPENCLAW-SECURITY-INTEGRITY/
│
├── watcher.mjs                 # Main service — orchestrates everything
│   ├── Folder watcher (chokidar)
│   ├── Telegram bot handler
│   ├── scanFile() pipeline
│   └── Report formatting
│
├── dynamic-analyzer.mjs        # Frida + ADB automation module
│   ├── checkEmulator()         # ADB device detection
│   ├── installApk()            # APK deployment
│   ├── ensureFridaServer()     # Frida server lifecycle
│   ├── runFridaScript()        # Script execution + output capture
│   └── runDynamicAnalysis()    # Main entry point
│
├── scripts/                    # Frida instrumentation scripts
│   ├── SSL-BYE.js              # SSL pinning bypass (30+ methods)
│   ├── ROOTER.js               # Root detection bypass
│   └── PintooR.js              # Combined SSL + root bypass
│
├── setup-emulator.ps1          # One-time emulator setup guide
├── package.json                # Dependencies: chokidar, dotenv, telegram-bot-api
├── .env                        # Runtime configuration (secrets)
├── .env.example                # Configuration template
└── README.md                   # User-facing documentation

~/.openclaw/extensions/mobsf/   # OpenClaw plugin (separate location)
├── index.mjs                   # Plugin entry — registers 7 agent tools
├── openclaw.plugin.json        # Plugin metadata + config schema
├── package.json                # Plugin package info
└── skills/mobsf-scan/
    └── SKILL.md                # Agent skill instructions for MobSF workflows
```

### 3.2 Dependency Graph

```mermaid
graph TD
    W[watcher.mjs] -->|imports| DA[dynamic-analyzer.mjs]
    W -->|requires| CHK[chokidar]
    W -->|requires| DOT[dotenv]
    W -->|requires| TG[node-telegram-bot-api]
    DA -->|spawns| ADB[adb CLI]
    DA -->|spawns| FRIDA[frida CLI]
    DA -->|reads| S1[scripts/SSL-BYE.js]
    DA -->|reads| S2[scripts/ROOTER.js]
    DA -->|reads| S3[scripts/PintooR.js]
```

---

## 4. Data Flow

### 4.1 APK Scan Pipeline — Complete Data Flow

```mermaid
sequenceDiagram
    participant User
    participant Watcher as watcher.mjs
    participant MobSF as MobSF :8000
    participant DA as dynamic-analyzer.mjs
    participant ADB as adb
    participant Frida as frida CLI
    participant Emulator as Android Emulator
    participant FS as File System

    User->>FS: Drop APK in inbox/
    FS->>Watcher: chokidar "add" event
    
    Note over Watcher: Validate extension + magic bytes
    
    Watcher->>MobSF: POST /api/v1/upload (multipart)
    MobSF-->>Watcher: {hash: "6744eaa4..."}
    
    Watcher->>MobSF: POST /api/v1/scan {hash}
    Note over MobSF: Static analysis (30-120s)
    MobSF-->>Watcher: Scan complete
    
    Watcher->>MobSF: POST /api/v1/report_json {hash}
    MobSF-->>Watcher: JSON report data
    Watcher->>FS: Write report.json
    
    Watcher->>MobSF: POST /api/v1/download_pdf {hash}
    MobSF-->>Watcher: PDF binary
    Watcher->>FS: Write report.pdf
    
    Note over Watcher: If ext === ".apk"
    Watcher->>DA: runDynamicAnalysis(apkPath, outDir, report)
    
    DA->>ADB: adb devices
    ADB-->>DA: emulator-5554
    
    DA->>ADB: adb install -r -t <apk>
    ADB->>Emulator: Install APK
    ADB-->>DA: Success
    
    DA->>ADB: adb shell su -c "ps | grep frida-server"
    ADB-->>DA: frida-server running
    
    loop For each script [SSL-BYE, ROOTER, PintooR]
        DA->>Frida: frida -U -f <package> -l <script>
        Frida->>Emulator: Spawn app + inject hooks
        Note over Emulator: Script runs for 20s
        Frida-->>DA: stdout/stderr output
    end
    
    DA->>FS: Write frida-results.json
    DA->>ADB: adb uninstall <package>
    DA-->>Watcher: {success: true, results: {...}}
    
    Watcher->>FS: All reports saved to reports/<app>-<timestamp>/
```

### 4.2 Data Artifacts Per Scan

Each scan produces a timestamped directory under `C:\MobSF-Scans\reports\`:

```
<app_name>-<YYYY-MM-DDTHH-MM-SS>/
├── report.json          # MobSF full JSON report
│   ├── app_name, package_name, version
│   ├── security_score (0-100)
│   ├── code_analysis{} — findings with severity
│   ├── manifest_analysis[] — manifest issues
│   ├── permissions{} — permission risk levels
│   └── average_cvss
│
├── report.pdf           # MobSF formatted PDF report
│
└── frida-results.json   # Dynamic analysis output
    ├── device: "emulator-5554"
    ├── packageName: "com.example.app"
    ├── scripts[]
    │   ├── name: "SSL Pinning Bypass"
    │   ├── success: true/false
    │   └── output: ["[+] Bypassing OkHTTPv3...", ...]
    └── summary
        ├── totalScripts: 3
        ├── successful: 3
        ├── sslBypasses: 5
        ├── rootBypasses: 2
        └── totalHooks: 9
```

### 4.3 Telegram Data Flow

```mermaid
sequenceDiagram
    participant User as Telegram User
    participant TG as Telegram API
    participant Bot as Bot Handler
    participant Pipeline as scanFile()

    User->>TG: Send APK as document
    TG->>Bot: document event
    Bot->>Bot: Validate: allowlist, extension
    Bot->>TG: "📥 Received... ⏳ Downloading"
    Bot->>TG: getFileLink(file_id)
    TG-->>Bot: HTTPS download URL
    Bot->>Bot: Download file buffer
    Bot->>Pipeline: scanFile(buffer, fileName, onProgress)
    Pipeline-->>Bot: {success, outDir, reportData}
    Bot->>TG: Formatted Markdown report
    Bot->>TG: Send report.pdf as document
```

---

## 5. Control Flow

### 5.1 Application Startup

```mermaid
flowchart TD
    A[node watcher.mjs] --> B{MOBSF_API_KEY set?}
    B -->|No| C[❌ Exit with error]
    B -->|Yes| D{MOBSF_URL is localhost?}
    D -->|No| E[❌ SSRF protection - Exit]
    D -->|Yes| F[Create inbox + reports dirs]
    F --> G[setupFolderWatcher]
    G --> H{TELEGRAM_BOT_TOKEN set?}
    H -->|No| I[⚠️ Telegram disabled]
    H -->|Yes| J[setupTelegramBot]
    J --> K[bot.getMe - verify token]
    K --> L[Register /start /help /status /scans handlers]
    L --> M[Register document upload handler]
    I --> N[🟢 Ready! Waiting for APK files...]
    M --> N
    N --> O[Process signals: SIGINT, SIGTERM, SIGBREAK]
```

### 5.2 Dynamic Analysis Decision Tree

```mermaid
flowchart TD
    A[runDynamicAnalysis called] --> B{adb devices has device?}
    B -->|No| C[Return skipped=true<br>Static reports still saved]
    B -->|Yes| D{Package name known?}
    D -->|From MobSF report| E[Use report.package_name]
    D -->|No report| F{aapt available?}
    F -->|Yes| G[Parse from aapt dump badging]
    F -->|No| H[Return error: cant determine package]
    E --> I[adb install -r -t APK]
    G --> I
    I --> J{Install success?}
    J -->|No| K[Return error]
    J -->|Yes| L{Frida server running?}
    L -->|Not running| M[Start: adb shell su -c frida-server]
    L -->|Running| N[Run scripts sequentially]
    M --> N
    N --> O[SSL-BYE.js — 20s timeout]
    O --> P[ROOTER.js — 20s timeout]
    P --> Q[PintooR.js — 20s timeout]
    Q --> R[Build frida-results.json]
    R --> S[adb uninstall package]
    S --> T[Return success + results]
```

### 5.3 Error Handling Strategy

| Component | Error | Behavior |
|-----------|-------|----------|
| MobSF connection | `ECONNREFUSED` | Scan fails with descriptive error |
| MobSF API | HTTP 401 | "Unauthorized" — API key mismatch |
| No emulator | `adb devices` empty | Dynamic analysis **skipped**, static continues |
| APK install fail | `adb install` error | Dynamic analysis fails, static continues |
| Frida script crash | Non-zero exit code | Marked as failed, other scripts still run |
| Frida timeout | 20s elapsed | Process killed, output captured, marked success |
| Telegram download | Network error | Status message updated with error |
| File validation | Bad extension/magic | Rejected before any processing |

---

## 6. Module Reference

### 6.1 `watcher.mjs` — Main Service Orchestrator

**Lines:** 610 &nbsp;|&nbsp; **Entry Point:** `main()` at L570

| Function | Line | Purpose |
|----------|------|---------|
| `safeFetch(url, opts)` | 69 | Fetch wrapper with 3-min AbortController timeout |
| `authHeaders()` | 79 | Returns `{Authorization: MOBSF_API_KEY}` |
| `log(level, msg)` | 85 | Timestamped console logger with emoji prefixes |
| `scanFile(fileBuffer, fileName, onProgress)` | 100 | **Core pipeline** — upload → scan → JSON → PDF → Frida |
| `formatTelegramReport(reportData, fileName, outDir)` | 247 | Builds MarkdownV2 report for Telegram |
| `escMd(text)` | 320 | Escapes Telegram MarkdownV2 special characters |
| `setupFolderWatcher()` | 327 | Configures chokidar to watch inbox directory |
| `setupTelegramBot()` | 367 | Initializes Telegram bot with all command handlers |
| `main()` | 570 | Startup: validate config → watch folder → start bot |

**scanFile() Pipeline Steps:**
1. Validate extension (`.apk`, `.ipa`, `.xapk`, etc.)
2. Validate magic bytes (ZIP header `PK\x03\x04`)
3. Upload to MobSF (`POST /api/v1/upload`)
4. Trigger scan (`POST /api/v1/scan`)
5. Download JSON report (`POST /api/v1/report_json`)
6. Download PDF report (`POST /api/v1/download_pdf`)
7. Run Frida dynamic analysis (APK only, if emulator available)
8. Return `{success, outDir, reportData, hash, fridaResults}`

---

### 6.2 `dynamic-analyzer.mjs` — Frida + ADB Automation

**Lines:** 372 &nbsp;|&nbsp; **Exports:** `runDynamicAnalysis()`, `checkEmulator()`

| Function | Line | Purpose |
|----------|------|---------|
| `checkEmulator()` | 53 | Parses `adb devices` output for connected devices |
| `installApk(apkPath)` | 74 | Runs `adb install -r -t <path>` with 2-min timeout |
| `uninstallApk(packageName)` | 92 | Best-effort `adb uninstall` cleanup |
| `getPackageName(report, apkPath)` | 106 | Extracts package from MobSF report → aapt → aapt2 |
| `ensureFridaServer()` | 143 | Checks/starts frida-server via `adb shell su -c` |
| `runFridaScript(pkg, scriptPath, name)` | 180 | Spawns `frida -U -f <pkg> -l <script>`, captures output for 20s |
| `runDynamicAnalysis(apkPath, outDir, report, onProgress)` | 251 | **Main entry** — full pipeline orchestration |
| `countFridaMatches(results, pattern)` | 364 | Regex counter across script outputs |

**Key Constants:**

| Constant | Value | Purpose |
|----------|-------|---------|
| `SCRIPTS_DIR` | `./scripts/` | Location of Frida .js scripts |
| `FRIDA_SCRIPT_TIMEOUT` | 20,000ms | How long each script runs before kill |
| `ADB` | `"adb"` | ADB binary name (must be in PATH) |

---

### 6.3 `extensions/mobsf/index.mjs` — OpenClaw Plugin

**Lines:** 887 &nbsp;|&nbsp; **Registers:** 7 agent tools

This plugin exposes MobSF capabilities as tools that the OpenClaw AI agent can invoke during conversations.

| Tool Name | Purpose | Parameters |
|-----------|---------|------------|
| `mobsf_upload` | Upload APK/IPA to MobSF | `filePath` (absolute) |
| `mobsf_scan` | Trigger static analysis | `hash`, `reScan?` |
| `mobsf_report` | Get JSON report summary | `hash` |
| `mobsf_scans` | List recent scans | `page?`, `pageSize?` |
| `mobsf_pdf` | Download PDF report | `hash`, `outputDir?` |
| `mobsf_scorecard` | Get security scorecard | `hash` |
| `mobsf_auto_scan` | One-step: upload → scan → report → PDF | `filePath`, `outputDir?` |

**Security hardening in plugin:**
- URL restricted to loopback only (anti-SSRF)
- File paths validated: absolute, no `..` traversal
- Extensions allowlisted
- Response bodies size-capped (10 MB)
- API key never logged or echoed

---

### 6.4 Frida Scripts

| Script | Lines | Bypass Methods | Source |
|--------|-------|---------------|--------|
| `SSL-BYE.js` | 729 | TrustManager, OkHTTPv3 (×4), Trustkit (×3), Conscrypt, OpenSSL, PhoneGap, IBM MobileFirst, IBM WorkLight (×4), Netty, Squareup (×2), WebViewClient (×4), Cordova, Boye, Apache, Chromium Cronet, Flutter (×2), Dynamic SSLPeerUnverified patcher | BrutDroid by Brut Security |
| `ROOTER.js` | 342 | Package name checks (25 root packages), binary existence (7 binaries), Runtime.exec (6 overloads), SystemProperties, ProcessBuilder, BufferedReader, native fopen/system interceptors | BrutDroid by Brut Security |
| `PintooR.js` | ~500 | Combined SSL + root bypass | BrutDroid by Brut Security |

---

## 7. API Reference

### 7.1 MobSF REST API (consumed by this project)

All requests require header: `Authorization: <MOBSF_API_KEY>`

| Endpoint | Method | Body | Response |
|----------|--------|------|----------|
| `/api/v1/upload` | POST | Multipart/form-data with `file` | `{hash, file_name, scan_type}` |
| `/api/v1/scan` | POST | `hash=<md5>` | Scan result JSON |
| `/api/v1/report_json` | POST | `hash=<md5>` | Full security report |
| `/api/v1/download_pdf` | POST | `hash=<md5>` | PDF binary |
| `/api/v1/scans` | GET | `?page=1&page_size=10` | `{content: [...], count, num_pages}` |
| `/api/v1/scorecard` | POST | `hash=<md5>` | Security scorecard |

### 7.2 Telegram Bot Commands

| Command | Handler | Description |
|---------|---------|-------------|
| `/start` | L378 | Welcome message + chat ID |
| `/help` | L396 | Usage instructions |
| `/status` | L410 | Check MobSF connection |
| `/scans` | L426 | List 5 most recent scans |
| *document* | L454 | Upload APK → full scan → report |

---

## 8. Configuration Reference

### 8.1 Environment Variables (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MOBSF_API_KEY` | ✅ | — | MobSF REST API key (SHA-256 of `~/.MobSF/secret`) |
| `MOBSF_URL` | ❌ | `http://127.0.0.1:8000` | MobSF server URL (must be localhost) |
| `APK_INBOX_DIR` | ❌ | `C:\MobSF-Scans\inbox` | Watch directory for APK drops |
| `REPORTS_OUTPUT_DIR` | ❌ | `C:\MobSF-Scans\reports` | Where reports are saved |
| `TELEGRAM_BOT_TOKEN` | ❌ | — | Telegram bot token from @BotFather |
| `TELEGRAM_ALLOWED_CHATS` | ❌ | *(allow all)* | Comma-separated chat IDs for access control |

### 8.2 OpenClaw Configuration (`~/.openclaw/openclaw.json`)

| Path | Purpose |
|------|---------|
| `gateway.auth.mode` | Must be `"token"` (never `"none"`) |
| `gateway.bind` | Must be `"loopback"` |
| `plugins.entries.mobsf.config.mobsfApiKey` | MobSF API key for agent tools |
| `plugins.entries.mobsf.config.mobsfUrl` | MobSF URL for agent tools |
| `channels.telegram.botToken` | Telegram bot token for OpenClaw |

---

## 9. Security Model

### 9.1 Trust Boundaries

```mermaid
graph TB
    subgraph Trusted Zone ["🟢 Trusted Zone (localhost)"]
        A[watcher.mjs]
        B[MobSF :8000]
        C[OpenClaw :18789]
        D[Ollama :11434]
    end

    subgraph Semi-Trusted ["🟡 Semi-Trusted (emulator)"]
        E[Android Emulator]
        F[Frida Server]
    end

    subgraph External ["🔴 External (internet)"]
        G[Telegram API]
        H[Google Gemini API]
        I[Uploaded APKs]
    end

    A --> B
    A --> G
    A --> E
    C --> H
    I -->|untrusted input| A
```

### 9.2 Security Controls

| Control | Implementation | Status |
|---------|---------------|--------|
| API authentication | Token-based header auth | ✅ Enabled |
| SSRF prevention | URL restricted to loopback | ✅ Enforced |
| Path traversal protection | Reject `..` in file paths | ✅ Enforced |
| File type validation | Extension allowlist + magic bytes | ✅ Enforced |
| Response size limits | 10-20 MB caps | ✅ Enforced |
| Request timeouts | AbortController (2-3 min) | ✅ Enforced |
| Telegram access control | Chat ID allowlist | ⚠️ Available but disabled |
| Credential encryption | Plaintext in config files | ❌ Not implemented |
| Network isolation | `bind: loopback` in gateway | ✅ Configured |

---

## 10. Deployment & Infrastructure

### 10.1 Prerequisites

| Software | Version | Install |
|----------|---------|---------|
| Node.js | ≥22.0.0 | [nodejs.org](https://nodejs.org) |
| Python | ≥3.9 | [python.org](https://python.org) |
| Android Studio | Latest | [developer.android.com](https://developer.android.com/studio) |
| MobSF | v4.4.5 | `git clone https://github.com/MobSF/Mobile-Security-Framework-MobSF` |
| Frida | 16.7.x | `pip install frida-tools` |
| BrutDroid | v2.0 | `git clone https://github.com/Brut-Security/BrutDroid` |

### 10.2 First-Time Setup

```
1. Clone project
2. npm install
3. Copy .env.example → .env, fill in MOBSF_API_KEY
4. Start MobSF: cd Mobile-Security-Framework-MobSF && run.bat
5. One-time emulator setup: .\setup-emulator.ps1
6. Start watcher: npm start
```

### 10.3 Directory Layout on Disk

```
C:\
├── MobSF-Scans\
│   ├── inbox\              # Drop APKs here
│   └── reports\            # Auto-generated report folders
│       └── AppName-2026-02-21T14-01-48\
│           ├── report.json
│           ├── report.pdf
│           └── frida-results.json
│
├── Users\elliot\
│   ├── .MobSF\             # MobSF data directory
│   │   ├── db.sqlite3      # MobSF database
│   │   ├── secret          # API key seed
│   │   └── config.py       # MobSF user config
│   │
│   ├── .openclaw\           # OpenClaw home
│   │   ├── openclaw.json   # Main config
│   │   └── extensions\mobsf\  # MobSF plugin
│   │
│   └── Documents\
│       ├── OPENCLAW-SECURITY-INTEGRITY\  # This project
│       ├── Mobile-Security-Framework-MobSF\
│       └── git clones\BrutDroid\
```

---

## 11. Contributing Guide

### 11.1 Code Style

- **Language:** JavaScript (ESM — `import`/`export`, `.mjs` extension)
- **Formatting:** 4-space indentation, no semicolons optional
- **Naming:** `camelCase` for functions/variables, `UPPER_SNAKE` for constants
- **Comments:** JSDoc on all exported functions

### 11.2 Adding a New Frida Script

1. Create your script in `scripts/my-script.js`
2. Add it to the `scripts` array in `dynamic-analyzer.mjs` → `runDynamicAnalysis()`:
   ```javascript
   const scripts = [
       { name: "SSL Pinning Bypass (SSL-BYE)", file: join(SCRIPTS_DIR, "SSL-BYE.js") },
       { name: "Root Detection Bypass (ROOTER)", file: join(SCRIPTS_DIR, "ROOTER.js") },
       { name: "Combined Bypass (PintooR)", file: join(SCRIPTS_DIR, "PintooR.js") },
       { name: "My Custom Script", file: join(SCRIPTS_DIR, "my-script.js") },  // ← add here
   ];
   ```
3. Test: drop an APK → verify your script output appears in `frida-results.json`

### 11.3 Adding a New OpenClaw Agent Tool

1. Edit `~/.openclaw/extensions/mobsf/index.mjs`
2. Add a new `api.registerTool({...})` block following the existing pattern
3. Always include:
   - Hash validation: `if (!/^[a-fA-F0-9]{32}$/.test(hash))`
   - Error handling with `errText(err)`
   - `safeFetch()` for all HTTP calls

### 11.4 Testing Checklist

- [ ] `node --check watcher.mjs` — syntax validation
- [ ] `node --check dynamic-analyzer.mjs` — syntax validation
- [ ] Drop test APK in inbox → verify `report.json` + `report.pdf` created
- [ ] If emulator running → verify `frida-results.json` created
- [ ] Telegram: send APK via bot → verify formatted report received
- [ ] Negative tests: wrong extension, corrupt file, MobSF offline

### 11.5 Known Limitations

| Limitation | Workaround |
|------------|------------|
| Frida scripts run sequentially (60s total) | Parallelization possible but may crash emulator |
| Only one emulator supported at a time | ADB serial targeting could enable multi-device |
| Telegram file limit is 50 MB | For larger APKs, use folder drop |
| No IPA dynamic analysis | Frida scripts are Android-only |
| BrutDroid is Windows-only | Linux users: manual emulator setup |

---

*Document generated for the OpenClaw Security Integrity project. For questions, reach out to the project maintainer.*
