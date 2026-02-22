# ================================================================
# WORMHOLE // ShinobiDroid - Emulator Setup Script
# Automates: emulator launch, Frida server install, Frida start
# ================================================================
#
# Prerequisites:
#   - Android Studio installed with SDK Platform-Tools
#   - Python 3.9+ with frida-tools (pip install frida-tools)
#   - At least one AVD created in Android Studio
#
# This script automates the full lab setup:
#   Step 1: Verify tools (ADB, Frida)
#   Step 2: Launch emulator (if not running)
#   Step 3: Detect architecture + install Frida server
#   Step 4: Start Frida server
#   Step 5: Verify everything works
# ================================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  WORMHOLE // ShinobiDroid - Automated Lab Setup" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Verify tools --
Write-Host "[Step 1/5] Verifying tools..." -ForegroundColor Yellow

# ADB
$adbCheck = cmd /c "adb version 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] ADB not found. Install Android SDK Platform-Tools." -ForegroundColor Red
    exit 1
}
Write-Host "  [OK] ADB available" -ForegroundColor Green

# Frida
$fridaVersion = cmd /c "frida --version 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Frida not found. Run: pip install frida-tools" -ForegroundColor Red
    exit 1
}
$fridaVersion = $fridaVersion.Trim()
Write-Host "  [OK] Frida $fridaVersion" -ForegroundColor Green

# emulator command
$emulatorCheck = cmd /c "emulator -list-avds 2>&1"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN] emulator command not found in PATH." -ForegroundColor Yellow
    Write-Host "         Add Android SDK emulator/ to your PATH." -ForegroundColor Gray
}

# -- Step 2: Launch emulator --
Write-Host ""
Write-Host "[Step 2/5] Checking emulator..." -ForegroundColor Yellow

$devices = cmd /c "adb devices 2>&1"
$connected = $devices | Select-String "device$"

if ($connected) {
    Write-Host "  [OK] Emulator already running!" -ForegroundColor Green
} else {
    Write-Host "  [--] No emulator found. Launching one..." -ForegroundColor Yellow

    $avdList = cmd /c "emulator -list-avds 2>&1"
    $avds = $avdList | Where-Object { $_.Trim() -ne "" }

    if (-not $avds -or $avds.Count -eq 0) {
        Write-Host "  [FAIL] No AVDs found." -ForegroundColor Red
        Write-Host "         Create one: Android Studio -> Tools -> Device Manager" -ForegroundColor Yellow
        Write-Host "         Recommended: Pixel 6, API 31, x86_64" -ForegroundColor Gray
        exit 1
    }

    Write-Host "  Available AVDs:" -ForegroundColor Cyan
    $i = 1
    foreach ($avd in $avds) {
        Write-Host "    [$i] $avd" -ForegroundColor White
        $i++
    }

    $selectedAvd = if ($avds -is [string]) { $avds } else { $avds[0] }
    Write-Host "  [--] Launching: $selectedAvd" -ForegroundColor Cyan

    Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd -WindowStyle Normal

    $timeout = 180
    $elapsed = 0
    $booted = $false
    while ($elapsed -lt $timeout) {
        Start-Sleep -Seconds 5
        $elapsed += 5
        $checkDevices = cmd /c "adb devices 2>&1"
        $checkConnected = $checkDevices | Select-String "device$"
        if ($checkConnected) {
            $booted = $true
            break
        }
        Write-Host "       ... waiting (${elapsed}s / ${timeout}s)" -ForegroundColor Gray
    }

    if (-not $booted) {
        Write-Host "  [FAIL] Emulator did not start within ${timeout}s" -ForegroundColor Red
        exit 1
    }

    Write-Host "  [OK] Emulator connected after ${elapsed}s" -ForegroundColor Green

    # Wait for full boot
    Write-Host "  [--] Waiting for boot to complete..." -ForegroundColor Yellow
    cmd /c "adb wait-for-device 2>&1" | Out-Null
    Start-Sleep -Seconds 10
    Write-Host "  [OK] Emulator fully booted" -ForegroundColor Green
}

# -- Step 3: Install Frida Server on emulator --
Write-Host ""
Write-Host "[Step 3/5] Installing Frida server on emulator..." -ForegroundColor Yellow

