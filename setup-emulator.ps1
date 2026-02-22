# ================================================================
# WORMHOLE // ShinobiDroid - Emulator Setup Script
# Uses BrutDroid for one-time Android emulator setup
# ================================================================
#
# Prerequisites:
#   - Android Studio installed with SDK Platform-Tools
#   - Python 3.9+ installed
#   - BrutDroid cloned to Documents\git clones\BrutDroid
#
# This script guides you through the one-time setup steps.
# After setup, the watcher handles everything automatically.
# ================================================================

$ErrorActionPreference = "Continue"
$BrutDroidDir = Join-Path $env:USERPROFILE "Documents\git clones\BrutDroid"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  WORMHOLE // ShinobiDroid - Emulator Setup (One-Time)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Verify BrutDroid --
if (-not (Test-Path (Join-Path $BrutDroidDir "BrutDroid.py"))) {
    Write-Host "[!] BrutDroid not found at: $BrutDroidDir" -ForegroundColor Red
    Write-Host "    Clone it first:" -ForegroundColor Yellow
    Write-Host '    git clone https://github.com/Brut-Security/BrutDroid.git "Documents\git clones\BrutDroid"'
    exit 1
}
Write-Host "[+] BrutDroid found at: $BrutDroidDir" -ForegroundColor Green

# -- Step 2: Verify ADB --
$adbVersion = cmd /c "adb version 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] ADB not found in PATH. Install Android SDK Platform-Tools." -ForegroundColor Red
    exit 1
}
Write-Host "[+] ADB available" -ForegroundColor Green

# -- Step 3: Verify Frida --
$fridaVersion = & frida --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] Frida not found. Install: pip install frida-tools" -ForegroundColor Red
    exit 1
}
Write-Host "[+] Frida $fridaVersion available" -ForegroundColor Green

# -- Step 4: Launch emulator if not already running --
Write-Host ""
Write-Host "--- Checking for connected emulator ---" -ForegroundColor Yellow
$devices = cmd /c "adb devices 2>&1"
$connected = $devices | Select-String "device$"

if ($connected) {
    Write-Host "[+] Emulator already connected!" -ForegroundColor Green
    cmd /c "adb devices"
} else {
    Write-Host "[!] No emulator connected. Launching one..." -ForegroundColor Yellow
    Write-Host ""

    # Find available AVDs
    $avdList = cmd /c "emulator -list-avds 2>&1"
    $avds = $avdList | Where-Object { $_.Trim() -ne "" }

    if (-not $avds -or $avds.Count -eq 0) {
        Write-Host "[!] No AVDs found. Create one in Android Studio first:" -ForegroundColor Red
        Write-Host "    Android Studio -> Tools -> Device Manager -> Create Device" -ForegroundColor Yellow
        Write-Host "    Recommended: Pixel 6, API 31, x86_64" -ForegroundColor Gray
        exit 1
    }

    # List available AVDs
    Write-Host "Available AVDs:" -ForegroundColor Cyan
    $i = 1
    foreach ($avd in $avds) {
        Write-Host "  [$i] $avd" -ForegroundColor White
        $i++
    }

    # Pick the first AVD (or let user choose if multiple)
    $selectedAvd = if ($avds -is [string]) { $avds } else { $avds[0] }
    Write-Host ""
    Write-Host "[*] Launching emulator: $selectedAvd" -ForegroundColor Cyan

    # Launch emulator in background
    Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd -WindowStyle Normal
    Write-Host "[*] Waiting for emulator to boot..." -ForegroundColor Yellow

    # Wait up to 120 seconds for emulator to appear
    $timeout = 120
    $elapsed = 0
    $booted = $false
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $checkDevices = cmd /c "adb devices 2>&1"
        $checkConnected = $checkDevices | Select-String "device$"
        if ($checkConnected) {
            Write-Host "[+] Emulator connected after ${elapsed}s!" -ForegroundColor Green
            $booted = $true
            break
        }
        Write-Host "    ... waiting (${elapsed}s / ${timeout}s)" -ForegroundColor Gray
    }

    if (-not $booted) {
        Write-Host "[!] Emulator did not connect within ${timeout}s." -ForegroundColor Red
        Write-Host "    Try launching it manually from Android Studio." -ForegroundColor Yellow
        exit 1
    }

    # Wait a bit more for full boot
    Write-Host "[*] Waiting for emulator to fully boot..." -ForegroundColor Yellow
    cmd /c "adb wait-for-device 2>&1" | Out-Null
    Start-Sleep -Seconds 10
    Write-Host "[+] Emulator is ready!" -ForegroundColor Green
}

# -- Step 5: Run BrutDroid for rooting and Frida setup --
Write-Host ""
Write-Host "--- Running BrutDroid for emulator configuration ---" -ForegroundColor Yellow
Write-Host "Follow these steps in BrutDroid:" -ForegroundColor Cyan
Write-Host "  1. Root Emulator            (Menu 2)" -ForegroundColor White
Write-Host "     - Installs Magisk and patches system image" -ForegroundColor Gray
Write-Host "  2. Install Tools            (Menu 3)" -ForegroundColor White
Write-Host "     - Installs frida-tools, objection, etc." -ForegroundColor Gray
Write-Host "  3. Configure Emulator       (Menu 4)" -ForegroundColor White
Write-Host "     - Install Frida Server on device" -ForegroundColor Gray
Write-Host "     - Install Burp Certificate (optional)" -ForegroundColor Gray
Write-Host ""

Push-Location $BrutDroidDir
python BrutDroid.py
Pop-Location

# -- Step 6: Verify Frida Server --
Write-Host ""
Write-Host "--- Verifying Frida Server ---" -ForegroundColor Yellow
$fridaCheck = & frida-ps -U 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "[+] Frida server is running on emulator!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  SETUP COMPLETE! You can now run the watcher:" -ForegroundColor Green
    Write-Host "    cd wormhole-shinobidroid" -ForegroundColor White
    Write-Host "    npm start" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "  Drop APKs in: C:\MobSF-Scans\inbox" -ForegroundColor White
    Write-Host "  Reports in:   C:\MobSF-Scans\reports" -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "[!] Frida server not detected on emulator." -ForegroundColor Yellow
    Write-Host "    Run BrutDroid -> Menu 5 (Run Frida Server)" -ForegroundColor Yellow
    Write-Host "    Or manually: adb shell su -c 'nohup /data/local/tmp/frida-server'" -ForegroundColor Gray
}
