# ================================================================
# Shinodroid - SDK-Aware Launch Script
#
# DEFAULT (no flags): Runs all services LOCALLY, step by step:
#   1. MobSF server (local Python venv)
#   2. Emulator (SDK-aware AVD selection)
#   3. Frida server on emulator
#   4. Convex dev server
#   5. Next.js dev server
#   6. Scan worker (node watcher.mjs)
#
# With -Docker flag: Uses Docker Compose instead of local services.
#
# Usage:
#   .\setup_tools.ps1                  # local mode, auto-select AVD
#   .\setup_tools.ps1 -TargetApi 34    # local mode, prefer API 34
#   .\setup_tools.ps1 -AvdName Pixel_6 # local mode, specific AVD
#   .\setup_tools.ps1 -Docker          # Docker mode
# ================================================================

param(
    [int]$TargetApi = 0,          # Preferred API level (0 = auto/highest)
    [string]$AvdName = "",        # Specific AVD name to launch
    [switch]$Docker,              # Use Docker Compose instead of local services
    [switch]$SkipEmulator         # Skip emulator launch (if already running)
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host "  =  Shinodroid - Lab Launcher             =" -ForegroundColor Magenta
Write-Host "  =  SDK-Aware Dynamic Analysis Setup      =" -ForegroundColor Magenta
Write-Host "  ==========================================" -ForegroundColor Magenta
Write-Host ""

$openclawPath = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path "$openclawPath\docker-compose.yml")) {
    $openclawPath = "C:\Users\elliot\Documents\OPENCLAW-SECURITY-INTEGRITY"
}
$webPath   = Join-Path $openclawPath "web"
$mobsfPath = "C:\Users\elliot\Documents\Mobile-Security-Framework-MobSF"

if ($Docker) {
    Write-Host "  Mode: DOCKER" -ForegroundColor Cyan
} else {
    Write-Host "  Mode: LOCAL (sequential startup)" -ForegroundColor Cyan
}
Write-Host ""


# =================================================================
#  STEP 1: Backend Services (MobSF + Ollama)
# =================================================================
Write-Host "[Step 1/6] Starting backend services..." -ForegroundColor Yellow

