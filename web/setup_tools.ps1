# ============================================================
# launch-all.ps1
# Launches MobSF, Emulator setup, Supabase worker,
# Convex dev, Next.js dev, and opens browser tabs.
# ============================================================

$ErrorActionPreference = "Continue"

# -----------------------------------------------------------
# 1 & 2 & 3 — MobSF: activate venv, run server, open browser
# -----------------------------------------------------------
$mobsfPath = "C:\Users\elliot\Documents\Mobile-Security-Framework-MobSF"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$mobsfPath'; & '.\mobsf-venv\Scripts\Activate.ps1'; & '.\run.bat'"
)

# Give MobSF a few seconds to start binding to port 8000
Start-Sleep -Seconds 10
Start-Process "http://localhost:8000/"

# -----------------------------------------------------------
# 4 — Emulator setup script (separate terminal)
# -----------------------------------------------------------
$openclawPath = "C:\Users\elliot\Documents\OPENCLAW-SECURITY-INTEGRITY"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$openclawPath'; & '.\setup-emulator.ps1'"
)

# -----------------------------------------------------------
# 5 — Supabase worker (separate terminal)
# -----------------------------------------------------------
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$openclawPath'; node supabase-worker.mjs"
)

# -----------------------------------------------------------
# 6 — Convex dev (separate terminal)
# -----------------------------------------------------------
$webPath = "$openclawPath\web"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$webPath'; npx convex dev"
)

# -----------------------------------------------------------
# 7 — Next.js dev (separate terminal)
# -----------------------------------------------------------
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$webPath'; npm run dev"
)

# Give Next.js a few seconds to start on port 3000
Start-Sleep -Seconds 8

# -----------------------------------------------------------
# 8 — Open localhost:3000 in the default browser
# -----------------------------------------------------------
Start-Process "http://localhost:3000/"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host " All services launched successfully." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  MobSF           -> http://localhost:8000/"
Write-Host "  Web app          -> http://localhost:3000/"
Write-Host ""
Write-Host "  Terminals opened:"
Write-Host "    1. MobSF (venv + run.bat)"
Write-Host "    2. setup-emulator.ps1"
Write-Host "    3. node supabase-worker.mjs"
Write-Host "    4. npx convex dev"
Write-Host "    5. npm run dev"
Write-Host ""