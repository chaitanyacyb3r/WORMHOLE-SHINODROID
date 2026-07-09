// ========================================================
// SSL-DETECT-OBFUSCATED.js 
// Purpose: Detect obfuscated Java pinning and Native pinning.
// Note: This script ONLY detects and logs the presence of pinning. 
// It does NOT modify return values or bypass the pinning.
// ========================================================

setTimeout(function() {
    // 1. Shape-Based Detection (Java Layer)
    Java.perform(function() {
        console.log("[*] Starting Obfuscated SSL Pinning Detection Scan...");

        // Scan all loaded classes to find custom TrustManagers regardless of their obfuscated names
        Java.enumerateLoadedClasses({
            onMatch: function(className) {
                // Filter out standard Android/Java system libraries to find app-specific implementations
                if (className.startsWith("java.") || 
                    className.startsWith("android.") || 
                    className.startsWith("androidx.") || 
                    className.startsWith("com.android.") ||
                    className.startsWith("org.apache.") ||
                    className.startsWith("sun.") ||
                    className.startsWith("com.google.")) {
                    return;
                }

                try {
                    var clazz = Java.use(className);
                    var isTrustManager = false;
                    
                    // Inspect interfaces to see if it implements X509TrustManager
                    var interfaces = clazz.class.getInterfaces();
                    for (var i = 0; i < interfaces.length; i++) {
                        if (interfaces[i].getName() === "javax.net.ssl.X509TrustManager") {
                            isTrustManager = true;
                            break;
                        }
                    }
                    
                    if (isTrustManager) {
                        console.log("[DETECTED_OBFUSCATED_TRUSTMANAGER] Found custom TrustManager: " + className);
                        
                        // Hook checkServerTrusted to observe when it's actively used by the app
                        if (clazz.checkServerTrusted) {
                            var overloads = clazz.checkServerTrusted.overloads;
                            for (var j = 0; j < overloads.length; j++) {
                                overloads[j].implementation = function() {
                                    console.log("[PINNING_ACTIVE] Obfuscated TrustManager " + className + ".checkServerTrusted called!");
                                    // Call original implementation (NO BYPASS, purely observational)
                                    return this.checkServerTrusted.apply(this, arguments);
                                };
                            }
                        }
                    }
                } catch (e) {
                    // Ignore classes that cannot be introspected
                }
            },
            onComplete: function() {
                console.log("[*] Shape-based Java detection scan complete.");
            }
        });
    });

    // 2. Native Layer Detection (BoringSSL/OpenSSL)
    function detectNativeSSL() {
        var modules = Process.enumerateModules();
        var sslModules = [];
        
        // Find all loaded native SSL/Crypto libraries
        for (var i = 0; i < modules.length; i++) {
            var name = modules[i].name.toLowerCase();
            if (name.includes("libssl") || name.includes("libcrypto") || name.includes("libconscrypt")) {
                sslModules.push(modules[i]);
            }
        }
        
        sslModules.forEach(function(module) {
            console.log("[*] Monitoring Native SSL Module: " + module.name);
            
            // Detect SSL_CTX_set_custom_verify (BoringSSL custom verifier registration)
            var set_custom_verify = Module.findExportByName(module.name, "SSL_CTX_set_custom_verify");
            if (set_custom_verify) {
                Interceptor.attach(set_custom_verify, {
                    onEnter: function(args) {
                        console.log("[DETECTED_NATIVE_PINNING] SSL_CTX_set_custom_verify called in " + module.name);
                    }
                });
            }
            
            // Detect SSL_set_verify (Standard OpenSSL/BoringSSL verifier registration)
            var set_verify = Module.findExportByName(module.name, "SSL_set_verify");
            if (set_verify) {
                Interceptor.attach(set_verify, {
                    onEnter: function(args) {
                        var mode = args[1].toInt32();
                        console.log("[DETECTED_NATIVE_PINNING] SSL_set_verify called in " + module.name + " with mode: " + mode);
                    }
                });
            }

            // Detect SSL_get_verify_result (often called by native pinning logic to check if verification passed)
            var get_verify_result = Module.findExportByName(module.name, "SSL_get_verify_result");
            if (get_verify_result) {
                Interceptor.attach(get_verify_result, {
                    onEnter: function(args) {
                        // Just observing
                    },
                    onLeave: function(retval) {
                        console.log("[NATIVE_PINNING_CHECK] SSL_get_verify_result returned: " + retval);
                    }
                });
            }
        });
    }
    
    detectNativeSSL();

}, 1500); // 1.5s delay to allow primary libraries to load into memory
