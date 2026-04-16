// ================================================================
// SHINOBI-STORAGE.js — Data Storage Monitor
// Shinodroid 忍ドロイド — MASVS-STORAGE (M2)
//
// Monitors all data storage operations: SharedPreferences,
// SQLite databases, file I/O, clipboard, and external storage.
// Detects insecure data storage patterns.
// ================================================================

setTimeout(function () {
    Java.perform(function () {
        console.log('');
        console.log('================================================================');
        console.log('[#]  SHINOBI-STORAGE — Data Storage Monitor                   [#]');
        console.log('================================================================');

        // ── SharedPreferences ────────────────────────────────────────────

        try {
            var SharedPreferencesImpl = Java.use('android.app.SharedPreferencesImpl');

            SharedPreferencesImpl.getString.implementation = function (key, defValue) {
                var val = this.getString(key, defValue);
                var isSensitive = /password|token|secret|key|api|auth|session|cookie|pin|credential/i.test(key);
                console.log('[+] [STORAGE] SharedPrefs.getString("' + key + '")' + (isSensitive ? ' ⚠️ SENSITIVE KEY' : ''));
                return val;
            };

            try {
                SharedPreferencesImpl.getInt.overload('java.lang.String', 'int').implementation = function (key, defValue) {
                    var val = this.getInt(key, defValue);
                    console.log('[+] [STORAGE] SharedPrefs.getInt("' + key + '") = ' + val);
                    return val;
                };
            } catch (e) { }

            try {
                SharedPreferencesImpl.getBoolean.overload('java.lang.String', 'boolean').implementation = function (key, defValue) {
                    var val = this.getBoolean(key, defValue);
                    var isSensitive = /debug|root|jailbreak|premium|paid|license|vpn/i.test(key);
                    console.log('[+] [STORAGE] SharedPrefs.getBoolean("' + key + '") = ' + val + (isSensitive ? ' ⚠️ SENSITIVE' : ''));
                    return val;
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] SharedPreferencesImpl hooks not found');
        }

        // SharedPreferencesImpl$EditorImpl
        try {
            var EditorImpl = Java.use('android.app.SharedPreferencesImpl$EditorImpl');

            EditorImpl.putString.implementation = function (key, value) {
                var isSensitive = /password|token|secret|key|api|auth|session|cookie|pin|credential/i.test(key);
                var preview = value ? value.substring(0, 30) : 'null';
                console.log('[+] [STORAGE] SharedPrefs.putString("' + key + '", "' + preview + '...")' + (isSensitive ? ' ⚠️ SENSITIVE DATA STORED' : ''));
                return this.putString(key, value);
            };

            try {
                EditorImpl.putInt.implementation = function (key, value) {
                    console.log('[+] [STORAGE] SharedPrefs.putInt("' + key + '", ' + value + ')');
                    return this.putInt(key, value);
                };
            } catch (e) { }

            try {
                EditorImpl.putBoolean.implementation = function (key, value) {
                    console.log('[+] [STORAGE] SharedPrefs.putBoolean("' + key + '", ' + value + ')');
                    return this.putBoolean(key, value);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] SharedPrefs Editor hooks not found');
        }

        // ── SQLite Database ──────────────────────────────────────────────

        try {
            var SQLiteDatabase = Java.use('android.database.sqlite.SQLiteDatabase');

            SQLiteDatabase.execSQL.overload('java.lang.String').implementation = function (sql) {
                console.log('[+] [STORAGE] SQLiteDatabase.execSQL("' + sql.substring(0, 120) + '")');
                return this.execSQL(sql);
            };

            try {
                SQLiteDatabase.execSQL.overload('java.lang.String', '[Ljava.lang.Object;').implementation = function (sql, args) {
                    console.log('[+] [STORAGE] SQLiteDatabase.execSQL("' + sql.substring(0, 100) + '", args=' + (args ? args.length : 0) + ')');
                    return this.execSQL(sql, args);
                };
            } catch (e) { }

            try {
                SQLiteDatabase.rawQuery.overload('java.lang.String', '[Ljava.lang.String;').implementation = function (sql, args) {
                    var isSensitive = /password|token|secret|key|user|session|credential/i.test(sql);
                    console.log('[+] [STORAGE] SQLiteDatabase.rawQuery("' + sql.substring(0, 100) + '")' + (isSensitive ? ' ⚠️ SENSITIVE QUERY' : ''));
                    return this.rawQuery(sql, args);
                };
            } catch (e) { }

            try {
                SQLiteDatabase.insert.implementation = function (table, nullCol, values) {
                    console.log('[+] [STORAGE] SQLiteDatabase.insert("' + table + '")');
                    return this.insert(table, nullCol, values);
                };
            } catch (e) { }

            try {
                SQLiteDatabase.openOrCreateDatabase.overload('java.lang.String', 'android.database.sqlite.SQLiteDatabase$CursorFactory').implementation = function (path, factory) {
                    console.log('[+] [STORAGE] SQLiteDatabase.openOrCreateDatabase("' + path + '")');
                    return this.openOrCreateDatabase(path, factory);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] SQLiteDatabase hooks not found');
        }

        // ── File I/O ─────────────────────────────────────────────────────

        try {
            var FileOutputStream = Java.use('java.io.FileOutputStream');
            FileOutputStream.$init.overload('java.io.File').implementation = function (file) {
                var path = file.getAbsolutePath();
                var isExternal = path.indexOf('/sdcard') !== -1 || path.indexOf('/storage/emulated') !== -1;
                console.log('[+] [STORAGE] FileOutputStream("' + path + '")' + (isExternal ? ' ⚠️ EXTERNAL STORAGE' : ''));
                return this.$init(file);
            };

            try {
                FileOutputStream.$init.overload('java.lang.String').implementation = function (path) {
                    var isExternal = path.indexOf('/sdcard') !== -1 || path.indexOf('/storage/emulated') !== -1;
                    console.log('[+] [STORAGE] FileOutputStream("' + path + '")' + (isExternal ? ' ⚠️ EXTERNAL STORAGE' : ''));
                    return this.$init(path);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] FileOutputStream hook not found');
        }

        try {
            var FileInputStream = Java.use('java.io.FileInputStream');
            FileInputStream.$init.overload('java.io.File').implementation = function (file) {
                var path = file.getAbsolutePath();
                console.log('[+] [STORAGE] FileInputStream("' + path + '")');
                return this.$init(file);
            };
        } catch (err) {
            console.log('[-] [STORAGE] FileInputStream hook not found');
        }

        // ── Clipboard ────────────────────────────────────────────────────

        try {
            var ClipboardManager = Java.use('android.content.ClipboardManager');
            ClipboardManager.setPrimaryClip.implementation = function (clip) {
                console.log('[+] [STORAGE] ClipboardManager.setPrimaryClip() ⚠️ CLIPBOARD WRITE');
                return this.setPrimaryClip(clip);
            };
            try {
                ClipboardManager.getPrimaryClip.implementation = function () {
                    console.log('[+] [STORAGE] ClipboardManager.getPrimaryClip() ⚠️ CLIPBOARD READ');
                    return this.getPrimaryClip();
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] ClipboardManager hooks not found');
        }

        // ── ContentResolver ──────────────────────────────────────────────

        try {
            var ContentResolver = Java.use('android.content.ContentResolver');
            ContentResolver.query.overload('android.net.Uri', '[Ljava.lang.String;', 'java.lang.String', '[Ljava.lang.String;', 'java.lang.String').implementation = function (uri, projection, selection, selectionArgs, sortOrder) {
                console.log('[+] [STORAGE] ContentResolver.query("' + uri.toString() + '")');
                return this.query(uri, projection, selection, selectionArgs, sortOrder);
            };
            try {
                ContentResolver.insert.overload('android.net.Uri', 'android.content.ContentValues').implementation = function (uri, values) {
                    console.log('[+] [STORAGE] ContentResolver.insert("' + uri.toString() + '")');
                    return this.insert(uri, values);
                };
            } catch (e) { }
        } catch (err) {
            console.log('[-] [STORAGE] ContentResolver hooks not found');
        }

        // ── Logging sensitive data to logcat ────────────────────────────

        try {
            var Log = Java.use('android.util.Log');
            var origD = Log.d.overload('java.lang.String', 'java.lang.String');
            origD.implementation = function (tag, msg) {
                if (/password|token|secret|key|api_key|session|credential|bearer/i.test(msg)) {
                    console.log('[+] [STORAGE] Log.d("' + tag + '") ⚠️ SENSITIVE DATA IN LOGCAT');
                }
                return origD.call(this, tag, msg);
            };
        } catch (err) {
            console.log('[-] [STORAGE] Log.d hook not found');
        }

        console.log('================================================================');
        console.log('[#]  SHINOBI-STORAGE — Monitoring active                      [#]');
        console.log('================================================================');
    });
}, 0);
