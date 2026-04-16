// ================================================================
// SHINOBI-NETWORK.js — Network Traffic Monitor
// Shinodroid 忍ドロイド — MASVS-NETWORK (M3)
//
// Intercepts all HTTP/HTTPS connections, URL calls, DNS lookups,
// and WebView URL loads. Complements SSL-BYE.js by monitoring
// actual traffic patterns rather than just bypassing pins.
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-NETWORK — Network Traffic Monitor                [#]');
        console.log('================================================================');

        // ── java.net.URL ─────────────────────────────────────────────────

        try {
            var URL = Java.use('java.net.URL');
            URL.openConnection.overload().implementation = function () {
                var urlStr = this.toString();
                var isHttp = urlStr.indexOf('http://') === 0;
                console.log('[+] [NET] URL.openConnection("' + urlStr + '")' + (isHttp ? ' ⚠️ CLEARTEXT HTTP' : ''));
                return this.openConnection();
            };
        } catch (err) {
            console.log('[-] [NET] URL.openConnection hook not found');
        }

        // ── java.net.HttpURLConnection ───────────────────────────────────

        try {
            var HttpURLConnection = Java.use('java.net.HttpURLConnection');
            HttpURLConnection.setRequestMethod.implementation = function (method) {
                console.log('[+] [NET] HttpURLConnection.setRequestMethod("' + method + '")');
                return this.setRequestMethod(method);
            };
            try {
                HttpURLConnection.getResponseCode.implementation = function () {
                    var code = this.getResponseCode();
                    var url = this.getURL().toString();
                    console.log('[+] [NET] HttpURLConnection.getResponseCode() = ' + code + ' — ' + url);
                    return code;
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [NET] HttpURLConnection hooks not found');
        }

        // ── javax.net.ssl.HttpsURLConnection ─────────────────────────────

        try {
            var HttpsURLConnection = Java.use('javax.net.ssl.HttpsURLConnection');
            HttpsURLConnection.setHostnameVerifier.implementation = function (verifier) {
                console.log('[+] [NET] HttpsURLConnection.setHostnameVerifier() ⚠️ CUSTOM VERIFIER');
                return this.setHostnameVerifier(verifier);
            };
        } catch (err) {
            console.log('[-] [NET] HttpsURLConnection hook not found');
        }

        // ── OkHttp3 OkHttpClient ─────────────────────────────────────────

        try {
            var OkHttpRequest = Java.use('okhttp3.Request');
            OkHttpRequest.url.overload().implementation = function () {
                var url = this.url();
                console.log('[+] [NET] OkHttp3 Request.url() = ' + url.toString());
                return url;
            };
        } catch (err) {
            console.log('[-] [NET] OkHttp3 Request hooks not found');
        }

        try {
            var OkHttpResponse = Java.use('okhttp3.Response');
            OkHttpResponse.code.implementation = function () {
                var code = this.code();
                try {
                    var req = this.request();
                    var url = req.url().toString();
                    console.log('[+] [NET] OkHttp3 Response.code() = ' + code + ' — ' + url);
                } catch (e) {
                    console.log('[+] [NET] OkHttp3 Response.code() = ' + code);
                }
                return code;
            };
        } catch (err) {
            console.log('[-] [NET] OkHttp3 Response hooks not found');
        }

        // ── android.webkit.WebView ───────────────────────────────────────

        try {
            var WebView = Java.use('android.webkit.WebView');
            WebView.loadUrl.overload('java.lang.String').implementation = function (url) {
                var isJs = url.indexOf('javascript:') === 0;
                console.log('[+] [NET] WebView.loadUrl("' + url.substring(0, 120) + '")' + (isJs ? ' ⚠️ JS INJECTION' : ''));
                return this.loadUrl(url);
            };
            try {
                WebView.loadUrl.overload('java.lang.String', 'java.util.Map').implementation = function (url, headers) {
                    console.log('[+] [NET] WebView.loadUrl("' + url.substring(0, 120) + '", headers)');
                    return this.loadUrl(url, headers);
                };
            } catch (e) { }
            try {
                WebView.loadData.implementation = function (data, mime, enc) {
                    console.log('[+] [NET] WebView.loadData(mime=' + mime + ', len=' + (data ? data.length : 0) + ')');
                    return this.loadData(data, mime, enc);
                };
            } catch (e) { }
            try {
                WebView.loadDataWithBaseURL.implementation = function (base, data, mime, enc, failUrl) {
                    console.log('[+] [NET] WebView.loadDataWithBaseURL(base=' + base + ')');
                    return this.loadDataWithBaseURL(base, data, mime, enc, failUrl);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [NET] WebView hooks not found');
        }

        // ── java.net.InetAddress (DNS) ───────────────────────────────────

        try {
            var InetAddress = Java.use('java.net.InetAddress');
            InetAddress.getByName.overload('java.lang.String').implementation = function (host) {
                console.log('[+] [NET] DNS lookup: InetAddress.getByName("' + host + '")');
                return this.getByName(host);
            };
            try {
                InetAddress.getAllByName.overload('java.lang.String').implementation = function (host) {
                    console.log('[+] [NET] DNS lookup: InetAddress.getAllByName("' + host + '")');
                    return this.getAllByName(host);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [NET] InetAddress hook not found');
        }

        // ── java.net.Socket ──────────────────────────────────────────────

        try {
            var Socket = Java.use('java.net.Socket');
            Socket.$init.overload('java.lang.String', 'int').implementation = function (host, port) {
                console.log('[+] [NET] Socket("' + host + '", ' + port + ')');
                return this.$init(host, port);
            };
        } catch (err) {
            console.log('[-] [NET] Socket hook not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-NETWORK — Monitoring active                      [#]');
        console.log('================================================================');
    });
}, 0);
