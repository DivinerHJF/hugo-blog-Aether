'use strict';

const fs = require('node:fs');
const path = require('node:path');

const themeRoot = path.resolve(__dirname, '..');
const repositoryRoot = path.resolve(themeRoot, '..', '..');
const sourceRoots = [
    'themes/aether/assets/css',
    'themes/aether/layouts',
    'themes/aether/src',
    'layouts',
    'static',
];
const sourceExtensions = new Set(['.css', '.html', '.js', '.json', '.scss', '.toml']);
const legacyTokenPattern = /--color-[a-z0-9-]+/g;

function collectSourceFiles(directory) {
    if (!fs.existsSync(directory)) return [];

    return fs.readdirSync(directory, { withFileTypes: true })
        .sort((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const entryPath = path.join(directory, entry.name);
            if (entry.isDirectory()) return collectSourceFiles(entryPath);
            return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
        });
}

const files = sourceRoots.flatMap((sourceRoot) => collectSourceFiles(path.join(repositoryRoot, sourceRoot)));
const violations = [];

files.forEach((filePath) => {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
        const matches = line.match(legacyTokenPattern);
        if (!matches) return;
        matches.forEach((token) => {
            violations.push({
                filePath: path.relative(repositoryRoot, filePath),
                line: index + 1,
                token,
            });
        });
    });
});

if (violations.length > 0) {
    console.error('Legacy --color-* tokens are not allowed in theme source:');
    violations.forEach(({ filePath, line, token }) => {
        console.error(`- ${filePath}:${line} ${token}`);
    });
    process.exitCode = 1;
} else {
    console.log(`Token language check passed: ${files.length} source files scanned.`);
}
