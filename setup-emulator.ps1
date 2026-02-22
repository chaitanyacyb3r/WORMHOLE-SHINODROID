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

# -- Step 4: Check for emulator --
Write-Host ""
Write-Host "--- Checking for connected emulator ---" -ForegroundColor Yellow
$devices = cmd /c "adb devices 2>&1"
$connected = $devices | Select-String "device$"

if ($connected) {
    Write-Host "[+] Emulator already connected!" -ForegroundColor Green
    & adb devices
} else {
    Write-Host "[!] No emulator connected." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Follow these steps in BrutDroid:" -ForegroundColor Cyan
    Write-Host "  1. Create Virtual Device    (Menu 1)" -ForegroundColor White
    Write-Host "     - Use API 31, x86_64 or arm64" -ForegroundColor Gray
    Write-Host "  2. Root Emulator            (Menu 2)" -ForegroundColor White
    Write-Host "     - Installs Magisk and patches system image" -ForegroundColor Gray
    Write-Host "  3. Install Tools            (Menu 3)" -ForegroundColor White
    Write-Host "     - Installs frida-tools, objection, etc." -ForegroundColor Gray
    Write-Host "  4. Configure Emulator       (Menu 4)" -ForegroundColor White
    Write-Host "     - Install Frida Server on device" -ForegroundColor Gray
    Write-Host "     - Install Burp Certificate (optional)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Starting BrutDroid now..." -ForegroundColor Cyan
    Write-Host ""

    Push-Location $BrutDroidDir
    python BrutDroid.py
    Pop-Location
}

# -- Step 5: Verify Frida Server --
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
