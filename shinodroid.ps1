# ==============================================================================
#  WORMHOLE // Shinodroid — Unified Master Launcher
# ==============================================================================
#  Automated Android Security Analysis Platform (MobSF + Frida + Convex + Next.js)
#
#  Usage:
#    .\shinodroid.ps1                     # Full stack (MobSF -> Emulator -> Frida -> Convex -> Next.js -> Worker)
#    .\shinodroid.ps1 -Mode scan          # Start only scan worker (assumes MobSF is running)
#    .\shinodroid.ps1 -Mode web           # Start only web dashboard (Convex + Next.js)
#    .\shinodroid.ps1 -Mode worker        # Start only the daemon/worker
#    .\shinodroid.ps1 -SkipAI             # Disable AI triage engine
#    .\shinodroid.ps1 -SkipEmulator       # Skip emulator launch (if already running or headless)
#    .\shinodroid.ps1 -TargetApi 34       # Prefer specific Android API level emulator
#    .\shinodroid.ps1 -AvdName Pixel_6a   # Launch specific AVD
#    .\shinodroid.ps1 -Docker             # Run stack via Docker Compose
# ==============================================================================

param(
    [ValidateSet('full','scan','web','worker')]
    [string]$Mode = 'full',
    [switch]$SkipAI,
    [switch]$SkipEmulator,
    [switch]$Docker,
    [int]$TargetApi = 0,
    [string]$AvdName = ''
)

$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ==============================================================================
#  Path Configuration
# ==============================================================================
function Find-MobSFPath {
    $dirs = @(
        $env:MOBSF_PATH,
        $env:MOBSF_DIR,
        (Join-Path $env:USERPROFILE "Documents\Mobile-Security-Framework-MobSF"),
        (Join-Path $env:USERPROFILE "Mobile-Security-Framework-MobSF"),
        (Join-Path $env:USERPROFILE "Documents\MobSF"),
        (Join-Path $env:USERPROFILE "MobSF"),
        "C:\Mobile-Security-Framework-MobSF",
        "C:\MobSF"
    )
    foreach ($d in $dirs) {
        if ($d -and (Test-Path (Join-Path $d "run.bat"))) {
            return $d
        }
    }
    return $null
}

$mobsfPath = Find-MobSFPath
$rootDir   = $PSScriptRoot
$webPath   = Join-Path $PSScriptRoot 'web'

# ==============================================================================
#  Environment Configuration
# ==============================================================================
$aiModel   = "ornith-64k"
$aiBackend = "ollama"

# Load default AI model from .env if available
if (Test-Path (Join-Path $rootDir ".env")) {
    $envLines = Get-Content (Join-Path $rootDir ".env") -ErrorAction SilentlyContinue
    foreach ($line in $envLines) {
        if ($line -match '^\s*OLLAMA_MODEL\s*=\s*([^#\r\n]+)') {
            $parsedModel = $Matches[1].Trim()
            if ($parsedModel) {
                $aiModel = $parsedModel
            }
        }
        if ($line -match '^\s*AI_BACKEND\s*=\s*([^#\r\n]+)') {
            $parsedBackend = $Matches[1].Trim()
            if ($parsedBackend) {
                $aiBackend = $parsedBackend
            }
        }
    }
}

if ($SkipAI) {
    $env:SKIP_AI = 'true'
    $aiStatus = 'SKIP'
    $aiDisplay = 'Disabled'
} else {
    $aiStatus = 'ACTIVE'
    # Format display name cleanly (remove tags like :cloud if needed for box)
    $cleanAi = if ($aiModel -match '^([^:]+)') { $Matches[1] } else { $aiModel }
    if ($aiBackend -eq 'hermes') {
        $aiDisplay = "Hermes ($cleanAi)"
    } else {
        $aiDisplay = $cleanAi
    }
}

# ==============================================================================
#  CLI Helpers & UI Components
# ==============================================================================

