#!/usr/bin/env node
// gen-pitch-deck.cjs — CommonJS helper (project root has "type":"module")
// Usage: node gen-pitch-deck.cjs

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.gemini', 'antigravity', 'brain',
    '9da90768-bcf1-4ed9-97dc-e052968dbb2a', 'pitch-deck.md'
);
const TEMP = path.join(__dirname, '_pitch-deck-temp.md');
const OUT = path.join(__dirname, 'ShinobiDroid-PitchDeck-2026.pdf');

if (!fs.existsSync(SRC)) {
    console.error('pitch-deck.md not found at: ' + SRC);
    process.exit(1);
}

fs.copyFileSync(SRC, TEMP);
console.log('Copied -> ' + TEMP);

try {
    execSync(
        'node reporting/convert.js "' + TEMP + '" "' + OUT + '"',
        { cwd: __dirname, stdio: 'inherit' }
    );
} finally {
    try { fs.unlinkSync(TEMP); } catch (_) { }
}

console.log('\nPDF ready -> ' + OUT);
