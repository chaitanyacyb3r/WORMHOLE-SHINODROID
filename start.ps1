# ══════════════════════════════════════════════════════════════════════════════
# Shinodroid — Production Startup Script (PowerShell)
#
# This script:
#   1. Validates the environment configuration
#   2. Starts all Docker services
#   3. Pulls the AI model into the Ollama container
#   4. Verifies all services are healthy
#
# Usage:
#   .\start.ps1
#
# Requirements:
#   - Docker Desktop running
#   - .env file configured (copy from .env.example)
#   - web\.env.local configured (Convex credentials)
# ══════════════════════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║   🥷 Shinodroid — Production Launcher            ║" -ForegroundColor Magenta
Write-Host "  ╚═══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

# ── Step 1: Validate environment ─────────────────────────────────────────
Write-Host "[1/5] Checking environment files..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and fill in your values:"
    Write-Host "   Copy-Item .env.example .env"
    exit 1
}

if (-not (Test-Path "web\.env.local")) {
    Write-Host "❌ web\.env.local not found!" -ForegroundColor Red
    Write-Host "   This file must contain your Convex credentials."
    exit 1
}

Write-Host "✅ Environment files found" -ForegroundColor Green

# ── Step 2: Build and start services ─────────────────────────────────────
Write-Host ""
Write-Host "[2/5] Building and starting Docker services..." -ForegroundColor Cyan
Write-Host "      (This may take 5-10 minutes on first run)" -ForegroundColor Yellow
Write-Host ""

# Use only the production compose file (skip override)
docker compose -f docker-compose.yml build --parallel
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Build failed!" -ForegroundColor Red; exit 1 }

docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) { Write-Host "❌ Failed to start services!" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "✅ All containers started" -ForegroundColor Green

# ── Step 3: Pull AI model ────────────────────────────────────────────────
Write-Host ""
Write-Host "[3/5] Pulling AI model into Ollama container..." -ForegroundColor Cyan
Write-Host "      (This downloads ~4GB on first run, be patient)" -ForegroundColor Yellow
Write-Host ""

# Wait for Ollama to be ready
$maxRetries = 30
$retry = 0
do {
    $retry++
    try {
        docker exec Shinodroid-ollama curl -sf http://127.0.0.1:11434/api/tags 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { break }
    } catch { }
    
    if ($retry -ge $maxRetries) {
        Write-Host "❌ Ollama failed to start after $maxRetries attempts" -ForegroundColor Red
        docker compose -f docker-compose.yml logs ollama --tail=20
        exit 1
    }
    Write-Host "   Waiting for Ollama... ($retry/$maxRetries)"
    Start-Sleep -Seconds 2
} while ($true)

# Read model from .env or use default
$model = "minimax-text-01:cloud"
Get-Content .env | ForEach-Object {
    if ($_ -match "^OLLAMA_MODEL=(.+)$") {
        $model = $Matches[1].Trim()
    }
}

Write-Host "   Pulling model: $model" -ForegroundColor Cyan
docker exec Shinodroid-ollama ollama pull $model
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Model pull failed — AI reports will be unavailable" -ForegroundColor Yellow
    Write-Host "   You can pull it manually later: docker exec Shinodroid-ollama ollama pull $model"
}

Write-Host ""
Write-Host "✅ AI model ready" -ForegroundColor Green

# ── Step 4: Verify services ──────────────────────────────────────────────
Write-Host ""
Write-Host "[4/5] Verifying service health..." -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 5

function Test-ServiceHealth {
    param($Name, $Container)
    
    try {
        $running = docker inspect --format='{{.State.Running}}' $Container 2>$null
        $health = docker inspect --format='{{.State.Health.Status}}' $Container 2>$null
    } catch {
        $running = "false"
        $health = "unknown"
    }
    
    if ($running -eq "true") {
        if ($health -eq "healthy" -or $health -match "no-healthcheck" -or $health -eq "") {
            Write-Host "   ✅ $Name — running" -ForegroundColor Green
        } else {
            Write-Host "   ⏳ $Name — starting ($health)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ $Name — not running" -ForegroundColor Red
    }
}

Test-ServiceHealth "Web Dashboard" "Shinodroid-web"
Test-ServiceHealth "Scan Worker" "Shinodroid-worker"
Test-ServiceHealth "MobSF Engine" "Shinodroid-mobsf"
Test-ServiceHealth "Ollama AI" "Shinodroid-ollama"

# ── Step 5: Print access info ────────────────────────────────────────────
Write-Host ""
Write-Host "[5/5] Ready!" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ╔═══════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "  ║   🌐 Dashboard:  http://localhost:3000           ║" -ForegroundColor Magenta
Write-Host "  ║   📊 Status:     docker compose ps               ║" -ForegroundColor Magenta
Write-Host "  ║   📋 Logs:       docker compose logs -f worker   ║" -ForegroundColor Magenta
Write-Host "  ║   🛑 Stop:       docker compose down             ║" -ForegroundColor Magenta
Write-Host "  ╚═══════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""
Write-Host "Upload an APK from the dashboard to start scanning! 🚀" -ForegroundColor Green
Write-Host ""