if ($Docker) {
    # --- Docker mode ---
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "         Start Docker Desktop and try again." -ForegroundColor Gray
        exit 1
    }
    Write-Host "  [OK] Docker Desktop is running" -ForegroundColor Green

    Push-Location $openclawPath
    Write-Host "  [--] Building and starting containers..." -ForegroundColor Gray
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] docker compose up failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location

    # Wait for MobSF
    Write-Host "  [--] Waiting for MobSF container to be healthy..." -ForegroundColor Gray
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' Shinodroid-mobsf 2>$null
            if ($health -eq "healthy") { break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    Write-Host "  [OK] Docker containers started" -ForegroundColor Green

} else {
    # --- Local mode ---
    # 1a. Start MobSF in its own terminal
    if (Test-Path "$mobsfPath\run.bat") {
        Write-Host "  [--] Starting MobSF server (new terminal)..." -ForegroundColor Gray
        Start-Process powershell -ArgumentList @(
            "-NoExit", "-Command",
            "Set-Location '$mobsfPath'; & '.\mobsf-venv\Scripts\Activate.ps1'; & '.\run.bat'"
        )
        # Wait for MobSF to bind to port 8000 before proceeding
        Write-Host "  [--] Waiting for MobSF on port 8000..." -ForegroundColor Gray
        $mobsfUp = $false
        for ($i = 0; $i -lt 30; $i++) {
            try {
                $tcp = New-Object System.Net.Sockets.TcpClient
                $tcp.Connect("127.0.0.1", 8000)
                $tcp.Close()
                $mobsfUp = $true
                break
            } catch { }
            Start-Sleep -Seconds 2
        }
        if ($mobsfUp) {
            Write-Host "  [OK] MobSF is running on http://localhost:8000" -ForegroundColor Green
        } else {
            Write-Host "  [WARN] MobSF may still be starting (timed out waiting)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [WARN] MobSF not found at: $mobsfPath" -ForegroundColor Yellow
        Write-Host "         Static analysis will not work without MobSF." -ForegroundColor Gray
    }
}


# =================================================================
#  STEP 2: Discover AVDs and their API levels
# =================================================================
Write-Host ""
Write-Host "[Step 2/6] Discovering Android Virtual Devices..." -ForegroundColor Yellow

$avdList = @()
$avdNames = @()

try {
    $rawAvds = cmd /c "emulator -list-avds 2>&1"
    $avdNames = $rawAvds | Where-Object { $_.Trim() -ne "" -and $_ -notmatch "^INFO" }
} catch {
    Write-Host "  [WARN] emulator command not found. Add SDK emulator/ to PATH." -ForegroundColor Yellow
}

if ($avdNames.Count -eq 0) {
    Write-Host "  [WARN] No AVDs found!" -ForegroundColor Yellow
    Write-Host "         Create AVDs in Android Studio -> Tools -> Device Manager:" -ForegroundColor Gray
    Write-Host "           - Pixel 6a, API 34, google_apis, x86_64  (modern apps)" -ForegroundColor Gray
    Write-Host "           - Pixel 4,  API 28, google_apis, x86_64  (legacy apps)" -ForegroundColor Gray
    Write-Host "         Use 'google_apis' NOT 'google_apis_playstore'" -ForegroundColor Cyan
} else {
    $avdRoot = Join-Path $env:USERPROFILE ".android\avd"

    foreach ($name in $avdNames) {
        $name = $name.Trim()
        $configPath = Join-Path $avdRoot "$name.avd\config.ini"
        $apiLevel = 0

        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw
            if ($content -match "target=android-(\d+)") {
                $apiLevel = [int]$Matches[1]
            } elseif ($content -match "image\.sysdir\.1=.*android-(\d+)") {
                $apiLevel = [int]$Matches[1]
            }
        }

        $avdList += [PSCustomObject]@{
            Name     = $name
            ApiLevel = $apiLevel
        }
    }

    Write-Host "  Found $($avdList.Count) AVD(s):" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "    #   AVD Name                            API Level" -ForegroundColor DarkGray
    Write-Host "    --- -----------------------------------  ---------" -ForegroundColor DarkGray
    $idx = 1
    foreach ($avd in $avdList) {
        $nameStr = $avd.Name.PadRight(35)
        $apiStr  = if ($avd.ApiLevel -gt 0) { "API $($avd.ApiLevel)" } else { "unknown" }
        Write-Host "    $($idx.ToString().PadLeft(2))  $nameStr  $apiStr" -ForegroundColor White
        $idx++
    }
    Write-Host ""
}


# =================================================================
#  STEP 3: Select the best AVD
# =================================================================
Write-Host "[Step 3/6] Selecting emulator..." -ForegroundColor Yellow

$selectedAvd = $null

if ($SkipEmulator) {
    Write-Host "  [--] Skipping emulator (SkipEmulator flag set)" -ForegroundColor Gray
} elseif ($avdList.Count -eq 0) {
    Write-Host "  [--] No AVDs available - skipping" -ForegroundColor Gray
} else {
    if ($AvdName -ne "") {
        $selectedAvd = $avdList | Where-Object { $_.Name -eq $AvdName }
        if (-not $selectedAvd) {
            $availableNames = ($avdList | ForEach-Object { $_.Name }) -join ", "
            Write-Host "  [FAIL] AVD '$AvdName' not found!" -ForegroundColor Red
            Write-Host "         Available: $availableNames" -ForegroundColor Gray
            exit 1
        }
        Write-Host "  [OK] User-selected: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
    } elseif ($TargetApi -gt 0) {
        # Exact match
        $exact = $avdList | Where-Object { $_.ApiLevel -eq $TargetApi }
        if ($exact) {
            $selectedAvd = $exact | Select-Object -First 1
            Write-Host "  [OK] Exact match: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
        } else {
            # Closest above
            $above = $avdList | Where-Object { $_.ApiLevel -ge $TargetApi } | Sort-Object ApiLevel | Select-Object -First 1
            if ($above) {
                $selectedAvd = $above
                Write-Host "  [OK] Closest match: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel)) - target was $TargetApi" -ForegroundColor Green
            } else {
                # Highest below
                $below = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
                if ($below) {
                    $selectedAvd = $below
                    Write-Host "  [WARN] No AVD >= API $TargetApi. Using: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Yellow
                }
            }
        }
    } else {
        # No preference - highest API
        $selectedAvd = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
        if (-not $selectedAvd) { $selectedAvd = $avdList | Select-Object -First 1 }
        Write-Host "  [OK] Auto-selected (highest): $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
    }
}


