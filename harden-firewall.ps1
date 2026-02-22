# ============================================================
# WORMHOLE // ShinobiDroid - Firewall Hardening
# Run as Administrator: Right-click -> Run as Administrator
# ============================================================

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Firewall Hardening - WORMHOLE // ShinobiDroid" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check for admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[!] This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "    Right-click this file -> Run as Administrator" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "[1/4] Blocking external access to MobSF (port 8000)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Block MobSF External" >$null 2>&1
netsh advfirewall firewall add rule name="Block MobSF External" dir=in localport=8000 protocol=tcp action=block profile=any remoteip=any
Write-Host "  [+] Rule added" -ForegroundColor Green

Write-Host "[2/4] Allowing localhost to MobSF..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Allow MobSF Localhost" >$null 2>&1
netsh advfirewall firewall add rule name="Allow MobSF Localhost" dir=in localport=8000 protocol=tcp action=allow profile=any remoteip=127.0.0.1
Write-Host "  [+] Rule added" -ForegroundColor Green

Write-Host "[3/4] Blocking external access to OpenClaw (port 18789)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Block OpenClaw External" >$null 2>&1
netsh advfirewall firewall add rule name="Block OpenClaw External" dir=in localport=18789 protocol=tcp action=block profile=any remoteip=any
Write-Host "  [+] Rule added" -ForegroundColor Green

Write-Host "[4/4] Allowing localhost to OpenClaw..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Allow OpenClaw Localhost" >$null 2>&1
netsh advfirewall firewall add rule name="Allow OpenClaw Localhost" dir=in localport=18789 protocol=tcp action=allow profile=any remoteip=127.0.0.1
Write-Host "  [+] Rule added" -ForegroundColor Green

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Firewall rules applied successfully!" -ForegroundColor Green
Write-Host "  Ports 8000 and 18789 are now blocked externally" -ForegroundColor Green
Write-Host "  Only localhost (127.0.0.1) can access them" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
pause
