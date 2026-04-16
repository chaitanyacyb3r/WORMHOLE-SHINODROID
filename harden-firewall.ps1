# ============================================================
# WORMHOLE // Shinodroid - Comprehensive Firewall Hardening
# Run as Administrator: Right-click -> Run as Administrator
#
# Blocks external access to ALL security-sensitive ports:
#   - 8000  (MobSF)
#   - 18789 (OpenClaw Gateway)
#   - 3000  (Next.js Dashboard)
#   - 5037  (ADB Server)
#   - 27042 (Frida Server)
#   - 5554-5585 (Android Emulator range)
# ============================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Firewall Hardening - WORMHOLE // Shinodroid" -ForegroundColor Cyan
Write-Host "  Covering: MobSF, OpenClaw, Next.js, ADB, Frida" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# ── Admin check ─────────────────────────────────────────────
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "    Right-click this file -> Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

# ── Port definitions ────────────────────────────────────────
$rules = @(
    @{ Name = "MobSF";          Port = "8000";      Desc = "MobSF Static Analysis Server" },
    @{ Name = "OpenClaw";       Port = "18789";     Desc = "OpenClaw Gateway (1-click RCE vector)" },
    @{ Name = "NextJS";         Port = "3000";      Desc = "Shinodroid Dashboard" },
    @{ Name = "ADB";            Port = "5037";      Desc = "ADB Server (device control)" },
    @{ Name = "Frida";          Port = "27042";     Desc = "Frida Server (code injection)" },
    @{ Name = "Emulator-Console"; Port = "5554-5585"; Desc = "Android Emulator ports" }
)

$step = 1
$total = $rules.Count * 2  # block + allow per rule

foreach ($rule in $rules) {
    $blockName = "Shinodroid-Block-$($rule.Name)-External"
    $allowName = "Shinodroid-Allow-$($rule.Name)-Localhost"

    # Block external inbound
    Write-Host "[$step/$total] Blocking external access to $($rule.Name) (port $($rule.Port))..." -ForegroundColor Yellow
    Write-Host "         $($rule.Desc)" -ForegroundColor DarkGray
    netsh advfirewall firewall delete rule name="$blockName" >$null 2>&1
    # Also clean up old rule names from previous script version
    netsh advfirewall firewall delete rule name="Block $($rule.Name) External" >$null 2>&1
    netsh advfirewall firewall add rule name="$blockName" dir=in localport="$($rule.Port)" protocol=tcp action=block profile=any remoteip=any | Out-Null
    Write-Host "  [+] Block rule added" -ForegroundColor Green
    $step++

    # Allow localhost only
    Write-Host "[$step/$total] Allowing localhost to $($rule.Name)..." -ForegroundColor Yellow
    netsh advfirewall firewall delete rule name="$allowName" >$null 2>&1
    netsh advfirewall firewall delete rule name="Allow $($rule.Name) Localhost" >$null 2>&1
    netsh advfirewall firewall add rule name="$allowName" dir=in localport="$($rule.Port)" protocol=tcp action=allow profile=any remoteip=127.0.0.1 | Out-Null
    Write-Host "  [+] Allow rule added" -ForegroundColor Green
    $step++
}

# ── Block outbound from Frida server (prevent data exfil) ──
Write-Host ""
Write-Host "[$step/$total] Blocking outbound from Frida port (prevent exfil)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Shinodroid-Block-Frida-Outbound" >$null 2>&1
netsh advfirewall firewall add rule name="Shinodroid-Block-Frida-Outbound" dir=out localport=27042 protocol=tcp action=block profile=any | Out-Null
Write-Host "  [+] Outbound block added" -ForegroundColor Green

# ── Verification ────────────────────────────────────────────
Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Verifying all rules are active..." -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

$allRules = netsh advfirewall firewall show rule name=all | Out-String
$failures = 0
foreach ($rule in $rules) {
    $blockName = "Shinodroid-Block-$($rule.Name)-External"
    if ($allRules -match [regex]::Escape($blockName)) {
        Write-Host "  [OK] $blockName" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $blockName not found!" -ForegroundColor Red
        $failures++
    }
}

if ($failures -eq 0) {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "  All firewall rules applied and verified!" -ForegroundColor Green
    Write-Host "  Ports blocked externally:" -ForegroundColor Green
    foreach ($rule in $rules) {
        Write-Host "    - $($rule.Port) ($($rule.Name))" -ForegroundColor Green
    }
    Write-Host "  Only localhost (127.0.0.1) can access them" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "  WARNING: $failures rule(s) failed verification!" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
}

Write-Host ""
pause