# =================================================================
#  STEP 4: Launch emulator + Frida
# =================================================================
Write-Host ""
Write-Host "[Step 4/6] Launching emulator + Frida server..." -ForegroundColor Yellow

$devices = cmd /c "adb devices 2>&1"
$alreadyRunning = $devices | Select-String "device$"

if ($alreadyRunning) {
    Write-Host "  [OK] Emulator already running!" -ForegroundColor Green
    try {
        $runningApi = (cmd /c "adb shell getprop ro.build.version.sdk 2>&1").Trim()
        Write-Host "  [OK] Running API level: $runningApi" -ForegroundColor Cyan
    } catch { }
} elseif ($selectedAvd) {
    Write-Host "  [--] Launching: $($selectedAvd.Name)..." -ForegroundColor Cyan

    Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd.Name, "-no-audio", "-no-boot-anim", "-gpu", "auto" -WindowStyle Normal

    # Wait for full boot
    $timeout = 120
    $elapsed = 0
    $booted = $false
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $checkDevices = cmd /c "adb devices 2>&1"
        $checkConnected = $checkDevices | Select-String "device$"
        if ($checkConnected) {
            try {
                $bootDone = (cmd /c "adb shell getprop sys.boot_completed 2>&1").Trim()
                if ($bootDone -eq "1") { $booted = $true; break }
            } catch { }
            if ($elapsed -ge 40) { $booted = $true; break }
        }
        Write-Host "       ... waiting (${elapsed}s / ${timeout}s)" -ForegroundColor Gray
    }

    if (-not $booted) {
        Write-Host "  [FAIL] Emulator did not start within ${timeout}s" -ForegroundColor Red
        exit 1
    }

    $runningApi = (cmd /c "adb shell getprop ro.build.version.sdk 2>&1").Trim()
    Write-Host "  [OK] Emulator booted - $($selectedAvd.Name) (API $runningApi)" -ForegroundColor Green
} else {
    Write-Host "  [--] No emulator to launch - dynamic analysis will be skipped" -ForegroundColor Gray
}

# Install Frida server on emulator (if connected)
$devices2 = cmd /c "adb devices 2>&1"
$connected = $devices2 | Select-String "device$"

if ($connected) {
    $setupScript = Join-Path $openclawPath "setup-emulator.ps1"
    if (Test-Path $setupScript) {
        Write-Host "  [--] Installing Frida server on emulator..." -ForegroundColor Gray
        & $setupScript
    }

    if ($Docker) {
        # Docker needs ADB bridge
        Write-Host "  [--] Restarting ADB in network mode for Docker..." -ForegroundColor Gray
        cmd /c "adb kill-server 2>&1" | Out-Null
        Start-Sleep -Seconds 1
        Start-Process powershell -ArgumentList @(
            "-NoExit", "-Command",
            "Write-Host 'ADB Server - DO NOT CLOSE' -ForegroundColor Red; Write-Host 'Bridges emulator to Docker.' -ForegroundColor Gray; adb -a nodaemon server start"
        )
        Start-Sleep -Seconds 3
        Write-Host "  [OK] ADB server bridged to Docker" -ForegroundColor Green
    }
}


# =================================================================
#  STEP 5: Frontend Services (Convex + Next.js)
# =================================================================
Write-Host ""
Write-Host "[Step 5/6] Starting frontend services..." -ForegroundColor Yellow

