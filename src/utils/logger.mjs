/**
 * WORMHOLE // Shinodroid 忍ドロイド
 * Enhanced Cyberpunk Logger & Terminal UI Utility
 */

export const ANSI = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    italic: "\x1b[3m",
    underline: "\x1b[4m",
    cyan: "\x1b[36m",
    brightCyan: "\x1b[96m",
    green: "\x1b[32m",
    brightGreen: "\x1b[92m",
    yellow: "\x1b[33m",
    brightYellow: "\x1b[93m",
    red: "\x1b[31m",
    brightRed: "\x1b[91m",
    magenta: "\x1b[35m",
    brightMagenta: "\x1b[95m",
    white: "\x1b[97m",
    brightWhite: "\x1b[97m",
    gray: "\x1b[90m",
};

function stripAnsi(str) {
    return String(str).replace(/\x1b\[[0-9;]*m/g, "");
}

function getVisualWidth(str) {
    let width = 0;
    const clean = stripAnsi(str);
    for (const ch of clean) {
        const code = ch.codePointAt(0);
        if (
            (code >= 0x1100 && code <= 0x115F) ||
            (code >= 0x2E80 && code <= 0xA4CF) ||
            (code >= 0xAC00 && code <= 0xD7A3) ||
            (code >= 0xF900 && code <= 0xFAFF) ||
            (code >= 0xFE10 && code <= 0xFE19) ||
            (code >= 0xFE30 && code <= 0xFE6F) ||
            (code >= 0xFF00 && code <= 0xFF60) ||
            (code >= 0xFFE0 && code <= 0xFFE6) ||
            (code >= 0x1F300 && code <= 0x1FAFF) ||
            (code >= 0x2600 && code <= 0x27BF)
        ) {
            width += 2;
        } else {
            width += 1;
        }
    }
    return width;
}

function boxLine(content, innerWidth, borderColor = ANSI.cyan) {
    const vis = getVisualWidth(content);
    const padLen = Math.max(0, innerWidth - vis);
    return `${borderColor}║${ANSI.reset} ${content}${" ".repeat(padLen)} ${borderColor}║${ANSI.reset}`;
}

export class Logger {
    static formatOptions = { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" };
    static ANSI = ANSI;

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

    /**
     * Prints the full cyberpunk ASCII art banner.
     */
    static banner() {
        console.log();
        const innerWidth = 76;
        const topBorder = "═".repeat(innerWidth + 2);

        console.log(`${ANSI.cyan}╔${topBorder}╗${ANSI.reset}`);
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ███████╗██╗  ██╗██╗███╗   ██╗ ██████╗ ██████╗ ██████╗  ██████╗ ██╗██████╗ ${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ██╔════╝██║  ██║██║████╗  ██║██╔═══██╗██╔══██╗██╔══██╗██╔═══██╗██║██╔══██╗${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ███████╗███████║██║██╔██╗ ██║██║   ██║██║  ██║██████╔╝██║   ██║██║██║  ██║${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ╚════██║██╔══██║██║██║╚██╗██║██║   ██║██║  ██║██╔══██╗██║   ██║██║██║  ██║${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ███████║██║  ██║██║██║ ╚████║╚██████╔╝██████╔╝██║  ██║╚██████╔╝██║██████╔╝${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.brightCyan}${ANSI.bold} ╚══════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝╚═════╝ ${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(`${ANSI.cyan}╠${topBorder}╣${ANSI.reset}`);
        console.log(boxLine(`${ANSI.magenta}${ANSI.bold}WORMHOLE // Shinodroid 忍ドロイド${ANSI.reset} ── ${ANSI.white}Unified Daemon Service${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(boxLine(`${ANSI.gray}Automated Mobile Pentesting Framework • MobSF + Frida + BrutDroid + AI${ANSI.reset}`, innerWidth, ANSI.cyan));
        console.log(`${ANSI.cyan}╚${topBorder}╝${ANSI.reset}`);
        console.log();
    }

    /**
     * Interactive terminal spinner supporting both TTY animations and clean non-TTY fallbacks.
     * @param {string} text 
     */
    static spinner(text = "Processing...") {
        const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        let frameIdx = 0;
        let message = text;
        let timer = null;
        const isTTY = Boolean(process.stdout.isTTY);

        if (isTTY) {
            process.stdout.write(`\r${ANSI.cyan}${frames[0]}${ANSI.reset} ${message}`);
            timer = setInterval(() => {
                frameIdx = (frameIdx + 1) % frames.length;
                process.stdout.write(`\r${ANSI.cyan}${frames[frameIdx]}${ANSI.reset} ${message}`);
            }, 80);
        } else {
            const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
            console.log(`[${ts}] ⏳ ${message}`);
        }

        const stopTimer = () => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        };

        return {
            update(newMessage) {
                message = newMessage;
                if (isTTY) {
                    process.stdout.write(`\r${ANSI.cyan}${frames[frameIdx]}${ANSI.reset} ${message}`);
                }
            },
            succeed(msg) {
                stopTimer();
                const out = msg || message;
                if (isTTY) {
                    process.stdout.write(`\r\x1b[2K${ANSI.brightGreen}✔${ANSI.reset} ${out}\n`);
                } else {
                    const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
                    console.log(`[${ts}] ✅ ${out}`);
                }
            },
            fail(msg) {
                stopTimer();
                const out = msg || message;
                if (isTTY) {
                    process.stdout.write(`\r\x1b[2K${ANSI.brightRed}✖${ANSI.reset} ${out}\n`);
                } else {
                    const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
                    console.log(`[${ts}] ❌ ${out}`);
                }
            },
            warn(msg) {
                stopTimer();
                const out = msg || message;
                if (isTTY) {
                    process.stdout.write(`\r\x1b[2K${ANSI.brightYellow}⚠${ANSI.reset} ${out}\n`);
                } else {
                    const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
                    console.log(`[${ts}] ⚠️ ${out}`);
                }
            },
            info(msg) {
                stopTimer();
                const out = msg || message;
                if (isTTY) {
                    process.stdout.write(`\r\x1b[2K${ANSI.brightCyan}ℹ${ANSI.reset} ${out}\n`);
                } else {
                    const ts = new Date().toLocaleTimeString("en-US", Logger.formatOptions);
                    console.log(`[${ts}] ℹ️ ${out}`);
                }
            },
            stop() {
                stopTimer();
                if (isTTY) {
                    process.stdout.write("\r\x1b[2K");
                }
            }
        };
    }

    /**
     * Renders a cyberpunk system status table with colored dots.
     * 🟢 Green for online/active
     * 🔴 Red for offline/unreachable
     * 🟡 Yellow for skip/disabled
     *
     * @param {object} status
     */
    static systemStatus(status = {}) {
        const innerWidth = 76;
        const border = "─".repeat(innerWidth + 2);

        console.log(`${ANSI.cyan}┌─ SYSTEM STATUS ${"─".repeat(innerWidth - 15)}┐${ANSI.reset}`);

        // MobSF
        const mobsfUp = status.mobsf === true || status.mobsf === "online";
        const mobsfUrl = status.mobsfUrl || "http://127.0.0.1:8000";
        const mobsfBadge = mobsfUp
            ? `🟢 ${ANSI.brightGreen}Online${ANSI.reset}   ${ANSI.dim}(${mobsfUrl})${ANSI.reset}`
            : `🔴 ${ANSI.brightRed}Offline${ANSI.reset}  ${ANSI.dim}(${mobsfUrl})${ANSI.reset}`;
        console.log(boxLine(`${ANSI.bold}MobSF Core API     :${ANSI.reset} ${mobsfBadge}`, innerWidth, ANSI.cyan));

        // Convex
        const convexUrl = status.convexUrl;
        let convexBadge;
        if (!convexUrl || status.convex === "skip" || status.convex === "skipped") {
            convexBadge = `🟡 ${ANSI.brightYellow}Skipped${ANSI.reset}  ${ANSI.dim}(Not configured / standalone mode)${ANSI.reset}`;
        } else if (status.convex === true || status.convex === "online") {
            convexBadge = `🟢 ${ANSI.brightGreen}Online${ANSI.reset}   ${ANSI.dim}(${convexUrl})${ANSI.reset}`;
        } else {
            convexBadge = `🔴 ${ANSI.brightRed}Offline${ANSI.reset}  ${ANSI.dim}(${convexUrl})${ANSI.reset}`;
        }
        console.log(boxLine(`${ANSI.bold}Convex Cloud DB    :${ANSI.reset} ${convexBadge}`, innerWidth, ANSI.cyan));

        // Inbox
        const inbox = status.inbox || "C:\\MobSF-Scans\\inbox";
        const inboxBadge = `🟢 ${ANSI.brightGreen}Active${ANSI.reset}   ${ANSI.dim}(${inbox})${ANSI.reset}`;
        console.log(boxLine(`${ANSI.bold}APK Inbox Channel  :${ANSI.reset} ${inboxBadge}`, innerWidth, ANSI.cyan));

        // Reports
        const reports = status.reports || "C:\\MobSF-Scans\\reports";
        const reportsBadge = `🟢 ${ANSI.brightGreen}Active${ANSI.reset}   ${ANSI.dim}(${reports})${ANSI.reset}`;
        console.log(boxLine(`${ANSI.bold}Reports Directory  :${ANSI.reset} ${reportsBadge}`, innerWidth, ANSI.cyan));

        // AI Engine
        const isSkipAi = status.skipAi !== undefined
            ? Boolean(status.skipAi)
            : Boolean(process.env.SKIP_AI && process.env.SKIP_AI !== "0" && process.env.SKIP_AI.toLowerCase() !== "false");
        const aiBadge = isSkipAi
            ? `🟡 ${ANSI.brightYellow}Skipped${ANSI.reset}  ${ANSI.dim}(process.env.SKIP_AI=1 — bypassed)${ANSI.reset}`
            : `🟢 ${ANSI.brightGreen}Active${ANSI.reset}   ${ANSI.dim}(Full Heuristic + AI Insights enabled)${ANSI.reset}`;
        console.log(boxLine(`${ANSI.bold}AI Analysis Engine :${ANSI.reset} ${aiBadge}`, innerWidth, ANSI.cyan));

        console.log(`${ANSI.cyan}└${border}┘${ANSI.reset}`);
        console.log();
    }

    /**
     * Shows an animated ready badge.
     * @param {string} message 
     */
    static async ready(message = "Ready — waiting for targets") {
        const isTTY = Boolean(process.stdout.isTTY);
        if (isTTY) {
            const frames = ["⚡", "✨", "🟢"];
            for (const f of frames) {
                process.stdout.write(`\r\x1b[2K${f} ${ANSI.bold}${ANSI.brightGreen}${message}...${ANSI.reset}`);
                await new Promise((r) => setTimeout(r, 100));
            }
            process.stdout.write("\r\x1b[2K");
        }

        const innerWidth = 76;
        const border = "═".repeat(innerWidth + 2);
        console.log(`${ANSI.brightGreen}╔${border}╗${ANSI.reset}`);
        console.log(boxLine(`🟢 ${ANSI.bold}${ANSI.brightWhite}${message}${ANSI.reset}`, innerWidth, ANSI.brightGreen));
        console.log(boxLine(`${ANSI.dim}Listening for analysis requests across all configured channels...${ANSI.reset}`, innerWidth, ANSI.brightGreen));
        console.log(`${ANSI.brightGreen}╚${border}╝${ANSI.reset}`);
        console.log();
    }

    /**
     * Clean, styled shutdown message with SHINODROID name.
     * @param {string} sig 
     */
    static shutdown(sig = "SIGINT") {
        console.log();
        const innerWidth = 76;
        const border = "═".repeat(innerWidth + 2);
        console.log(`${ANSI.brightRed}╔${border}╗${ANSI.reset}`);
        console.log(boxLine(`${ANSI.bold}${ANSI.brightWhite}[WORMHOLE // SHINODROID]${ANSI.reset} Graceful Shutdown Initiated`, innerWidth, ANSI.brightRed));
        console.log(boxLine(`${ANSI.brightYellow}Signal: ${sig}${ANSI.reset} ── Closing active listeners and pollers...`, innerWidth, ANSI.brightRed));
        console.log(boxLine(`${ANSI.gray}All processes stopped safely. Goodbye! 忍${ANSI.reset}`, innerWidth, ANSI.brightRed));
        console.log(`${ANSI.brightRed}╚${border}╝${ANSI.reset}`);
        console.log();
    }

    static goodbye(sig) {
        Logger.shutdown(sig);
    }
}
