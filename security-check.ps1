# ============================================================
# Shinodroid Security Posture Check
# Run anytime to verify your security hardening is intact.
# Does NOT require Administrator (read-only checks).
# ============================================================

param(
    [switch]$Fix  # Pass -Fix to auto-remediate where possible
)

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Shinodroid Security Posture Check" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor DarkGray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$pass = 0
$warn = 0
$fail = 0

function Check-Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green; $script:pass++ }
function Check-Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:warn++ }
function Check-Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:fail++ }

if (Test-Path $ocConfig) {
    $config = Get-Content $ocConfig -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($config) {
        # Check gateway bind
        if ($config.gateway.bind -eq "loopback") {
            Check-Pass "Gateway bound to loopback (localhost only)"
        } else {
            Check-Fail "Gateway NOT bound to loopback! Current: $($config.gateway.bind)"
        }

        # Check auth mode
        if ($config.gateway.auth.mode -eq "token") {
            Check-Pass "Gateway auth enabled (token mode)"
        } else {
            Check-Fail "Gateway auth not set to token mode!"
        }

        # Check Tailscale
        if ($config.gateway.tailscale.mode -eq "off") {
            Check-Pass "Tailscale exposure disabled"
        } else {
            Check-Warn "Tailscale is enabled (mode: $($config.gateway.tailscale.mode))"
        }
    }
} else {
}

# ── 2. Tool Permissions ─────────────────────────────────────
Write-Host ""
Write-Host "[2/8] Agent Tool Permissions" -ForegroundColor White
if ($config) {
    $agents = $config.agents.list
    foreach ($agent in $agents) {
        $allowed = $agent.tools.alsoAllow
        if ($allowed -contains "*") {
            Check-Fail "Agent '$($agent.id)' has WILDCARD tool permissions! RCE risk!"
        } else {
            Check-Pass "Agent '$($agent.id)' has explicit tool allowlist ($($allowed.Count) tools)"
        }
    }
}

# ── 3. File Permissions on Secrets ──────────────────────────
Write-Host ""
Write-Host "[3/8] Secret File Permissions" -ForegroundColor White
$secretFiles = @(
    "$PSScriptRoot\.env"
)
foreach ($f in $secretFiles) {
    if (Test-Path $f) {
        $acl = Get-Acl $f -ErrorAction SilentlyContinue
        $accessRules = $acl.Access | Where-Object {
            $_.IdentityReference -notmatch "SYSTEM|BUILTIN\\Administrators|$env:USERNAME"
        }
        if ($accessRules.Count -eq 0) {
            Check-Pass "$(Split-Path $f -Leaf) has restricted permissions"
        } else {
            $extras = ($accessRules | ForEach-Object { $_.IdentityReference }) -join ", "
            Check-Fail "$(Split-Path $f -Leaf) accessible by: $extras"
        }
    }
}

# ── 4. Exposed Ports ────────────────────────────────────────
Write-Host ""
Write-Host "[4/8] Exposed Network Ports" -ForegroundColor White
$dangerousPorts = @(8000, 18789, 3000, 5037, 27042)
$listeners = netstat -an 2>$null | Select-String "LISTEN"
foreach ($port in $dangerousPorts) {
    $exposed = $listeners | Where-Object { $_ -match "0\.0\.0\.0:$port\s" }
    if ($exposed) {
        Check-Fail "Port $port is listening on 0.0.0.0 (externally accessible!)"
    } else {
        $local = $listeners | Where-Object { $_ -match "127\.0\.0\.1:$port\s" }
        if ($local) {
            Check-Pass "Port $port is listening on localhost only"
        } else {
            Check-Pass "Port $port is not listening"
        }
    }
}

# ── 5. Firewall Rules ──────────────────────────────────────
Write-Host ""
Write-Host "[5/8] Firewall Rules" -ForegroundColor White
$fwRules = netsh advfirewall firewall show rule name=all dir=in 2>$null | Out-String
foreach ($name in $requiredBlocks) {
    if ($fwRules -match "Shinodroid-Block-$name") {
        Check-Pass "Firewall block rule exists for $name"
    } else {
        Check-Fail "No firewall block rule for $name - run harden-firewall.ps1 as Admin"
    }
}

# ── 6. .gitignore Coverage ─────────────────────────────────
Write-Host ""
Write-Host "[6/8] Git Secret Protection" -ForegroundColor White
$gitignore = "$PSScriptRoot\.gitignore"
if (Test-Path $gitignore) {
    $content = Get-Content $gitignore -Raw
    foreach ($p in $patterns) {
        if ($content -match [regex]::Escape($p)) {
            Check-Pass ".gitignore covers '$p'"
        } else {
            Check-Fail ".gitignore missing pattern '$p'"
        }
    }
} else {
    Check-Fail "No .gitignore found!"
}

# ── 7. MobSF Binding Check ─────────────────────────────────
Write-Host ""
Write-Host "[7/8] MobSF Configuration" -ForegroundColor White
$mobsfConfig = "$env:USERPROFILE\.MobSF\config.py"
if (Test-Path $mobsfConfig) {
    $mobsfContent = Get-Content $mobsfConfig -Raw
    if ($mobsfContent -match "BIND_ADDRESS.*0\.0\.0\.0") {
        Check-Fail "MobSF binds to 0.0.0.0 - change to 127.0.0.1 in config.py"
    } else {
        Check-Pass "MobSF config does not bind to 0.0.0.0"
    }
} else {
    Check-Warn "MobSF config.py not found (may use defaults)"
}

Write-Host ""
if ($config) {
    if ($tg.dmPolicy -eq "pairing") {
    } else {
    }
    if ($tg.groupPolicy -eq "allowlist") {
    } else {
    }
}

# ── Summary ─────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Results: $pass PASS  |  $warn WARN  |  $fail FAIL" -ForegroundColor $(if ($fail -gt 0) { "Red" } elseif ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host "============================================" -ForegroundColor Cyan

if ($fail -gt 0) {
    Write-Host ""
    Write-Host "  ACTION REQUIRED: $fail critical issue(s) found!" -ForegroundColor Red
    Write-Host "  Run: .\harden-firewall.ps1  (as Admin)" -ForegroundColor Yellow
} elseif ($warn -gt 0) {
    Write-Host ""
    Write-Host "  Mostly secure - $warn advisory warning(s)" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "  All checks passed! System is hardened." -ForegroundColor Green
}

Write-Host ""
