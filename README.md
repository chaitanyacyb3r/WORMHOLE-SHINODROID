# ShinobiDroid

> **Automated Android Security Analysis Platform**  
> Static analysis · Dynamic instrumentation · AI-generated reports · Web dashboard

---

## What It Does

ShinobiDroid is a full-stack Android pentesting pipeline. You upload an APK — it runs every analysis tool automatically and produces a professional, documented security report.

```
Upload APK (web dashboard / Telegram / folder drop)
         │
         ▼
 ┌───────────────────────────────────────────────┐
 │           Engine Orchestrator                 │
 │   MobSF  ·  Androwarn  ·  Firebase           │
 │   Frida  ·  Logcat     ·  AI (MiniMax M2.5)  │
 └───────────────────────────────────────────────┘
         │
         ▼
 ai-security-analysis.pdf   ← AI report with Mermaid diagrams
 report.pdf                 ← MobSF static report
 frida-results.json         ← Dynamic instrumentation results
```

---

## Prerequisites

Install these **before** cloning the project. All are free.

| Software | Version | Download |
|---|---|---|
| **Node.js** | ≥ 22.0 | https://nodejs.org |
| **Python** | ≥ 3.9 | https://python.org |
| **Git** | Any | https://git-scm.com |
| **MobSF** | v4.4.5+ | See step 3 below |
| **Ollama** | Latest | https://ollama.com |
| **Android Studio** | Latest | https://developer.android.com/studio |
| **ADB (Platform Tools)** | Latest | Included with Android Studio |
| **Frida Tools** | 16.x | `pip install frida-tools` |

> **Note:** ADB must be in your system PATH. Android Studio adds it automatically, or add `%LOCALAPPDATA%\Android\Sdk\platform-tools` to your PATH manually.

---

## Setup Guide

### Step 1 — Clone the Project

```powershell
git clone https://github.com/YOUR_USERNAME/wormhole-shinobidroid.git
cd wormhole-shinobidroid
```

### Step 2 — Install Dependencies

```powershell
# Root project
npm install

# Web dashboard
cd web
npm install
cd ..

# Reporting tool (Mermaid → PDF converter)
cd reporting
npm install
cd ..
```

### Step 3 — Install MobSF

```powershell
# Clone MobSF anywhere on your machine (e.g. Documents)
git clone https://github.com/MobSF/Mobile-Security-Framework-MobSF.git
cd Mobile-Security-Framework-MobSF

# Create a virtual python environment and activate it
python -m venv mobsf-venv
mobsf-venv/Scripts/activate

# Install Python deps
tall -r requirements.txt

# Run it (keep this terminal open)
.\run.bat
```

MobSF will be running at `http://127.0.0.1:8000`.

### Step 4 — Get Your MobSF API Key

With MobSF running, open a **new** PowerShell terminal:

```powershell
python -c "from hashlib import sha256; from pathlib import Path; print(sha256(Path.home().joinpath('.MobSF','secret').read_bytes().strip()).hexdigest())"
```

Copy the output — this is your `MOBSF_API_KEY`.

### Step 5 — Configure Environment

```powershell
# Copy the template
Copy-Item .env.example .env
```

Open `.env` in any text editor and fill in:

```env
# Required
MOBSF_API_KEY=paste_your_key_here

# Supabase (for web dashboard) — see Step 6
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Ollama model (for AI reports)
OLLAMA_MODEL=minimax-text-01:cloud
```

> **Path defaults are automatic** — if you leave `APK_INBOX_DIR` and `REPORTS_OUTPUT_DIR` blank, the project uses `C:\MobSF-Scans\inbox` and `C:\MobSF-Scans\reports` and creates them for you. You can change them to any path you like.

Also create `web/.env.local`:

```powershell
Copy-Item .env.example web\.env.local
```

Then fill in the same Supabase values in `web/.env.local`.

### Step 6 — Set Up Supabase (Web Dashboard)

1. Create a **free** account at https://supabase.com
2. Create a new project
3. Go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`
4. Run the database migration — go to **SQL Editor** in Supabase and run the contents of `web/supabase-dynamic-migration.sql`

### Step 7 — Pull the AI Model

```powershell
# Install Ollama (if not already)
# Download from https://ollama.com and install it

