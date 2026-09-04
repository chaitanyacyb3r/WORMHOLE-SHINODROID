# Shinodroid Setup Guide

> **A comprehensive guide to getting Shinodroid running on a new PC/Laptop.**

---

## 1. Prerequisites

Before cloning the project, install the following tools. Make sure they are added to your system `PATH`.

| Tool | Version | Download Link | Notes |
|------|---------|---------------|-------|
| **Node.js** | v22+ | [nodejs.org](https://nodejs.org/) | Required for the backend orchestrator and web dashboard. |
| **Python** | 3.10+ | [python.org](https://python.org/) | Check the "Add to PATH" box during installation. |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) | Version control. |
| **Android Studio** | Latest | [developer.android.com](https://developer.android.com/studio) | Includes the emulator and `adb`. |
| **OWASP ZAP** | v2.16+ | [zaproxy.org](https://www.zaproxy.org/download/) | The network proxy engine. |
| **Ollama** | Latest | [ollama.com](https://ollama.com/) | Local AI models for report generation. |
| **Docker Desktop** | Latest | [docker.com](https://www.docker.com/products/docker-desktop/) | Used for running MobSF locally in a container. |

---

## 2. Setting Up Third-Party Dependencies

### A. Supabase & Convex (Database & Auth)
Since your old API limits were reached, you must create new accounts.

1. **Convex (Real-time Database)**
   - Go to [convex.dev](https://www.convex.dev/) and sign up with a new email/GitHub account.
   - We will initialize a new Convex project in Step 4.

2. **Supabase (Storage & Backup DB)**
   - Go to [supabase.com](https://supabase.com/) and create a new project.
   - Go to **Project Settings > API**.
   - Copy the `Project URL`, `anon / public key`, and `service_role secret`.

### B. Ollama (AI Model)
You will need to pull a fresh model to use for the AI Engine.
Open your terminal and run:
```bash
ollama pull mistral  # or whichever model you prefer
```

### C. MobSF (Static Analysis Engine)
MobSF runs in a Docker container.
Open a terminal and run:
```bash
docker pull opensecurity/mobile-security-framework-mobsf:latest
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```
- Wait for it to start.
- Open your browser to `http://localhost:8000` to ensure it's running.
- In the top right corner of the MobSF web UI, click **API Key** and copy it.

---

## 3. Clone and Configure the Project

1. Open a terminal (PowerShell or Git Bash).
2. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/chaitanyacyb3r/WORMHOLE-SHINODROID.git
   cd WORMHOLE-SHINODROID
   git checkout feature/owasp-zap
   ```

3. **Configure Environment Variables**:
   Copy the example config:
   ```bash
   cp .env.example .env
   ```
   Open the `.env` file in your code editor and fill it out:
   - `MOBSF_API_KEY`: Paste the key you got from MobSF.
   - `NEXT_PUBLIC_SUPABASE_URL`: Paste your new Supabase Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Paste your new Supabase anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Paste your new Supabase service_role key.
   - `CONVEX_DEPLOY_KEY`: Paste the deploy key from your Convex Dashboard (see Step 4D).
   - `OLLAMA_MODEL`: Set this to the model you downloaded (e.g., `mistral`).
   - `SHINODROID_ADMIN_SECRET`: Set a secure random string for the CI/CD API.

---

## 4. Install Dependencies & Setup Databases

### A. Root Orchestrator
In the main project folder (`WORMHOLE-SHINODROID`), install the backend dependencies:
```bash
npm install
```

### B. Python Tools (Androwarn)
Install the Python dependencies for the static analysis engines:
```bash
pip install androwarn markitdown docx
```

### C. Web Dashboard & Convex
Open a new terminal window, and navigate to the `web/` directory:
```bash
cd web/
npm install
```

Now, initialize your new Convex project:
```bash
npx convex dev
```
- It will prompt you to log in to Convex.
- It will ask if you want to create a new project. Select **Yes**.
- This auto-creates `web/.env.local` with `NEXT_PUBLIC_CONVEX_URL`.
- Keep this terminal running! It synchronizes the database schema and runs the backend functions for the web dashboard.

### D. Convex Deploy Key (required for the scan worker)
The scan worker (`src/daemon.mjs`) needs a deploy key to call internal Convex functions.
1. Open your [Convex Dashboard](https://dashboard.convex.dev).
2. Select your project → select the **dev** deployment.
3. Go to **Settings** → **Deploy Keys** → **Create Deploy Key**.
4. Name it `shinodroid-worker` and select these permissions:
   - `deployment:functions:runInternalQueries`
   - `deployment:functions:runInternalMutations`
5. Click **Create**, copy the key.
6. Paste it into the root `.env` file as `CONVEX_DEPLOY_KEY=<your_key>`.

---

## 5. Prepare the Android Emulator

1. Open **Android Studio**.
2. Go to **Device Manager** -> **Create Device**.
3. Create a **Pixel 4a** device.
4. Select a System Image with **API Level 30** (without Google Play is preferred so root access is easier).
5. Start the emulator.
6. Open a terminal and ensure `adb` can see it:
   ```bash
   adb devices
   ```
   *You should see a device listed, e.g., `emulator-5554`.*

---

## 6. Run Shinodroid

You now need three terminal windows running simultaneously to operate the entire platform.

**Terminal 1: MobSF Docker Container**
*(If not already running from Step 2C)*
```bash
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest
```

**Terminal 2: Convex Dev Server & Next.js Web Dashboard**
```bash
cd web/
npx convex dev
# In another tab in the web folder:
npm run dev
```
- The dashboard is now accessible at `http://localhost:3000`.

**Terminal 3: The Shinodroid Orchestrator Daemon**
In the root directory of the project:
```bash
node src/daemon.mjs
```

### Success!
You can now upload an APK through the web dashboard, and the orchestrator daemon will automatically pick it up, pass it through all 8 engines, and render the final AI and Compliance reports in the web UI.
