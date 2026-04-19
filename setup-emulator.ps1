# ================================================================
# WORMHOLE // Shinodroid - Emulator Setup Script
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
Write-Host "  WORMHOLE // Shinodroid - Automated Lab Setup" -ForegroundColor Cyan
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

    Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd, "-writable-system", "-wipe-data", "-no-audio", "-no-boot-anim" -WindowStyle Normal

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

# Ensure adb runs as root
cmd /c "adb root 2>&1" | Out-Null

# Check if already running
$fridaRunning = cmd /c "adb shell 'ps -A | grep frida-server' 2>&1"
if ($fridaRunning -match "frida-server" -and $fridaRunning -notmatch "grep") {
    Write-Host "  [OK] Frida server already running" -ForegroundColor Green
} else {
    Write-Host "  [--] Launching Frida server in background..." -ForegroundColor Yellow
    cmd /c 'adb shell "nohup /data/local/tmp/frida-server > /dev/null 2>&1 &"'
    Start-Sleep -Seconds 3
    Write-Host "  [OK] Frida server started" -ForegroundColor Green
}

# -- Step 4.5: Install ZAP CA Certificate --
Write-Host ""
Write-Host "[Step 4.5/5] Installing OWASP ZAP CA Certificate..." -ForegroundColor Yellow

$zapCert = "$env:USERPROFILE\ZAP\.ZAP\config\ssl\zap_root_ca.cer"
if (Test-Path $zapCert) {
    Write-Host "  [--] Found ZAP certificate, pushing to device..." -ForegroundColor Gray
    
    # Do NOT pipe to Out-Null so we can see if adb push or adb root hangs
    cmd /c "adb push `"$zapCert`" /sdcard/zap_ca.cer 2>&1"
    
    # For Android 7+ (API 24+), we must install it as a system cert
    Write-Host "  [--] Installing as system certificate via tmpfs (API 24+)..." -ForegroundColor Gray
    
    try {
        # Ensure root and WAIT for device to come back online
        cmd /c "adb root 2>&1"
        cmd /c "adb wait-for-device 2>&1"
        Start-Sleep -Seconds 2
        
        # Calculate subject_hash_old natively in PowerShell
        $certObj = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($zapCert)
        $subjectBytes = $certObj.SubjectName.RawData
        $md5 = [System.Security.Cryptography.MD5]::Create()
        $hashBytes = $md5.ComputeHash($subjectBytes)
        $hashInt = [BitConverter]::ToUInt32($hashBytes, 0)
        $hash = '{0:x8}' -f $hashInt
        
        if ($hash -match "^[0-9a-f]{8}$") {
            # Since Android 10 (API 29+), /system is strictly Read-Only.
            # On Android 11 (API 30+), the Conscrypt APEX module manages the real trust store
            # at /apex/com.android.conscrypt/cacerts/ -- the Settings UI reads from there.
            # Strategy: tmpfs overlay on BOTH the legacy and APEX cert directories.
            
            # Step 1: Overlay /system/etc/security/cacerts with tmpfs + inject cert
            $sysCmds = @(
                "mkdir -p -m 700 /data/local/tmp/certs",
                "cp /system/etc/security/cacerts/* /data/local/tmp/certs/",
                "cp /sdcard/zap_ca.cer /data/local/tmp/certs/${hash}.0",
                "chmod 644 /data/local/tmp/certs/${hash}.0",
                "mount -t tmpfs tmpfs /system/etc/security/cacerts",
                "cp /data/local/tmp/certs/* /system/etc/security/cacerts/",
                "chmod 644 /system/etc/security/cacerts/*",
                "chcon u:object_r:system_file:s0 /system/etc/security/cacerts/*"
            )
            foreach ($cmd in $sysCmds) {
                cmd /c "adb shell `"$cmd`" 2>&1"
            }
            
            # Step 2: Overlay /apex/com.android.conscrypt/cacerts with tmpfs + inject cert
            # This is where Android 11+ actually reads trusted certificates from.
            $apexCmds = @(
                "mount -t tmpfs tmpfs /apex/com.android.conscrypt/cacerts",
                "cp /system/etc/security/cacerts/* /apex/com.android.conscrypt/cacerts/",
                "chmod 644 /apex/com.android.conscrypt/cacerts/*",
                "chcon u:object_r:system_file:s0 /apex/com.android.conscrypt/cacerts/*"
            )
            foreach ($cmd in $apexCmds) {
                cmd /c "adb shell `"$cmd`" 2>&1"
            }
            
            # Cleanup temp dir
            cmd /c "adb shell rm -rf /data/local/tmp/certs 2>&1"

            
            # Verify installation in APEX path (the real trust store)
            $check = cmd /c "adb shell ls /apex/com.android.conscrypt/cacerts/${hash}.0 2>&1"
            if ($check -match "${hash}.0") {
                Write-Host "  [OK] ZAP certificate installed in system + APEX trust store (${hash}.0)" -ForegroundColor Green
            } else {
                # Fallback check on legacy path
                $legacyCheck = cmd /c "adb shell ls /system/etc/security/cacerts/${hash}.0 2>&1"
                if ($legacyCheck -match "${hash}.0") {
                    Write-Host "  [OK] ZAP certificate installed in legacy trust store (${hash}.0)" -ForegroundColor Green
                    Write-Host "       Note: APEX mount failed -- cert may not appear in Settings UI on Android 11+" -ForegroundColor Yellow
                } else {
                    Write-Host "  [FAIL] Certificate installation failed." -ForegroundColor Red
                }
            }
        } else {
            Write-Host "  [WARN] Failed to compute certificate hash locally." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  [WARN] Failed to install ZAP system cert. Interception may fail." -ForegroundColor Yellow
        Write-Host "         Error: $_" -ForegroundColor Gray
    }
} else {
    Write-Host "  [WARN] ZAP certificate not found at: $zapCert" -ForegroundColor Yellow
    Write-Host "         Network interception will not work." -ForegroundColor Gray
    Write-Host "         Open ZAP -> Options -> Dynamic SSL Certificates -> Generate -> Save" -ForegroundColor Gray
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
