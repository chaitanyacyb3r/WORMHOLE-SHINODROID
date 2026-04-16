// ================================================================
// SHINOBI-RESILIENCE.js — Anti-Tamper & Reverse Engineering Bypass
// Shinodroid 忍ドロイド — MASVS-RESILIENCE (M7/M9)
//
// Bypasses and monitors: debugger detection, Frida detection,
// emulator detection, integrity checks, SafetyNet/Play Integrity,
// and code obfuscation checks. Complements ROOTER.js by targeting
// anti-reverse-engineering protections beyond root detection.
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-RESILIENCE — Anti-Tamper Bypass & Monitor        [#]');
        console.log('================================================================');

        // ── Debugger Detection Bypass ────────────────────────────────────

        try {
            var Debug = Java.use('android.os.Debug');
            Debug.isDebuggerConnected.implementation = function () {
                console.log('[+] [RESILIENCE] Debug.isDebuggerConnected() → false (bypassed)');
                return false;
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] Debug.isDebuggerConnected hook not found');
        }

        try {
            var Debug2 = Java.use('android.os.Debug');
            Debug2.waitingForDebugger.implementation = function () {
                console.log('[+] [RESILIENCE] Debug.waitingForDebugger() → false (bypassed)');
                return false;
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] Debug.waitingForDebugger hook not found');
        }

        // ── ApplicationInfo debuggable flag ──────────────────────────────

        try {
            var ApplicationInfo = Java.use('android.content.pm.ApplicationInfo');
            var origFlags = ApplicationInfo.flags;
            // Note: We monitor this rather than override it
            // FLAG_DEBUGGABLE = 0x2
        } catch (err) { }

        // ── Emulator Detection Bypass ────────────────────────────────────

        try {
            var Build = Java.use('android.os.Build');

            var fields = {
                'FINGERPRINT': Build.FINGERPRINT.value,
                'MODEL': Build.MODEL.value,
                'MANUFACTURER': Build.MANUFACTURER.value,
                'BRAND': Build.BRAND.value,
                'DEVICE': Build.DEVICE.value,
                'PRODUCT': Build.PRODUCT.value,
                'HARDWARE': Build.HARDWARE.value,
            };

            var emulatorIndicators = /generic|unknown|emulator|Android SDK|Genymotion|google_sdk|goldfish|ranchu|sdk_gphone/i;

            for (var field in fields) {
                if (emulatorIndicators.test(fields[field])) {
                    console.log('[+] [RESILIENCE] Build.' + field + ' = "' + fields[field] + '" ⚠️ EMULATOR FINGERPRINT');
                }
            }
        } catch (err) {
            console.log('[-] [RESILIENCE] Build field monitoring failed');
        }

        // ── Frida Detection Bypass ───────────────────────────────────────

        // Hook libc functions used for Frida detection
        try {
            // /proc/self/maps scanning (common Frida detection)
            Interceptor.attach(Module.findExportByName("libc.so", "strstr"), {
                onEnter: function (args) {
                    this.haystack = args[0];
                    this.needle = Memory.readUtf8String(args[1]);
                },
                onLeave: function (retval) {
                    if (this.needle) {
                        if (/frida|gadget|linjector|gmain/i.test(this.needle)) {
                            console.log('[+] [RESILIENCE] Frida detection via strstr("' + this.needle + '") → bypassed');
                            retval.replace(ptr(0)); // Return NULL (not found)
                        }
                    }
                }
            });
        } catch (err) {
            console.log('[-] [RESILIENCE] strstr Frida bypass not available');
        }

        // Hook open() to detect /proc/self/maps reading for Frida port scanning
        try {
            Interceptor.attach(Module.findExportByName("libc.so", "open"), {
                onEnter: function (args) {
                    var path = Memory.readUtf8String(args[0]);
                    if (path && path.indexOf('/proc/') !== -1 && path.indexOf('maps') !== -1) {
                        console.log('[+] [RESILIENCE] /proc/maps scan detected (possible Frida detection)');
                    }
                }
            });
        } catch (err) {
            console.log('[-] [RESILIENCE] open() hook not available');
        }

        // Default Frida port detection bypass
        try {
            Interceptor.attach(Module.findExportByName("libc.so", "connect"), {
                onEnter: function (args) {
                    var sockAddr = args[1];
                    var family = Memory.readU16(sockAddr);
                    if (family === 2) { // AF_INET
                        var port = (Memory.readU8(sockAddr.add(2)) << 8) | Memory.readU8(sockAddr.add(3));
                        if (port === 27042 || port === 27043) {
                            console.log('[+] [RESILIENCE] Frida port detection (port ' + port + ') → connection will proceed');
                        }
                    }
                }
            });
        } catch (err) {
            console.log('[-] [RESILIENCE] connect() hook not available');
        }

        // ── Signature Verification (Tamper Detection) ────────────────────

        try {
            var PackageManager = Java.use('android.app.ApplicationPackageManager');
            PackageManager.getPackageInfo.overload('java.lang.String', 'int').implementation = function (pname, flags) {
                // GET_SIGNATURES = 64
                if ((flags & 64) !== 0) {
                    console.log('[+] [RESILIENCE] PackageManager.getPackageInfo("' + pname + '", GET_SIGNATURES) — integrity check');
                }
                return this.getPackageInfo(pname, flags);
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] PackageManager signature check hook not found');
        }

        // ── TracerPid Detection (anti-debug via /proc) ───────────────────

        try {
            var BufferedReader = Java.use('java.io.BufferedReader');
            BufferedReader.readLine.overload().implementation = function () {
                var line = this.readLine();
                if (line && line.indexOf('TracerPid') !== -1) {
                    console.log('[+] [RESILIENCE] TracerPid check detected → returning 0 (bypassed)');
                    return 'TracerPid:\t0';
                }
                return line;
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] BufferedReader TracerPid hook not found');
        }

        // ── System.exit() prevention (anti-tamper kill) ──────────────────

        try {
            var System = Java.use('java.lang.System');
            System.exit.implementation = function (code) {
                console.log('[+] [RESILIENCE] System.exit(' + code + ') → PREVENTED ⚠️ ANTI-TAMPER KILL BLOCKED');
                // Don't actually exit — blocks anti-tamper kills
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] System.exit hook not found');
        }

        // ── Runtime.getRuntime().exec for env checks ─────────────────────

        // Already covered in PintooR.js/ROOTER.js — not duplicated

        // ── Settings.Secure (developer options detection) ────────────────

        try {
            var Settings_Secure = Java.use('android.provider.Settings$Secure');
            Settings_Secure.getString.implementation = function (resolver, name) {
                var result = this.getString(resolver, name);
                if (name === 'development_settings_enabled' || name === 'adb_enabled') {
                    console.log('[+] [RESILIENCE] Settings.Secure.getString("' + name + '") = ' + result);
                }
                return result;
            };
        } catch (err) {
            console.log('[-] [RESILIENCE] Settings.Secure hook not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-RESILIENCE — Monitoring active                   [#]');
        console.log('================================================================');
    });
}, 0);