function Show-Banner {
    Write-Host ""
    Write-Host " ____  _   _ ___ _   _  ___  ____  ____   ___ ___ ____  " -ForegroundColor Cyan
    Write-Host "/ ___|| | | |_ _| \ | |/ _ \|  _ \|  _ \ / _ \_ _|  _ \ " -ForegroundColor Magenta
    Write-Host "\___ \| |_| || ||  \| | | | | | | | |_) | | | | || | | |" -ForegroundColor Cyan
    Write-Host " ___) |  _  || || |\  | |_| | |_| |  _ <| |_| | || |_| |" -ForegroundColor Magenta
    Write-Host "|____/|_| |_|___|_| \_|\___/|____/|_| \_\\___/___|____/ " -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  v2.0.0 | Automated Android Security Analysis Platform" -ForegroundColor DarkCyan
    Write-Host "  ────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step {
    param(
        [int]$Step,
        [int]$Total,
        [string]$Message
    )
    $barLength = 6
    $filled = [math]::Round(($Step / $Total) * $barLength)
    if ($filled -lt 1 -and $Step -gt 0) { $filled = 1 }
    if ($filled -gt $barLength) { $filled = $barLength }
    $empty = $barLength - $filled
    $bar = ('■' * $filled) + ('□' * $empty)

    Write-Host ""
    Write-Host "[$bar] " -NoNewline -ForegroundColor Cyan
    Write-Host "Step $Step/$Total  " -NoNewline -ForegroundColor Magenta
    Write-Host "$Message" -ForegroundColor White
}

function Write-SubStep {
    param(
        [Parameter(Position=0)]
        [string]$Message,
        [switch]$Ok,
        [switch]$Warn,
        [switch]$Fail,
        [switch]$Skip,
        [switch]$Info
    )
    Write-Host "   └─ " -NoNewline -ForegroundColor DarkGray
    if ($Ok)   { Write-Host "✓ " -NoNewline -ForegroundColor Green;    Write-Host $Message -ForegroundColor White }
    elseif ($Warn) { Write-Host "⚠ " -NoNewline -ForegroundColor Yellow;   Write-Host $Message -ForegroundColor Yellow }
    elseif ($Fail) { Write-Host "✗ " -NoNewline -ForegroundColor Red;      Write-Host $Message -ForegroundColor Red }
    elseif ($Skip) { Write-Host "⊘ " -NoNewline -ForegroundColor DarkGray; Write-Host $Message -ForegroundColor DarkGray }
    else           { Write-Host "→ " -NoNewline -ForegroundColor Cyan;     Write-Host $Message -ForegroundColor Gray }
}

function Write-Status {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Status
    )
    $statusUpper = $Status.ToUpper()
    $statusColor = switch -Regex ($statusUpper) {
        '^(ONLINE|READY|ACTIVE|RUNNING|OK)$' { 'Green' }
        '^(OFFLINE|FAILED|ERROR|DOWN)$'       { 'Red' }
        '^(SKIP|SKIPPED|DISABLED)$'           { 'Yellow' }
        default                               { 'Cyan' }
    }
    
    $nameCol = $Name.PadRight(13).Substring(0, 13)
    $valCol  = $Value.PadRight(25).Substring(0, 25)
    $tag     = '[' + $statusUpper + ']'
    $tagCol  = $tag.PadRight(10).Substring(0, 10)

    Write-Host '║  ' -NoNewline -ForegroundColor Cyan
    Write-Host $nameCol -NoNewline -ForegroundColor White
    Write-Host $valCol -NoNewline -ForegroundColor Gray
    Write-Host $tagCol -NoNewline -ForegroundColor $statusColor
    Write-Host '║' -ForegroundColor Cyan
}

