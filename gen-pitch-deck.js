#!/usr/bin/env node
/**
 * gen-pitch-deck.js — copy pitch-deck.md from artifacts dir and convert to PDF
 * Usage: node gen-pitch-deck.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.join(
    process.env.USERPROFILE || process.env.HOME,
    '.gemini', 'antigravity', 'brain',
    '9da90768-bcf1-4ed9-97dc-e052968dbb2a', 'pitch-deck.md'
);
const TEMP = path.join(__dirname, '_pitch-deck-temp.md');
const OUT = path.join(__dirname, 'Shinodroid-PitchDeck-2026.pdf');

if (!fs.existsSync(SRC)) {
    console.error('pitch-deck.md not found at: ' + SRC);
    process.exit(1);
}

fs.copyFileSync(SRC, TEMP);
console.log('Copied pitch-deck.md -> ' + TEMP);

try {
    execSync(`node reporting/convert.js "${TEMP}" "${OUT}"`, {
        cwd: __dirname,
        stdio: 'inherit'
    });
} finally {
    fs.unlinkSync(TEMP);
}

console.log('\nPDF ready -> ' + OUT);
