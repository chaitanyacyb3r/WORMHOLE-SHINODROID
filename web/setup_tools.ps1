# ================================================================
# Shinodroid - SDK-Aware Launch Script
#
# This script:
#   1. Starts Docker containers (MobSF, Worker, Ollama, Web)
#   2. Discovers local AVDs and their API levels
#   3. Launches the emulator (or lets you pick one)
#   4. Exposes ADB to Docker so the worker can reach the emulator
#   5. Runs setup-emulator.ps1 to install/start Frida server
#   6. Opens the dashboard in your browser
#
# Usage:
#   .\setup_tools.ps1                  # auto-select AVD
#   .\setup_tools.ps1 -TargetApi 34    # prefer API 34 AVD
#   .\setup_tools.ps1 -AvdName Pixel_6 # launch a specific AVD
# ================================================================

param(
    [int]$TargetApi = 0,          # Preferred API level (0 = auto/highest)
    [string]$AvdName = "",        # Specific AVD name to launch
    [switch]$SkipDocker,          # Skip Docker startup (if already running)
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
    # Fallback: try the known absolute path
    $openclawPath = "C:\Users\elliot\Documents\OPENCLAW-SECURITY-INTEGRITY"
}

# -----------------------------------------------------------------
# Step 1: Docker Containers
# -----------------------------------------------------------------
if (-not $SkipDocker) {
    Write-Host "[Step 1/6] Starting Docker containers..." -ForegroundColor Yellow

    # Check Docker is running
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "         Please start Docker Desktop and try again." -ForegroundColor Gray
        exit 1
    }
    Write-Host "  [OK] Docker Desktop is running" -ForegroundColor Green

    Push-Location $openclawPath
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] docker compose up failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    Pop-Location

    # Wait for MobSF health check
    Write-Host "  [--] Waiting for MobSF to become healthy..." -ForegroundColor Gray
    $mobsfReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' Shinodroid-mobsf 2>$null
            if ($health -eq "healthy") { $mobsfReady = $true; break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    if ($mobsfReady) {
        Write-Host "  [OK] All containers running" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] MobSF may still be starting - continuing anyway" -ForegroundColor Yellow
    }
} else {
    Write-Host "[Step 1/6] Skipping Docker startup (SkipDocker flag set)" -ForegroundColor Gray
}

# -----------------------------------------------------------------
# Step 2: Discover AVDs and their API levels
# -----------------------------------------------------------------
Write-Host ""
Write-Host "[Step 2/6] Discovering Android Virtual Devices..." -ForegroundColor Yellow

$avdList = @()
$avdNames = @()

try {
    $rawAvds = cmd /c "emulator -list-avds 2>&1"
    $avdNames = $rawAvds | Where-Object { $_.Trim() -ne "" -and $_ -notmatch "^INFO" }
} catch {
    Write-Host "  [WARN] emulator command not found. Add Android SDK emulator/ to PATH." -ForegroundColor Yellow
}