function Test-PortOpen {
    param(
        [string]$HostName = '127.0.0.1',
        [int]$Port,
        [int]$TimeoutMs = 750
    )
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($HostName, $Port, $null, $null)
        $success = $connect.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
        if ($success) {
            $tcp.EndConnect($connect)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

function Start-MobSFServer {
    param([int]$WaitSeconds = 40)

    if (Test-PortOpen -Port 8000) {
        Write-SubStep -Ok "MobSF online at http://localhost:8000"
        return $true
    }

    $detectedPath = Find-MobSFPath
    if (-not $detectedPath) {
        Write-SubStep -Warn "MobSF not found in common paths"
        Write-SubStep -Info "Ensure MobSF is installed or set `$env:MOBSF_PATH"
        return $false
    }

    Write-SubStep -Info "Starting MobSF server in background ($detectedPath)..."
    Start-Process cmd.exe -ArgumentList "/k cd /d `"$detectedPath`" && call mobsf-venv\Scripts\activate.bat && run.bat" -WindowStyle Minimized

    Write-SubStep -Info "Waiting for MobSF on port 8000..."
    $mobsfUp = $false
    for ($i = 0; $i -lt $WaitSeconds; $i++) {
        if (Test-PortOpen -Port 8000) {
            $mobsfUp = $true
            break
        }
        Start-Sleep -Seconds 1
    }

    if ($mobsfUp) {
        Write-SubStep -Ok "MobSF online at http://localhost:8000"
        return $true
    } else {
        Write-SubStep -Warn "MobSF still initializing (timed out after ${WaitSeconds}s)"
        return $false
    }
}

function Show-Summary {
    param(
        [string]$DashboardUrl = 'http://localhost:3000',
        [string]$DashboardStatus = 'ONLINE',
        [string]$MobSfUrl = 'http://localhost:8000',
        [string]$MobSfStatus = 'ONLINE',
        [string]$EmulatorInfo = 'Pixel_6a (API 34)',
        [string]$EmulatorStatus = 'READY',
        [string]$AiInfo = 'ornith-64k',
        [string]$AiStatus = 'ACTIVE',
        [string]$WorkerInfo = 'Listening...',
        [string]$WorkerStatus = 'ACTIVE'
    )

    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  SHINODROID v2.0.0 — ALL SYSTEMS OPERATIONAL     ║" -ForegroundColor Cyan
    Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Status -Name "Dashboard"   -Value $DashboardUrl  -Status $DashboardStatus
    Write-Status -Name "MobSF"       -Value $MobSfUrl      -Status $MobSfStatus
    Write-Status -Name "Emulator"    -Value $EmulatorInfo  -Status $EmulatorStatus
    Write-Status -Name "AI Engine"   -Value $AiInfo        -Status $AiStatus
    Write-Status -Name "Scan Worker" -Value $WorkerInfo    -Status $WorkerStatus
    Write-Host "╠══════════════════════════════════════════════════╣" -ForegroundColor Cyan
    Write-Host "║  Usage:                                          ║" -ForegroundColor DarkGray
    Write-Host "║    .\shinodroid.ps1                 # full start ║" -ForegroundColor DarkGray
    Write-Host "║    .\shinodroid.ps1 -Mode scan      # scan only  ║" -ForegroundColor DarkGray
    Write-Host "║    .\shinodroid.ps1 -SkipAI         # no AI      ║" -ForegroundColor DarkGray
    Write-Host "║    .\shinodroid.ps1 -Mode web       # dashboard  ║" -ForegroundColor DarkGray
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

# ==============================================================================
#  Display Startup Banner & Mode Information
# ==============================================================================
Show-Banner

if ($SkipAI) {
    Write-Host "  [SKIP] AI engine disabled" -ForegroundColor Yellow
}

# ==============================================================================
#  MODE: SCAN (Start only scan worker, check prerequisites)
# ==============================================================================
if ($Mode -eq 'scan') {
    Write-Step -Step 1 -Total 2 -Message "Verifying scan prerequisites..."

    # Check & Auto-start MobSF
    $mobsfUp = Start-MobSFServer -WaitSeconds 35
    $mobsfSummaryStatus = if ($mobsfUp) { "ONLINE" } else { "OFFLINE" }

    # Check Android Device / Emulator
    $devices = cmd /c "adb devices 2>&1"
    $connected = $devices | Select-String "device$"
    if ($connected) {
        $devSerial = ($connected[0].Line -split "`t")[0].Trim()
        $isEmulator = $devSerial -like "emulator-*"
        $devType = if ($isEmulator) { "Emulator" } else { "Physical device ($devSerial)" }
        $runningApi = (cmd /c "adb -s $devSerial shell getprop ro.build.version.sdk 2>&1").Trim()
        Write-SubStep -Ok "$devType connected (API $runningApi)"
        $emuSummaryInfo = "$devType (API $runningApi)"
        $emuSummaryStatus = "READY"
    } else {
        Write-SubStep -Warn "No Android device/emulator connected (Dynamic analysis skipped)"
        $emuSummaryInfo = "None"
        $emuSummaryStatus = "OFFLINE"
    }

    # Check Dashboard
    $webUp = Test-PortOpen -Port 3000
    $webSummaryStatus = if ($webUp) { "ONLINE" } else { "OFFLINE" }

    Write-Step -Step 2 -Total 2 -Message "Starting scan worker daemon..."
    Write-SubStep -Ok "Worker starting in live listener mode"

    Show-Summary -DashboardStatus $webSummaryStatus `
                 -MobSfStatus $mobsfSummaryStatus `
                 -EmulatorInfo $emuSummaryInfo `
                 -EmulatorStatus $emuSummaryStatus `
                 -AiInfo $aiDisplay `
                 -AiStatus $aiStatus `
                 -WorkerInfo "Listening..." `
                 -WorkerStatus "ACTIVE"

    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "  =  Scan Worker - LIVE LOGS BELOW         =" -ForegroundColor Cyan
    Write-Host "  =  Upload an APK to start scanning       =" -ForegroundColor Cyan
    Write-Host "  =  Press Ctrl+C to stop                  =" -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
    Set-Location $rootDir
    node src/daemon.mjs
    exit 0
}

# ==============================================================================
#  MODE: WORKER (Start only the daemon / worker)
# ==============================================================================
if ($Mode -eq 'worker') {
    Write-Step -Step 1 -Total 1 -Message "Starting Shinodroid daemon worker..."
    
    # Check & Auto-start MobSF
    $mobsfUp = Start-MobSFServer -WaitSeconds 35
    $mobsfSummaryStatus = if ($mobsfUp) { "ONLINE" } else { "OFFLINE" }

    $devices = cmd /c "adb devices 2>&1"
    $connected = $devices | Select-String "device$"
    if ($connected) {
        $runningApi = (cmd /c "adb shell getprop ro.build.version.sdk 2>&1").Trim()
        $emuSummaryInfo = "Connected (API $runningApi)"
        $emuSummaryStatus = "READY"
    } else {
        $emuSummaryInfo = "None"
        $emuSummaryStatus = "OFFLINE"
    }

    $webUp = Test-PortOpen -Port 3000
    $webSummaryStatus = if ($webUp) { "ONLINE" } else { "OFFLINE" }

    Write-SubStep -Ok "Worker starting in foreground listener mode"

    Show-Summary -DashboardStatus $webSummaryStatus `
                 -MobSfStatus $mobsfSummaryStatus `
                 -EmulatorInfo $emuSummaryInfo `
                 -EmulatorStatus $emuSummaryStatus `
                 -AiInfo $aiDisplay `
                 -AiStatus $aiStatus `
                 -WorkerInfo "Listening..." `
                 -WorkerStatus "ACTIVE"

    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "  =  Scan Worker - LIVE LOGS BELOW         =" -ForegroundColor Cyan
    Write-Host "  =  Upload an APK to start scanning       =" -ForegroundColor Cyan
    Write-Host "  =  Press Ctrl+C to stop                  =" -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
    Set-Location $rootDir
    node src/daemon.mjs
    exit 0
}

# ==============================================================================
#  MODE: WEB (Start Convex dev server + Next.js dashboard)
# ==============================================================================
if ($Mode -eq 'web') {
    Write-Step -Step 1 -Total 2 -Message "Starting Convex dev server..."
    Write-SubStep -Info "Launching Convex dev process in background..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$webPath'; Write-Host 'Shinodroid — Convex Dev Server' -ForegroundColor Magenta; npx convex dev"
    )
    Start-Sleep -Seconds 8
    Write-SubStep -Ok "Convex dev server initialized"

    Write-Step -Step 2 -Total 2 -Message "Starting Next.js web dashboard..."
    if (Test-PortOpen -Port 3000) {
        Write-SubStep -Ok "Next.js dashboard already running on http://localhost:3000"
    } else {
        Write-SubStep -Info "Launching Next.js in background..."
        Start-Process powershell -ArgumentList @(
            "-NoExit", "-Command",
            "Set-Location '$webPath'; Write-Host 'Shinodroid — Next.js Dev Server' -ForegroundColor Cyan; npm run dev"
        )
        $nextUp = $false
        for ($i = 0; $i -lt 20; $i++) {
            if (Test-PortOpen -Port 3000) { $nextUp = $true; break }
            Start-Sleep -Seconds 2
        }
        if ($nextUp) {
            Write-SubStep -Ok "Next.js online at http://localhost:3000"
        } else {
            Write-SubStep -Warn "Next.js compiling (timed out waiting on port 3000)"
        }
    }

    Start-Process "http://localhost:3000/"

    $mobsfUp = Test-PortOpen -Port 8000
    $mobsfSummaryStatus = if ($mobsfUp) { "ONLINE" } else { "OFFLINE" }

    Show-Summary -DashboardStatus "ONLINE" `
                 -MobSfStatus $mobsfSummaryStatus `
                 -EmulatorInfo "Not Started" `
                 -EmulatorStatus "OFFLINE" `
                 -AiInfo $aiDisplay `
                 -AiStatus $aiStatus `
                 -WorkerInfo "Standby" `
                 -WorkerStatus "OFFLINE"

    Write-Host "  Web dashboard is running. Press Ctrl+C or close windows when done." -ForegroundColor Cyan
    exit 0
}

# ==============================================================================
#  MODE: FULL (Default: MobSF -> Emulator -> Frida -> Convex -> Next.js -> Worker)
# ==============================================================================

# ------------------------------------------------------------------------------
#  STEP 1/6: Starting MobSF server & Backend Services
# ------------------------------------------------------------------------------
Write-Step -Step 1 -Total 6 -Message "Starting MobSF server..."

$mobsfSummaryStatus = "OFFLINE"

if ($Docker) {
    # --- Docker Mode ---
    Write-SubStep -Info "Verifying Docker Desktop daemon..."
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-SubStep -Fail "Docker Desktop is not running! Start Docker Desktop and try again."
        exit 1
    }
    Write-SubStep -Ok "Docker Desktop is active"

    Write-SubStep -Info "Building and starting containers..."
    docker compose up -d 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-SubStep -Fail "docker compose up failed."
        exit 1
    }

    Write-SubStep -Info "Waiting for MobSF container to report healthy..."
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = docker inspect --format='{{.State.Health.Status}}' Shinodroid-mobsf 2>$null
            if ($health -eq "healthy") { break }
        } catch { }
        Start-Sleep -Seconds 2
    }
    Write-SubStep -Ok "MobSF online at http://localhost:8000 (Docker)"
    $mobsfSummaryStatus = "ONLINE"
} else {
    # --- Local Mode ---
    $mobsfUp = Start-MobSFServer -WaitSeconds 40
    $mobsfSummaryStatus = if ($mobsfUp) { "ONLINE" } else { "OFFLINE" }

    # Check OWASP ZAP Daemon
    $zapPath = "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat"
    if (Test-Path $zapPath) {
        if (Test-PortOpen -Port 8080) {
            Write-SubStep -Ok "OWASP ZAP daemon already running on port 8080"
        } else {
            Write-SubStep -Info "Starting ZAP daemon (port 8080)..."
            Start-Process -FilePath $zapPath -ArgumentList "-daemon", "-port", "8080", "-config", "api.key=shinodroid-zap-key", "-config", "api.addrs.addr.name=.*", "-config", "api.addrs.addr.regex=true" -WorkingDirectory "C:\Program Files\ZAP\Zed Attack Proxy" -WindowStyle Minimized
            Write-SubStep -Ok "ZAP daemon started in background"
        }
    }
}

# ------------------------------------------------------------------------------
#  STEP 2/6: Launching Android Emulator
# ------------------------------------------------------------------------------
Write-Step -Step 2 -Total 6 -Message "Launching Android emulator..."

$selectedAvd = $null
$selectedAvdDisplay = "Pixel_6a (API 34)"
$emulatorStatus = "OFFLINE"

if ($SkipEmulator) {
    Write-SubStep -Skip "Emulator launch skipped (-SkipEmulator flag set)"
    $selectedAvdDisplay = "Skipped"
    $emulatorStatus = "SKIP"
} else {
    # Check if a device or emulator is ALREADY running
    $devices = cmd /c "adb devices 2>&1"
    $alreadyRunning = $devices | Select-String "device$"

    if ($alreadyRunning) {
        $devSerial = ($alreadyRunning[0].Line -split "`t")[0].Trim()
        $isEmulator = $devSerial -like "emulator-*"
        $devLabel = if ($isEmulator) { "Emulator" } else { "Physical device ($devSerial)" }
        try {
            $runningApi = (cmd /c "adb -s $devSerial shell getprop ro.build.version.sdk 2>&1").Trim()
            Write-SubStep -Ok "$devLabel already active (API $runningApi)"
            $selectedAvdDisplay = "$devLabel (API $runningApi)"
            $emulatorStatus = "READY"
        } catch {
            Write-SubStep -Ok "$devLabel already active"
            $selectedAvdDisplay = $devLabel
            $emulatorStatus = "READY"
        }
    } else {
        # Discover AVDs
        $avdList = @()
        $avdNames = @()
        try {
            $rawAvds = cmd /c "emulator -list-avds 2>&1"
            $avdNames = $rawAvds | Where-Object { $_.Trim() -ne "" -and $_ -notmatch "^INFO" }
        } catch {
            Write-SubStep -Warn "emulator command not found in PATH"
        }

        if ($avdNames.Count -gt 0) {
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

            # Select AVD based on parameters
            if ($AvdName -ne "") {
                $selectedAvd = $avdList | Where-Object { $_.Name -eq $AvdName }
                if (-not $selectedAvd) {
                    $availableNames = ($avdList | ForEach-Object { $_.Name }) -join ", "
                    Write-SubStep -Fail "AVD '$AvdName' not found. Available: $availableNames"
                    exit 1
                }
            } elseif ($TargetApi -gt 0) {
                $exact = $avdList | Where-Object { $_.ApiLevel -eq $TargetApi }
                if ($exact) {
                    $selectedAvd = $exact | Select-Object -First 1
                } else {
                    $above = $avdList | Where-Object { $_.ApiLevel -ge $TargetApi } | Sort-Object ApiLevel | Select-Object -First 1
                    if ($above) {
                        $selectedAvd = $above
                    } else {
                        $selectedAvd = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
                    }
                }
            } else {
                $selectedAvd = $avdList | Where-Object { $_.ApiLevel -gt 0 } | Sort-Object ApiLevel -Descending | Select-Object -First 1
                if (-not $selectedAvd) { $selectedAvd = $avdList | Select-Object -First 1 }
            }

            if ($selectedAvd) {
                Write-SubStep -Info "Starting emulator: $($selectedAvd.Name) (API $($selectedAvd.ApiLevel))..."
                Start-Process -FilePath "emulator" -ArgumentList "-avd", $selectedAvd.Name, "-writable-system", "-no-audio", "-no-boot-anim", "-gpu", "auto" -WindowStyle Normal

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
                        try {
                            $bootDone = (cmd /c "adb shell getprop sys.boot_completed 2>&1").Trim()
                            if ($bootDone -eq "1") {
                                Start-Sleep -Seconds 5
                                $booted = $true
                                break
                            }
                        } catch { }
                        if ($elapsed -ge 60) { $booted = $true; break }
                    }
                }

                if ($booted) {
                    $runningApi = (cmd /c "adb shell getprop ro.build.version.sdk 2>&1").Trim()
                    Write-SubStep -Ok "$($selectedAvd.Name) (API $runningApi) booted"
                    $selectedAvdDisplay = "$($selectedAvd.Name) (API $runningApi)"
                    $emulatorStatus = "READY"
                } else {
                    Write-SubStep -Fail "Emulator did not boot within ${timeout}s"
                    $selectedAvdDisplay = "$($selectedAvd.Name)"
                    $emulatorStatus = "OFFLINE"
                }
            }
        } else {
            Write-SubStep -Warn "No AVDs found. Dynamic analysis will be skipped."
            $selectedAvdDisplay = "None"
            $emulatorStatus = "OFFLINE"
        }
    }
}

