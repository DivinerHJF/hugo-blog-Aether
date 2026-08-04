'use strict';

const fs = require('node:fs');
const path = require('node:path');

const themeRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(themeRoot, 'package.json'), 'utf8'));
const expectedPhotoSwipe = packageJson.config && packageJson.config.photoswipeVersion;
const libraryVersions = fs.readFileSync(path.join(themeRoot, 'assets', 'lib', 'VERSION'), 'utf8');
const photoSwipeEntry = libraryVersions
    .split(/\r?\n/)
    .find((line) => line.startsWith('photoswipe@'));
const actualPhotoSwipe = photoSwipeEntry && photoSwipeEntry.split(/\s+/)[0].slice('photoswipe@'.length);

if (!expectedPhotoSwipe || actualPhotoSwipe !== expectedPhotoSwipe) {
    throw new Error(
        `PhotoSwipe version mismatch: package.json expects ${expectedPhotoSwipe || '(unset)'}, `
        + `assets/lib/VERSION declares ${actualPhotoSwipe || '(unset)'}.`
    );
}

console.log(`Using PhotoSwipe ${actualPhotoSwipe}`);