# Pull the AI model used for security reports
ollama pull minimax-text-01:cloud
```

### Step 8 — Set Up Android Emulator (for Dynamic Analysis)

Dynamic analysis requires a rooted Android emulator with Frida server:

```powershell
# Run the automated setup script (one-time only)
.\setup-emulator.ps1
```

This script creates a rooted AVD with ADB access and installs the correct Frida server binary.

> **Dynamic analysis is optional** — if no emulator is running, the pipeline runs all static engines and skips Frida.

---

## Running the Project

You need **two terminals** running simultaneously:

### Terminal 1 — Web Dashboard

```powershell
cd web
npm run dev
```

Open http://localhost:3000 in your browser. Create an account, then go to **New Scan** to upload an APK.

### Terminal 2 — Scan Worker

```powershell
node .\supabase-worker.mjs
```

This worker polls Supabase for new APKs, runs all engines, uploads the results, and updates the dashboard in real time.

---

## Project Structure

```
wormhole-shinobidroid/
│
├── web/                        # Next.js web dashboard (TypeScript)
│   ├── src/app/dashboard/      # Dashboard pages (scan, reports, settings)
│   ├── src/lib/supabase/       # Supabase client helpers
│   └── supabase-dynamic-migration.sql  # Run this in Supabase SQL Editor
│
├── engines/                    # Analysis engine plugins
│   ├── ai.engine.mjs           # AI report generation (MiniMax via Ollama)
│   ├── mobsf.engine.mjs        # MobSF static analysis
│   ├── androwarn.engine.mjs    # Malicious behavior detection
│   ├── firebase.engine.mjs     # Firebase misconfiguration scanner
│   ├── frida.engine.mjs        # Dynamic instrumentation (SSL/root bypass)
│   └── logcat.engine.mjs       # Runtime log leak detection
│
├── scripts/                    # Frida instrumentation scripts
│   ├── SHINOBI-SSL.js          # SSL pinning bypass
│   ├── SHINOBI-ROOT.js         # Root detection bypass
│   └── SHINOBI-RESILIENCE.js   # Combined bypass
│
├── reporting/                  # Markdown + Mermaid → PDF converter
│   └── convert.js              # Usage: node convert.js report.md report.pdf
│
├── orchestrator.mjs            # Engine runner — coordinates all engines
├── supabase-worker.mjs         # Scan worker — polls Supabase, runs engines
├── watcher.mjs                 # Folder-drop + Telegram bot mode
│
├── .env.example                # Copy to .env and fill in your values
├── setup-emulator.ps1          # One-time emulator + Frida setup
└── harden-firewall.ps1         # Windows firewall rules for MobSF
```

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `MOBSF_API_KEY` | ✅ | MobSF REST API key |
| `MOBSF_URL` | Optional | MobSF URL (default: `http://127.0.0.1:8000`) |
| `APK_INBOX_DIR` | Optional | Folder-watch inbox (default: `C:\MobSF-Scans\inbox`) |
| `REPORTS_OUTPUT_DIR` | Optional | Report output folder (default: `C:\MobSF-Scans\reports`) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (worker only) |
| `OLLAMA_BASE_URL` | Optional | Ollama URL (default: `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` | Optional | Model name (default: `minimax-text-01:cloud`) |
| `TELEGRAM_BOT_TOKEN` | Optional | Telegram bot token (disables Telegram if blank) |
| `TELEGRAM_ALLOWED_CHATS` | Optional | Comma-separated allowed chat IDs |

---

## Alternate: Folder-Drop Mode (No Web Dashboard)

If you just want to drop APKs and get reports without the web UI:

```powershell
# Start MobSF first, then:
node watcher.mjs
```

Drop any `.apk` into `C:\MobSF-Scans\inbox\` (or whatever you set `APK_INBOX_DIR` to) and get full reports in `C:\MobSF-Scans\reports\`.

---

## Convert Any Report to PDF Manually

```powershell
node reporting\convert.js path\to\ai-security-analysis.md
# → creates ai-security-analysis.pdf in the same folder
```

---

## Troubleshooting

**"MOBSF_API_KEY is missing"**  
→ Make sure `.env` exists (not just `.env.example`) and has `MOBSF_API_KEY=` filled in.

**"Supabase unreachable from Node.js"**  
→ Your ISP may block Cloudflare. Install [Cloudflare WARP](https://1.1.1.1/) — the worker auto-connects it.

**Upload stuck at 62% (web)**  
→ The insert times out when connectivity drops. The worker has auto-retry — just wait or restart the worker.

**"adb: command not found"**  
→ Add Android SDK platform-tools to your PATH:  
`$env:PATH += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"`

**Frida engine skipped**  
→ Normal if no emulator is running. Start the emulator from Android Studio first, then re-run the scan.

**Ollama / AI engine skipped**  
→ Run `ollama serve` and `ollama pull minimax-text-01:cloud` first.

---

## How to Create a GitHub Repo for This Project

See the **"GitHub Setup"** section at the bottom of this README.

---

## GitHub Setup (First Time)

### 1. Create the Repository on GitHub

1. Go to https://github.com and sign in
2. Click **+** → **New repository**
3. Name it: `wormhole-shinobidroid` (or anything you like)
4. Set to **Private** (recommended — this has security tool code)
5. **Do NOT** tick "Add README" or "Add .gitignore" (you already have them)
6. Click **Create repository**

### 2. Push Your Existing Code

GitHub will show you these commands — copy the HTTPS version:

```powershell
cd C:\Users\elliot\Documents\OPENCLAW-SECURITY-INTEGRITY

# If git isn't initialized yet:
git init
git add .
git commit -m "Initial commit: ShinobiDroid Android pentesting platform"

# Link to your new GitHub repo:
git remote add origin https://github.com/YOUR_USERNAME/wormhole-shinobidroid.git

# Push:
git branch -M main
git push -u origin main
```

### 3. Share with Your Friend

Your friend clones it and follows the Setup Guide above:

```powershell
git clone https://github.com/YOUR_USERNAME/wormhole-shinobidroid.git
cd wormhole-shinobidroid

# Install all dependencies
npm install
cd web && npm install && cd ..
cd reporting && npm install && cd ..

# Configure
Copy-Item .env.example .env
# (edit .env with their own MobSF key + Supabase keys)
```

> **Important:** Your friend needs their **own** Supabase project (free tier is fine), their **own** MobSF API key (generated from their machine), and their **own** `.env` file. These are **never** committed to git.

---

*ShinobiDroid — Built for Android Application Security Research*