# ------------------------------------------------------------------------------
#  STEP 3/6: Initializing Frida server on emulator
# ------------------------------------------------------------------------------
Write-Step -Step 3 -Total 6 -Message "Configuring Frida server on emulator..."

$devicesCheck = cmd /c "adb devices 2>&1"
$deviceConnected = $devicesCheck | Select-String "device$"

if ($deviceConnected) {
    # Check if Frida server is already running
    $psList = cmd /c "adb shell ps -A 2>&1"
    $fridaRunning = $psList | Select-String "frida-server"
    if ($fridaRunning) {
        Write-SubStep -Ok "Frida server already active on device"
    } else {
        # Check if Magisk su is available
        $suCheck = (cmd /c "adb shell su -c whoami 2>&1").Trim()
        if ($suCheck -eq "root") {
            Write-SubStep -Info "Starting Frida server with Magisk su..."
            cmd /c "adb shell su -c setenforce 0 2>&1" | Out-Null
            Start-Process -NoNewWindow adb -ArgumentList "shell", "su", "-c", "nohup /data/local/tmp/frida-server -D > /dev/null 2>&1 &"
            Start-Sleep -Seconds 2
            Write-SubStep -Ok "Frida server initialized via su on physical device"
        } else {
            $setupScript = Join-Path $rootDir "setup-emulator.ps1"
            if (Test-Path $setupScript) {
                Write-SubStep -Info "Running emulator instrumentation setup..."
                & $setupScript
                Write-SubStep -Ok "Frida server initialized on device"
            } else {
                Write-SubStep -Warn "setup-emulator.ps1 not found; skipped automated Frida push"
            }
        }
    }

    if ($Docker) {
        Write-SubStep -Info "Configuring ADB network bridge for Docker..."
        cmd /c "adb kill-server 2>&1" | Out-Null
        Start-Sleep -Seconds 1
        Start-Process powershell -ArgumentList @(
            "-NoExit", "-Command",
            "Write-Host 'Shinodroid — ADB Server (Bridges emulator to Docker)' -ForegroundColor Red; adb -a nodaemon server start"
        )
        Start-Sleep -Seconds 3
        Write-SubStep -Ok "ADB network bridge active"
    }
} else {
    Write-SubStep -Skip "No emulator connected; skipping Frida initialization"
}

