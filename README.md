# OpenClaw Security Integrity

> Automated Android penetration testing pipeline: **MobSF** (static) + **Frida** (dynamic) + **BrutDroid** (emulator setup)

## Architecture

```
APK dropped in C:\MobSF-Scans\inbox
  │
  ├─→ MobSF Static Analysis
  │     └─ report.json + report.pdf
  │
  └─→ Frida Dynamic Analysis (if emulator running)
        └─ frida-results.json
  │
  └─→ All saved to C:\MobSF-Scans\reports\<app>-<timestamp>\
```

## Quick Start

### 1. One-Time Setup (Emulator + Frida Server)

```powershell
# Run the guided setup script
.\setup-emulator.ps1
```

This uses BrutDroid to:
- Create a virtual device (API 31, x86_64)
- Root the emulator with Magisk
- Install Frida server on the emulator

### 2. Start MobSF

```powershell
cd C:\Users\elliot\Documents\Mobile-Security-Framework-MobSF
.\run.bat
```

### 3. Start the Watcher

```powershell
cd C:\Users\elliot\Documents\OPENCLAW-SECURITY-INTEGRITY
npm start
```

### 4. Scan an APK

Drop any `.apk` file into `C:\MobSF-Scans\inbox` — the watcher will:

1. **Upload to MobSF** → static analysis (permissions, code analysis, manifest)
2. **Install on emulator** → if an emulator is connected
3. **Run Frida scripts** → SSL pinning bypass, root detection bypass, combined
4. **Save all reports** → `C:\MobSF-Scans\reports\<app>-<timestamp>\`

## Reports Generated Per Scan

| File | Source | Contents |
|------|--------|----------|
| `report.json` | MobSF | Static analysis: permissions, code findings, manifest issues |
| `report.pdf` | MobSF | Full PDF security report |
| `frida-results.json` | Frida | Dynamic analysis: SSL bypass hooks, root bypass hooks |

## Frida Scripts

Sourced from [BrutDroid](https://github.com/Brut-Security/BrutDroid):

| Script | Purpose |
|--------|---------|
| `SSL-BYE.js` | Universal SSL pinning bypass (30+ methods) |
| `ROOTER.js` | Root detection bypass (package checks, binary checks, native hooks) |
| `PintooR.js` | Combined SSL + root bypass |

## Configuration

Edit `.env`:

```properties
# MobSF
MOBSF_API_KEY=69c46e5f7783c478d23feb4bf37104573bfc4714787cd154a9ffba440f22e2c9
MOBSF_URL=http://127.0.0.1:8000

# Folder paths
APK_INBOX_DIR=C:\MobSF-Scans\inbox
REPORTS_OUTPUT_DIR=C:\MobSF-Scans\reports

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your-bot-token-here
```

## API Key Locations

| Key | File | Field |
|-----|------|-------|
| MobSF API Key | `.env` | `MOBSF_API_KEY=` |
| MobSF API Key | `~/.openclaw/openclaw.json` | `plugins.entries.mobsf.config.mobsfApiKey` |
| Gemini API Key | `~/.openclaw/openclaw.json` | `models.providers.google.apiKey` |

## Project Structure

```
OPENCLAW-SECURITY-INTEGRITY/
├── watcher.mjs              # Main service (folder watch + Telegram + Frida)
├── dynamic-analyzer.mjs     # Frida + ADB automation module
├── setup-emulator.ps1       # One-time emulator setup (uses BrutDroid)
├── scripts/
│   ├── SSL-BYE.js           # SSL pinning bypass
│   ├── ROOTER.js            # Root detection bypass
│   └── PintooR.js           # Combined bypass
├── .env                     # Configuration
├── .env.example             # Config template
├── package.json             # Node.js dependencies
└── README.md                # This file
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No emulator connected | Start Android Studio emulator, verify with `adb devices` |
| Frida server not running | Run: `adb shell su -c 'nohup /data/local/tmp/frida-server &'` |
| MobSF 500 errors | Check `~/.MobSF/debug.log`, re-run migrations if needed |
| Dynamic analysis skipped | Normal if no emulator — MobSF static scan still runs |