# Check if already installed
$fridaExists = cmd /c "adb shell ls /data/local/tmp/frida-server 2>&1"
if ($fridaExists -match "frida-server" -and $fridaExists -notmatch "No such file") {
    Write-Host "  [OK] Frida server already installed on device" -ForegroundColor Green
} else {
    # Detect architecture
    Write-Host "  [--] Detecting emulator architecture..." -ForegroundColor Yellow
    $arch = (cmd /c "adb shell getprop ro.product.cpu.abi 2>&1").Trim()
    Write-Host "  [OK] Architecture: $arch" -ForegroundColor Green

    # Download matching frida-server
    $downloadUrl = "https://github.com/frida/frida/releases/download/$fridaVersion/frida-server-$fridaVersion-android-$arch.xz"
    $xzFile = Join-Path $env:TEMP "frida-server-$fridaVersion.xz"
    $serverFile = Join-Path $env:TEMP "frida-server"

    Write-Host "  [--] Downloading frida-server $fridaVersion for $arch..." -ForegroundColor Yellow
    Write-Host "       URL: $downloadUrl" -ForegroundColor Gray

    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $xzFile -UseBasicParsing
        Write-Host "  [OK] Downloaded ($([math]::Round((Get-Item $xzFile).Length / 1MB, 1)) MB)" -ForegroundColor Green
    } catch {
        Write-Host "  [FAIL] Download failed: $_" -ForegroundColor Red
        Write-Host "         Try manually: https://github.com/frida/frida/releases" -ForegroundColor Yellow
        exit 1
    }

    # Extract .xz using Python (available since frida-tools requires Python)
    Write-Host "  [--] Extracting..." -ForegroundColor Yellow
    python -c "import lzma; open(r'$serverFile','wb').write(lzma.open(r'$xzFile').read())"
    if (-not (Test-Path $serverFile)) {
        Write-Host "  [FAIL] Extraction failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Extracted" -ForegroundColor Green

    # Push to emulator
    Write-Host "  [--] Pushing to emulator..." -ForegroundColor Yellow
    cmd /c "adb push `"$serverFile`" /data/local/tmp/frida-server 2>&1"
    cmd /c "adb shell chmod 755 /data/local/tmp/frida-server 2>&1"
    Write-Host "  [OK] Frida server installed on emulator" -ForegroundColor Green

    # Cleanup temp files
    Remove-Item $xzFile -ErrorAction SilentlyContinue
    Remove-Item $serverFile -ErrorAction SilentlyContinue
}

# -- Step 4: Start Frida Server --
Write-Host ""
Write-Host "[Step 4/5] Starting Frida server..." -ForegroundColor Yellow

# Check if already running
$fridaRunning = cmd /c "adb shell su -c 'ps | grep frida-server' 2>&1"
if ($fridaRunning -match "frida-server" -and $fridaRunning -notmatch "grep") {
    Write-Host "  [OK] Frida server already running" -ForegroundColor Green
} else {
    Write-Host "  [--] Launching Frida server in background..." -ForegroundColor Yellow
    cmd /c 'adb shell su -c "nohup /data/local/tmp/frida-server > /dev/null 2>&1 &"'
    Start-Sleep -Seconds 3
    Write-Host "  [OK] Frida server started" -ForegroundColor Green
}

# -- Step 5: Verify everything --
Write-Host ""
Write-Host "[Step 5/5] Verifying setup..." -ForegroundColor Yellow

$fridaPs = cmd /c "frida-ps -U 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Frida connection verified - can see device processes!" -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  LAB SETUP COMPLETE!" -ForegroundColor Green
    Write-Host "" -ForegroundColor Green
    Write-Host "  Emulator: running" -ForegroundColor White
    Write-Host "  Frida:    running on device" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "  Start the scanner:" -ForegroundColor Cyan
    Write-Host "    npm start" -ForegroundColor White
    Write-Host "" -ForegroundColor White
    Write-Host "  Drop APKs in: C:\MobSF-Scans\inbox" -ForegroundColor White
    Write-Host "  Reports in:   C:\MobSF-Scans\reports" -ForegroundColor White
    Write-Host "========================================================" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Cannot connect to Frida on device." -ForegroundColor Yellow
    Write-Host "         The emulator may need to be rooted first." -ForegroundColor Yellow
    Write-Host "" -ForegroundColor Yellow
    Write-Host "  To root your emulator, run BrutDroid:" -ForegroundColor Cyan
    Write-Host "    cd '$env:USERPROFILE\Documents\git clones\BrutDroid'" -ForegroundColor White
    Write-Host "    python BrutDroid.py" -ForegroundColor White
    Write-Host "    -> Select Menu 2 (Root Emulator)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  After rooting, run this setup script again." -ForegroundColor Cyan
}
