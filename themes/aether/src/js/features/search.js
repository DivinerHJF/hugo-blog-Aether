(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;

    function loadScriptAsset(asset, context) {
        if (!asset || !asset.src) return Promise.resolve();
        const existing = document.querySelector(`script[src="${asset.src}"]`);
        if (existing) {
            if (existing.dataset.loaded === 'true') return Promise.resolve();
            return new Promise((resolve, reject) => {
                existing.addEventListener('load', resolve, { once: true });
                existing.addEventListener('error', reject, { once: true });
                context.addCleanup(() => {
                    existing.removeEventListener('load', resolve);
                    existing.removeEventListener('error', reject);
                });
            });
        }
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = asset.src;
            script.async = false;
            if (asset.integrity) {
                script.integrity = asset.integrity;
                script.crossOrigin = asset.crossorigin || 'anonymous';
            } else if (asset.crossorigin) {
                script.crossOrigin = asset.crossorigin;
            }
            script.onload = () => {
                script.dataset.loaded = 'true';
                resolve();
            };
            script.onerror = reject;
            document.body.appendChild(script);
            context.addCleanup(() => {
                script.onload = null;
                script.onerror = null;
            });
        });
    }

    function loadSearchAssets(context, searchConfig) {
        const assets = context.config.searchAssets || {};
        const chain = [assets.autocomplete];
        if (searchConfig.type === 'lunr') chain.push(assets.lunr, assets.lunrStemmer, assets.lunrLanguage);
        if (searchConfig.type === 'algolia') chain.push(assets.algolia);
        if (searchConfig.type === 'fuse') chain.push(assets.fuse);
        return chain.filter(Boolean).reduce((promise, asset) => {
            return promise.then(() => loadScriptAsset(asset, context));
        }, Promise.resolve());
    }

    function createSearchResults(searchConfig, state, query, snippetLength, highlightTag, maxResultLength) {
        if (searchConfig.type === 'fuse') {
            if (!state.index) return [];
            const results = {};
            state.index.search(query).forEach(({ item, matches }) => {
                let title = item.title || '';
                let content = item.content || '';
                (matches || []).forEach(({ indices, key }) => {
                    if (!indices || !key) return;
                    const target = key === 'title' ? title : content;
                    let offset = 0;
                    indices.forEach(index => {
                        const substring = target.substring(index[0] + offset, index[1] + offset + 1);
                        const mark = `<${highlightTag}>${substring}</${highlightTag}>`;
                        if (key === 'title') title = title.substring(0, index[0] + offset) + mark + title.substring(index[1] + offset + 1);
                        else content = content.substring(0, index[0] + offset) + mark + content.substring(index[1] + offset + 1);
                        offset += mark.length - substring.length;
                    });
                });
                results[item.uri] = {
                    uri: item.uri,
                    title,
                    date: item.date,
                    context: content.substring(0, snippetLength),
                };
            });
            return Object.values(results).slice(0, maxResultLength);
        }

        if (searchConfig.type === 'algolia' && state.index) {
            return state.index.search(query, {
                offset: 0,
                length: maxResultLength * 8,
                attributesToHighlight: ['title'],
                attributesToSnippet: [`content:${snippetLength}`],
                highlightPreTag: `<${highlightTag}>`,
                highlightPostTag: `</${highlightTag}>`,
            }).then(({ hits }) => hits.map(hit => ({
                uri: hit.uri,
                title: hit._highlightResult.title.value,
                date: hit.date,
                context: hit._snippetResult.content.value,
            })).slice(0, maxResultLength));
        }

        if (searchConfig.type === 'lunr' && state.index) {
            const results = {};
            state.index.search(query).forEach(({ ref, matchData: { metadata } }) => {
                const matchData = state.indexData[ref];
                if (!matchData || results[matchData.uri]) return;
                let title = matchData.title;
                let content = matchData.content;
                Object.keys(metadata).forEach(key => {
                    title = title.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                    content = content.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                });
                results[matchData.uri] = { uri: matchData.uri, title, date: matchData.date, context: content.substring(0, snippetLength) };
            });
            return Object.values(results).slice(0, maxResultLength);
        }
        return [];
    }

    function initSearch(context) {
        const searchConfig = context.config.search;
        if (!searchConfig || searchConfig.enable === false) return utils.noop;
        const isMobile = utils.isMobileWindow();
        const suffix = isMobile ? 'mobile' : 'desktop';
        const header = document.getElementById(`header-${suffix}`);
        const input = document.getElementById(`search-input-${suffix}`);
        const toggle = document.getElementById(`search-toggle-${suffix}`);
        const loading = document.getElementById(`search-loading-${suffix}`);
        const clear = document.getElementById(`search-clear-${suffix}`);
        if (!input || !loading || !clear) return utils.noop;

        const maxResultLength = searchConfig.maxResultLength || 10;
        const snippetLength = searchConfig.snippetLength || 50;
        const highlightTag = searchConfig.highlightTag || 'em';
        const state = { instance: null, index: null, indexData: {}, promise: null, cancelled: false };
        context.state.search = state;
        const setValue = value => {
            if (state.instance && state.instance.autocomplete) state.instance.autocomplete.setVal(value);
        };
        const close = () => {
            if (header) header.classList.remove('open');
            loading.style.display = 'none';
            clear.style.display = 'none';
            setValue('');
        };
        const open = () => {
            document.body.classList.add('blur');
            if (header) header.classList.add('open');
            if (!isMobile) input.focus();
        };

        if (isMobile) {
            context.listen(input, 'focus', open);
            const cancel = document.getElementById('search-cancel-mobile');
            if (cancel) context.listen(cancel, 'click', () => { close(); document.body.classList.remove('blur'); });
        } else if (toggle) {
            context.listen(toggle, 'click', open);
        }
        context.listen(clear, 'click', () => { clear.style.display = 'none'; setValue(''); });
        context.listen(input, 'input', () => {
            clear.style.display = input.value === '' ? 'none' : 'inline';
        });
        context.events.mask.add(close);
        context.events.pjaxSend.add(close);

        const initializeIndex = data => {
            if (searchConfig.type === 'fuse' && typeof root.Fuse === 'function') {
                state.index = new root.Fuse(data, {
                    isCaseSensitive: !!searchConfig.isCaseSensitive,
                    findAllMatches: !!searchConfig.findAllMatches,
                    minMatchCharLength: searchConfig.minMatchCharLength || 1,
                    location: searchConfig.location || 0,
                    threshold: searchConfig.threshold === undefined ? .3 : searchConfig.threshold,
                    distance: searchConfig.distance || 100,
                    ignoreLocation: !!searchConfig.ignoreLocation,
                    useExtendedSearch: !!searchConfig.useExtendedSearch,
                    ignoreFieldNorm: !!searchConfig.ignoreFieldNorm,
                    includeScore: false,
                    shouldSort: true,
                    includeMatches: true,
                    keys: ['content', 'title'],
                });
            }
        };

        const initAutocomplete = () => {
            if (state.cancelled || typeof root.autocomplete !== 'function') return;
            const instance = root.autocomplete(`#search-input-${suffix}`, {
                hint: false,
                autoselect: true,
                dropdownMenuContainer: `#search-dropdown-${suffix}`,
                clearOnSelected: true,
                cssClasses: { noPrefix: true },
                debug: true,
            }, {
                name: 'search',
                source: (query, callback) => {
                    loading.style.display = 'inline';
                    clear.style.display = 'none';
                    const finish = results => {
                        loading.style.display = 'none';
                        clear.style.display = 'inline';
                        callback(results);
                    };
                    const result = createSearchResults(searchConfig, state, query, snippetLength, highlightTag, maxResultLength);
                    if (result && typeof result.then === 'function') result.then(finish).catch(error => { console.error(error); finish([]); });
                    else finish(result);
                },
                templates: {
                    suggestion: ({ title, date, context: snippet }) => `<div><span class="suggestion-title">${title}</span><span class="suggestion-date">${date}</span></div><div class="suggestion-context">${snippet}</div>`,
                    empty: ({ query }) => `<div class="search-empty">${searchConfig.noResultsFound || 'No results'}: <span class="search-query">"${query}"</span></div>`,
                    footer: () => '<div class="search-footer">Search by <a href="https://fusejs.io/" rel="noopener noreffer" target="_blank">Fuse.js</a></div>',
                },
            });
            state.instance = instance;
            instance.on('autocomplete:selected', (_event, suggestion) => root.location.assign(suggestion.uri));
        };

        const ensure = () => {
            if (state.promise) return state.promise;
            loading.style.display = 'inline';
            state.promise = loadSearchAssets(context, searchConfig)
                .then(() => {
                    if (state.cancelled) return;
                    if (searchConfig.type === 'fuse' && searchConfig.fuseIndexURL) {
                        return fetch(searchConfig.fuseIndexURL).then(response => response.json()).then(data => initializeIndex(data));
                    }
                    if (searchConfig.type === 'lunr' && searchConfig.lunrIndexURL) {
                        return fetch(searchConfig.lunrIndexURL).then(response => response.json()).then(data => {
                            if (typeof root.lunr !== 'function') return;
                            const indexData = {};
                            state.index = root.lunr(function () {
                                this.ref('objectID');
                                this.field('title', { boost: 50 });
                                this.field('tags', { boost: 20 });
                                this.field('categories', { boost: 20 });
                                this.field('content', { boost: 10 });
                                this.metadataWhitelist = ['position'];
                                data.forEach(record => { indexData[record.objectID] = record; this.add(record); });
                            });
                            state.indexData = indexData;
                        });
                    }
                    if (searchConfig.type === 'algolia' && root.algoliasearch) {
                        state.index = root.algoliasearch(searchConfig.algoliaAppID, searchConfig.algoliaSearchKey).initIndex(searchConfig.algoliaIndex);
                    }
                })
                .then(initAutocomplete)
                .then(() => { loading.style.display = 'none'; })
                .catch(error => {
                    if (!state.cancelled) console.error(error);
                    loading.style.display = 'none';
                    state.promise = null;
                });
            return state.promise;
        };

        context.listen(input, 'focus', ensure);
        context.listen(input, 'input', ensure);
        if (toggle) context.listen(toggle, 'click', ensure);

        return () => {
            state.cancelled = true;
            if (state.instance && typeof state.instance.destroy === 'function') state.instance.destroy();
            state.instance = null;
            context.events.mask.delete(close);
            context.events.pjaxSend.delete(close);
        };
    }

    modules.search = {
        name: 'search',
        init: initSearch,
    };
})(window);
