// ================================================================
// SHINOBI-PLATFORM.js — Platform Interaction Monitor
// Shinodroid 忍ドロイド — MASVS-PLATFORM (M1)
//
// Monitors Android IPC mechanisms: Intents, BroadcastReceivers,
// ContentProviders, PendingIntents, and deep link handling.
// Detects insecure exported components and intent data leaks.
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-PLATFORM — Platform Interaction Monitor          [#]');
        console.log('================================================================');

        // ── Intent Monitoring ────────────────────────────────────────────

        try {
            var Intent = Java.use('android.content.Intent');

            Intent.$init.overload('java.lang.String').implementation = function (action) {
                console.log('[+] [PLATFORM] Intent("' + action + '")');
                return this.$init(action);
            };

            try {
                Intent.$init.overload('java.lang.String', 'android.net.Uri').implementation = function (action, uri) {
                    console.log('[+] [PLATFORM] Intent("' + action + '", uri="' + uri.toString() + '")');
                    return this.$init(action, uri);
                };
            } catch (e) { }

            try {
                Intent.setData.implementation = function (uri) {
                    console.log('[+] [PLATFORM] Intent.setData("' + uri.toString() + '")');
                    return this.setData(uri);
                };
            } catch (e) { }

            try {
                Intent.putExtra.overload('java.lang.String', 'java.lang.String').implementation = function (name, value) {
                    var isSensitive = /password|token|secret|key|auth|session|credential|api/i.test(name);
                    console.log('[+] [PLATFORM] Intent.putExtra("' + name + '", "' + (value ? value.substring(0, 30) : 'null') + '")' + (isSensitive ? ' ⚠️ SENSITIVE DATA IN INTENT' : ''));
                    return this.putExtra(name, value);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [PLATFORM] Intent hooks not found');
        }

        // ── Activity.startActivity ───────────────────────────────────────

        try {
            var Activity = Java.use('android.app.Activity');
            Activity.startActivity.overload('android.content.Intent').implementation = function (intent) {
                var action = intent.getAction();
                var data = intent.getDataString();
                var component = intent.getComponent();
                var info = 'action=' + action;
                if (data) info += ', data=' + data;
                if (component) info += ', component=' + component.getClassName();
                console.log('[+] [PLATFORM] Activity.startActivity(' + info + ')');
                return this.startActivity(intent);
            };

            try {
                Activity.startActivityForResult.overload('android.content.Intent', 'int').implementation = function (intent, requestCode) {
                    var action = intent.getAction();
                    console.log('[+] [PLATFORM] Activity.startActivityForResult(action=' + action + ', requestCode=' + requestCode + ')');
                    return this.startActivityForResult(intent, requestCode);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [PLATFORM] Activity hooks not found');
        }

        // ── Context.sendBroadcast ────────────────────────────────────────

        try {
            var ContextWrapper = Java.use('android.content.ContextWrapper');
            ContextWrapper.sendBroadcast.overload('android.content.Intent').implementation = function (intent) {
                var action = intent.getAction();
                console.log('[+] [PLATFORM] sendBroadcast(action="' + action + '") ⚠️ IMPLICIT BROADCAST');
                return this.sendBroadcast(intent);
            };
            try {
                ContextWrapper.sendBroadcast.overload('android.content.Intent', 'java.lang.String').implementation = function (intent, permission) {
                    var action = intent.getAction();
                    console.log('[+] [PLATFORM] sendBroadcast(action="' + action + '", perm="' + permission + '")');
                    return this.sendBroadcast(intent, permission);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [PLATFORM] sendBroadcast hooks not found');
        }

        // ── PendingIntent ────────────────────────────────────────────────

        try {
            var PendingIntent = Java.use('android.app.PendingIntent');

            PendingIntent.getActivity.overload('android.content.Context', 'int', 'android.content.Intent', 'int').implementation = function (ctx, requestCode, intent, flags) {
                var isMutable = (flags & 0x02000000) === 0; // FLAG_IMMUTABLE = 0x04000000, FLAG_MUTABLE = 0x02000000
                console.log('[+] [PLATFORM] PendingIntent.getActivity(flags=0x' + flags.toString(16) + ')' + (isMutable ? ' ⚠️ MUTABLE PENDING INTENT' : ''));
                return this.getActivity(ctx, requestCode, intent, flags);
            };

            try {
                PendingIntent.getBroadcast.overload('android.content.Context', 'int', 'android.content.Intent', 'int').implementation = function (ctx, requestCode, intent, flags) {
                    console.log('[+] [PLATFORM] PendingIntent.getBroadcast(flags=0x' + flags.toString(16) + ')');
                    return this.getBroadcast(ctx, requestCode, intent, flags);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [PLATFORM] PendingIntent hooks not found');
        }

        // ── ContentProvider.query ─────────────────────────────────────────

        try {
            var ContentProvider = Java.use('android.content.ContentProvider');
            ContentProvider.query.overload('android.net.Uri', '[Ljava.lang.String;', 'java.lang.String', '[Ljava.lang.String;', 'java.lang.String').implementation = function (uri, projection, selection, selectionArgs, sortOrder) {
                console.log('[+] [PLATFORM] ContentProvider.query("' + uri.toString() + '")');
                return this.query(uri, projection, selection, selectionArgs, sortOrder);
            };
        } catch (err) {
            console.log('[-] [PLATFORM] ContentProvider hooks not found');
        }

        // ── NotificationManager ──────────────────────────────────────────

        try {
            var NotificationManager = Java.use('android.app.NotificationManager');
            NotificationManager.notify.overload('int', 'android.app.Notification').implementation = function (id, notification) {
                console.log('[+] [PLATFORM] NotificationManager.notify(id=' + id + ')');
                return this.notify(id, notification);
            };
        } catch (err) {
            console.log('[-] [PLATFORM] NotificationManager not found');
        }

        // ── Runtime.exec (command injection detection) ───────────────────

        try {
            var Runtime = Java.use('java.lang.Runtime');
            Runtime.exec.overload('java.lang.String').implementation = function (cmd) {
                console.log('[+] [PLATFORM] Runtime.exec("' + cmd + '") ⚠️ COMMAND EXECUTION');
                return this.exec(cmd);
            };
        } catch (err) {
            console.log('[-] [PLATFORM] Runtime.exec hook not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-PLATFORM — Monitoring active                     [#]');
        console.log('================================================================');
    });
}, 0);
