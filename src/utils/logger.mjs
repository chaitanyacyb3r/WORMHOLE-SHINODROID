export class Logger {
    static formatOptions = { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" };

    static _print(level, prefix, msg) {
        const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
        console.log(`[${ts}] ${prefix} ${msg}`);
    }

    static info(msg) { Logger._print("info", "ℹ️", msg); }
    static ok(msg) { Logger._print("ok", "✅", msg); }
    static warn(msg) { Logger._print("warn", "⚠️", msg); }
    static error(msg) { Logger._print("error", "❌", msg); }
    static step(msg) { Logger._print("step", "➡️", msg); }

    // Drop-in wrapper for legacy contexts expecting raw `log(level, msg)` injection
    static legacy(level, msg) {
        const methods = { info: Logger.info, ok: Logger.ok, warn: Logger.warn, error: Logger.error, step: Logger.step };
        if (methods[level]) methods[level](msg);
        else Logger.info(msg);
    }
}
