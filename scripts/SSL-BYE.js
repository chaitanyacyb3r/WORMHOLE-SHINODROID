// ========================================================
// SSL-BYE.js – Universal SSL Pinning Bypass for Android
// Modified & Brutified by: Brut Security
// Website: https://brutsec.com
// ========================================================

setTimeout(function() {
	Java.perform(function() {
		console.log('');
		console.log('=================================================================');
		console.log('[#]  Android Bypass for various Certificate Pinning methods   [#]');
		console.log('=================================================================');

		// ── Diagnostic Utilities ─────────────────────────────────────────────
		var _diagDone = {}; // Track which classes have been diagnosed

		function diagClassLoader(className, resolvedClass) {
			if (_diagDone[className]) return;
			_diagDone[className] = true;
			try {
				var resolvedLoader = resolvedClass.class.getClassLoader();
				console.log('[DIAG_CLASSLOADER] ' + className + ' resolved from: ' + resolvedLoader);
				Java.enumerateClassLoaders({
					onMatch: function(loader) {
						if (String(loader) === String(resolvedLoader)) return;
						try {
							loader.loadClass(className);
							console.log('[DIAG_CLASSLOADER_MISMATCH] ' + className + ' ALSO found in: ' + loader);
						} catch(e) { /* not in this loader */ }
					},
					onComplete: function() {}
				});
			} catch(e) {
				console.log('[DIAG_CLASSLOADER] Could not inspect ClassLoader for ' + className + ': ' + e.message);
			}
		}

		// AOT compilation diagnostic
		try {
			var VMRuntime = Java.use('dalvik.system.VMRuntime');
			var runtime = VMRuntime.getRuntime();
			console.log('[DIAG_AOT] VM Instruction Set: ' + runtime.vmInstructionSet());
			console.log('[DIAG_AOT] Target SDK: ' + runtime.getTargetSdkVersion());
		} catch(e) {
			console.log('[DIAG_AOT] Could not query VMRuntime: ' + e.message);
		}

		// ProfileInstaller check (Baseline Profiles / AOT)
		try {
			var ProfileInstaller = Java.use('androidx.profileinstaller.ProfileInstaller');
			console.log('[DIAG_AOT] ProfileInstaller class found — app uses Baseline Profiles (may have AOT-compiled hot paths)');
		} catch(e) {
			console.log('[DIAG_AOT] No ProfileInstaller detected — app likely not using Baseline Profiles');
		}

		var X509TrustManager = Java.use('javax.net.ssl.X509TrustManager');
		diagClassLoader('javax.net.ssl.X509TrustManager', X509TrustManager);
		
		var SSLContext = Java.use('javax.net.ssl.SSLContext');
		diagClassLoader('javax.net.ssl.SSLContext', SSLContext);
		
		// TrustManager (Android < 7) //
		////////////////////////////////
		var TrustManager = Java.registerClass({
			// Implement a custom TrustManager
			name: 'dev.asd.test.TrustManager',
			implements: [X509TrustManager],
			methods: {
				checkClientTrusted: function(chain, authType) {},
				checkServerTrusted: function(chain, authType) {},
				getAcceptedIssuers: function() {return []; }
			}
		});
		// Prepare the TrustManager array to pass to SSLContext.init()
		var TrustManagers = [TrustManager.$new()];
		// Get a handle on the init() on the SSLContext class
		var SSLContext_init = SSLContext.init.overload(
			'[Ljavax.net.ssl.KeyManager;', '[Ljavax.net.ssl.TrustManager;', 'java.security.SecureRandom');
		try {
			// Override the init method, specifying the custom TrustManager
			SSLContext_init.implementation = function(keyManager, trustManager, secureRandom) {
				console.log('[SSL_BYPASS_CONFIRMED] TrustManager (Android < 7): SSLContext.init() intercepted');
				SSLContext_init.call(this, keyManager, TrustManagers, secureRandom);
			};
			console.log('[SSL_HOOK_INSTALLED] TrustManager (Android < 7) — javax.net.ssl.SSLContext.init(KeyManager[], TrustManager[], SecureRandom)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] TrustManager (Android < 7) — javax.net.ssl.SSLContext.init not found');
			console.log('[DIAG_OBFUSCATION] javax.net.ssl.SSLContext: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}



	
		// OkHTTPv3 (quadruple bypass) //
		/////////////////////////////////
		try {
			// Bypass OkHTTPv3 {1}
			var okhttp3_Activity_1 = Java.use('okhttp3.CertificatePinner');    
			diagClassLoader('okhttp3.CertificatePinner', okhttp3_Activity_1);
			okhttp3_Activity_1.check.overload('java.lang.String', 'java.util.List').implementation = function(a, b) {                              
				console.log('[SSL_BYPASS_CONFIRMED] OkHTTPv3 {1}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] OkHTTPv3 {1} — okhttp3.CertificatePinner.check(String, List)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OkHTTPv3 {1} — okhttp3.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] okhttp3.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass OkHTTPv3 {2}
			// This method of CertificatePinner.check is deprecated but could be found in some old Android apps
			var okhttp3_Activity_2 = Java.use('okhttp3.CertificatePinner');    
			okhttp3_Activity_2.check.overload('java.lang.String', 'java.security.cert.Certificate').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] OkHTTPv3 {2}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] OkHTTPv3 {2} — okhttp3.CertificatePinner.check(String, Certificate)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OkHTTPv3 {2} — okhttp3.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] okhttp3.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass OkHTTPv3 {3}
			var okhttp3_Activity_3 = Java.use('okhttp3.CertificatePinner');    
			okhttp3_Activity_3.check.overload('java.lang.String', '[Ljava.security.cert.Certificate;').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] OkHTTPv3 {3}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] OkHTTPv3 {3} — okhttp3.CertificatePinner.check(String, Certificate[])');
		} catch(err) {
			console.log('[SSL_NOT_PRESENT] OkHTTPv3 {3} — okhttp3.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] okhttp3.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass OkHTTPv3 {4}
			var okhttp3_Activity_4 = Java.use('okhttp3.CertificatePinner');    
			//okhttp3_Activity_4['check$okhttp'].implementation = function(a, b) {
			okhttp3_Activity_4.check$okhttp.overload('java.lang.String', 'kotlin.jvm.functions.Function0').implementation = function(a, b) {		
				console.log('[SSL_BYPASS_CONFIRMED] OkHTTPv3 {4}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] OkHTTPv3 {4} — okhttp3.CertificatePinner.check$okhttp(String, Function0)');
		} catch(err) {
			console.log('[SSL_NOT_PRESENT] OkHTTPv3 {4} — okhttp3.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] okhttp3.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}

	

	
		// Trustkit (triple bypass) //
		//////////////////////////////
		try {
			// Bypass Trustkit {1}
			var trustkit_Activity_1 = Java.use('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier');
			diagClassLoader('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier', trustkit_Activity_1);
			trustkit_Activity_1.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Trustkit {1}: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Trustkit {1} — OkHostnameVerifier.verify(String, SSLSession)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Trustkit {1} — com.datatheorem.android.trustkit.pinning.OkHostnameVerifier not found');
			console.log('[DIAG_OBFUSCATION] com.datatheorem.android.trustkit.pinning.OkHostnameVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass Trustkit {2}
			var trustkit_Activity_2 = Java.use('com.datatheorem.android.trustkit.pinning.OkHostnameVerifier');
			trustkit_Activity_2.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Trustkit {2}: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Trustkit {2} — OkHostnameVerifier.verify(String, X509Certificate)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Trustkit {2} — com.datatheorem.android.trustkit.pinning.OkHostnameVerifier not found');
			console.log('[DIAG_OBFUSCATION] com.datatheorem.android.trustkit.pinning.OkHostnameVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass Trustkit {3}
			var trustkit_PinningTrustManager = Java.use('com.datatheorem.android.trustkit.pinning.PinningTrustManager');
			diagClassLoader('com.datatheorem.android.trustkit.pinning.PinningTrustManager', trustkit_PinningTrustManager);
			trustkit_PinningTrustManager.checkServerTrusted.overload('[Ljava.security.cert.X509Certificate;', 'java.lang.String').implementation = function(chain, authType) {
				console.log('[SSL_BYPASS_CONFIRMED] Trustkit {3}: PinningTrustManager.checkServerTrusted intercepted');
				//return;
			};
			console.log('[SSL_HOOK_INSTALLED] Trustkit {3} — PinningTrustManager.checkServerTrusted(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Trustkit {3} — com.datatheorem.android.trustkit.pinning.PinningTrustManager not found');
			console.log('[DIAG_OBFUSCATION] com.datatheorem.android.trustkit.pinning.PinningTrustManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		
	
	
  
		// TrustManagerImpl (Android > 7) //
		////////////////////////////////////
		try {
			// Bypass TrustManagerImpl (Android > 7) {1}
			var array_list = Java.use("java.util.ArrayList");
			var TrustManagerImpl_Activity_1 = Java.use('com.android.org.conscrypt.TrustManagerImpl');
			diagClassLoader('com.android.org.conscrypt.TrustManagerImpl', TrustManagerImpl_Activity_1);
			TrustManagerImpl_Activity_1.checkTrustedRecursive.implementation = function(certs, ocspData, tlsSctData, host, clientAuth, untrustedChain, trustAnchorChain, used) {
				console.log('[SSL_BYPASS_CONFIRMED] TrustManagerImpl (Android > 7) checkTrustedRecursive: '+ host);
				return array_list.$new();
			};
			console.log('[SSL_HOOK_INSTALLED] TrustManagerImpl (Android > 7) {1} — checkTrustedRecursive(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] TrustManagerImpl (Android > 7) {1} — com.android.org.conscrypt.TrustManagerImpl not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.TrustManagerImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}  
		try {
			// Bypass TrustManagerImpl (Android > 7) {2} (probably no more necessary)
			var TrustManagerImpl_Activity_2 = Java.use('com.android.org.conscrypt.TrustManagerImpl');
			TrustManagerImpl_Activity_2.verifyChain.implementation = function(untrustedChain, trustAnchorChain, host, clientAuth, ocspData, tlsSctData) {
				console.log('[SSL_BYPASS_CONFIRMED] TrustManagerImpl (Android > 7) verifyChain: ' + host);
				return untrustedChain;
			};   
			console.log('[SSL_HOOK_INSTALLED] TrustManagerImpl (Android > 7) {2} — verifyChain(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] TrustManagerImpl (Android > 7) {2} — com.android.org.conscrypt.TrustManagerImpl not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.TrustManagerImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}

  
  
		

		// Appcelerator Titanium PinningTrustManager //
		///////////////////////////////////////////////
		try {
			var appcelerator_PinningTrustManager = Java.use('appcelerator.https.PinningTrustManager');
			diagClassLoader('appcelerator.https.PinningTrustManager', appcelerator_PinningTrustManager);
			appcelerator_PinningTrustManager.checkServerTrusted.implementation = function(chain, authType) {
				console.log('[SSL_BYPASS_CONFIRMED] Appcelerator PinningTrustManager: checkServerTrusted intercepted');
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] Appcelerator PinningTrustManager — checkServerTrusted(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Appcelerator PinningTrustManager — appcelerator.https.PinningTrustManager not found');
			console.log('[DIAG_OBFUSCATION] appcelerator.https.PinningTrustManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Fabric PinningTrustManager //
		////////////////////////////////
		try {
			var fabric_PinningTrustManager = Java.use('io.fabric.sdk.android.services.network.PinningTrustManager');
			diagClassLoader('io.fabric.sdk.android.services.network.PinningTrustManager', fabric_PinningTrustManager);
			fabric_PinningTrustManager.checkServerTrusted.implementation = function(chain, authType) {
				console.log('[SSL_BYPASS_CONFIRMED] Fabric PinningTrustManager: checkServerTrusted intercepted');
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] Fabric PinningTrustManager — checkServerTrusted(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Fabric PinningTrustManager — io.fabric.sdk.android.services.network.PinningTrustManager not found');
			console.log('[DIAG_OBFUSCATION] io.fabric.sdk.android.services.network.PinningTrustManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// OpenSSLSocketImpl Conscrypt (double bypass) //
		/////////////////////////////////////////////////
		try {
			var OpenSSLSocketImpl = Java.use('com.android.org.conscrypt.OpenSSLSocketImpl');
			diagClassLoader('com.android.org.conscrypt.OpenSSLSocketImpl', OpenSSLSocketImpl);
			OpenSSLSocketImpl.verifyCertificateChain.implementation = function(certRefs, JavaObject, authMethod) {
				console.log('[SSL_BYPASS_CONFIRMED] OpenSSLSocketImpl Conscrypt {1}: verifyCertificateChain intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] OpenSSLSocketImpl Conscrypt {1} — verifyCertificateChain(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OpenSSLSocketImpl Conscrypt {1} — com.android.org.conscrypt.OpenSSLSocketImpl not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.OpenSSLSocketImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			var OpenSSLSocketImpl = Java.use('com.android.org.conscrypt.OpenSSLSocketImpl');
			OpenSSLSocketImpl.verifyCertificateChain.implementation = function(certChain, authMethod) {
				console.log('[SSL_BYPASS_CONFIRMED] OpenSSLSocketImpl Conscrypt {2}: verifyCertificateChain intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] OpenSSLSocketImpl Conscrypt {2} — verifyCertificateChain(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OpenSSLSocketImpl Conscrypt {2} — com.android.org.conscrypt.OpenSSLSocketImpl not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.OpenSSLSocketImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// OpenSSLEngineSocketImpl Conscrypt //
		///////////////////////////////////////
		try {
			var OpenSSLEngineSocketImpl_Activity = Java.use('com.android.org.conscrypt.OpenSSLEngineSocketImpl');
			diagClassLoader('com.android.org.conscrypt.OpenSSLEngineSocketImpl', OpenSSLEngineSocketImpl_Activity);
			OpenSSLEngineSocketImpl_Activity.verifyCertificateChain.overload('[Ljava.lang.Long;', 'java.lang.String').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] OpenSSLEngineSocketImpl Conscrypt: ' + b);
			};
			console.log('[SSL_HOOK_INSTALLED] OpenSSLEngineSocketImpl Conscrypt — verifyCertificateChain(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OpenSSLEngineSocketImpl Conscrypt — com.android.org.conscrypt.OpenSSLEngineSocketImpl not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.OpenSSLEngineSocketImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// OpenSSLSocketImpl Apache Harmony //
		//////////////////////////////////////
		try {
			var OpenSSLSocketImpl_Harmony = Java.use('org.apache.harmony.xnet.provider.jsse.OpenSSLSocketImpl');
			diagClassLoader('org.apache.harmony.xnet.provider.jsse.OpenSSLSocketImpl', OpenSSLSocketImpl_Harmony);
			OpenSSLSocketImpl_Harmony.verifyCertificateChain.implementation = function(asn1DerEncodedCertificateChain, authMethod) {
				console.log('[SSL_BYPASS_CONFIRMED] OpenSSLSocketImpl Apache Harmony: verifyCertificateChain intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] OpenSSLSocketImpl Apache Harmony — verifyCertificateChain(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] OpenSSLSocketImpl Apache Harmony — org.apache.harmony.xnet.provider.jsse.OpenSSLSocketImpl not found');
			console.log('[DIAG_OBFUSCATION] org.apache.harmony.xnet.provider.jsse.OpenSSLSocketImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// PhoneGap sslCertificateChecker //
		////////////////////////////////////
		try {
			var phonegap_Activity = Java.use('nl.xservices.plugins.sslCertificateChecker');
			diagClassLoader('nl.xservices.plugins.sslCertificateChecker', phonegap_Activity);
			phonegap_Activity.execute.overload('java.lang.String', 'org.json.JSONArray', 'org.apache.cordova.CallbackContext').implementation = function(a, b, c) {
				console.log('[SSL_BYPASS_CONFIRMED] PhoneGap sslCertificateChecker: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] PhoneGap sslCertificateChecker — execute(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] PhoneGap sslCertificateChecker — nl.xservices.plugins.sslCertificateChecker not found');
			console.log('[DIAG_OBFUSCATION] nl.xservices.plugins.sslCertificateChecker: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// IBM MobileFirst pinTrustedCertificatePublicKey (double bypass) //
		////////////////////////////////////////////////////////////////////
		try {
			// Bypass IBM MobileFirst {1}
			var WLClient_Activity_1 = Java.use('com.worklight.wlclient.api.WLClient');
			diagClassLoader('com.worklight.wlclient.api.WLClient', WLClient_Activity_1);
			WLClient_Activity_1.getInstance().pinTrustedCertificatePublicKey.overload('java.lang.String').implementation = function(cert) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM MobileFirst {1}: ' + cert);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM MobileFirst {1} — pinTrustedCertificatePublicKey(String)');
			} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM MobileFirst {1} — com.worklight.wlclient.api.WLClient not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.api.WLClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass IBM MobileFirst {2}
			var WLClient_Activity_2 = Java.use('com.worklight.wlclient.api.WLClient');
			WLClient_Activity_2.getInstance().pinTrustedCertificatePublicKey.overload('[Ljava.lang.String;').implementation = function(cert) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM MobileFirst {2}: ' + cert);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM MobileFirst {2} — pinTrustedCertificatePublicKey(String[])');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM MobileFirst {2} — com.worklight.wlclient.api.WLClient not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.api.WLClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// IBM WorkLight (ancestor of MobileFirst) HostNameVerifierWithCertificatePinning (quadruple bypass) //
		///////////////////////////////////////////////////////////////////////////////////////////////////////
		try {
			// Bypass IBM WorkLight {1}
			var worklight_Activity_1 = Java.use('com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning');
			diagClassLoader('com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning', worklight_Activity_1);
			worklight_Activity_1.verify.overload('java.lang.String', 'javax.net.ssl.SSLSocket').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM WorkLight {1}: ' + a);                
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM WorkLight {1} — verify(String, SSLSocket)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM WorkLight {1} — com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass IBM WorkLight {2}
			var worklight_Activity_2 = Java.use('com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning');
			worklight_Activity_2.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM WorkLight {2}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM WorkLight {2} — verify(String, X509Certificate)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM WorkLight {2} — com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass IBM WorkLight {3}
			var worklight_Activity_3 = Java.use('com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning');
			worklight_Activity_3.verify.overload('java.lang.String', '[Ljava.lang.String;', '[Ljava.lang.String;').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM WorkLight {3}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM WorkLight {3} — verify(String, String[], String[])');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM WorkLight {3} — com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass IBM WorkLight {4}
			var worklight_Activity_4 = Java.use('com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning');
			worklight_Activity_4.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] IBM WorkLight {4}: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] IBM WorkLight {4} — verify(String, SSLSession)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] IBM WorkLight {4} — com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.wlclient.certificatepinning.HostNameVerifierWithCertificatePinning: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Conscrypt CertPinManager //
		//////////////////////////////
		try {
			var conscrypt_CertPinManager_Activity = Java.use('com.android.org.conscrypt.CertPinManager');
			diagClassLoader('com.android.org.conscrypt.CertPinManager', conscrypt_CertPinManager_Activity);
			conscrypt_CertPinManager_Activity.checkChainPinning.overload('java.lang.String', 'java.util.List').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Conscrypt CertPinManager: ' + a);
				//return;
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Conscrypt CertPinManager — checkChainPinning(String, List)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Conscrypt CertPinManager — com.android.org.conscrypt.CertPinManager not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.CertPinManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		
		


		// Conscrypt CertPinManager (Legacy) //
		///////////////////////////////////////
		try {
			var legacy_conscrypt_CertPinManager_Activity = Java.use('com.android.org.conscrypt.CertPinManager');
			legacy_conscrypt_CertPinManager_Activity.isChainValid.overload('java.lang.String', 'java.util.List').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Conscrypt CertPinManager (Legacy): ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Conscrypt CertPinManager (Legacy) — isChainValid(String, List)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Conscrypt CertPinManager (Legacy) — com.android.org.conscrypt.CertPinManager not found');
			console.log('[DIAG_OBFUSCATION] com.android.org.conscrypt.CertPinManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}

			   


		// CWAC-Netsecurity (unofficial back-port pinner for Android<4.2) CertPinManager //
		///////////////////////////////////////////////////////////////////////////////////
		try {
			var cwac_CertPinManager_Activity = Java.use('com.commonsware.cwac.netsecurity.conscrypt.CertPinManager');
			diagClassLoader('com.commonsware.cwac.netsecurity.conscrypt.CertPinManager', cwac_CertPinManager_Activity);
			cwac_CertPinManager_Activity.isChainValid.overload('java.lang.String', 'java.util.List').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] CWAC-Netsecurity CertPinManager: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] CWAC-Netsecurity CertPinManager — isChainValid(String, List)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] CWAC-Netsecurity CertPinManager — com.commonsware.cwac.netsecurity.conscrypt.CertPinManager not found');
			console.log('[DIAG_OBFUSCATION] com.commonsware.cwac.netsecurity.conscrypt.CertPinManager: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Worklight Androidgap WLCertificatePinningPlugin //
		/////////////////////////////////////////////////////
		try {
			var androidgap_WLCertificatePinningPlugin_Activity = Java.use('com.worklight.androidgap.plugin.WLCertificatePinningPlugin');
			diagClassLoader('com.worklight.androidgap.plugin.WLCertificatePinningPlugin', androidgap_WLCertificatePinningPlugin_Activity);
			androidgap_WLCertificatePinningPlugin_Activity.execute.overload('java.lang.String', 'org.json.JSONArray', 'org.apache.cordova.CallbackContext').implementation = function(a, b, c) {
				console.log('[SSL_BYPASS_CONFIRMED] Worklight Androidgap WLCertificatePinningPlugin: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Worklight Androidgap WLCertificatePinningPlugin — execute(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Worklight Androidgap WLCertificatePinningPlugin — com.worklight.androidgap.plugin.WLCertificatePinningPlugin not found');
			console.log('[DIAG_OBFUSCATION] com.worklight.androidgap.plugin.WLCertificatePinningPlugin: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Netty FingerprintTrustManagerFactory //
		//////////////////////////////////////////
		try {
			var netty_FingerprintTrustManagerFactory = Java.use('io.netty.handler.ssl.util.FingerprintTrustManagerFactory');
			diagClassLoader('io.netty.handler.ssl.util.FingerprintTrustManagerFactory', netty_FingerprintTrustManagerFactory);
			//NOTE: sometimes this below implementation could be useful 
			//var netty_FingerprintTrustManagerFactory = Java.use('org.jboss.netty.handler.ssl.util.FingerprintTrustManagerFactory');
			netty_FingerprintTrustManagerFactory.checkTrusted.implementation = function(type, chain) {
				console.log('[SSL_BYPASS_CONFIRMED] Netty FingerprintTrustManagerFactory: checkTrusted intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] Netty FingerprintTrustManagerFactory — checkTrusted(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Netty FingerprintTrustManagerFactory — io.netty.handler.ssl.util.FingerprintTrustManagerFactory not found');
			console.log('[DIAG_OBFUSCATION] io.netty.handler.ssl.util.FingerprintTrustManagerFactory: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Squareup CertificatePinner [OkHTTP<v3] (double bypass) //
		////////////////////////////////////////////////////////////
		try {
			// Bypass Squareup CertificatePinner  {1}
			var Squareup_CertificatePinner_Activity_1 = Java.use('com.squareup.okhttp.CertificatePinner');
			diagClassLoader('com.squareup.okhttp.CertificatePinner', Squareup_CertificatePinner_Activity_1);
			Squareup_CertificatePinner_Activity_1.check.overload('java.lang.String', 'java.security.cert.Certificate').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Squareup CertificatePinner {1}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] Squareup CertificatePinner {1} — check(String, Certificate)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Squareup CertificatePinner {1} — com.squareup.okhttp.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] com.squareup.okhttp.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass Squareup CertificatePinner {2}
			var Squareup_CertificatePinner_Activity_2 = Java.use('com.squareup.okhttp.CertificatePinner');
			Squareup_CertificatePinner_Activity_2.check.overload('java.lang.String', 'java.util.List').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Squareup CertificatePinner {2}: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] Squareup CertificatePinner {2} — check(String, List)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Squareup CertificatePinner {2} — com.squareup.okhttp.CertificatePinner not found');
			console.log('[DIAG_OBFUSCATION] com.squareup.okhttp.CertificatePinner: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Squareup OkHostnameVerifier [OkHTTP v3] (double bypass) //
		/////////////////////////////////////////////////////////////
		try {
			// Bypass Squareup OkHostnameVerifier {1}
			var Squareup_OkHostnameVerifier_Activity_1 = Java.use('com.squareup.okhttp.internal.tls.OkHostnameVerifier');
			diagClassLoader('com.squareup.okhttp.internal.tls.OkHostnameVerifier', Squareup_OkHostnameVerifier_Activity_1);
			Squareup_OkHostnameVerifier_Activity_1.verify.overload('java.lang.String', 'java.security.cert.X509Certificate').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Squareup OkHostnameVerifier {1}: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Squareup OkHostnameVerifier {1} — verify(String, X509Certificate)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Squareup OkHostnameVerifier {1} — com.squareup.okhttp.internal.tls.OkHostnameVerifier not found');
			console.log('[DIAG_OBFUSCATION] com.squareup.okhttp.internal.tls.OkHostnameVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}    
		try {
			// Bypass Squareup OkHostnameVerifier {2}
			var Squareup_OkHostnameVerifier_Activity_2 = Java.use('com.squareup.okhttp.internal.tls.OkHostnameVerifier');
			Squareup_OkHostnameVerifier_Activity_2.verify.overload('java.lang.String', 'javax.net.ssl.SSLSession').implementation = function(a, b) {
				console.log('[SSL_BYPASS_CONFIRMED] Squareup OkHostnameVerifier {2}: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Squareup OkHostnameVerifier {2} — verify(String, SSLSession)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Squareup OkHostnameVerifier {2} — com.squareup.okhttp.internal.tls.OkHostnameVerifier not found');
			console.log('[DIAG_OBFUSCATION] com.squareup.okhttp.internal.tls.OkHostnameVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}


		

		// Android WebViewClient (quadruple bypass) //
		//////////////////////////////////////////////
		try {
			// Bypass WebViewClient {1} (deprecated from Android 6)
			var AndroidWebViewClient_Activity_1 = Java.use('android.webkit.WebViewClient');
			diagClassLoader('android.webkit.WebViewClient', AndroidWebViewClient_Activity_1);
			AndroidWebViewClient_Activity_1.onReceivedSslError.overload('android.webkit.WebView', 'android.webkit.SslErrorHandler', 'android.net.http.SslError').implementation = function(obj1, obj2, obj3) {
				console.log('[SSL_BYPASS_CONFIRMED] Android WebViewClient {1}: onReceivedSslError intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] Android WebViewClient {1} — onReceivedSslError(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Android WebViewClient {1} — android.webkit.WebViewClient not found');
			console.log('[DIAG_OBFUSCATION] android.webkit.WebViewClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass WebViewClient {2}
			var AndroidWebViewClient_Activity_2 = Java.use('android.webkit.WebViewClient');
			AndroidWebViewClient_Activity_2.onReceivedSslError.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest', 'android.webkit.WebResourceError').implementation = function(obj1, obj2, obj3) {
				console.log('[SSL_BYPASS_CONFIRMED] Android WebViewClient {2}: onReceivedSslError intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] Android WebViewClient {2} — onReceivedSslError(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Android WebViewClient {2} — android.webkit.WebViewClient not found');
			console.log('[DIAG_OBFUSCATION] android.webkit.WebViewClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass WebViewClient {3}
			var AndroidWebViewClient_Activity_3 = Java.use('android.webkit.WebViewClient');
			AndroidWebViewClient_Activity_3.onReceivedError.overload('android.webkit.WebView', 'int', 'java.lang.String', 'java.lang.String').implementation = function(obj1, obj2, obj3, obj4) {
				console.log('[SSL_BYPASS_CONFIRMED] Android WebViewClient {3}: onReceivedError intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] Android WebViewClient {3} — onReceivedError(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Android WebViewClient {3} — android.webkit.WebViewClient not found');
			console.log('[DIAG_OBFUSCATION] android.webkit.WebViewClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass WebViewClient {4}
			var AndroidWebViewClient_Activity_4 = Java.use('android.webkit.WebViewClient');
			AndroidWebViewClient_Activity_4.onReceivedError.overload('android.webkit.WebView', 'android.webkit.WebResourceRequest', 'android.webkit.WebResourceError').implementation = function(obj1, obj2, obj3) {
				console.log('[SSL_BYPASS_CONFIRMED] Android WebViewClient {4}: onReceivedError intercepted');
			};
			console.log('[SSL_HOOK_INSTALLED] Android WebViewClient {4} — onReceivedError(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Android WebViewClient {4} — android.webkit.WebViewClient not found');
			console.log('[DIAG_OBFUSCATION] android.webkit.WebViewClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		



		// Apache Cordova WebViewClient //
		//////////////////////////////////
		try {
			var CordovaWebViewClient_Activity = Java.use('org.apache.cordova.CordovaWebViewClient');
			diagClassLoader('org.apache.cordova.CordovaWebViewClient', CordovaWebViewClient_Activity);
			CordovaWebViewClient_Activity.onReceivedSslError.overload('android.webkit.WebView', 'android.webkit.SslErrorHandler', 'android.net.http.SslError').implementation = function(obj1, obj2, obj3) {
				console.log('[SSL_BYPASS_CONFIRMED] Apache Cordova WebViewClient: onReceivedSslError intercepted');
				obj3.proceed();
			};
			console.log('[SSL_HOOK_INSTALLED] Apache Cordova WebViewClient — onReceivedSslError(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Apache Cordova WebViewClient — org.apache.cordova.CordovaWebViewClient not found');
			console.log('[DIAG_OBFUSCATION] org.apache.cordova.CordovaWebViewClient: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Boye AbstractVerifier //
		///////////////////////////
		try {
			var boye_AbstractVerifier = Java.use('ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier');
			diagClassLoader('ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier', boye_AbstractVerifier);
			boye_AbstractVerifier.verify.implementation = function(host, ssl) {
				console.log('[SSL_BYPASS_CONFIRMED] Boye AbstractVerifier: ' + host);
			};
			console.log('[SSL_HOOK_INSTALLED] Boye AbstractVerifier — verify(String, SSLSocket)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Boye AbstractVerifier — ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier not found');
			console.log('[DIAG_OBFUSCATION] ch.boye.httpclientandroidlib.conn.ssl.AbstractVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Apache AbstractVerifier //
		/////////////////////////////
		try {
			var apache_AbstractVerifier = Java.use('org.apache.http.conn.ssl.AbstractVerifier');
			diagClassLoader('org.apache.http.conn.ssl.AbstractVerifier', apache_AbstractVerifier);
			apache_AbstractVerifier.verify.implementation = function(a, b, c, d) {
				console.log('[SSL_BYPASS_CONFIRMED] Apache AbstractVerifier: ' + a);
				return;
			};
			console.log('[SSL_HOOK_INSTALLED] Apache AbstractVerifier — verify(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Apache AbstractVerifier — org.apache.http.conn.ssl.AbstractVerifier not found');
			console.log('[DIAG_OBFUSCATION] org.apache.http.conn.ssl.AbstractVerifier: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}




		// Chromium Cronet //
		/////////////////////    
		try {
			var CronetEngineBuilderImpl_Activity = Java.use("org.chromium.net.impl.CronetEngineBuilderImpl");
			diagClassLoader('org.chromium.net.impl.CronetEngineBuilderImpl', CronetEngineBuilderImpl_Activity);
			// Setting argument to TRUE (default is TRUE) to disable Public Key pinning for local trust anchors
			CronetEngine_Activity.enablePublicKeyPinningBypassForLocalTrustAnchors.overload('boolean').implementation = function(a) {
				console.log("[SSL_BYPASS_CONFIRMED] Chromium Cronet: disablePublicKeyPinningBypassForLocalTrustAnchors");
				var cronet_obj_1 = CronetEngine_Activity.enablePublicKeyPinningBypassForLocalTrustAnchors.call(this, true);
				return cronet_obj_1;
			};
			// Bypassing Chromium Cronet pinner
			CronetEngine_Activity.addPublicKeyPins.overload('java.lang.String', 'java.util.Set', 'boolean', 'java.util.Date').implementation = function(hostName, pinsSha256, includeSubdomains, expirationDate) {
				console.log("[SSL_BYPASS_CONFIRMED] Chromium Cronet: addPublicKeyPins for " + hostName);
				var cronet_obj_2 = CronetEngine_Activity.addPublicKeyPins.call(this, hostName, pinsSha256, includeSubdomains, expirationDate);
				return cronet_obj_2;
			};
			console.log('[SSL_HOOK_INSTALLED] Chromium Cronet — enablePublicKeyPinningBypassForLocalTrustAnchors + addPublicKeyPins');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Chromium Cronet — org.chromium.net.impl.CronetEngineBuilderImpl not found');
			console.log('[DIAG_OBFUSCATION] org.chromium.net.impl.CronetEngineBuilderImpl: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}



		// Flutter Pinning packages http_certificate_pinning and ssl_pinning_plugin (double bypass) //
		//////////////////////////////////////////////////////////////////////////////////////////////
		try {
			// Bypass HttpCertificatePinning.check {1}
			var HttpCertificatePinning_Activity = Java.use('diefferson.http_certificate_pinning.HttpCertificatePinning');
			diagClassLoader('diefferson.http_certificate_pinning.HttpCertificatePinning', HttpCertificatePinning_Activity);
			HttpCertificatePinning_Activity.checkConnexion.overload("java.lang.String", "java.util.List", "java.util.Map", "int", "java.lang.String").implementation = function (a, b, c ,d, e) {
				console.log('[SSL_BYPASS_CONFIRMED] Flutter HttpCertificatePinning: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Flutter HttpCertificatePinning — checkConnexion(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Flutter HttpCertificatePinning — diefferson.http_certificate_pinning.HttpCertificatePinning not found');
			console.log('[DIAG_OBFUSCATION] diefferson.http_certificate_pinning.HttpCertificatePinning: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}
		try {
			// Bypass SslPinningPlugin.check {2}
			var SslPinningPlugin_Activity = Java.use('com.macif.plugin.sslpinningplugin.SslPinningPlugin');
			diagClassLoader('com.macif.plugin.sslpinningplugin.SslPinningPlugin', SslPinningPlugin_Activity);
			SslPinningPlugin_Activity.checkConnexion.overload("java.lang.String", "java.util.List", "java.util.Map", "int", "java.lang.String").implementation = function (a, b, c ,d, e) {
				console.log('[SSL_BYPASS_CONFIRMED] Flutter SslPinningPlugin: ' + a);
				return true;
			};
			console.log('[SSL_HOOK_INSTALLED] Flutter SslPinningPlugin — checkConnexion(...)');
		} catch (err) {
			console.log('[SSL_NOT_PRESENT] Flutter SslPinningPlugin — com.macif.plugin.sslpinningplugin.SslPinningPlugin not found');
			console.log('[DIAG_OBFUSCATION] com.macif.plugin.sslpinningplugin.SslPinningPlugin: Class not found. May indicate R8/ProGuard obfuscation renamed this class. Check the app mapping.txt for the obfuscated name.');
		}



		
		// Dynamic SSLPeerUnverifiedException Patcher                                //
		// An useful technique to bypass SSLPeerUnverifiedException failures raising //
		// when the Android app uses some uncommon SSL Pinning methods or an heavily //
		// code obfuscation. Inspired by an idea of: https://github.com/httptoolkit  //
		///////////////////////////////////////////////////////////////////////////////
		function rudimentaryFix(typeName) {
			// This is a improvable rudimentary fix, if not works you can patch it manually
			if (typeName === undefined){
				return;
			} else if (typeName === 'boolean') {
				return true;
			} else {
				return null;
			}
		}
		try {
			var UnverifiedCertError = Java.use('javax.net.ssl.SSLPeerUnverifiedException');
			UnverifiedCertError.$init.implementation = function (str) {
				console.log('\x1b[36m[!] Unexpected SSLPeerUnverifiedException occurred, trying to patch it dynamically...\x1b[0m');
				try {
					var stackTrace = Java.use('java.lang.Thread').currentThread().getStackTrace();
					var exceptionStackIndex = stackTrace.findIndex(stack =>
						stack.getClassName() === "javax.net.ssl.SSLPeerUnverifiedException"
					);
					// Retrieve the method raising the SSLPeerUnverifiedException
					var callingFunctionStack = stackTrace[exceptionStackIndex + 1];
					var className = callingFunctionStack.getClassName();
					var methodName = callingFunctionStack.getMethodName();
					var callingClass = Java.use(className);
					var callingMethod = callingClass[methodName];
					console.log('\x1b[36m[!] Attempting to bypass uncommon SSL Pinning method on: '+className+'.'+methodName+'\x1b[0m');
					console.log('[SSL_BYPASS_CONFIRMED] Dynamic SSLPeerUnverifiedException patch: ' + className + '.' + methodName);
					// Skip it when already patched by Frida
					if (callingMethod.implementation) {
						return; 
					}
					// Trying to patch the uncommon SSL Pinning method via implementation
					var returnTypeName = callingMethod.returnType.type;
					callingMethod.implementation = function() {
						rudimentaryFix(returnTypeName);
					};
				} catch (e) {
					// Dynamic patching via implementation does not works, then trying via function overloading
					//console.log('[!] The uncommon SSL Pinning method has more than one overload); 
					if (String(e).includes(".overload")) {
						var splittedList = String(e).split(".overload");
						for (let i=2; i<splittedList.length; i++) {
							var extractedOverload = splittedList[i].trim().split("(")[1].slice(0,-1).replaceAll("'","");
							// Check if extractedOverload has multiple arguments
							if (extractedOverload.includes(",")) {
								// Go here if overloaded method has multiple arguments (NOTE: max 6 args are covered here)
								var argList = extractedOverload.split(", ");
								console.log('\x1b[36m[!] Attempting overload of '+className+'.'+methodName+' with arguments: '+extractedOverload+'\x1b[0m');
								if (argList.length == 2) {
									callingMethod.overload(argList[0], argList[1]).implementation = function(a,b) {
										rudimentaryFix(returnTypeName);
									}
								} else if (argNum == 3) {
									callingMethod.overload(argList[0], argList[1], argList[2]).implementation = function(a,b,c) {
										rudimentaryFix(returnTypeName);
									}
								}  else if (argNum == 4) {
									callingMethod.overload(argList[0], argList[1], argList[2], argList[3]).implementation = function(a,b,c,d) {
										rudimentaryFix(returnTypeName);
									}
								}  else if (argNum == 5) {
									callingMethod.overload(argList[0], argList[1], argList[2], argList[3], argList[4]).implementation = function(a,b,c,d,e) {
										rudimentaryFix(returnTypeName);
									}
								}  else if (argNum == 6) {
									callingMethod.overload(argList[0], argList[1], argList[2], argList[3], argList[4], argList[5]).implementation = function(a,b,c,d,e,f) {
										rudimentaryFix(returnTypeName);
									}
								} 
							// Go here if overloaded method has a single argument
							} else {
								callingMethod.overload(extractedOverload).implementation = function(a) {
									rudimentaryFix(returnTypeName);
								}
							}
						}
					} else {
						console.log('[SSL_NOT_PRESENT] Dynamic patch failed for SSLPeerUnverifiedException: ' + e);
					}
				}
				//console.log('\x1b[36m[+] SSLPeerUnverifiedException hooked\x1b[0m');
				return this.$init(str);
			};
		} catch (err) {
			//console.log('\x1b[36m[-] SSLPeerUnverifiedException not found\x1b[0m');
			//console.log('\x1b[36m'+err+'\x1b[0m');
		}
		
	console.log('========================================================================');
	console.log('[#]They said ‘SSL Pinning is unbreakable.’ So I took that personally.[#]');
	console.log('========================================================================');
	});
	
}, 0);
