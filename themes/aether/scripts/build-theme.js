'use strict';

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const themeRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(themeRoot, 'src', 'js');
const outputFile = path.join(themeRoot, 'assets', 'js', 'theme.min.js');
const sourceMapFile = `${outputFile}.map`;
const modules = [
    'core/events.js',
    'core/config.js',
    'core/lifecycle.js',
    'features/tag-explorer.js',
    'features/footprint-gallery.js',
    'core/pjax.js',
    'theme.js',
];

const source = modules.map(file => {
    const absolute = path.join(sourceRoot, file);
    return `/* ${file} */\n${fs.readFileSync(absolute, 'utf8')}`;
}).join('\n\n');

const result = babel.transformSync(source, {
    configFile: path.join(themeRoot, '.babelrc'),
    filename: path.join(sourceRoot, 'theme.js'),
    sourceMaps: true,
    sourceFileName: '../../src/js/theme.js',
    comments: false,
});

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, result.code);
fs.writeFileSync(sourceMapFile, JSON.stringify(result.map));
