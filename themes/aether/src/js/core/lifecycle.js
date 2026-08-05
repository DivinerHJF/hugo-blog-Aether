(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const forEach = utils.forEach;

    function initObjectFit(context) {
        if (context.config.compatibility && context.config.compatibility.objectFit && root.objectFitImages) {
            root.objectFitImages();
        }
        return utils.noop;
    }

    function initSVGIcon(context) {
        const controllers = [];
        forEach(context.root.querySelectorAll('[data-svg-src]'), icon => {
            const controller = root.AbortController ? new root.AbortController() : null;
            if (controller) controllers.push(controller);
            fetch(icon.getAttribute('data-svg-src'), controller ? { signal: controller.signal } : undefined)
                .then(response => response.text())
                .then(svg => {
                    if (context.destroyed || !icon.parentElement) return;
                    const temp = document.createElement('div');
                    temp.insertAdjacentHTML('afterbegin', svg);
                    const svgElement = temp.firstChild;
                    if (!svgElement) return;
                    svgElement.setAttribute('data-svg-src', icon.getAttribute('data-svg-src'));
                    svgElement.classList.add('icon');
                    const titles = svgElement.getElementsByTagName('title');
                    if (titles.length) svgElement.removeChild(titles[0]);
                    icon.parentElement.replaceChild(svgElement, icon);
                })
                .catch(error => {
                    if (!context.destroyed && error.name !== 'AbortError') console.error(error);
                });
        });
        return () => controllers.forEach(controller => controller.abort());
    }

    function initTwemoji(context) {
        if (context.config.twemoji && root.twemoji) root.twemoji.parse(document.body);
        return utils.noop;
    }

    function initMenuMobile(context) {
        const toggle = document.getElementById('menu-toggle-mobile');
        const menu = document.getElementById('menu-mobile');
        if (!toggle || !menu) return utils.noop;
        const onClick = () => {
            document.body.classList.toggle('blur');
            toggle.classList.toggle('active');
            menu.classList.toggle('active');
        };
        const close = () => {
            toggle.classList.remove('active');
            menu.classList.remove('active');
        };
        context.listen(toggle, 'click', onClick);
        context.events.mask.add(close);
        return () => context.events.mask.delete(close);
    }

    function emitTheme(context, theme) {
        document.body.setAttribute('theme', theme);
        if (root.localStorage) root.localStorage.setItem('theme', theme);
        context.state.isDark = theme !== 'light';
        context.emit(context.events.theme);
    }

    function initSwitchTheme(context) {
        forEach(document.getElementsByClassName('theme-switch'), themeSwitch => {
            context.listen(themeSwitch, 'click', () => {
                const currentTheme = document.body.getAttribute('theme');
                emitTheme(context, currentTheme === 'dark' ? 'black' : (currentTheme === 'black' ? 'light' : 'dark'));
            });
        });
        return utils.noop;
    }

    function initSelectTheme(context) {
        forEach(document.getElementsByClassName('color-theme-select'), select => {
            const currentTheme = document.body.getAttribute('theme');
            Array.from(select.options || []).some((option, index) => {
                if (option.value === currentTheme) {
                    select.selectedIndex = index;
                    return true;
                }
                return false;
            });
            context.listen(select, 'change', () => {
                let theme = select.value;
                if (theme === 'auto') {
                    theme = root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                emitTheme(context, theme);
            });
        });
        return utils.noop;
    }

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

    function createSearchResults(context, searchConfig, state, query, snippetLength, highlightTag, maxResultLength) {
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
                    let result = createSearchResults(context, searchConfig, state, query, snippetLength, highlightTag, maxResultLength);
                    if (result && typeof result.then === 'function') result.then(finish).catch(error => { console.error(error); finish([]); });
                    else finish(result);
                },
                templates: {
                    suggestion: ({ title, date, context: snippet }) => `<div><span class="suggestion-title">${title}</span><span class="suggestion-date">${date}</span></div><div class="suggestion-context">${snippet}</div>`,
                    empty: ({ query }) => `<div class="search-empty">${searchConfig.noResultsFound || 'No results'}: <span class="search-query">"${query}"</span></div>`,
                    footer: () => `<div class="search-footer">Search by <a href="https://fusejs.io/" rel="noopener noreffer" target="_blank">Fuse.js</a></div>`,
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

    function initDetails(context) {
        forEach(document.getElementsByClassName('details'), details => {
            const summary = details.getElementsByClassName('details-summary')[0];
            if (summary) context.listen(summary, 'click', () => details.classList.toggle('open'));
        });
        return utils.noop;
    }

    function initLightGallery(context) {
        if (!context.config.lightGallery || typeof root.lightGallery !== 'function') return utils.noop;
        const content = document.getElementById('content');
        if (!content) return utils.noop;
        const instance = root.lightGallery(content, context.config.lightGallery);
        return () => { if (instance && typeof instance.destroy === 'function') instance.destroy(true); };
    }

    function initHighlight(context) {
        forEach(document.querySelectorAll('.highlight > pre.chroma'), pre => {
            const chroma = document.createElement('div');
            chroma.className = pre.className;
            const table = document.createElement('table');
            const tbody = document.createElement('tbody');
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            table.appendChild(tbody);
            tbody.appendChild(row);
            row.appendChild(cell);
            chroma.appendChild(table);
            pre.parentElement.replaceChild(chroma, pre);
            cell.appendChild(pre);
        });
        forEach(document.querySelectorAll('.highlight > .chroma'), chroma => {
            if (chroma.dataset.aetherReady === 'true') return;
            const codeElements = chroma.querySelectorAll('pre.chroma > code');
            if (!codeElements.length) return;
            const code = codeElements[codeElements.length - 1];
            const header = document.createElement('div');
            header.className = `code-header ${code.className.toLowerCase()}`;
            const title = document.createElement('span');
            title.className = 'code-title';
            title.insertAdjacentHTML('afterbegin', '<i class="arrow fas fa-chevron-right fa-fw"></i>');
            context.listen(title, 'click', () => chroma.classList.toggle('open'));
            header.appendChild(title);
            const ellipses = document.createElement('span');
            ellipses.className = 'ellipses';
            ellipses.insertAdjacentHTML('afterbegin', '<i class="fas fa-ellipsis-h fa-fw"></i>');
            context.listen(ellipses, 'click', () => chroma.classList.add('open'));
            header.appendChild(ellipses);
            if (context.config.code && context.config.code.copyTitle && root.ClipboardJS) {
                const copy = document.createElement('span');
                copy.className = 'copy';
                copy.insertAdjacentHTML('afterbegin', '<i class="far fa-copy fa-fw"></i>');
                const text = code.innerText;
                copy.setAttribute('data-clipboard-text', text);
                copy.title = context.config.code.copyTitle;
                const clipboard = new root.ClipboardJS(copy);
                clipboard.on('success', () => {
                    copy.firstElementChild.className = 'fas fa-check fa-fw';
                    root.setTimeout(() => { if (copy.firstElementChild) copy.firstElementChild.className = 'far fa-copy fa-fw'; }, 3000);
                });
                context.addCleanup(() => { if (typeof clipboard.destroy === 'function') clipboard.destroy(); });
                header.appendChild(copy);
            }
            if (!context.config.code || context.config.code.maxShownLines < 0 || code.innerText.split('\n').length < context.config.code.maxShownLines + 2) chroma.classList.add('open');
            chroma.insertBefore(header, chroma.firstChild);
            chroma.dataset.aetherReady = 'true';
        });
        return utils.noop;
    }

    function initTable(context) {
        forEach(document.querySelectorAll('.content table'), table => {
            if (table.parentElement && table.parentElement.classList.contains('table-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentElement.replaceChild(wrapper, table);
            wrapper.appendChild(table);
        });
        return utils.noop;
    }

    function initHeaderLink(context) {
        for (let level = 1; level <= 6; level++) {
            forEach(document.querySelectorAll(`.single .content > h${level}`), header => {
                header.classList.add('headerLink');
                if (!header.querySelector('.header-mark')) header.insertAdjacentHTML('afterbegin', `<a href="#${header.id}" class="header-mark"></a>`);
            });
        }
        return utils.noop;
    }

    function initToc(context) {
        const tocCore = document.getElementById('TableOfContents');
        const staticContainer = document.getElementById('toc-content-static');
        const autoContainer = document.getElementById('toc-content-auto');
        const toc = document.getElementById('toc-auto');
        const page = document.getElementsByClassName('page')[0];
        if (!tocCore || !staticContainer || !autoContainer || !toc || !page) return utils.noop;
        const tocStatic = document.getElementById('toc-static');
        let layout = null;

        const resetAutoStyles = () => {
            toc.style.left = '';
            toc.style.maxWidth = '';
            toc.style.visibility = '';
            toc.style.position = '';
            toc.style.top = '';
        };

        const prepareAutoLayout = () => {
            toc.style.position = 'absolute';
            toc.style.top = '';
            const rect = page.getBoundingClientRect();
            toc.style.left = `${rect.left + rect.width + 24}px`;
            toc.style.maxWidth = '15rem';
            toc.style.visibility = 'visible';

            const header = document.getElementById('header-desktop');
            const headerIsFixed = document.body.getAttribute('header-desktop') !== 'normal';
            const headerHeight = header ? header.offsetHeight : 0;
            const topSpacing = 20 + (headerIsFixed ? headerHeight : 0);
            const minTocTop = toc.offsetTop;

            layout = {
                headerIsFixed,
                headerHeight,
                topSpacing,
                minTocTop,
                minScrollTop: minTocTop - topSpacing + (headerIsFixed ? 0 : headerHeight),
            };
        };

        const moveToc = () => {
            const shouldBeStatic = (tocStatic && tocStatic.getAttribute('kept') === 'true') || utils.isTocStatic();
            const container = shouldBeStatic ? staticContainer : autoContainer;
            if (tocCore.parentElement !== container) container.appendChild(tocCore);
            if (shouldBeStatic) {
                layout = null;
                resetAutoStyles();
                return true;
            }
            if (!layout) prepareAutoLayout();
            return false;
        };

        const update = () => {
            if (moveToc()) return;

            if (!layout) return;
            const scrollTop = utils.getScrollTop();
            if (scrollTop < layout.minScrollTop) {
                toc.style.position = 'absolute';
                toc.style.top = `${layout.minTocTop}px`;
            } else {
                toc.style.position = 'fixed';
                toc.style.top = `${layout.topSpacing}px`;
            }

            const links = Array.from(tocCore.querySelectorAll('a:first-child'));
            const headers = Array.from(document.getElementsByClassName('headerLink'));
            const items = Array.from(tocCore.getElementsByTagName('li'));
            links.forEach(link => link.classList.remove('active'));
            items.forEach(item => item.classList.remove('has-active'));
            if (!links.length || !headers.length) return;

            const indexSpacing = 20 + (layout.headerIsFixed ? layout.headerHeight : 0);
            let active = headers.length - 1;
            for (let index = 0; index < headers.length - 1; index += 1) {
                const headerTop = headers[index].getBoundingClientRect().top;
                const nextHeaderTop = headers[index + 1].getBoundingClientRect().top;
                if ((index === 0 && headerTop > indexSpacing)
                    || (headerTop <= indexSpacing && nextHeaderTop > indexSpacing)) {
                    active = index;
                    break;
                }
            }

            if (active >= 0 && active < links.length) {
                links[active].classList.add('active');
                let parent = links[active].parentElement;
                while (parent && parent !== tocCore) {
                    parent.classList.add('has-active');
                    parent = parent.parentElement && parent.parentElement.parentElement;
                }
            }
        };

        const handleResize = () => {
            layout = null;
            update();
        };

        context.state.tocRefresh = update;
        context.events.scroll.add(update);
        context.events.resize.add(handleResize);
        update();
        return () => {
            context.events.scroll.delete(update);
            context.events.resize.delete(handleResize);
            if (context.state.tocRefresh === update) delete context.state.tocRefresh;
            resetAutoStyles();
        };
    }

    function initMath(context) {
        if (context.config.math && root.renderMathInElement) root.renderMathInElement(document.body, context.config.math);
        return utils.noop;
    }

    function initMermaid(context) {
        if (!context.config.mermaid || !root.mermaid) return utils.noop;
        const elements = document.getElementsByClassName('mermaid');
        if (!elements.length) return utils.noop;
        root.mermaid.initialize({ startOnLoad: false, theme: 'default' });
        forEach(elements, element => {
            if (element.dataset.aetherReady === 'true') return;
            const source = context.data[element.id];
            if (!source) return;
            root.mermaid.mermaidAPI.render(`svg-${element.id}`, source, svgCode => {
                if (context.destroyed || element.dataset.aetherReady === 'true') return;
                element.insertAdjacentHTML('afterbegin', svgCode);
                const svg = document.getElementById(`svg-${element.id}`);
                if (svg && svg.children[0]) svg.children[0].remove();
                element.dataset.aetherReady = 'true';
            }, element);
        });
        return utils.noop;
    }

    function initEcharts(context) {
        if (!context.config.echarts || !root.echarts) return utils.noop;
        const state = { charts: [] };
        const render = () => {
            state.charts.forEach(chart => chart.dispose());
            state.charts = [];
            forEach(document.getElementsByClassName('echarts'), element => {
                if (!context.data[element.id]) return;
                const chart = root.echarts.init(element, context.state.isDark ? 'dark' : 'macarons', { renderer: 'svg' });
                chart.setOption(JSON.parse(context.data[element.id]));
                state.charts.push(chart);
            });
        };
        const resize = () => state.charts.forEach(chart => chart.resize());
        context.events.theme.add(render);
        context.events.resize.add(resize);
        render();
        return () => {
            context.events.theme.delete(render);
            context.events.resize.delete(resize);
            state.charts.forEach(chart => chart.dispose());
            state.charts = [];
        };
    }

    function initMapbox(context) {
        if (!context.config.mapbox || !root.mapboxgl) return utils.noop;
        root.mapboxgl.accessToken = context.config.mapbox.accessToken;
        if (context.config.mapbox.RTLTextPlugin && root.mapboxgl.setRTLTextPlugin) root.mapboxgl.setRTLTextPlugin(context.config.mapbox.RTLTextPlugin);
        const state = { maps: [] };
        forEach(document.getElementsByClassName('mapbox'), element => {
            const data = context.data[element.id];
            if (!data) return;
            const map = new root.mapboxgl.Map({
                container: element,
                center: [data.lng, data.lat],
                zoom: data.zoom,
                minZoom: .2,
                style: context.state.isDark ? data.darkStyle : data.lightStyle,
                attributionControl: false,
            });
            if (data.marked) new root.mapboxgl.Marker().setLngLat([data.lng, data.lat]).addTo(map);
            if (data.navigation) map.addControl(new root.mapboxgl.NavigationControl(), 'bottom-right');
            if (data.geolocate) map.addControl(new root.mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, showUserLocation: true, trackUserLocation: true }), 'bottom-right');
            if (data.scale) map.addControl(new root.mapboxgl.ScaleControl());
            if (data.fullscreen) map.addControl(new root.mapboxgl.FullscreenControl());
            if (root.MapboxLanguage) map.addControl(new root.MapboxLanguage());
            state.maps.push({ map, data });
        });
        const updateTheme = () => state.maps.forEach(({ map, data }) => map.setStyle(context.state.isDark ? data.darkStyle : data.lightStyle));
        context.events.theme.add(updateTheme);
        return () => {
            context.events.theme.delete(updateTheme);
            state.maps.forEach(({ map }) => { if (typeof map.remove === 'function') map.remove(); });
            state.maps = [];
        };
    }

    function initTypeit(context) {
        if (!context.config.typeit || typeof root.TypeIt !== 'function') return utils.noop;
        const config = context.config.typeit;
        const instances = [];
        const timers = [];
        Object.values(config.data || {}).forEach(group => {
            const typeone = index => {
                if (context.destroyed || !group[index]) return;
                const instance = new root.TypeIt(`#${group[index]}`, {
                    strings: context.data[group[index]],
                    speed: config.speed || 100,
                    lifeLike: true,
                    cursorSpeed: config.cursorSpeed || 1000,
                    cursorChar: config.cursorChar || '|',
                    waitUntilVisible: true,
                    afterComplete: () => {
                        if (index === group.length - 1) {
                            if (config.duration >= 0) timers.push(root.setTimeout(() => instance.destroy(), config.duration));
                            return;
                        }
                        instance.destroy();
                        typeone(index + 1);
                    },
                }).go();
                instances.push(instance);
            };
            typeone(0);
        });
        return () => {
            timers.forEach(timer => root.clearTimeout(timer));
            instances.forEach(instance => { if (instance && typeof instance.destroy === 'function') instance.destroy(); });
        };
    }

    function initComment(context) {
        const config = context.config.comment;
        if (!config) return utils.noop;
        if (config.gitalk && typeof root.Gitalk === 'function') {
            config.gitalk.body = decodeURI(root.location.href);
            const gitalk = new root.Gitalk(config.gitalk);
            gitalk.render('gitalk');
        }
        if (config.valine && typeof root.Valine === 'function') new root.Valine(config.valine);
        if (config.waline && typeof root.Waline === 'function') new root.Waline(config.waline);
        if (config.twikoo && root.twikoo) root.twikoo.init(config.twikoo);
        if (config.utterances) {
            const container = document.getElementById('utterances');
            if (container && !container.querySelector('script')) {
                const script = document.createElement('script');
                script.src = 'https://utteranc.es/client.js';
                script.async = true;
                script.crossOrigin = 'anonymous';
                script.setAttribute('repo', config.utterances.repo);
                script.setAttribute('issue-term', config.utterances.issueTerm);
                if (config.utterances.label) script.setAttribute('label', config.utterances.label);
                script.setAttribute('theme', context.state.isDark ? config.utterances.darkTheme : config.utterances.lightTheme);
                container.appendChild(script);
                const updateTheme = () => {
                    const iframe = container.querySelector('.utterances-frame');
                    if (iframe) iframe.contentWindow.postMessage({ type: 'set-theme', theme: context.state.isDark ? config.utterances.darkTheme : config.utterances.lightTheme }, 'https://utteranc.es');
                };
                context.events.theme.add(updateTheme);
                context.addCleanup(() => context.events.theme.delete(updateTheme));
            }
        }
        return utils.noop;
    }

    function initMeta(context) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return utils.noop;
        const update = () => { meta.content = context.state.isDark ? '#000000' : '#ffffff'; };
        context.events.theme.add(update);
        update();
        return () => context.events.theme.delete(update);
    }

    function initCookieconsent(context) {
        if (context.config.cookieconsent && root.cookieconsent && typeof root.cookieconsent.initialise === 'function') root.cookieconsent.initialise(context.config.cookieconsent);
        return utils.noop;
    }

    function initScroll(context) {
        const headers = [];
        const comments = document.getElementById('comments');
        const viewComments = document.getElementById('view-comments');
        if (document.body.getAttribute('header-desktop') === 'auto') headers.push(document.getElementById('header-desktop'));
        if (document.body.getAttribute('header-mobile') === 'auto') headers.push(document.getElementById('header-mobile'));
        if (viewComments) {
            viewComments.style.display = comments ? 'block' : 'none';
            if (comments) viewComments.href = '#comments';
        }
        const fixedButtons = document.getElementById('fixed-buttons');
        if (!fixedButtons) return utils.noop;
        let oldScrollTop = utils.getScrollTop();
        const handleScroll = () => {
            const newScrollTop = utils.getScrollTop();
            const scroll = newScrollTop - oldScrollTop;
            headers.filter(Boolean).forEach(header => {
                if (scroll > 20) header.classList.add('is-hidden');
                else if (scroll < -20 || newScrollTop <= 20) header.classList.remove('is-hidden');
            });
            if (newScrollTop > 100 && (!utils.isMobileWindow() || scroll < -20)) fixedButtons.classList.add('is-visible');
            else fixedButtons.classList.remove('is-visible');
            context.emit(context.events.scroll);
            oldScrollTop = newScrollTop;
        };
        context.listen(root, 'scroll', handleScroll);
        handleScroll();
        return utils.noop;
    }

    function initResize(context) {
        let timeout = null;
        const handleResize = () => {
            if (timeout) return;
            timeout = root.setTimeout(() => {
                timeout = null;
                context.emit(context.events.resize);
                if (context.state.tocRefresh) context.state.tocRefresh();
            }, 100);
        };
        context.listen(root, 'resize', handleResize);
        return () => { if (timeout) root.clearTimeout(timeout); };
    }

    function initMask(context) {
        const mask = document.getElementById('mask');
        if (!mask) return utils.noop;
        context.listen(mask, 'click', () => {
            context.emit(context.events.mask);
            document.body.classList.remove('blur');
        });
        return utils.noop;
    }

    const pageModules = [
        { name: 'object fit images', init: initObjectFit },
        { name: 'SVG icons', init: initSVGIcon },
        { name: 'Twemoji', init: initTwemoji },
        { name: 'mobile menu', init: initMenuMobile },
        { name: 'theme switcher', init: initSwitchTheme },
        { name: 'theme selector', init: initSelectTheme },
        { name: 'search', init: initSearch },
        { name: 'details', init: initDetails },
        { name: 'light gallery', init: initLightGallery },
        { name: 'highlight', init: initHighlight },
        { name: 'table', init: initTable },
        { name: 'header links', init: initHeaderLink },
        { name: 'math', init: initMath },
        { name: 'Mermaid', init: initMermaid },
        { name: 'ECharts', init: initEcharts },
        { name: 'TypeIt', init: initTypeit },
        { name: 'Mapbox', init: initMapbox },
        { name: 'cookie consent', init: initCookieconsent },
        { name: 'table of contents', init: initToc },
        { name: 'comments', init: initComment },
        { name: 'scroll handler', init: initScroll },
        { name: 'resize handler', init: initResize },
        { name: 'click mask', init: initMask },
        { name: 'meta', init: initMeta },
    ];

    modules.lifecycle = {
        name: 'page-lifecycle',
        init(context) {
            context.data = context.config.data || {};
            context.state.isDark = document.body.getAttribute('theme') !== 'light';
            pageModules.forEach(pageModule => utils.safeInit(pageModule.name, pageModule.init, context));
            return utils.noop;
        },
    };
})(window);
