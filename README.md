# WORMHOLE // ShinobiDroid 忍ドロイド

> **Automated Android penetration testing pipeline** by WORMHOLE Security
>
> MobSF (static) + Frida (dynamic) + BrutDroid (emulator setup)

## Architecture

```
APK dropped in C:\MobSF-Scans\inbox
  |
  +---> MobSF Static Analysis
  |       +-- report.json + report.pdf
  |
  +---> Frida Dynamic Analysis (if emulator running)
          +-- frida-results.json
  |
  +---> All saved to C:\MobSF-Scans\reports\<app>-<timestamp>\
```

## Quick Start

### 1. One-Time Setup (Emulator + Frida Server)

```powershell
.\setup-emulator.ps1
```

### 2. Start MobSF

```powershell
cd C:\Users\elliot\Documents\Mobile-Security-Framework-MobSF
.\run.bat
```

### 3. Start ShinobiDroid

```powershell
cd wormhole-shinobidroid
npm start
```

### 4. Scan an APK

Drop any `.apk` file into `C:\MobSF-Scans\inbox` - the pipeline will:

1. **Upload to MobSF** - static analysis (permissions, code analysis, manifest)
2. **Install on emulator** - if an emulator is connected
3. **Run Frida scripts** - SSL pinning bypass, root detection bypass, combined
4. **Save all reports** - `C:\MobSF-Scans\reports\<app>-<timestamp>\`

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

Copy `.env.example` to `.env` and fill in your values:

```properties
MOBSF_API_KEY=your_api_key_here
MOBSF_URL=http://127.0.0.1:8000
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ALLOWED_CHATS=your_chat_id
```

## Project Structure

```
wormhole-shinobidroid/
+-- watcher.mjs              # Main service (folder watch + Telegram + Frida)
+-- dynamic-analyzer.mjs     # Frida + ADB automation module
+-- setup-emulator.ps1       # One-time emulator setup (uses BrutDroid)
+-- harden-firewall.ps1      # Security hardening (firewall rules)
+-- scripts/
|   +-- SSL-BYE.js           # SSL pinning bypass
|   +-- ROOTER.js            # Root detection bypass
|   +-- PintooR.js           # Combined bypass
+-- .env.example             # Config template (copy to .env)
+-- .gitignore               # Excludes secrets from git
+-- package.json             # Node.js dependencies
+-- ARCHITECTURE.md          # Full technical documentation
+-- README.md                # This file
```

## Security Hardening

Run as Administrator to apply firewall rules:
```powershell
.\harden-firewall.ps1
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No emulator connected | Start Android Studio emulator, verify with `adb devices` |
| Frida server not running | Run: `adb shell su -c 'nohup /data/local/tmp/frida-server &'` |
| MobSF 500 errors | Check `~/.MobSF/debug.log`, re-run migrations if needed |
| Dynamic analysis skipped | Normal if no emulator - MobSF static scan still runs |

---

*Built with by WORMHOLE Security*
