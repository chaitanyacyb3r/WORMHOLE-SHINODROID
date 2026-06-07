# Shinodroid 忍ドロイド — Docker Setup Guide

> **Get the entire Shinodroid security analysis pipeline running with just 3 commands.**
> No manual installation of MobSF, ZAP, Ollama, or Python required — Docker handles everything.

---

## Prerequisites

You only need **two things** installed:

| Tool | Download |
|------|----------|
| **Docker Desktop** | https://docker.com/products/docker-desktop |
| **Git** | https://git-scm.com |

> [!IMPORTANT]
> Make sure Docker Desktop is **running** before proceeding.
> On Windows, enable **WSL 2** backend in Docker Desktop settings for best performance.

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| Disk | 15 GB free | 25 GB free |
| CPU | 4 cores | 8 cores |

---

## Step 1: Clone the Repository

```powershell
git clone https://github.com/chaitanyacyb3r/WORMHOLE-SHINODROID.git
cd WORMHOLE-SHINODROID
git checkout feature/owasp-zap
```

---

## Step 2: Configure Environment

```powershell
# Copy the example config
Copy-Item .env.example .env
```

Open `.env` in any text editor and set **only these two values**:

```env
# Generate a random key for MobSF (or use any string)
MOBSF_API_KEY=my-secret-mobsf-key-change-me

# ZAP key (default works fine)
ZAP_API_KEY=shinodroid-zap-key
```

> [!NOTE]
> When running via Docker, the `MOBSF_API_KEY` in your `.env` is passed directly to
> the MobSF container. You don't need to run any Python command to generate it —
> just set any strong string and both the worker and MobSF will use it.

### Optional: Convex Web Dashboard

If you want the web dashboard (not required for scanning):

1. Create a free account at https://convex.dev
2. Run `cd web && npx convex dev` to get your deployment URL
3. Add to `.env`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   CONVEX_DEPLOY_KEY=your-deploy-key
   ```

---

## Step 3: Launch Everything

```powershell
docker compose up -d
```

That's it. Docker will automatically:

1. **Pull & build** all 5 containers (~5 min first time, instant after)
2. **Start MobSF** for static analysis
3. **Start OWASP ZAP** for network/API scanning
4. **Start Ollama** for AI-powered report generation
5. **Start the Worker** that orchestrates all engines
6. **Start the Web Dashboard** at `http://localhost:3000`

### Pull an AI Model (One-time)

After the containers are running, pull a free LLM model:

```powershell
# Pull llama3 into the Ollama container (~4.7GB download)
docker exec Shinodroid-ollama ollama pull llama3
```

Then update your `.env` to use it:
```env
OLLAMA_MODEL=llama3
```

And restart the worker:
```powershell
docker compose restart worker
```

---

## Verifying Everything is Running

```powershell
docker compose ps
```

You should see all 5 containers with status `Up (healthy)`:

```
NAME                STATUS
Shinodroid-web      Up (healthy)
Shinodroid-worker   Up (healthy)
Shinodroid-mobsf    Up (healthy)
Shinodroid-ollama   Up
Shinodroid-zap      Up (healthy)
```

### Check Worker Logs

```powershell
# Watch live logs from the scan worker
docker compose logs -f worker
```

---

## Scanning an APK

### Option 1: Web Dashboard
1. Open `http://localhost:3000` in your browser
2. Upload an APK file
3. Watch the progress in real-time

### Option 2: Folder Drop
```powershell
# Copy an APK into the inbox — the worker auto-detects it
docker cp my-app.apk Shinodroid-worker:/app/reports/inbox/
```

### Option 3: Direct API (for CI/CD)
```powershell
# Upload via the web dashboard API
curl -X POST http://localhost:3000/api/upload -F "file=@my-app.apk"
```

---

## Useful Commands

```powershell
# View all logs
docker compose logs -f

# View only worker logs
docker compose logs -f worker

# Stop everything
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v

# Restart just the worker (after .env changes)
docker compose restart worker

# Access MobSF UI for debugging (uncomment port in docker-compose.yml first)
# http://localhost:8000

# Shell into the worker container
docker exec -it Shinodroid-worker bash
```

---

## Architecture (Docker)

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network                       │
│                  (Shinodroid-net)                        │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │   Web    │  │  Worker  │  │  MobSF   │  │  ZAP   │ │
│  │ :3000    │  │ (daemon) │  │ :8000    │  │ :8080  │ │
│  └──────────┘  └────┬─────┘  └──────────┘  └────────┘ │
│                     │                                   │
│                     │ orchestrates all engines           │
│                     │                                   │
│                ┌────┴─────┐                             │
│                │  Ollama  │                             │
│                │ :11434   │                             │
│                └──────────┘                             │
└─────────────────────────────────────────────────────────┘
         │
         │ port 3000 exposed
         ▼
    http://localhost:3000  (Your Browser)
```

All containers communicate internally on the `Shinodroid-net` bridge network.
Only port `3000` (web dashboard) is exposed to your machine.

---

## Dynamic Analysis (Frida) with Docker

> [!WARNING]
> Frida dynamic analysis requires an **Android Emulator** running on your **host machine**
> (not inside Docker). This is because emulators need GPU access and hardware acceleration.

To enable Frida when using Docker:

1. Start an Android Emulator on your host machine (via Android Studio)
2. Make sure `adb devices` shows the emulator on your host
3. The Docker worker connects to your host's ADB server via `host.docker.internal:5037`
4. This is already configured in `docker-compose.yml` (`ADB_SERVER_SOCKET`)

If you don't need dynamic analysis, everything else works perfectly without an emulator.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Containers won't start | Run `docker compose logs` to see errors |
| MobSF unhealthy | It needs ~45s to start. Wait and check again with `docker compose ps` |
| `MOBSF_API_KEY is not set` | Edit your `.env` file and set the key |
| Ollama model not found | Run `docker exec Shinodroid-ollama ollama pull llama3` |
| Out of disk space | Run `docker system prune -a` to clean unused images |
| Port 3000 already in use | Stop whatever is using it, or change the port in `docker-compose.yml` |
| Worker can't reach MobSF | Make sure MobSF container is healthy: `docker compose ps mobsf` |
