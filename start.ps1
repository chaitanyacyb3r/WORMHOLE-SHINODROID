# Shinodroid - Production Startup Script (PowerShell)
# Usage: .\start.ps1

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host "  =  Shinodroid - Production Launcher      =" -ForegroundColor Magenta
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host ""

# -- Step 1: Validate environment --
Write-Host "[1/5] Checking environment files..." -ForegroundColor Cyan

if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found!" -ForegroundColor Red
    Write-Host "   Copy .env.example to .env and fill in your values:"
    Write-Host "   Copy-Item .env.example .env"
    exit 1
}

if (-not (Test-Path "web\.env.local")) {
    Write-Host "ERROR: web\.env.local not found!" -ForegroundColor Red
    Write-Host "   This file must contain your Convex credentials."
    exit 1
}

Write-Host "[OK] Environment files found" -ForegroundColor Green

# -- Step 2: Build and start services --
Write-Host ""
Write-Host "[2/5] Building and starting Docker services..." -ForegroundColor Cyan
Write-Host "      (This may take 5-10 minutes on first run)" -ForegroundColor Yellow
Write-Host ""

docker compose -f docker-compose.yml build --parallel
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

docker compose -f docker-compose.yml up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start services!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] All containers started" -ForegroundColor Green

# -- Step 3: Pull AI model --
Write-Host ""
Write-Host "[3/5] Pulling AI model into Ollama container..." -ForegroundColor Cyan
Write-Host "      (This downloads ~4GB on first run, be patient)" -ForegroundColor Yellow
Write-Host ""

$maxRetries = 30
$retry = 0
$ollamaReady = $false

while (-not $ollamaReady -and $retry -lt $maxRetries) {
    $retry++
    try {
        $result = docker exec Shinodroid-ollama curl -sf http://127.0.0.1:11434/api/tags 2>$null
        if ($LASTEXITCODE -eq 0) {
            $ollamaReady = $true
        }
    } catch { }

    if (-not $ollamaReady) {
        if ($retry -ge $maxRetries) {
            Write-Host "ERROR: Ollama failed to start after $maxRetries attempts" -ForegroundColor Red
            docker compose -f docker-compose.yml logs ollama --tail=20
            exit 1
        }
        Write-Host "   Waiting for Ollama... ($retry/$maxRetries)"
        Start-Sleep -Seconds 2
    }
}

# Read model from .env or use default
$model = "minimax-text-01:cloud"
$envContent = Get-Content .env -ErrorAction SilentlyContinue
foreach ($line in $envContent) {
    if ($line -match "^OLLAMA_MODEL=(.+)$") {
        $model = $Matches[1].Trim()
    }
}

Write-Host "   Pulling model: $model" -ForegroundColor Cyan
docker exec Shinodroid-ollama ollama pull $model
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Model pull failed - AI reports will be unavailable" -ForegroundColor Yellow
    Write-Host "   You can pull it manually later:"
    Write-Host "   docker exec Shinodroid-ollama ollama pull $model"
} else {
    Write-Host ""
    Write-Host "[OK] AI model ready" -ForegroundColor Green
}

# -- Step 4: Verify services --
Write-Host ""
Write-Host "[4/5] Verifying service health..." -ForegroundColor Cyan
Write-Host ""

Start-Sleep -Seconds 5

$services = @(
    @{ Name = "Web Dashboard"; Container = "Shinodroid-web" },
    @{ Name = "Scan Worker";   Container = "Shinodroid-worker" },
    @{ Name = "MobSF Engine";  Container = "Shinodroid-mobsf" },
    @{ Name = "Ollama AI";     Container = "Shinodroid-ollama" }
)

foreach ($svc in $services) {
    try {
        $running = docker inspect --format='{{.State.Running}}' $svc.Container 2>$null
    } catch {
        $running = "false"
    }

    if ($running -eq "true") {
        Write-Host "   [OK] $($svc.Name) - running" -ForegroundColor Green
    } else {
        Write-Host "   [FAIL] $($svc.Name) - not running" -ForegroundColor Red
    }
}

# -- Step 5: Print access info --
Write-Host ""
Write-Host "[5/5] Ready!" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host "  Dashboard:  http://localhost:3000" -ForegroundColor Green
Write-Host "  Status:     docker compose ps" -ForegroundColor White
Write-Host "  Logs:       docker compose logs -f worker" -ForegroundColor White
Write-Host "  Stop:       docker compose down" -ForegroundColor White
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "Upload an APK from the dashboard to start scanning!" -ForegroundColor Green
Write-Host ""
