// ================================================================
// SHINOBI-AUTH.js — Authentication & Authorization Monitor
// Shinodroid 忍ドロイド — MASVS-AUTH (M6)
//
// Monitors biometric authentication, fingerprint APIs, account
// management, keyguard interactions, and JavaScript bridge usage
// in WebViews (common attack surface for auth bypass).
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-AUTH — Authentication & Authorization Monitor    [#]');
        console.log('================================================================');

        // ── BiometricPrompt (Android 9+) ─────────────────────────────────

        try {
            var BiometricPrompt = Java.use('android.hardware.biometrics.BiometricPrompt');
            BiometricPrompt.authenticate.overload('android.os.CancellationSignal', 'java.util.concurrent.Executor', 'android.hardware.biometrics.BiometricPrompt$AuthenticationCallback').implementation = function (cancel, executor, callback) {
                console.log('[+] [AUTH] BiometricPrompt.authenticate() — no CryptoObject ⚠️ WEAK BIOMETRIC');
                return this.authenticate(cancel, executor, callback);
            };
            try {
                BiometricPrompt.authenticate.overload('android.hardware.biometrics.BiometricPrompt$CryptoObject', 'android.os.CancellationSignal', 'java.util.concurrent.Executor', 'android.hardware.biometrics.BiometricPrompt$AuthenticationCallback').implementation = function (crypto, cancel, executor, callback) {
                    console.log('[+] [AUTH] BiometricPrompt.authenticate(CryptoObject) — strong biometric');
                    return this.authenticate(crypto, cancel, executor, callback);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] BiometricPrompt not found');
        }

        // ── AndroidX BiometricPrompt ─────────────────────────────────────

        try {
            var AndroidXBiometric = Java.use('androidx.biometric.BiometricPrompt');
            AndroidXBiometric.authenticate.overload('androidx.biometric.BiometricPrompt$PromptInfo').implementation = function (info) {
                console.log('[+] [AUTH] AndroidX BiometricPrompt.authenticate(PromptInfo) — no CryptoObject ⚠️ WEAK');
                return this.authenticate(info);
            };
            try {
                AndroidXBiometric.authenticate.overload('androidx.biometric.BiometricPrompt$PromptInfo', 'androidx.biometric.BiometricPrompt$CryptoObject').implementation = function (info, crypto) {
                    console.log('[+] [AUTH] AndroidX BiometricPrompt.authenticate(PromptInfo, CryptoObject) — strong');
                    return this.authenticate(info, crypto);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] AndroidX BiometricPrompt not found');
        }

        // ── Legacy FingerprintManager ────────────────────────────────────

        try {
            var FingerprintManager = Java.use('android.hardware.fingerprint.FingerprintManager');
            FingerprintManager.authenticate.implementation = function (crypto, cancel, flags, callback, handler) {
                var hasCrypto = crypto !== null;
                console.log('[+] [AUTH] FingerprintManager.authenticate(hasCrypto=' + hasCrypto + ')' + (!hasCrypto ? ' ⚠️ NO CRYPTO' : ''));
                return this.authenticate(crypto, cancel, flags, callback, handler);
            };
        } catch (err) {
            console.log('[-] [AUTH] FingerprintManager not found');
        }

        // ── AccountManager ───────────────────────────────────────────────

        try {
            var AccountManager = Java.use('android.accounts.AccountManager');
            AccountManager.getAccounts.implementation = function () {
                console.log('[+] [AUTH] AccountManager.getAccounts() ⚠️ ACCESSING DEVICE ACCOUNTS');
                return this.getAccounts();
            };
            try {
                AccountManager.getAccountsByType.implementation = function (type) {
                    console.log('[+] [AUTH] AccountManager.getAccountsByType("' + type + '")');
                    return this.getAccountsByType(type);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] AccountManager not found');
        }

        // ── KeyguardManager (Screen Lock) ────────────────────────────────

        try {
            var KeyguardManager = Java.use('android.app.KeyguardManager');
            try {
                KeyguardManager.isDeviceSecure.implementation = function () {
                    var result = this.isDeviceSecure();
                    console.log('[+] [AUTH] KeyguardManager.isDeviceSecure() = ' + result);
                    return result;
                };
            } catch (e) { }
            try {
                KeyguardManager.isKeyguardSecure.implementation = function () {
                    var result = this.isKeyguardSecure();
                    console.log('[+] [AUTH] KeyguardManager.isKeyguardSecure() = ' + result);
                    return result;
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] KeyguardManager not found');
        }

        // ── WebView JavaScript Interface ─────────────────────────────────

        try {
            var WebView = Java.use('android.webkit.WebView');
            WebView.addJavascriptInterface.implementation = function (obj, name) {
                console.log('[+] [AUTH] WebView.addJavascriptInterface("' + name + '") ⚠️ JS BRIDGE EXPOSED');
                return this.addJavascriptInterface(obj, name);
            };
            try {
                WebView.evaluateJavascript.implementation = function (script, callback) {
                    var preview = script ? script.substring(0, 80) : '';
                    console.log('[+] [AUTH] WebView.evaluateJavascript("' + preview + '...")');
                    return this.evaluateJavascript(script, callback);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] WebView JS hooks not found');
        }

        // ── WebView Settings ─────────────────────────────────────────────

        try {
            var WebSettings = Java.use('android.webkit.WebSettings');
            WebSettings.setJavaScriptEnabled.implementation = function (enabled) {
                console.log('[+] [AUTH] WebSettings.setJavaScriptEnabled(' + enabled + ')');
                return this.setJavaScriptEnabled(enabled);
            };
            try {
                WebSettings.setAllowFileAccess.implementation = function (enabled) {
                    if (enabled) {
                        console.log('[+] [AUTH] WebSettings.setAllowFileAccess(true) ⚠️ FILE ACCESS ENABLED');
                    }
                    return this.setAllowFileAccess(enabled);
                };
            } catch (e) { }
            try {
                WebSettings.setAllowUniversalAccessFromFileURLs.implementation = function (enabled) {
                    if (enabled) {
                        console.log('[+] [AUTH] WebSettings.setAllowUniversalAccessFromFileURLs(true) ⚠️ UNIVERSAL ACCESS');
                    }
                    return this.setAllowUniversalAccessFromFileURLs(enabled);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [AUTH] WebSettings hooks not found');
        }

        // ── CookieManager ────────────────────────────────────────────────

        try {
            var CookieManager = Java.use('android.webkit.CookieManager');
            CookieManager.setCookie.overload('java.lang.String', 'java.lang.String').implementation = function (url, value) {
                var isSession = /session|auth|token/i.test(value);
                console.log('[+] [AUTH] CookieManager.setCookie("' + url + '")' + (isSession ? ' ⚠️ SESSION COOKIE' : ''));
                return this.setCookie(url, value);
            };
        } catch (err) {
            console.log('[-] [AUTH] CookieManager not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-AUTH — Monitoring active                         [#]');
        console.log('================================================================');
    });
}, 0);