if ($Docker) {
    Write-Host "  [OK] Web dashboard running inside Docker (Shinodroid-web)" -ForegroundColor Green
} else {
    # 5a. Convex dev server (must start BEFORE Next.js)
    Write-Host "  [--] Starting Convex dev server (new terminal)..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$webPath'; Write-Host 'Convex Dev Server' -ForegroundColor Cyan; npx convex dev"
    )

    # Wait for Convex to initialize before starting Next.js
    Write-Host "  [--] Waiting for Convex to initialize..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    Write-Host "  [OK] Convex dev server started" -ForegroundColor Green

    # 5b. Next.js dev server
    Write-Host "  [--] Starting Next.js dev server (new terminal)..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$webPath'; Write-Host 'Next.js Dev Server' -ForegroundColor Cyan; npm run dev"
    )

    # Wait for Next.js to bind to port 3000
    Write-Host "  [--] Waiting for Next.js on port 3000..." -ForegroundColor Gray
    $nextUp = $false
    for ($i = 0; $i -lt 20; $i++) {
        try {
            $tcp = New-Object System.Net.Sockets.TcpClient
            $tcp.Connect("127.0.0.1", 3000)
            $tcp.Close()
            $nextUp = $true
            break
        } catch { }
        Start-Sleep -Seconds 2
    }
    if ($nextUp) {
        Write-Host "  [OK] Next.js running on http://localhost:3000" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Next.js may still be compiling (timed out waiting)" -ForegroundColor Yellow
    }
}


# =================================================================
#  STEP 6: Scan Worker
# =================================================================
Write-Host ""
Write-Host "[Step 6/6] Starting scan worker..." -ForegroundColor Yellow

if ($Docker) {
    Write-Host "  [OK] Worker running inside Docker (Shinodroid-worker)" -ForegroundColor Green
}


# =================================================================
#  DONE - Summary
# =================================================================
Write-Host ""
Start-Process "http://localhost:3000/"

Write-Host ""
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host "  =        Shinodroid Lab is READY!        =" -ForegroundColor Green
Write-Host "  ==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Dashboard:     http://localhost:3000" -ForegroundColor White
Write-Host "  MobSF:         http://localhost:8000" -ForegroundColor White
if ($selectedAvd) {
    Write-Host "  Emulator:      $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor White
}
Write-Host ""

if ($Docker) {
    Write-Host "  Running in DOCKER mode" -ForegroundColor Cyan
    Write-Host "    docker logs -f Shinodroid-worker    # watch scan progress" -ForegroundColor Gray
    Write-Host "    docker compose ps                   # container status" -ForegroundColor Gray
    Write-Host "    docker compose down                 # stop everything" -ForegroundColor Gray
} else {
    Write-Host "  Running in LOCAL mode" -ForegroundColor Cyan
    Write-Host "    Terminal 1: MobSF server" -ForegroundColor Gray
    Write-Host "    Terminal 2: Android emulator" -ForegroundColor Gray
    Write-Host "    Terminal 3: Convex dev server" -ForegroundColor Gray
    Write-Host "    Terminal 4: Next.js dev server" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  To stop: press Ctrl+C here, then close terminal windows" -ForegroundColor Gray
}
Write-Host ""
Write-Host "  SDK-Aware Options:" -ForegroundColor DarkGray
Write-Host "    .\setup_tools.ps1 -TargetApi 34     # API 34 emulator" -ForegroundColor Gray
Write-Host "    .\setup_tools.ps1 -AvdName Pixel_6  # specific AVD" -ForegroundColor Gray
Write-Host "    .\setup_tools.ps1 -Docker           # use Docker instead" -ForegroundColor Gray
Write-Host ""

# =================================================================
#  STEP 6: Scan Worker (FOREGROUND - logs stream here)
# =================================================================
if (-not $Docker) {
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "  =  Scan Worker - LIVE LOGS BELOW         =" -ForegroundColor Cyan
    Write-Host "  =  Upload an APK to start scanning       =" -ForegroundColor Cyan
    Write-Host "  =  Press Ctrl+C to stop                  =" -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""

    Set-Location $openclawPath
    node watcher.mjs
}