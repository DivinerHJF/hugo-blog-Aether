'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const expectedVersion = fs.readFileSync(path.join(repositoryRoot, '.hugo-version'), 'utf8').trim();
const hugoCommand = process.platform === 'win32' ? 'hugo.exe' : 'hugo';
const result = spawnSync(hugoCommand, ['version'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
});
const output = `${result.stdout || ''}\n${result.stderr || ''}`;
const versionMatch = output.match(/\bv(\d+\.\d+\.\d+)/);
const actualVersion = versionMatch && versionMatch[1];

if (result.error || !actualVersion || actualVersion !== expectedVersion) {
    const reason = result.error ? result.error.message : `found ${actualVersion || 'unknown'}`;
    throw new Error(`Hugo version mismatch: expected ${expectedVersion}, ${reason}.`);
}

console.log(`Using Hugo ${actualVersion}`);
