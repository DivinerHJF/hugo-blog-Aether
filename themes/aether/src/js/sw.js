const CACHE_VERSION = 3;

const BASE_CACHE_FILES = [
    '/site.webmanifest',
];

const OFFLINE_CACHE_FILES = [
    '/site.webmanifest',
    '/404.html',
];

const NOT_FOUND_CACHE_FILES = [
    '/site.webmanifest',
    '/404.html',
];

const OFFLINE_PAGE = '/404.html';
const NOT_FOUND_PAGE = '/404.html';

const CACHE_VERSIONS = {
    assets: 'assets-v' + CACHE_VERSION,
    content: 'content-v' + CACHE_VERSION,
    offline: 'offline-v' + CACHE_VERSION,
    notFound: '404-v' + CACHE_VERSION,
};

const CACHE_BLACKLIST = [
    (url) => {
        const parsedUrl = new URL(url);
        return parsedUrl.origin !== self.location.origin;
    },
];

const SUPPORTED_METHODS = [
    'GET',
];

/**
 * isBlackListed
 * @param {string} url
 * @returns {boolean}
 */
function isBlacklisted(url) {
    return (CACHE_BLACKLIST.length > 0) ? !CACHE_BLACKLIST.filter((rule) => {
        if (typeof rule === 'function') {
            return !rule(url);
        } else {
            return false;
        }
    }).length : false
}

/**
 * installServiceWorker
 * @returns {Promise}
 */
function installServiceWorker() {
    return Promise.all(
        [
            caches.open(CACHE_VERSIONS.assets)
                .then(
                    (cache) => {
                        return cache.addAll(BASE_CACHE_FILES);
                    }
                ),
            caches.open(CACHE_VERSIONS.offline)
                .then(
                    (cache) => {
                        return cache.addAll(OFFLINE_CACHE_FILES);
                    }
                ),
            caches.open(CACHE_VERSIONS.notFound)
                .then(
                    (cache) => {
                        return cache.addAll(NOT_FOUND_CACHE_FILES);
                    }
                )
        ]
    )
        .then(() => {
            return self.skipWaiting();
        });
}

/**
 * cleanupLegacyCache
 * @returns {Promise}
 */
function cleanupLegacyCache() {

    const currentCaches = Object.keys(CACHE_VERSIONS)
        .map(
            (key) => {
                return CACHE_VERSIONS[key];
            }
        );

    return caches.keys()
        .then(
            (keys) => {
                return Promise.all(
                    keys
                        .filter(
                            (key) => {
                                return !currentCaches.includes(key);
                            }
                        )
                        .map(
                            (legacyKey) => {
                                return caches.delete(legacyKey);
                            }
                        )
                );
            }
        );
}

self.addEventListener(
    'install', event => {
        event.waitUntil(
            Promise.all([
                installServiceWorker(),
                self.skipWaiting(),
            ])
        );
    }
);

// The activate handler takes care of cleaning up old caches.
self.addEventListener(
    'activate', event => {
        event.waitUntil(
            Promise.all(
                [
                    cleanupLegacyCache(),
                    self.clients.claim(),
                    self.skipWaiting(),
                ]
            )
                .catch(
                    (err) => {
                        self.skipWaiting();
                    }
                )
        );
    }
);

self.addEventListener(
    'fetch', event => {

        if (!SUPPORTED_METHODS.includes(event.request.method) || !event.request.url.startsWith('http') || isBlacklisted(event.request.url)) {
            return;
        }

        event.respondWith(
            caches.open(CACHE_VERSIONS.content)
                .then(
                    (cache) => {
                        return fetch(event.request.clone())
                            .then(
                                (response) => {
                                    if (response.status < 400) {
                                        cache.put(event.request, response.clone());
                                        return response;
                                    }

                                    return caches.open(CACHE_VERSIONS.notFound)
                                        .then(
                                            (notFoundCache) => {
                                                return notFoundCache.match(NOT_FOUND_PAGE);
                                            }
                                        )
                                        .then(
                                            (notFoundResponse) => {
                                                return notFoundResponse || response;
                                            }
                                        );
                                }
                            )
                            .catch(
                                () => {
                                    return cache.match(event.request)
                                        .then(
                                            (cachedResponse) => {
                                                if (cachedResponse) {
                                                    return cachedResponse;
                                                }

                                                return caches.open(CACHE_VERSIONS.offline)
                                                    .then(
                                                        (offlineCache) => {
                                                            return offlineCache.match(OFFLINE_PAGE);
                                                        }
                                                    );
                                            }
                                        );
                                }
                            );
                    }
                )
                .catch(
                    (error) => {
                        console.error('  Error in fetch handler:', error);
                        throw error;
                    }
                )
        );

    }
);
