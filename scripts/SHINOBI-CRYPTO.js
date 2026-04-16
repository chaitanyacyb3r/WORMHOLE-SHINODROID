// ================================================================
// SHINOBI-CRYPTO.js — Cryptographic Operations Monitor
// Shinodroid 忍ドロイド — MASVS-CRYPTO (M5)
//
// Hooks all javax.crypto, java.security, and Android Keystore
// operations. Detects weak algorithms, insecure modes, hardcoded
// keys, and improper key management.
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-CRYPTO — Cryptographic Operations Monitor        [#]');
        console.log('================================================================');

        // ── javax.crypto.Cipher ──────────────────────────────────────────

        try {
            var Cipher = Java.use('javax.crypto.Cipher');

            Cipher.getInstance.overload('java.lang.String').implementation = function (transformation) {
                var isWeak = /DES|RC4|RC2|Blowfish|ECB/i.test(transformation);
                console.log('[+] [CRYPTO] Cipher.getInstance("' + transformation + '")' + (isWeak ? ' ⚠️ WEAK ALGORITHM' : ''));
                return this.getInstance(transformation);
            };

            try {
                Cipher.getInstance.overload('java.lang.String', 'java.lang.String').implementation = function (transformation, provider) {
                    var isWeak = /DES|RC4|RC2|Blowfish|ECB/i.test(transformation);
                    console.log('[+] [CRYPTO] Cipher.getInstance("' + transformation + '", "' + provider + '")' + (isWeak ? ' ⚠️ WEAK' : ''));
                    return this.getInstance(transformation, provider);
                };
            } catch (e) { }

            try {
                Cipher.doFinal.overload('[B').implementation = function (input) {
                    var algo = this.getAlgorithm();
                    console.log('[+] [CRYPTO] Cipher.doFinal() — algo: ' + algo + ', inputLen: ' + (input ? input.length : 0));
                    return this.doFinal(input);
                };
            } catch (e) { }

            try {
                Cipher.doFinal.overload().implementation = function () {
                    console.log('[+] [CRYPTO] Cipher.doFinal() — algo: ' + this.getAlgorithm());
                    return this.doFinal();
                };
            } catch (e) { }

        } catch (err) {
            console.log('[-] [CRYPTO] Cipher hooks failed: ' + err);
        }

        // ── javax.crypto.spec.SecretKeySpec ──────────────────────────────

        try {
            var SecretKeySpec = Java.use('javax.crypto.spec.SecretKeySpec');
            SecretKeySpec.$init.overload('[B', 'java.lang.String').implementation = function (key, algo) {
                var keyLen = key ? key.length : 0;
                var isWeak = keyLen < 16 || /DES|RC/i.test(algo);
                console.log('[+] [CRYPTO] SecretKeySpec("' + algo + '", keyLen=' + (keyLen * 8) + 'bit)' + (isWeak ? ' ⚠️ WEAK KEY' : ''));
                return this.$init(key, algo);
            };
        } catch (err) {
            console.log('[-] [CRYPTO] SecretKeySpec hook not found');
        }

        // ── javax.crypto.KeyGenerator ────────────────────────────────────

        try {
            var KeyGenerator = Java.use('javax.crypto.KeyGenerator');
            KeyGenerator.getInstance.overload('java.lang.String').implementation = function (algo) {
                console.log('[+] [CRYPTO] KeyGenerator.getInstance("' + algo + '")');
                return this.getInstance(algo);
            };
            try {
                KeyGenerator.init.overload('int').implementation = function (keySize) {
                    var isWeak = keySize < 128;
                    console.log('[+] [CRYPTO] KeyGenerator.init(keySize=' + keySize + ')' + (isWeak ? ' ⚠️ WEAK KEY SIZE' : ''));
                    return this.init(keySize);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [CRYPTO] KeyGenerator hook not found');
        }

        // ── java.security.MessageDigest ──────────────────────────────────

        try {
            var MessageDigest = Java.use('java.security.MessageDigest');
            MessageDigest.getInstance.overload('java.lang.String').implementation = function (algo) {
                var isWeak = /MD5|SHA-1|SHA1/i.test(algo) && !/SHA-1[0-9]/i.test(algo);
                console.log('[+] [CRYPTO] MessageDigest.getInstance("' + algo + '")' + (isWeak ? ' ⚠️ WEAK HASH' : ''));
                return this.getInstance(algo);
            };

            try {
                MessageDigest.digest.overload('[B').implementation = function (input) {
                    console.log('[+] [CRYPTO] MessageDigest.digest(inputLen=' + (input ? input.length : 0) + ', algo=' + this.getAlgorithm() + ')');
                    return this.digest(input);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [CRYPTO] MessageDigest hook not found');
        }

        // ── javax.crypto.Mac ─────────────────────────────────────────────

        try {
            var Mac = Java.use('javax.crypto.Mac');
            Mac.getInstance.overload('java.lang.String').implementation = function (algo) {
                console.log('[+] [CRYPTO] Mac.getInstance("' + algo + '")');
                return this.getInstance(algo);
            };
        } catch (err) {
            console.log('[-] [CRYPTO] Mac hook not found');
        }

        // ── java.security.SecureRandom ───────────────────────────────────

        try {
            var SecureRandom = Java.use('java.security.SecureRandom');
            try {
                SecureRandom.setSeed.overload('[B').implementation = function (seed) {
                    console.log('[+] [CRYPTO] SecureRandom.setSeed(len=' + (seed ? seed.length : 0) + ') ⚠️ STATIC SEED');
                    return this.setSeed(seed);
                };
            } catch (e) { }
            try {
                SecureRandom.setSeed.overload('long').implementation = function (seed) {
                    console.log('[+] [CRYPTO] SecureRandom.setSeed(' + seed + ') ⚠️ STATIC SEED');
                    return this.setSeed(seed);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [CRYPTO] SecureRandom hook not found');
        }

        // ── java.security.KeyStore ───────────────────────────────────────

        try {
            var KeyStore = Java.use('java.security.KeyStore');
            KeyStore.getInstance.overload('java.lang.String').implementation = function (type) {
                console.log('[+] [CRYPTO] KeyStore.getInstance("' + type + '")');
                return this.getInstance(type);
            };

            try {
                KeyStore.load.overload('java.io.InputStream', '[C').implementation = function (stream, password) {
                    console.log('[+] [CRYPTO] KeyStore.load(hasPassword=' + (password !== null) + ')');
                    return this.load(stream, password);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [CRYPTO] KeyStore hook not found');
        }

        // ── java.security.Signature ──────────────────────────────────────

        try {
            var Signature = Java.use('java.security.Signature');
            Signature.getInstance.overload('java.lang.String').implementation = function (algo) {
                console.log('[+] [CRYPTO] Signature.getInstance("' + algo + '")');
                return this.getInstance(algo);
            };
        } catch (err) {
            console.log('[-] [CRYPTO] Signature hook not found');
        }

        // ── android.util.Base64 ──────────────────────────────────────────

        try {
            var Base64 = Java.use('android.util.Base64');
            Base64.encodeToString.overload('[B', 'int').implementation = function (input, flags) {
                var len = input ? input.length : 0;
                console.log('[+] [CRYPTO] Base64.encodeToString(inputLen=' + len + ')');
                return this.encodeToString(input, flags);
            };
            try {
                Base64.decode.overload('java.lang.String', 'int').implementation = function (str, flags) {
                    var preview = str ? str.substring(0, 40) : '';
                    console.log('[+] [CRYPTO] Base64.decode("' + preview + '...")');
                    return this.decode(str, flags);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [CRYPTO] Base64 hook not found');
        }

        // ── javax.crypto.spec.IvParameterSpec ────────────────────────────

        try {
            var IvParameterSpec = Java.use('javax.crypto.spec.IvParameterSpec');
            IvParameterSpec.$init.overload('[B').implementation = function (iv) {
                var ivLen = iv ? iv.length : 0;
                // Check for static/zeros IV
                var allZero = true;
                if (iv) { for (var i = 0; i < iv.length; i++) { if (iv[i] !== 0) { allZero = false; break; } } }
                console.log('[+] [CRYPTO] IvParameterSpec(len=' + ivLen + ')' + (allZero ? ' ⚠️ STATIC/ZERO IV' : ''));
                return this.$init(iv);
            };
        } catch (err) {
            console.log('[-] [CRYPTO] IvParameterSpec hook not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-CRYPTO — Monitoring active                       [#]');
        console.log('================================================================');
    });
}, 0);
