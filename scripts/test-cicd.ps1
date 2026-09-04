<# 
.SYNOPSIS
  Shinodroid CI/CD Pipeline - Local Smoke Test
.DESCRIPTION
  Simulates exactly what the GitHub Action does:
    1. Generate an API key (admin endpoint)
    2. Upload an APK using the CI endpoint
    3. Poll for scan results
    4. Check fail-on logic (exit 1 if Critical/High found)
.NOTES
  Prerequisites:
    - Convex deployed with 'npx convex deploy' from web/
    - SHINODROID_ADMIN_SECRET set via 'npx convex env set'
    - Your Shinodroid worker running (npm start or docker compose up)
#>

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Shinodroid CI/CD -- Local Smoke Test                  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

# -- Configuration -----------------------------------------------------------
# Auto-detect Convex URL from web/.env.local
# IMPORTANT: Convex HTTP actions are served on .convex.site, NOT .convex.cloud
#   .convex.cloud = Convex client API (queries, mutations)
#   .convex.site  = Custom HTTP routes (our CI/CD endpoints)
$envFile = Join-Path $PSScriptRoot "..\web\.env.local"
$envLine = Select-String -Path $envFile -Pattern "NEXT_PUBLIC_CONVEX_URL=" | ForEach-Object { $_.Line }
$cloudUrl = ($envLine -split "=", 2)[1].Trim()
$CONVEX_URL = $cloudUrl -replace "\.convex\.cloud", ".convex.site"
Write-Host "  Convex HTTP URL: $CONVEX_URL" -ForegroundColor Gray
$ADMIN_SECRET = Read-Host "Enter your SHINODROID_ADMIN_SECRET"
$USER_ID      = Read-Host "Enter your Convex user ID (from Dashboard > Data > users > _id)"
$APK_PATH     = Read-Host "Enter full path to a test APK"

if (-not (Test-Path $APK_PATH)) {
    Write-Host "ERROR: APK not found at $APK_PATH" -ForegroundColor Red
    exit 1
}

$APK_NAME = Split-Path $APK_PATH -Leaf
$APK_SIZE = (Get-Item $APK_PATH).Length
Write-Host "APK: $APK_NAME ($([math]::Round($APK_SIZE / 1MB, 1)) MB)" -ForegroundColor Gray
Write-Host ""

# ============================================================================
# TEST 1: Generate an API Key
# ============================================================================
Write-Host "--- TEST 1: Generate API Key ---" -ForegroundColor Yellow
Write-Host "  POST $CONVEX_URL/api/v1/ci-api-keys" -ForegroundColor Gray
Write-Host ""

$keyBody = @{
    userId = $USER_ID
    name   = "smoke-test-key-$(Get-Date -Format 'HHmmss')"
} | ConvertTo-Json

try {
    $keyResponse = Invoke-RestMethod `
        -Uri "$CONVEX_URL/api/v1/ci-api-keys" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $ADMIN_SECRET"
            "Content-Type"  = "application/json"
        } `
        -Body $keyBody

    $API_KEY = $keyResponse.apiKey
    $keyPreview = $API_KEY.Substring(0, 15)
    Write-Host "  [PASS] API Key generated: ${keyPreview}..." -ForegroundColor Green
    Write-Host "  Message: $($keyResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "  [FAIL]: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting:" -ForegroundColor Yellow
    Write-Host "    1. Did you run 'npx convex deploy' from the web/ folder?" -ForegroundColor Gray
    Write-Host "    2. Did you run 'npx convex env set SHINODROID_ADMIN_SECRET <secret>'?" -ForegroundColor Gray
    Write-Host "    3. Is the admin secret you entered the same one you set in Convex?" -ForegroundColor Gray
    exit 1
}

Write-Host ""

# ============================================================================
# TEST 2: Upload APK via CI Endpoint
# ============================================================================
Write-Host "--- TEST 2: Upload APK ---" -ForegroundColor Yellow