# ------------------------------------------------------------------------------
#  STEP 4/6: Starting Convex dev server
# ------------------------------------------------------------------------------
Write-Step -Step 4 -Total 6 -Message "Starting Convex dev server..."

if ($Docker) {
    Write-SubStep -Ok "Convex dev sync managed inside Docker"
} else {
    Write-SubStep -Info "Starting Convex dev server (new terminal)..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$webPath'; Write-Host 'Shinodroid — Convex Dev Server' -ForegroundColor Magenta; npx convex dev"
    )
    Write-SubStep -Info "Waiting for Convex to initialize..."
    Start-Sleep -Seconds 8
    Write-SubStep -Ok "Convex dev server initialized"
}

# ------------------------------------------------------------------------------
#  STEP 5/6: Starting Next.js web dashboard
# ------------------------------------------------------------------------------
Write-Step -Step 5 -Total 6 -Message "Starting Next.js web dashboard..."

$webSummaryStatus = "OFFLINE"

if ($Docker) {
    Write-SubStep -Ok "Web dashboard running inside Docker at http://localhost:3000"
    $webSummaryStatus = "ONLINE"
} else {
    if (Test-PortOpen -Port 3000) {
        Write-SubStep -Ok "Next.js dashboard already running on http://localhost:3000"
        $webSummaryStatus = "ONLINE"
    } else {
        Write-SubStep -Info "Starting Next.js dev server (new terminal)..."
        Start-Process powershell -ArgumentList @(
            "-NoExit", "-Command",
            "Set-Location '$webPath'; Write-Host 'Shinodroid — Next.js Dev Server' -ForegroundColor Cyan; npm run dev"
        )

        Write-SubStep -Info "Waiting for Next.js on port 3000..."
        $nextUp = $false
        for ($i = 0; $i -lt 20; $i++) {
            if (Test-PortOpen -Port 3000) {
                $nextUp = $true
                break
            }
            Start-Sleep -Seconds 2
        }

        if ($nextUp) {
            Write-SubStep -Ok "Next.js online at http://localhost:3000"
            $webSummaryStatus = "ONLINE"
        } else {
            Write-SubStep -Warn "Next.js compiling (timed out waiting on port 3000)"
            $webSummaryStatus = "ONLINE"
        }
    }
}

