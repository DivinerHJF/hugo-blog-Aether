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
    'features/navigation.js',
    'features/search/engine.js',
    'features/search/text-highlight.js',
    'features/search/results.js',
    'features/search/dialog.js',
    'features/search/landing.js',
    'features/search/index.js',
    'features/photoswipe.js',
    'features/content-image-viewer.js',
    'features/content-enhancements.js',
    'features/article-navigation.js',
    'features/toc.js',
    'features/comments.js',
    'features/integrations.js',
    'features/tag-explorer.js',
    'features/footprint-gallery.js',
    'core/lifecycle.js',
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

const workerSourceFile = path.join(sourceRoot, 'features', 'search', 'worker.js');
const workerOutputFile = path.join(themeRoot, 'assets', 'js', 'search-worker.min.js');
const workerSourceMapFile = `${workerOutputFile}.map`;
const workerResult = babel.transformSync(fs.readFileSync(workerSourceFile, 'utf8'), {
    configFile: path.join(themeRoot, '.babelrc'),
    filename: workerSourceFile,
    sourceMaps: true,
    sourceFileName: '../../src/js/features/search/worker.js',
    comments: false,
});

fs.writeFileSync(workerOutputFile, workerResult.code);
fs.writeFileSync(workerSourceMapFile, JSON.stringify(workerResult.map));