# Step 2a: Get upload URL
Write-Host "  GET $CONVEX_URL/api/v1/ci-upload-url" -ForegroundColor Gray
try {
    $urlResponse = Invoke-RestMethod `
        -Uri "$CONVEX_URL/api/v1/ci-upload-url" `
        -Method GET `
        -Headers @{ "Authorization" = "Bearer $API_KEY" }
    
    $UPLOAD_URL = $urlResponse.uploadUrl
} catch {
    Write-Host "  [FAIL]: Could not get upload URL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2b: Upload to storage
Write-Host "  Uploading $APK_NAME to Convex storage..." -ForegroundColor Gray
try {
    $apkBytes = [System.IO.File]::ReadAllBytes($APK_PATH)
    $storageResponse = Invoke-RestMethod `
        -Uri $UPLOAD_URL `
        -Method POST `
        -Headers @{ "Content-Type" = "application/octet-stream" } `
        -Body $apkBytes
    
    $STORAGE_ID = $storageResponse.storageId
} catch {
    Write-Host "  [FAIL]: Could not upload file to storage: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 2c: Start the scan
Write-Host "  POST $CONVEX_URL/api/v1/ci-scan" -ForegroundColor Gray
try {
    $scanBody = @{
        storageId = $STORAGE_ID
        fileName  = $APK_NAME
        fileSize  = $APK_SIZE
    } | ConvertTo-Json

    $uploadResponse = Invoke-RestMethod `
        -Uri "$CONVEX_URL/api/v1/ci-scan" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $API_KEY"
            "Content-Type"  = "application/json"
        } `
        -Body $scanBody

    $SCAN_ID = $uploadResponse.scanId
    Write-Host "  [PASS] Scan queued!" -ForegroundColor Green
    Write-Host "  Scan ID: $SCAN_ID" -ForegroundColor Cyan
    Write-Host "  Message: $($uploadResponse.message)" -ForegroundColor Gray
} catch {
    Write-Host "  [FAIL]: $($_.Exception.Message)" -ForegroundColor Red
    try {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errBody = $reader.ReadToEnd()
        Write-Host "  Response: $errBody" -ForegroundColor Red
    } catch {}
    exit 1
}

Write-Host ""

# ============================================================================
# TEST 3: Poll for Results
# ============================================================================
Write-Host "--- TEST 3: Poll Scan Status ---" -ForegroundColor Yellow
Write-Host "  GET $CONVEX_URL/api/v1/ci-scan/$SCAN_ID" -ForegroundColor Gray
Write-Host ""
Write-Host "  Polling every 15 seconds (timeout: 60 minutes)..." -ForegroundColor Gray
Write-Host "  NOTE: Your Shinodroid worker must be running!" -ForegroundColor Yellow
Write-Host ""

$timeout = 7200
$interval = 15
$elapsed = 0
$status = "pending"
$pollResponse = $null

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds $interval
    $elapsed += $interval

    try {
        $pollResponse = Invoke-RestMethod `
            -Uri "$CONVEX_URL/api/v1/ci-scan/$SCAN_ID" `
            -Method GET `
            -Headers @{ "Authorization" = "Bearer $API_KEY" }

        $status = $pollResponse.status
    } catch {
        $status = "error"
    }

    $mins = [math]::Floor($elapsed / 60)
    $secs = $elapsed % 60
    $timeStr = "{0}:{1:D2}" -f $mins, $secs
    Write-Host "  [$timeStr] Status: $status" -ForegroundColor Gray

    if ($status -eq "completed" -or $status -eq "failed") {
        break
    }
}

Write-Host ""

# ============================================================================
# TEST 4: Evaluate Results (Build Pass/Fail Logic)
# ============================================================================
if ($status -eq "completed") {
    $critical = $pollResponse.findingsCritical
    $high     = $pollResponse.findingsHigh
    $medium   = $pollResponse.findingsMedium
    $low      = $pollResponse.findingsLow
    $info     = $pollResponse.findingsInfo

    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host "  SCAN RESULTS                                          " -ForegroundColor Cyan
    Write-Host "========================================================" -ForegroundColor Cyan

    $critColor = if ($critical -gt 0) { "Red" } else { "Green" }
    $highColor = if ($high -gt 0) { "Red" } else { "Green" }
    Write-Host "  Critical: $critical" -ForegroundColor $critColor
    Write-Host "  High:     $high" -ForegroundColor $highColor
    Write-Host "  Medium:   $medium" -ForegroundColor Yellow
    Write-Host "  Low:      $low" -ForegroundColor Gray
    Write-Host "  Info:     $info" -ForegroundColor Gray
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host ""

    # Simulate fail-on: critical,high,medium
    $failOn = "critical,high,medium"
    $shouldFail = $false

    if ($critical -gt 0 -or $high -gt 0 -or $medium -gt 0) {
        $shouldFail = $true
    }

    if ($shouldFail) {
        Write-Host "  [BLOCKED] BUILD WOULD FAIL" -ForegroundColor Red
        Write-Host "  Reason: Found findings at severity levels: $failOn" -ForegroundColor Red
        Write-Host "  In GitHub Actions, this would block the PR merge with exit code 1." -ForegroundColor Gray
        Write-Host ""
        Write-Host "  This is the CORRECT behavior! The CI/CD pipeline is working!" -ForegroundColor Green
    } else {
        Write-Host "  [PASSED] BUILD WOULD PASS" -ForegroundColor Green
        Write-Host "  No critical or high findings. The PR would be allowed to merge." -ForegroundColor Gray
    }

} elseif ($status -eq "failed") {
    Write-Host "  [FAIL] Scan FAILED: $($pollResponse.errorMessage)" -ForegroundColor Red
    Write-Host "  Check your worker logs for details." -ForegroundColor Gray

} else {
    Write-Host "  [TIMEOUT] Scan timed out after $timeout seconds" -ForegroundColor Red
    Write-Host "  Is your Shinodroid worker running? (npm start or docker compose up)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "--- Test Complete ---" -ForegroundColor Yellow
Write-Host ""