# Open web dashboard in default browser
Start-Process "http://localhost:3000/"

# ------------------------------------------------------------------------------
#  System Summary Box
# ------------------------------------------------------------------------------
Show-Summary -DashboardStatus $webSummaryStatus `
             -MobSfStatus $mobsfSummaryStatus `
             -EmulatorInfo $selectedAvdDisplay `
             -EmulatorStatus $emulatorStatus `
             -AiInfo $aiDisplay `
             -AiStatus $aiStatus `
             -WorkerInfo "Listening..." `
             -WorkerStatus "ACTIVE"

# ------------------------------------------------------------------------------
#  STEP 6/6: Starting Shinodroid Scan Worker
# ------------------------------------------------------------------------------
Write-Step -Step 6 -Total 6 -Message "Starting scan worker daemon..."

if ($Docker) {
    Write-SubStep -Ok "Scan worker active inside Docker (Shinodroid-worker)"
    Write-Host ""
    Write-Host "  To stream Docker scan worker logs:" -ForegroundColor Cyan
    Write-Host "    docker logs -f Shinodroid-worker" -ForegroundColor White
    Write-Host ""
} else {
    Write-SubStep -Ok "Starting scan worker in foreground listener mode"
    Write-Host ""
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host "  =  Scan Worker - LIVE LOGS BELOW         =" -ForegroundColor Cyan
    Write-Host "  =  Upload an APK to start scanning       =" -ForegroundColor Cyan
    Write-Host "  =  Press Ctrl+C to stop                  =" -ForegroundColor Cyan
    Write-Host "  ==========================================" -ForegroundColor Cyan
    Write-Host ""
    Set-Location $rootDir
    node src/daemon.mjs
}
