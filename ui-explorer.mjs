/**
 * Shinodroid — AI-Assisted UI Explorer
 *
 * Smart UI exploration during dynamic analysis:
 *   1. monkey fuzzing (FREE) — fires 1000+ random events to trigger Frida hooks
 *   2. Login detection (regex) — checks if current screen has auth fields
 *   3. LLM credential fill (1 call) — only if login screen detected
 *   4. Post-login monkey (FREE) — explores authenticated areas
 *
 * Cost: ~$0.02/app (max 2-3 LLM calls, only when login screen exists)
 *
 * Safety: Only runs on emulators (verified before execution).
 */

import { readFile, writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// ── Configuration ───────────────────────────────────────────────────────────

const ADB = process.env.ADB_PATH || "adb";
const MONKEY_PRE_LOGIN_EVENTS = 1000;
const MONKEY_POST_LOGIN_EVENTS = 500;
const MONKEY_THROTTLE_MS = 200;
const UI_DUMP_PATH = join(tmpdir(), "shinodroid-ui-dump.xml");

// ── ADB Helpers ─────────────────────────────────────────────────────────────

function adb(...args) {
    return args;
}

async function adbExec(...args) {
    const { stdout } = await execFileAsync(ADB, args, { timeout: 30_000 });
    return stdout.trim();
}

async function adbShell(...args) {
    return adbExec("shell", ...args);
}

// ── Safety Check ────────────────────────────────────────────────────────────

/**
 * Verify we're running on an emulator, NOT a physical device.
 * monkey can trigger calls, SMS, etc. — unsafe on real devices.
 */
async function verifyEmulator(log) {
    try {
        const [hardware, characteristics, product] = await Promise.all([
            adbShell("getprop", "ro.hardware"),
            adbShell("getprop", "ro.build.characteristics"),
            adbShell("getprop", "ro.product.model"),
        ]);

        const isEmulator =
            hardware.includes("ranchu") ||
            hardware.includes("goldfish") ||
            characteristics.includes("emulator") ||
            product.toLowerCase().includes("sdk") ||
            product.toLowerCase().includes("emulator");

        if (!isEmulator) {
            log("warn", "UI Explorer: Physical device detected — SKIPPING monkey for safety");
            return false;
        }

        log("ok", `UI Explorer: Emulator confirmed (${product.trim()})`);
        return true;
    } catch (err) {
        log("warn", `UI Explorer: Could not verify device type: ${err.message}`);
        return false;
    }
}

// ── monkey Fuzzing ──────────────────────────────────────────────────────────

/**
 * Run Android monkey UI fuzzer.
 *
 * monkey sends random taps, swipes, key presses — extremely effective at
 * triggering code paths and Frida hooks that would otherwise never fire.
 *
 * @param {string} packageName   Android package name
 * @param {number} eventCount    Number of random events to send
 * @param {Function} log         Logger
 */
export async function runMonkeyFuzzing(packageName, eventCount, log) {
    log("info", `🐒 Running monkey: ${eventCount} events, ${MONKEY_THROTTLE_MS}ms throttle`);

    try {
        const { stdout, stderr } = await execFileAsync(ADB, [
            "shell", "monkey",
            "-p", packageName,
            "--throttle", String(MONKEY_THROTTLE_MS),
            "--ignore-crashes",
            "--ignore-timeouts",
            "--ignore-security-exceptions",
            "--ignore-native-crashes",
            "--monitor-native-crashes",
            "--pct-touch", "40",       // 40% taps
            "--pct-motion", "20",      // 20% swipes/drags
            "--pct-trackball", "5",    // 5% trackball
            "--pct-nav", "15",         // 15% navigation (dpad)
            "--pct-majornav", "10",    // 10% major nav (menu, back, home)
            "--pct-syskeys", "5",      // 5% system keys (volume, etc.)
            "--pct-appswitch", "3",    // 3% app switch
            "--pct-anyevent", "2",     // 2% other events
            "-v", String(eventCount),
        ], {
            timeout: Math.max(eventCount * MONKEY_THROTTLE_MS * 2, 120_000), // generous timeout
        });

        // Count injected events from monkey output
        const injectedMatch = stdout.match(/Events injected:\s*(\d+)/);
        const injected = injectedMatch ? parseInt(injectedMatch[1], 10) : eventCount;
        log("ok", `🐒 monkey completed: ${injected} events injected`);

        return { success: true, eventsInjected: injected };
    } catch (err) {
        // monkey often exits with non-zero if the app crashes — that's fine,
        // crashes during fuzzing are actually interesting findings
        if (err.stdout && err.stdout.includes("Events injected")) {
            const injectedMatch = err.stdout.match(/Events injected:\s*(\d+)/);
            const injected = injectedMatch ? parseInt(injectedMatch[1], 10) : 0;
            log("warn", `🐒 monkey finished with crash/error after ${injected} events (this may indicate a vulnerability)`);
            return { success: true, eventsInjected: injected, crashed: true };
        }
        log("warn", `🐒 monkey error: ${err.message}`);
        return { success: false, error: err.message };
    }
}

// ── Login Detection ─────────────────────────────────────────────────────────

/**
 * Dump current UI hierarchy and check for login/auth fields.
 * Uses regex FIRST (free) — only calls LLM if login screen detected.
 *
 * @returns {object} { isLoginScreen, uiXml, fields }
 */
async function detectLoginScreen(log) {
    try {
        // Dump UI hierarchy
        await adbShell("uiautomator", "dump", "/sdcard/window_dump.xml");
        await execFileAsync(ADB, ["pull", "/sdcard/window_dump.xml", UI_DUMP_PATH], { timeout: 10_000 });
        const uiXml = await readFile(UI_DUMP_PATH, "utf-8");

        // Fast regex check (zero AI cost)
        const loginPatterns = [
            /resource-id="[^"]*(?:password|passwd|pwd)[^"]*"/i,
            /resource-id="[^"]*(?:email|username|user_?name|login|phone)[^"]*"/i,
            /text="(?:Sign\s*in|Log\s*in|Login|Sign\s*up|Register|Enter\s*password)"/i,
            /content-desc="(?:Sign\s*in|Log\s*in|Login|Password)"/i,
        ];

        const hasPasswordField = loginPatterns[0].test(uiXml);
        const hasUsernameField = loginPatterns[1].test(uiXml) || loginPatterns[3].test(uiXml);
        const hasLoginButton = loginPatterns[2].test(uiXml);

        const isLoginScreen = hasPasswordField && (hasUsernameField || hasLoginButton);

        if (isLoginScreen) {
            log("info", "🔐 Login screen detected! (password + username/email fields found)");

            // Extract field resource IDs for direct adb input
            const fields = extractFieldIds(uiXml);
            return { isLoginScreen: true, uiXml, fields };
        }

        return { isLoginScreen: false, uiXml, fields: null };

    } catch (err) {
        log("warn", `Login detection failed: ${err.message}`);
        return { isLoginScreen: false, uiXml: null, fields: null };
    }
}

/**
 * Extract resource IDs and bounds of input fields from UI XML.
 */
function extractFieldIds(uiXml) {
    const fields = { username: null, password: null, submitButton: null };

    // Find username/email field
    const usernameMatch = uiXml.match(
        /<node[^>]*resource-id="([^"]*(?:email|username|user_?name|phone|login)[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i
    );
    if (usernameMatch) {
        fields.username = {
            resourceId: usernameMatch[1],
            x: Math.round((parseInt(usernameMatch[2]) + parseInt(usernameMatch[4])) / 2),
            y: Math.round((parseInt(usernameMatch[3]) + parseInt(usernameMatch[5])) / 2),
        };
    }

    // Find password field
    const passwordMatch = uiXml.match(
        /<node[^>]*resource-id="([^"]*(?:password|passwd|pwd)[^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i
    );
    if (passwordMatch) {
        fields.password = {
            resourceId: passwordMatch[1],
            x: Math.round((parseInt(passwordMatch[2]) + parseInt(passwordMatch[4])) / 2),
            y: Math.round((parseInt(passwordMatch[3]) + parseInt(passwordMatch[5])) / 2),
        };
    }

    // Find submit/login button
    const buttonMatch = uiXml.match(
        /<node[^>]*(?:text="(?:Sign\s*in|Log\s*in|Login|Submit|Continue|Next)"|resource-id="[^"]*(?:login|signin|submit|btn_login)[^"]*")[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/i
    );
    if (buttonMatch) {
        const offset = buttonMatch[1] ? 1 : 1; // adjust based on capture group
        fields.submitButton = {
            x: Math.round((parseInt(buttonMatch[offset]) + parseInt(buttonMatch[offset + 2])) / 2),
            y: Math.round((parseInt(buttonMatch[offset + 1]) + parseInt(buttonMatch[offset + 3])) / 2),
        };
    }

    return fields;
}

// ── Login Handling ──────────────────────────────────────────────────────────

/**
 * Fill login form and submit.
 *
 * Strategy:
 *   1. Try regex-extracted fields first (zero AI cost)
 *   2. If regex fails, fall back to LLM (1 call)
 *
 * @param {object} fields    From detectLoginScreen()
 * @param {string} uiXml     UI hierarchy XML
 * @param {Function} callLLM LLM function from ai.engine
 * @param {Function} log     Logger
 */
export async function handleLogin(fields, uiXml, callLLM, log) {
    const testCredentials = {
        email: "test@test.com",
        password: "Password123!",
    };

    // ── Attempt 1: Direct field input (regex-extracted, zero AI) ─────────
    if (fields && fields.username && fields.password) {
        log("info", "🔐 Filling login form via regex-extracted fields");

        try {
            // Tap username field
            await adbShell("input", "tap", String(fields.username.x), String(fields.username.y));
            await sleep(500);

            // Clear and type email
            await adbShell("input", "keyevent", "KEYCODE_MOVE_HOME");
            await adbShell("input", "keyevent", "--longpress", "KEYCODE_SHIFT_LEFT", "KEYCODE_MOVE_END");
            await adbShell("input", "text", testCredentials.email);
            await sleep(500);

            // Tap password field
            await adbShell("input", "tap", String(fields.password.x), String(fields.password.y));
            await sleep(500);

            // Type password
            await adbShell("input", "text", testCredentials.password);
            await sleep(500);

            // Tap submit button
            if (fields.submitButton) {
                await adbShell("input", "tap", String(fields.submitButton.x), String(fields.submitButton.y));
            } else {
                // Press Enter as fallback
                await adbShell("input", "keyevent", "66"); // KEYCODE_ENTER
            }

            log("ok", "🔐 Login form submitted (regex method)");
            await sleep(3000); // wait for login to process

            return { handled: true, method: "regex" };
        } catch (err) {
            log("warn", `Regex login fill failed: ${err.message}, trying LLM fallback`);
        }
    }

    // ── Attempt 2: LLM fallback (1 call) ─────────────────────────────────
    if (callLLM && uiXml) {
        log("info", "🔐 Using LLM to analyze login screen");

        try {
            const prompt = `You are an Android security tester. This is the UI hierarchy XML:

${uiXml.substring(0, 6000)}

Identify the login/auth fields and return a JSON array of actions to fill and submit the form.
Use these test credentials: email=test@test.com password=Password123!

Return ONLY a JSON array like:
[
  {"action":"tap","x":540,"y":800},
  {"action":"type","text":"test@test.com"},
  {"action":"tap","x":540,"y":950},
  {"action":"type","text":"Password123!"},
  {"action":"tap","x":540,"y":1100}
]

Use the center coordinates from the bounds="[x1,y1][x2,y2]" attributes.
Return ONLY valid JSON, no explanation.`;

            const response = await callLLM(prompt);

            // Parse LLM response — extract JSON
            let actions;
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                actions = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error("LLM did not return valid JSON");
            }

            // Execute actions
            for (const action of actions) {
                if (action.action === "tap") {
                    await adbShell("input", "tap", String(action.x), String(action.y));
                } else if (action.action === "type") {
                    await adbShell("input", "text", action.text.replace(/ /g, "%s"));
                }
                await sleep(800);
            }

            log("ok", "🔐 Login form submitted (LLM method)");
            await sleep(3000);

            return { handled: true, method: "llm" };
        } catch (err) {
            log("warn", `LLM login fallback failed: ${err.message}`);
        }
    }

    return { handled: false, method: "none" };
}

// ── Proxy Management ────────────────────────────────────────────────────────

/**
 * Set emulator HTTP proxy to ZAP for traffic capture.
 */
export async function setEmulatorProxy(proxyHost = "10.0.2.2", proxyPort = "8080", log) {
    try {
        await adbShell("settings", "put", "global", "http_proxy", `${proxyHost}:${proxyPort}`);
        log("ok", `Emulator proxy set → ${proxyHost}:${proxyPort} (ZAP)`);
        return true;
    } catch (err) {
        log("warn", `Could not set proxy: ${err.message}`);
        return false;
    }
}

/**
 * Remove emulator HTTP proxy.
 */
export async function clearEmulatorProxy(log) {
    try {
        await adbShell("settings", "put", "global", "http_proxy", ":0");
        log("ok", "Emulator proxy cleared");
        return true;
    } catch (err) {
        log("warn", `Could not clear proxy: ${err.message}`);
        return false;
    }
}

// ── Main Exploration Flow ───────────────────────────────────────────────────

/**
 * Full UI exploration pipeline:
 *   1. Safety check (emulator only)
 *   2. Set ZAP proxy
 *   3. Pre-login monkey fuzzing
 *   4. Login detection + handling
 *   5. Post-login monkey fuzzing
 *   6. Clear proxy
 *
 * @param {string}   packageName  Android package
 * @param {object}   options      { callLLM, log, zapProxy }
 * @returns {object} Exploration results
 */
export async function exploreApp(packageName, options = {}) {
    const log = options.log || ((level, msg) => console.log(`[UI-Explorer] ${msg}`));
    const callLLM = options.callLLM || null;
    const zapProxy = options.zapProxy !== false; // default: set proxy

    const results = {
        emulatorVerified: false,
        proxySet: false,
        preLoginMonkey: null,
        loginDetected: false,
        loginHandled: false,
        loginMethod: "none",
        postLoginMonkey: null,
    };

    // ── Step 1: Verify emulator ──────────────────────────────────────────
    const isEmulator = await verifyEmulator(log);
    results.emulatorVerified = isEmulator;

    if (!isEmulator) {
        log("warn", "Skipping UI exploration — not an emulator");
        return results;
    }

    // ── Step 2: Set ZAP proxy ────────────────────────────────────────────
    if (zapProxy) {
        results.proxySet = await setEmulatorProxy("10.0.2.2", "8080", log);
    }

    // ── Step 3: Pre-login monkey ─────────────────────────────────────────
    log("info", "── Phase 1: Pre-login exploration ──");
    results.preLoginMonkey = await runMonkeyFuzzing(packageName, MONKEY_PRE_LOGIN_EVENTS, log);

    // Give the app a moment to settle after monkey chaos
    await sleep(3000);

    // Re-launch the app (monkey might have left it in a weird state)
    try {
        await adbShell("monkey", "-p", packageName, "-c", "android.intent.category.LAUNCHER", "1");
        await sleep(3000);
    } catch { /* non-critical */ }

    // ── Step 4: Login detection ──────────────────────────────────────────
    log("info", "── Phase 2: Login detection ──");
    const { isLoginScreen, uiXml, fields } = await detectLoginScreen(log);
    results.loginDetected = isLoginScreen;

    if (isLoginScreen) {
        const loginResult = await handleLogin(fields, uiXml, callLLM, log);
        results.loginHandled = loginResult.handled;
        results.loginMethod = loginResult.method;

        if (loginResult.handled) {
            // ── Step 5: Post-login monkey ────────────────────────────────
            log("info", "── Phase 3: Post-login exploration ──");
            results.postLoginMonkey = await runMonkeyFuzzing(
                packageName, MONKEY_POST_LOGIN_EVENTS, log
            );
        }
    } else {
        log("info", "No login screen detected — skipping credential entry");
    }

    // ── Step 6: Clear proxy ──────────────────────────────────────────────
    if (zapProxy && results.proxySet) {
        await clearEmulatorProxy(log);
    }

    // Cleanup
    try { await unlink(UI_DUMP_PATH); } catch { }

    return results;
}

// ── Utility ─────────────────────────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
