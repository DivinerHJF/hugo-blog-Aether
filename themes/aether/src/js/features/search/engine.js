(function (root) {
    'use strict';

    const Aether = root.Aether;
    const noop = Aether.utils.noop;

    function getAssetURL(assets, name) {
        const asset = assets && assets[name];
        return asset && asset.src ? asset.src : '';
    }

    function getRuntimeConfig(config) {
        const search = config.search || {};
        const assets = config.searchAssets || {};
        const fuse = search.fuse || {};
        return {
            indexURL: search.fuseIndexURL || '',
            workerURL: getAssetURL(assets, 'worker'),
            fuseURL: getAssetURL(assets, 'fuse'),
            maxResults: Number(search.maxResults) || 8,
            debounce: Number(search.debounce) || 100,
            minQueryLength: Number(search.minQueryLength) || 1,
            fuse,
        };
    }

    function createSearchEngine(config) {
        const runtime = getRuntimeConfig(config);
        const signature = [runtime.indexURL, runtime.workerURL, runtime.fuseURL].join('|');
        let worker = null;
        let state = 'idle';
        let readyPromise = null;
        let rejectReady = null;
        let idleHandle = null;
        let requestNumber = 0;
        const pending = new Map();

        function rejectPending(error) {
            pending.forEach(request => request.reject(error));
            pending.clear();
        }

        function fail(error) {
            state = 'failed';
            rejectPending(error);
            if (rejectReady) {
                const reject = rejectReady;
                rejectReady = null;
                reject(error);
            }
            if (worker) worker.terminate();
            worker = null;
        }

        function handleMessage(event) {
            const message = event.data || {};
            if (message.type === 'ready') {
                state = 'ready';
                return;
            }
            if (message.type === 'error') {
                fail(new Error(message.message || 'Unable to initialize search.'));
                return;
            }
            if (message.type === 'results' || message.type === 'query-error') {
                const request = pending.get(message.requestId);
                if (!request) return;
                pending.delete(message.requestId);
                if (message.type === 'query-error') request.reject(new Error(message.message || 'Unable to search.'));
                else request.resolve(message.results || []);
            }
        }

        function preload() {
            if (state === 'ready') return Promise.resolve();
            if (state === 'loading' && readyPromise) return readyPromise;
            if (state === 'failed') return Promise.reject(new Error('Search is unavailable.'));
            if (!runtime.indexURL || !runtime.workerURL || !runtime.fuseURL || typeof root.Worker !== 'function') {
                const error = new Error('Search assets are unavailable.');
                fail(error);
                return Promise.reject(error);
            }

            state = 'loading';
            try {
                worker = new root.Worker(runtime.workerURL);
                worker.addEventListener('message', handleMessage);
                worker.addEventListener('error', event => {
                    fail(event.error || new Error(event.message || 'Search worker failed.'));
                });
                readyPromise = new Promise((resolve, reject) => {
                    rejectReady = reject;
                    const onReady = event => {
                        if ((event.data || {}).type !== 'ready') return;
                        worker.removeEventListener('message', onReady);
                        rejectReady = null;
                        resolve();
                    };
                    const onError = event => {
                        worker.removeEventListener('message', onReady);
                        rejectReady = null;
                        reject(event.error || new Error(event.message || 'Search worker failed.'));
                    };
                    worker.addEventListener('message', onReady);
                    worker.addEventListener('error', onError, { once: true });
                });
                worker.postMessage({
                    type: 'init',
                    indexURL: runtime.indexURL,
                    fuseURL: runtime.fuseURL,
                    options: runtime.fuse,
                });
                readyPromise = readyPromise.catch(error => {
                    fail(error);
                    throw error;
                });
                return readyPromise;
            } catch (error) {
                fail(error);
                return Promise.reject(error);
            }
        }

        function scheduleWarmup() {
            if (state !== 'idle' || idleHandle !== null) return;
            const start = () => {
                idleHandle = null;
                preload().catch(noop);
            };
            if (typeof root.requestIdleCallback === 'function') {
                idleHandle = root.requestIdleCallback(start, { timeout: 2000 });
            } else {
                idleHandle = root.setTimeout(start, 800);
            }
        }

        function search(query) {
            const value = (query || '').trim();
            if (!value) return Promise.resolve([]);
            return preload().then(() => new Promise((resolve, reject) => {
                const requestId = ++requestNumber;
                pending.set(requestId, { resolve, reject });
                worker.postMessage({
                    type: 'search',
                    requestId,
                    query: value,
                    limit: Math.max(50, runtime.maxResults * 8),
                });
            }));
        }

        function destroy() {
            if (idleHandle !== null) {
                if (typeof root.cancelIdleCallback === 'function' && typeof idleHandle === 'number') root.cancelIdleCallback(idleHandle);
                else root.clearTimeout(idleHandle);
                idleHandle = null;
            }
            const error = new Error('Search engine destroyed.');
            rejectPending(error);
            if (rejectReady) {
                const reject = rejectReady;
                rejectReady = null;
                reject(error);
            }
            if (worker) worker.terminate();
            worker = null;
            state = 'idle';
            readyPromise = null;
        }

        return {
            signature,
            config: runtime,
            preload,
            scheduleWarmup,
            search,
            destroy,
            get state() { return state; },
        };
    }

    Aether.getSearchEngine = function (config) {
        const runtime = getRuntimeConfig(config);
        const signature = [runtime.indexURL, runtime.workerURL, runtime.fuseURL].join('|');
        if (Aether.searchEngine && Aether.searchEngine.signature === signature) return Aether.searchEngine;
        if (Aether.searchEngine && typeof Aether.searchEngine.destroy === 'function') Aether.searchEngine.destroy();
        Aether.searchEngine = createSearchEngine(config);
        return Aether.searchEngine;
    };
})(window);