if ($avdNames.Count -eq 0) {
    Write-Host "  [WARN] No AVDs found!" -ForegroundColor Yellow
    Write-Host "         Create AVDs in Android Studio -> Tools -> Device Manager:" -ForegroundColor Gray
    Write-Host "           - Pixel 6a, API 34, google_apis, x86_64  (modern apps)" -ForegroundColor Gray
    Write-Host "           - Pixel 4,  API 28, google_apis, x86_64  (legacy apps)" -ForegroundColor Gray
    Write-Host "         IMPORTANT: Use 'google_apis' NOT 'google_apis_playstore'" -ForegroundColor Cyan
} else {
    $avdRoot = Join-Path $env:USERPROFILE ".android\avd"

    foreach ($name in $avdNames) {
        $name = $name.Trim()
        $configPath = Join-Path $avdRoot "$name.avd\config.ini"
        $apiLevel = 0

        if (Test-Path $configPath) {
            $content = Get-Content $configPath -Raw
            # Parse target=android-XX or image.sysdir.1=...android-XX/...
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

# -----------------------------------------------------------------
# Step 3: Select the best AVD
# -----------------------------------------------------------------
Write-Host "[Step 3/6] Selecting emulator..." -ForegroundColor Yellow

$selectedAvd = $null

if ($SkipEmulator) {
    Write-Host "  [--] Skipping emulator launch (SkipEmulator flag set)" -ForegroundColor Gray
} elseif ($avdList.Count -eq 0) {
    Write-Host "  [--] No AVDs available - skipping emulator launch" -ForegroundColor Gray
} else {
    if ($AvdName -ne "") {
        # User specified an exact AVD name
        $selectedAvd = $avdList | Where-Object { $_.Name -eq $AvdName }
        if (-not $selectedAvd) {
            Write-Host "  [FAIL] AVD '$AvdName' not found!" -ForegroundColor Red
            $availableNames = ($avdList | ForEach-Object { $_.Name }) -join ", "
            Write-Host "         Available: $availableNames" -ForegroundColor Gray
            exit 1
        }
        Write-Host "  [OK] User-selected: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
    } elseif ($TargetApi -gt 0) {
        # SDK-aware selection: find best match for requested API
        # Priority: exact match > closest above > closest below
        $exact = $avdList | Where-Object { $_.ApiLevel -eq $TargetApi }
        if ($exact) {
            $selectedAvd = $exact | Select-Object -First 1
            Write-Host "  [OK] Exact match: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
        } else {
            $above = $avdList | Where-Object { $_.ApiLevel -ge $TargetApi } | Sort-Object ApiLevel | Select-Object -First 1
            if ($above) {
                $selectedAvd = $above
                Write-Host "  [OK] Closest match: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel)) - target was API $TargetApi" -ForegroundColor Green
            } else {
                $below = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
                if ($below) {
                    $selectedAvd = $below
                    Write-Host "  [WARN] No AVD with API >= $TargetApi. Using highest: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Yellow
                    Write-Host "         For best results, create an API $TargetApi AVD in Android Studio." -ForegroundColor Gray
                }
            }
        }
    } else {
        # No preference - pick the highest API level
        $selectedAvd = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
        if (-not $selectedAvd) { $selectedAvd = $avdList | Select-Object -First 1 }
        Write-Host "  [OK] Auto-selected (highest API): $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))" -ForegroundColor Green
    }
}

# -----------------------------------------------------------------
# Step 4: Launch the selected emulator
# -----------------------------------------------------------------
Write-Host ""
Write-Host "[Step 4/6] Launching emulator..." -ForegroundColor Yellow

# Check if an emulator is already running
$devices = cmd /c "adb devices 2>&1"
$alreadyRunning = $devices | Select-String "device$"

if ($alreadyRunning) {
    Write-Host "  [OK] Emulator already running!" -ForegroundColor Green

    # Show what API level is running
    try {
        $runningApi = (cmd /c "adb shell getprop ro.build.version.sdk 2>&1").Trim()
        Write-Host "  [OK] Running emulator API level: $runningApi" -ForegroundColor Cyan

        if ($TargetApi -gt 0 -and $runningApi -ne "$TargetApi") {
            $diff = [Math]::Abs([int]$runningApi - $TargetApi)
            if ($diff -le 2) {
                Write-Host "  [OK] Close to target API $TargetApi (within $diff) - results will be reliable" -ForegroundColor Green
            } else {
                Write-Host "  [WARN] Running API $runningApi differs from target API $TargetApi by $diff levels" -ForegroundColor Yellow
                Write-Host "         For best accuracy, close this emulator and rerun with -AvdName" -ForegroundColor Gray
            }
        }
    } catch { }
} elseif ($selectedAvd) {
    Write-Host "  [--] Launching: $($selectedAvd.Name)..." -ForegroundColor Cyan

    Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd.Name, "-no-audio", "-no-boot-anim", "-gpu", "auto" -WindowStyle Normal

    # Wait for boot
    $timeout = 120
    $elapsed = 0
    $booted = $false
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $checkDevices = cmd /c "adb devices 2>&1"
        $checkConnected = $checkDevices | Select-String "device$"
        if ($checkConnected) {
            # Check sys.boot_completed
            try {
                $bootDone = (cmd /c "adb shell getprop sys.boot_completed 2>&1").Trim()
                if ($bootDone -eq "1") {
                    $booted = $true
                    break
                }
            } catch { }
            # After 40s, accept even if boot_completed is not set
            if ($elapsed -ge 40) {
                $booted = $true
                break
            }
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

# -----------------------------------------------------------------
# Step 5: Setup Frida Server + Expose ADB to Docker
# -----------------------------------------------------------------
Write-Host ""
Write-Host "[Step 5/6] Setting up Frida server and ADB bridge..." -ForegroundColor Yellow

# Check if emulator is connected
$devices2 = cmd /c "adb devices 2>&1"
$connected = $devices2 | Select-String "device$"

if ($connected) {
    # Run setup-emulator.ps1 to install Frida server
    $setupScript = Join-Path $openclawPath "setup-emulator.ps1"
    if (Test-Path $setupScript) {
        Write-Host "  [--] Installing/starting Frida server on emulator..." -ForegroundColor Gray
        & $setupScript
    } else {
        Write-Host "  [WARN] setup-emulator.ps1 not found at: $setupScript" -ForegroundColor Yellow
    }

    # Kill existing ADB server and restart in network mode for Docker
    Write-Host ""
    Write-Host "  [--] Restarting ADB server in network mode (for Docker bridge)..." -ForegroundColor Gray
    cmd /c "adb kill-server 2>&1" | Out-Null
    Start-Sleep -Seconds 1

    # Start ADB server in a new terminal window (must stay open)
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host 'ADB Server - DO NOT CLOSE THIS WINDOW' -ForegroundColor Red; Write-Host 'This bridges your emulator to Docker containers.' -ForegroundColor Gray; Write-Host ''; adb -a nodaemon server start"
    )

    # Wait for ADB server to come up
    Start-Sleep -Seconds 3
    Write-Host "  [OK] ADB server exposed to Docker via host.docker.internal:5037" -ForegroundColor Green
} else {
    Write-Host "  [--] No emulator connected - skipping Frida setup" -ForegroundColor Gray
}

# -----------------------------------------------------------------
# Step 6: Open Dashboard
# -----------------------------------------------------------------
Write-Host ""
Write-Host "[Step 6/6] Opening dashboard..." -ForegroundColor Yellow

Start-Sleep -Seconds 3
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
Write-Host "  Commands:" -ForegroundColor DarkGray
Write-Host "    docker logs -f Shinodroid-worker    # watch scan progress" -ForegroundColor Gray
Write-Host "    docker compose ps                   # check container status" -ForegroundColor Gray
Write-Host "    docker compose down                 # stop everything" -ForegroundColor Gray
Write-Host ""
Write-Host "  SDK-Aware Relaunch:" -ForegroundColor DarkGray
Write-Host "    .\setup_tools.ps1 -TargetApi 34     # launch API 34 emulator" -ForegroundColor Gray
Write-Host "    .\setup_tools.ps1 -AvdName Pixel_6  # launch specific AVD" -ForegroundColor Gray
Write-Host "    .\setup_tools.ps1 -SkipDocker       # skip Docker rebuild" -ForegroundColor Gray
Write-Host ""