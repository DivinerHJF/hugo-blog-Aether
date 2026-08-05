(function () {
    'use strict';

    const scope = self;
    let fuse = null;
    let initializePromise = null;

    function post(type, payload) {
        scope.postMessage(Object.assign({ type }, payload || {}));
    }

    function readIndex(indexURL) {
        return fetch(indexURL, { credentials: 'same-origin' }).then(response => {
            if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
            return response.json();
        }).then(data => {
            if (Array.isArray(data)) return data;
            if (data && Array.isArray(data.records)) return data.records;
            throw new Error('Search index has an unexpected format.');
        });
    }

    function initialize(message) {
        if (initializePromise) return initializePromise;

        // Start the index request before loading Fuse. The browser can make
        // progress on both resources while the worker prepares the engine.
        const indexPromise = readIndex(message.indexURL);
        let fuseError = null;
        try {
            importScripts(message.fuseURL);
        } catch (error) {
            fuseError = error;
        }

        initializePromise = indexPromise.then(records => {
            if (fuseError) throw fuseError;
            if (typeof scope.Fuse !== 'function') throw new Error('Fuse.js is unavailable in the search worker.');

            const options = message.options || {};
            fuse = new scope.Fuse(records, {
                includeMatches: true,
                includeScore: true,
                shouldSort: true,
                keys: [
                    { name: 'title', weight: 8 },
                    { name: 'heading', weight: 6 },
                    { name: 'tags', weight: 5 },
                    { name: 'categories', weight: 4 },
                    { name: 'series', weight: 4 },
                    { name: 'text', weight: 1 },
                ],
                threshold: options.threshold === undefined ? 0.3 : options.threshold,
                minMatchCharLength: options.minMatchCharLength || 1,
                isCaseSensitive: !!options.isCaseSensitive,
                ignoreLocation: options.ignoreLocation !== false,
                ignoreFieldNorm: !!options.ignoreFieldNorm,
                findAllMatches: true,
            });
            post('ready');
            return true;
        }).catch(error => {
            post('error', { message: error && error.message ? error.message : 'Unable to initialize search.' });
            throw error;
        });

        return initializePromise;
    }

    scope.addEventListener('message', event => {
        const message = event.data || {};
        if (message.type === 'init') {
            initialize(message).catch(() => {});
            return;
        }

        if (message.type !== 'search' || !fuse) return;
        try {
            const results = fuse.search(message.query || '', { limit: message.limit || 100 });
            post('results', { requestId: message.requestId, results });
        } catch (error) {
            post('query-error', {
                requestId: message.requestId,
                message: error && error.message ? error.message : 'Unable to search.',
            });
        }
    });
})();
