function forEach(elements, handler) {
    elements = elements || [];
    for (let i = 0; i < elements.length; i++) handler(elements[i]);
}

function getScrollTop() {
    return (document.documentElement && document.documentElement.scrollTop) || document.body.scrollTop;
}

function isMobileWindow() {
    return window.matchMedia('only screen and (max-width: 680px)').matches;
}

function isTocStatic() {
    return window.matchMedia('only screen and (max-width: 1000px)').matches;
}

function animateCSS(element, animation, reserved, callback) {
    if (!Array.isArray(animation)) animation = [animation];
    element.classList.add('animate__animated', ...animation);
    const handler = () => {
        element.classList.remove('animate__animated', ...animation);
        element.removeEventListener('animationend', handler);
        if (typeof callback === 'function') callback();
    };
    if (!reserved) element.addEventListener('animationend', handler, false);
}


function initSVGIcon() {
    forEach(document.querySelectorAll('[data-svg-src]'), $icon => {
        fetch($icon.getAttribute('data-svg-src'))
            .then(response => response.text())
            .then(svg => {
                const $temp = document.createElement('div');
                $temp.insertAdjacentHTML('afterbegin', svg);
                const $svg = $temp.firstChild;
                $svg.setAttribute('data-svg-src', $icon.getAttribute('data-svg-src'));
                $svg.classList.add('icon');
                const $titleElements = $svg.getElementsByTagName('title');
                if ($titleElements.length) $svg.removeChild($titleElements[0]);
                $icon.parentElement.replaceChild($svg, $icon);
            })
            .catch(err => { console.error(err); });
    });
}

function initTwemoji() {
    if (window.config.twemoji) twemoji.parse(document.body);
}

function initMenuMobile() {
    const $menuToggleMobile = document.getElementById('menu-toggle-mobile');
    const $menuMobile = document.getElementById('menu-mobile');
    if (!window.menuToggleMobileEventListener) {
        $menuToggleMobile.addEventListener('click', () => {
            document.body.classList.toggle('blur');
            $menuToggleMobile.classList.toggle('active');
            $menuMobile.classList.toggle('active');
        }, false);
        window.menuToggleMobileEventListener = true;
    }
    window._menuMobileOnClickMask = (() => {
        $menuToggleMobile.classList.remove('active');
        $menuMobile.classList.remove('active');
    });
    window.clickMaskEventSet.add(window._menuMobileOnClickMask);
}

function initSwitchTheme() {
    forEach(document.getElementsByClassName('theme-switch'), $themeSwitch => {
        $themeSwitch.addEventListener('click', () => {
            let currentTheme = document.body.getAttribute('theme');
            if (currentTheme === 'dark') {
                document.body.setAttribute('theme', 'black');
                window.localStorage && localStorage.setItem('theme', 'black');
                window.isDark = true;
            } else if (currentTheme === 'black') {
                document.body.setAttribute('theme', 'light');
                window.localStorage && localStorage.setItem('theme', 'light');
                window.isDark = false;
            } else {
                document.body.setAttribute('theme', 'dark');
                window.localStorage && localStorage.setItem('theme', 'dark');
                window.isDark = true;
            }
            for (let event of window.switchThemeEventSet) event();
        }, false);
    });
}

function initSelectTheme() {
    forEach(document.getElementsByClassName('color-theme-select'), $themeSelect => {
        let currentTheme = document.body.getAttribute('theme');
        for (let i, j = 0; i = $themeSelect.options[j]; j++) {
            if (i.value == currentTheme) {
                $themeSelect.selectedIndex = j;
                break;
            }
        }
        $themeSelect.addEventListener('change', () => {
            let theme = $themeSelect.value;
            window.localStorage && localStorage.setItem('theme', theme);
            if (theme != 'auto') {
                document.body.setAttribute('theme', theme);
                if (theme == 'light') {
                    window.isDark = false;
                } else {
                    window.isDark = true;
                }
            } else {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.setAttribute('theme', 'dark');
                    window.isDark = true;
                } else {
                    document.body.setAttribute('theme', 'white');
                    window.isDark = false;
                }
            }
            for (let event of window.switchThemeEventSet) event();
        }, false);
    });
}


function loadScriptAsset(asset) {
    if (!asset || !asset.src) return Promise.resolve();
    const existing = document.querySelector(`script[src="${asset.src}"]`);
    if (existing) {
        if (existing.dataset.loaded === 'true') return Promise.resolve();
        return new Promise((resolve, reject) => {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', reject, { once: true });
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
    });
}

function loadSearchAssets(searchConfig) {
    const assets = window.config.searchAssets || {};
    const chain = [assets.autocomplete];
    if (searchConfig.type === 'lunr') {
        chain.push(assets.lunr, assets.lunrStemmer, assets.lunrLanguage);
    } else if (searchConfig.type === 'algolia') {
        chain.push(assets.algolia);
    } else if (searchConfig.type === 'fuse') {
        chain.push(assets.fuse);
    }
    return chain.filter(Boolean).reduce((promise, asset) => promise.then(() => loadScriptAsset(asset)), Promise.resolve());
}

function initSearch() {
    const searchConfig = (window.config || {}).search;
    const isMobile = isMobileWindow();
    if (!searchConfig) return;

    const maxResultLength = searchConfig.maxResultLength ? searchConfig.maxResultLength : 10;
    const snippetLength = searchConfig.snippetLength ? searchConfig.snippetLength : 50;
    const highlightTag = searchConfig.highlightTag ? searchConfig.highlightTag : 'em';
    const isCaseSensitive = searchConfig.isCaseSensitive ? searchConfig.isCaseSensitive : false;
    const minMatchCharLength = searchConfig.minMatchCharLength ? searchConfig.minMatchCharLength : 1;
    const findAllMatches = searchConfig.findAllMatches ? searchConfig.findAllMatches : false;
    const location = searchConfig.location ? searchConfig.location : 0;
    const threshold = searchConfig.threshold ? searchConfig.threshold : 0.3;
    const distance = searchConfig.distance ? searchConfig.distance : 100;
    const ignoreLocation = searchConfig.ignoreLocation ? searchConfig.ignoreLocation : false;
    const useExtendedSearch = searchConfig.useExtendedSearch ? searchConfig.useExtendedSearch : false;
    const ignoreFieldNorm = searchConfig.ignoreFieldNorm ? searchConfig.ignoreFieldNorm : false;
    const suffix = isMobile ? 'mobile' : 'desktop';
    const $header = document.getElementById(`header-${suffix}`);
    const $searchInput = document.getElementById(`search-input-${suffix}`);
    const $searchToggle = document.getElementById(`search-toggle-${suffix}`);
    const $searchLoading = document.getElementById(`search-loading-${suffix}`);
    const $searchClear = document.getElementById(`search-clear-${suffix}`);
    if (!$searchInput || $searchInput.dataset.searchInit === 'true') return;
    $searchInput.dataset.searchInit = 'true';
    if (isMobile) {
        $searchInput.addEventListener('focus', () => {
            document.body.classList.add('blur');
            $header.classList.add('open');
        }, false);
        document.getElementById('search-cancel-mobile').addEventListener('click', () => {
            $header.classList.remove('open');
            document.body.classList.remove('blur');
            document.getElementById('menu-toggle-mobile').classList.remove('active');
            document.getElementById('menu-mobile').classList.remove('active');
            $searchLoading.style.display = 'none';
            $searchClear.style.display = 'none';
            window._searchMobile && window._searchMobile.autocomplete.setVal('');
        }, false);
        $searchClear.addEventListener('click', () => {
            $searchClear.style.display = 'none';
            window._searchMobile && window._searchMobile.autocomplete.setVal('');
        }, false);
        window._searchMobileOnClickMask = (() => {
            $header.classList.remove('open');
            $searchLoading.style.display = 'none';
            $searchClear.style.display = 'none';
            window._searchMobile && window._searchMobile.autocomplete.setVal('');
        });
        window.clickMaskEventSet.add(window._searchMobileOnClickMask);
        window.pjaxSendEventSet.add(window._searchMobileOnClickMask);
    } else {
        $searchToggle.addEventListener('click', () => {
            document.body.classList.add('blur');
            $header.classList.add('open');
            $searchInput.focus();
        }, false);
        $searchClear.addEventListener('click', () => {
            $searchClear.style.display = 'none';
            window._searchDesktop && window._searchDesktop.autocomplete.setVal('');
        }, false);
        window._searchDesktopOnClickMask = (() => {
            $header.classList.remove('open');
            $searchLoading.style.display = 'none';
            $searchClear.style.display = 'none';
            window._searchDesktop && window._searchDesktop.autocomplete.setVal('');
        });
        window.clickMaskEventSet.add(window._searchDesktopOnClickMask);
        window.pjaxSendEventSet.add(window._searchDesktopOnClickMask);
    }
    $searchInput.addEventListener('input', () => {
        if ($searchInput.value === '') $searchClear.style.display = 'none';
        else $searchClear.style.display = 'inline';
    }, false);

    let autosearchPromise;
    const initAutosearch = () => {
        const autosearch = autocomplete(`#search-input-${suffix}`, {
            hint: false,
            autoselect: true,
            dropdownMenuContainer: `#search-dropdown-${suffix}`,
            clearOnSelected: true,
            cssClasses: { noPrefix: true },
            debug: true,
        }, {
            name: 'search',
            source: (query, callback) => {
                $searchLoading.style.display = 'inline';
                $searchClear.style.display = 'none';
                const finish = (results) => {
                    $searchLoading.style.display = 'none';
                    $searchClear.style.display = 'inline';
                    callback(results);
                };
                if (searchConfig.type === 'lunr') {
                    const search = () => {
                        if (lunr.queryHandler) query = lunr.queryHandler(query);
                        const results = {};
                        window._index.search(query).forEach(({ ref, matchData: { metadata } }) => {
                            const matchData = window._indexData[ref];
                            let { uri, title, content: context } = matchData;
                            if (results[uri]) return;
                            let position = 0;
                            Object.values(metadata).forEach(({ content }) => {
                                if (content) {
                                    const matchPosition = content.position[0][0];
                                    if (matchPosition < position || position === 0) position = matchPosition;
                                }
                            });
                            position -= snippetLength / 5;
                            if (position > 0) {
                                position += context.substr(position, 20).lastIndexOf(' ') + 1;
                                context = '...' + context.substr(position, snippetLength);
                            } else {
                                context = context.substr(0, snippetLength);
                            }
                            Object.keys(metadata).forEach(key => {
                                title = title.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                                context = context.replace(new RegExp(`(${key})`, 'gi'), `<${highlightTag}>$1</${highlightTag}>`);
                            });
                            results[uri] = {
                                'uri': uri,
                                'title': title,
                                'date': matchData.date,
                                'context': context,
                            };
                        });
                        return Object.values(results).slice(0, maxResultLength);
                    }
                    if (!window._index) {
                        fetch(searchConfig.lunrIndexURL)
                            .then(response => response.json())
                            .then(data => {
                                const indexData = {};
                                window._index = lunr(function () {
                                    if (searchConfig.lunrLanguageCode) window.use(lunr[searchConfig.lunrLanguageCode]);
                                    window.ref('objectID');
                                    window.field('title', { boost: 50 });
                                    window.field('tags', { boost: 20 });
                                    window.field('categories', { boost: 20 });
                                    window.field('content', { boost: 10 });
                                    window.metadataWhitelist = ['position'];
                                    data.forEach((record) => {
                                        indexData[record.objectID] = record;
                                        window.add(record);
                                    });
                                });
                                window._indexData = indexData;
                                finish(search());
                            }).catch(err => {
                                console.error(err);
                                finish([]);
                            });
                    } else finish(search());
                } else if (searchConfig.type === 'algolia') {
                    window._algoliaIndex = window._algoliaIndex || algoliasearch(searchConfig.algoliaAppID, searchConfig.algoliaSearchKey).initIndex(searchConfig.algoliaIndex);
                    window._algoliaIndex
                        .search(query, {
                            offset: 0,
                            length: maxResultLength * 8,
                            attributesToHighlight: ['title'],
                            attributesToSnippet: [`content:${snippetLength}`],
                            highlightPreTag: `<${highlightTag}>`,
                            highlightPostTag: `</${highlightTag}>`,
                        })
                        .then(({ hits }) => {
                            const results = {};
                            hits.forEach(({ uri, date, _highlightResult: { title }, _snippetResult: { content } }) => {
                                if (results[uri] && results[uri].context.length > content.value) return;
                                results[uri] = {
                                    uri: uri,
                                    title: title.value,
                                    date: date,
                                    context: content.value,
                                };
                            });
                            finish(Object.values(results).slice(0, maxResultLength));
                        })
                        .catch(err => {
                            console.error(err);
                            finish([]);
                        });
                } else if (searchConfig.type === 'fuse') {
                    const search = () => {
                        const results = {};
                        window._index.search(query).forEach(({ item, refIndex, matches }) => {
                            let title = item.title;
                            let content = item.content;
                            matches.forEach(({ indices, value, key }) => {
                                if (key === 'content') {
                                    let offset = 0;
                                    for (let i = 0; i < indices.length; i++) {
                                        let substr = content.substring(indices[i][0] + offset, indices[i][1] + 1 + offset);
                                        let tag = `<${highlightTag}>` + substr + `</${highlightTag}>`;
                                        content = content.substring(0, indices[i][0] + offset) + tag + content.substring(indices[i][1] + 1 + offset, content.length);
                                        offset += highlightTag.length * 2 + 5;
                                    }
                                } else if (key === 'title') {
                                    let offset = 0;
                                    for (let i = 0; i < indices.length; i++) {
                                        let substr = title.substring(indices[i][0] + offset, indices[i][1] + 1 + offset);
                                        let tag = `<${highlightTag}>` + substr + `</${highlightTag}>`;
                                        title = title.substring(0, indices[i][0] + offset) + tag + title.substring(indices[i][1] + 1 + offset, content.length);
                                        offset += highlightTag.length * 2 + 5;

                                    }
                                }
                            });
                            results[item.uri] = {
                                'uri': item.uri,
                                'title': title,
                                'date': item.date,
                                'context': content
                            };
                        });
                        return Object.values(results).slice(0, maxResultLength);
                    }
                    if (!window._index) {
                        fetch(searchConfig.fuseIndexURL)
                            .then(response => response.json())
                            .then(data => {
                                const options = {
                                    isCaseSensitive: isCaseSensitive,
                                    findAllMatches: findAllMatches,
                                    minMatchCharLength: minMatchCharLength,
                                    location: location,
                                    threshold: threshold,
                                    distance: distance,
                                    ignoreLocation: ignoreLocation,
                                    useExtendedSearch: useExtendedSearch,
                                    ignoreFieldNorm: ignoreFieldNorm,
                                    includeScore: false,
                                    shouldSort: true,
                                    includeMatches: true,
                                    keys: [
                                        "content",
                                        "title"
                                    ]
                                };
                                window._index = new Fuse(data, options);
                                finish(search());
                            }).catch(err => {
                                console.error(err);
                                finish([]);
                            })
                    } else finish(search());
                }
            },
            templates: {
                suggestion: ({ title, date, context }) => `<div><span class="suggestion-title">${title}</span><span class="suggestion-date">${date}</span></div><div class="suggestion-context">${context}</div>`,
                empty: ({ query }) => `<div class="search-empty">${searchConfig.noResultsFound}: <span class="search-query">"${query}"</span></div>`,
                footer: ({ }) => {
                    const { searchType, icon, href } = searchConfig.type === 'algolia' ? {
                        searchType: 'algolia',
                        icon: '<i class="fab fa-algolia fa-fw"></i>',
                        href: 'https://www.algolia.com/',
                    } : (searchConfig.type === 'lunr' ? {
                        searchType: 'Lunr.js',
                        icon: '',
                        href: 'https://lunrjs.com/',
                    } : {
                        searchType: 'Fuse.js',
                        icon: '',
                        href: 'https://fusejs.io/',
                    });
                    return `<div class="search-footer">Search by <a href="${href}" rel="noopener noreffer" target="_blank">${icon} ${searchType}</a></div>`;
                },
            },
        });
        autosearch.on('autocomplete:selected', (_event, suggestion, _dataset, _context) => {
            window.location.assign(suggestion.uri);
        });
        if (isMobile) window._searchMobile = autosearch;
        else window._searchDesktop = autosearch;
    };
    const ensureAutosearch = () => {
        const current = isMobile ? window._searchMobile : window._searchDesktop;
        if (current) return Promise.resolve(current);
        if (autosearchPromise) return autosearchPromise;
        $searchLoading.style.display = 'inline';
        autosearchPromise = loadSearchAssets(searchConfig)
            .then(() => new Promise((resolve, reject) => {
                if (searchConfig.lunrSegmentitURL && !document.getElementById('lunr-segmentit')) {
                    const script = document.createElement('script');
                    script.id = 'lunr-segmentit';
                    script.type = 'text/javascript';
                    script.src = searchConfig.lunrSegmentitURL;
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.body.appendChild(script);
                } else resolve();
            }))
            .then(() => {
                initAutosearch();
                $searchLoading.style.display = 'none';
                return isMobile ? window._searchMobile : window._searchDesktop;
            })
            .catch(err => {
                console.error(err);
                $searchLoading.style.display = 'none';
                autosearchPromise = null;
            });
        return autosearchPromise;
    };
    $searchInput.addEventListener('focus', ensureAutosearch, false);
    $searchInput.addEventListener('input', ensureAutosearch, false);
    if ($searchToggle) $searchToggle.addEventListener('click', ensureAutosearch, false);
}

function initDetails() {
    forEach(document.getElementsByClassName('details'), $details => {
        const $summary = $details.getElementsByClassName('details-summary')[0];
        $summary.addEventListener('click', () => {
            $details.classList.toggle('open');
        }, false);
    });
}

function initLightGallery() {
    if (window.config.lightGallery) {
        const instance = lightGallery(document.getElementById('content'), window.config.lightGallery);
    }
}

function restorePjaxPageConfig() {
    const configScripts = document.querySelectorAll('.pjax-assets script');
    forEach(configScripts, script => {
        const content = script.textContent || '';
        const prefix = 'window.config=';
        const start = content.indexOf(prefix);
        if (start < 0) return;
        const serialized = content.slice(start + prefix.length).trim();
        const end = serialized.lastIndexOf(';');
        const json = end >= 0 ? serialized.slice(0, end) : serialized;
        try {
            let config;
            try {
                config = JSON.parse(json);
            } catch (jsonError) {
                config = Function(`return (${json});`)();
            }
            if (config && typeof config === 'object') window.config = config;
        } catch (err) {
            console.warn('Unable to restore the current page config after PJAX:', err);
        }
    });
}

function getFootprintGalleryRoot() {
    const galleryConfig = window.config && window.config.footprintGallery;
    if (!galleryConfig || !galleryConfig.enabled) return null;
    const page = document.querySelector('.footprint-page[data-footprint-layout="footprint-year"][data-footprint-category="travel"]');
    if (!page) return null;
    return page.querySelector('.footprint-detail-flow[data-footprint-category="travel"]');
}

function getFootprintMeaningfulChildNodes(element) {
    return Array.prototype.filter.call(element.childNodes, node => {
        return node.nodeType !== 3 || node.nodeValue.trim() !== '';
    });
}

function getFootprintImageFromNode(node) {
    if (!node || node.nodeType !== 1) return null;
    if (node.tagName.toLowerCase() === 'img') return node;
    if (node.tagName.toLowerCase() !== 'a') return null;
    const children = getFootprintMeaningfulChildNodes(node);
    if (children.length !== 1 || children[0].nodeType !== 1 || children[0].tagName.toLowerCase() !== 'img') return null;
    return children[0];
}

function collectFootprintImageGroups(root) {
    const groups = [];
    forEach(root.querySelectorAll('p'), paragraph => {
        if (paragraph.dataset.footprintGalleryReady === 'true') return;
        if (paragraph.closest('figure, video, iframe, pre, code, [data-footprint-gallery]')) return;
        const nodes = getFootprintMeaningfulChildNodes(paragraph);
        if (!nodes.length) return;
        const images = [];
        for (let i = 0; i < nodes.length; i++) {
            const image = getFootprintImageFromNode(nodes[i]);
            if (!image) return;
            images.push(image);
        }
        if (images.length) groups.push({ paragraph, nodes, images });
    });
    return groups;
}

function isUsableFootprintImageURL(value) {
    if (!value) return false;
    const url = value.trim();
    return url !== '' && url !== '#' && !/^(?:data|javascript|about):/i.test(url);
}

function resolveFootprintImageSource(image, link) {
    const candidates = [
        link && link.getAttribute('href'),
        link && link.getAttribute('data-pswp-src'),
        image && image.dataset.pswpSrc,
        image && image.currentSrc,
        image && image.getAttribute('src'),
        image && image.dataset.src,
        image && image.getAttribute('data-src'),
    ];
    for (let i = 0; i < candidates.length; i++) {
        if (isUsableFootprintImageURL(candidates[i])) return candidates[i].trim();
    }
    return '';
}

function normalizeFootprintSlide(node, image, index, total) {
    let slide = node.tagName.toLowerCase() === 'a' ? node : document.createElement('a');
    const source = resolveFootprintImageSource(image, node.tagName.toLowerCase() === 'a' ? node : null);
    if (!isUsableFootprintImageURL(slide.getAttribute('href')) && source) slide.setAttribute('href', source);
    slide.classList.add('footprint-gallery__slide');
    slide.dataset.footprintSlide = 'true';
    slide.dataset.index = String(index);
    if (source) slide.dataset.pswpSrc = source;
    const sourceSet = image.getAttribute('srcset') || image.getAttribute('data-srcset');
    if (sourceSet) slide.dataset.pswpSrcset = sourceSet;
    slide.setAttribute('aria-label', `查看第 ${index + 1} 张，共 ${total} 张`);
    if (slide.firstElementChild !== image) slide.appendChild(image);
    return slide;
}

function updateFootprintGalleryActive(galleryState, index) {
    if (!galleryState || index < 0 || index >= galleryState.slides.length) return;
    if (galleryState.currentIndex === index) return;
    galleryState.currentIndex = index;
    galleryState.slides.forEach((slide, slideIndex) => {
        const active = slideIndex === index;
        slide.classList.toggle('is-active', active);
        if (active) slide.setAttribute('aria-current', 'true');
        else slide.removeAttribute('aria-current');
    });
    if (galleryState.counter) galleryState.counter.textContent = `${index + 1} / ${galleryState.total}`;
}

function shouldReduceFootprintMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function observeFootprintGallerySlide(galleryState, state) {
    const track = galleryState.track;
    const updateFromCenter = () => {
        if (!track.clientWidth) return;
        const trackRect = track.getBoundingClientRect();
        const center = trackRect.left + trackRect.width / 2;
        let closestIndex = galleryState.currentIndex;
        let closestDistance = Number.POSITIVE_INFINITY;
        galleryState.slides.forEach((slide, index) => {
            const rect = slide.getBoundingClientRect();
            const distance = Math.abs(rect.left + rect.width / 2 - center);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = index;
            }
        });
        updateFootprintGalleryActive(galleryState, closestIndex);
    };
    const scheduleCenterUpdate = () => {
        if (galleryState.scrollFrame) return;
        const requestFrame = window.requestAnimationFrame || (callback => window.setTimeout(callback, 16));
        galleryState.scrollFrame = requestFrame(() => {
            galleryState.scrollFrame = null;
            updateFromCenter();
        });
    };
    const cancelFrame = () => {
        if (!galleryState.scrollFrame) return;
        if (window.cancelAnimationFrame) window.cancelAnimationFrame(galleryState.scrollFrame);
        else window.clearTimeout(galleryState.scrollFrame);
        galleryState.scrollFrame = null;
    };
    const scrollOptions = { passive: true };
    track.addEventListener('scroll', scheduleCenterUpdate, scrollOptions);
    state.cleanup.push(() => {
        cancelFrame();
        track.removeEventListener('scroll', scheduleCenterUpdate, scrollOptions);
    });

    if ('IntersectionObserver' in window) {
        const ratios = [];
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const index = Number(entry.target.dataset.index);
                ratios[index] = entry.intersectionRatio;
            });
            let bestIndex = galleryState.currentIndex;
            let bestRatio = 0;
            ratios.forEach((ratio, index) => {
                if (ratio > bestRatio) {
                    bestRatio = ratio;
                    bestIndex = index;
                }
            });
            if (bestRatio > 0) updateFootprintGalleryActive(galleryState, bestIndex);
        }, { root: track, threshold: [.4, .55, .7, .85, 1] });
        galleryState.slides.forEach(slide => observer.observe(slide));
        galleryState.observer = observer;
        state.observers.push(observer);
    }
    scheduleCenterUpdate();
}

function scrollFootprintGalleryToIndex(galleryState, index, behavior) {
    const nextIndex = Math.max(0, Math.min(index, galleryState.slides.length - 1));
    const slide = galleryState.slides[nextIndex];
    updateFootprintGalleryActive(galleryState, nextIndex);
    try {
        slide.scrollIntoView({
            behavior: shouldReduceFootprintMotion() ? 'auto' : behavior,
            block: 'nearest',
            inline: 'center',
        });
    } catch (err) {
        slide.scrollIntoView();
    }
}

function bindFootprintGalleryInteractions(galleryState, state) {
    const track = galleryState.track;
    const onKeyDown = event => {
        const canScroll = track.scrollWidth > track.clientWidth + 1;
        let nextIndex = galleryState.currentIndex;
        if (canScroll && event.key === 'ArrowRight') nextIndex += 1;
        else if (canScroll && event.key === 'ArrowLeft') nextIndex -= 1;
        else if (canScroll && event.key === 'Home') nextIndex = 0;
        else if (canScroll && event.key === 'End') nextIndex = galleryState.slides.length - 1;
        else if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            openFootprintPhotoSwipe(galleryState, galleryState.currentIndex, galleryState.slides[galleryState.currentIndex]);
            return;
        } else return;
        event.preventDefault();
        scrollFootprintGalleryToIndex(galleryState, nextIndex, 'smooth');
    };
    const onClick = event => {
        const slide = event.target.closest('[data-footprint-slide]');
        if (!slide || !track.contains(slide)) return;
        if (event.button && event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const index = Number(slide.dataset.index);
        if (Number.isNaN(index)) return;
        event.preventDefault();
        updateFootprintGalleryActive(galleryState, index);
        openFootprintPhotoSwipe(galleryState, index, slide, {
            x: event.clientX,
            y: event.clientY,
        });
    };
    track.addEventListener('keydown', onKeyDown, false);
    galleryState.gallery.addEventListener('click', onClick, false);
    state.cleanup.push(() => {
        track.removeEventListener('keydown', onKeyDown, false);
        galleryState.gallery.removeEventListener('click', onClick, false);
    });
}

function readFootprintImageDimensions(slide, image) {
    const declaredWidth = Number(slide.dataset.pswpWidth || image.getAttribute('width'));
    const declaredHeight = Number(slide.dataset.pswpHeight || image.getAttribute('height'));
    if (declaredWidth > 0 && declaredHeight > 0) return { width: declaredWidth, height: declaredHeight };
    if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        return { width: image.naturalWidth, height: image.naturalHeight };
    }
    return null;
}

function loadFootprintImageDimensions(state, source, image) {
    const cached = state.dimensionsCache.get(source);
    if (cached) return cached;
    const existingDimensions = readFootprintImageDimensions({ dataset: {} }, image);
    if (existingDimensions) {
        const immediate = Promise.resolve(existingDimensions);
        state.dimensionsCache.set(source, immediate);
        return immediate;
    }
    const promise = new Promise((resolve, reject) => {
        const probe = new Image();
        let settled = false;
        const finish = (error, dimensions) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeout);
            if (error) reject(error);
            else resolve(dimensions);
        };
        const timeout = window.setTimeout(() => finish(new Error('Image dimensions timed out')), 5000);
        probe.onload = () => {
            if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
                finish(null, { width: probe.naturalWidth, height: probe.naturalHeight });
            } else finish(new Error('Image dimensions unavailable'));
        };
        probe.onerror = () => finish(new Error('Image failed to load'));
        probe.src = source;
    });
    const tracked = promise.then(dimensions => dimensions, error => {
        state.dimensionsCache.delete(source);
        throw error;
    });
    state.dimensionsCache.set(source, tracked);
    return tracked;
}

function ensureFootprintSlideData(state, slide, index) {
    const image = slide.querySelector('img');
    const source = slide.dataset.pswpSrc || resolveFootprintImageSource(image, slide);
    if (!isUsableFootprintImageURL(source)) return Promise.reject(new Error('Image source unavailable'));
    const declaredDimensions = readFootprintImageDimensions(slide, image);
    const dimensionsPromise = declaredDimensions
        ? Promise.resolve(declaredDimensions)
        : loadFootprintImageDimensions(state, source, image);
    return dimensionsPromise.then(dimensions => {
        slide.dataset.pswpSrc = source;
        slide.dataset.pswpWidth = String(dimensions.width);
        slide.dataset.pswpHeight = String(dimensions.height);
        const thumbnail = image && (image.currentSrc || image.getAttribute('src'));
        const srcset = slide.dataset.pswpSrcset || (image && (image.getAttribute('srcset') || image.getAttribute('data-srcset')));
        const item = {
            src: source,
            width: dimensions.width,
            height: dimensions.height,
            alt: image ? image.getAttribute('alt') || '' : '',
            msrc: isUsableFootprintImageURL(thumbnail) ? thumbnail : source,
            footprintIndex: index,
        };
        if (srcset) item.srcset = srcset;
        return item;
    });
}

function ensureFootprintGalleryData(state, galleryState) {
    return Promise.all(galleryState.slides.map((slide, index) => {
        return ensureFootprintSlideData(state, slide, index)
            .then(item => ({ index, item }))
            .catch(error => ({ index, error }));
    }));
}

function loadFootprintPhotoSwipeModules(state) {
    if (state.modulePromise) return state.modulePromise;
    const galleryConfig = window.config && window.config.footprintGallery;
    if (!galleryConfig || !galleryConfig.lightboxModuleURL || !galleryConfig.coreModuleURL) {
        return Promise.reject(new Error('PhotoSwipe module URLs are not configured'));
    }
    state.modulePromise = Promise.all([
        import(galleryConfig.lightboxModuleURL),
        import(galleryConfig.coreModuleURL),
    ]).then(modules => ({
        PhotoSwipeLightbox: modules[0].default,
        PhotoSwipe: modules[1].default,
    })).catch(error => {
        if (!state.moduleErrorLogged) {
            console.error('Footprint gallery could not load PhotoSwipe:', error);
            state.moduleErrorLogged = true;
        }
        throw error;
    });
    return state.modulePromise;
}

function createFootprintPhotoSwipeLightbox(state, modules) {
    if (state.lightbox) return state.lightbox;
    const lightbox = new modules.PhotoSwipeLightbox({
        dataSource: [],
        pswpModule: modules.PhotoSwipe,
        showHideAnimationType: 'zoom',
        bgOpacity: .92,
        loop: false,
        returnFocus: false,
    });
    lightbox.addFilter('thumbEl', (thumbEl, data) => {
        const activeGallery = state.activeGallery;
        const originalIndex = data && data.footprintIndex;
        if (activeGallery && typeof originalIndex === 'number') {
            const slide = activeGallery.slides[originalIndex];
            const image = slide && slide.querySelector('img');
            if (image) return image;
        }
        return thumbEl;
    });
    lightbox.on('change', () => {
        if (!state.activeGallery || !lightbox.pswp || !lightbox.pswp.currSlide) return;
        const data = lightbox.pswp.currSlide.data;
        if (data && typeof data.footprintIndex === 'number') {
            updateFootprintGalleryActive(state.activeGallery, data.footprintIndex);
        }
    });
    lightbox.on('destroy', () => {
        if (state.destroyed) return;
        const trigger = state.activeTrigger;
        state.activeTrigger = null;
        state.activeGallery = null;
        if (trigger && document.documentElement.contains(trigger)) {
            try {
                trigger.focus({ preventScroll: true });
            } catch (err) {
                trigger.focus();
            }
        }
    });
    lightbox.init();
    state.lightbox = lightbox;
    return lightbox;
}

function openFootprintPhotoSwipe(galleryState, index, trigger, point) {
    const state = window._footprintGalleryState;
    if (!state || state.destroyed || galleryState.opening) return;
    const fallback = () => {
        const href = trigger.getAttribute('href') || trigger.dataset.pswpSrc;
        if (isUsableFootprintImageURL(href)) window.location.href = href;
    };
    galleryState.opening = true;
    state.activeGallery = galleryState;
    state.activeTrigger = trigger;
    galleryState.gallery.classList.add('is-opening');
    galleryState.gallery.setAttribute('aria-busy', 'true');
    let opened = false;
    Promise.all([
        loadFootprintPhotoSwipeModules(state),
        ensureFootprintGalleryData(state, galleryState),
    ]).then(results => {
        if (state.destroyed) return;
        const modules = results[0];
        const dataResults = results[1];
        const validResults = dataResults.filter(result => result.item);
        const startResult = dataResults.find(result => result.index === index && result.item);
        if (!startResult || !validResults.length) throw new Error('Selected image dimensions unavailable');
        const dataSource = validResults.map(result => result.item);
        const startIndex = dataSource.findIndex(item => item.footprintIndex === startResult.index);
        if (startIndex < 0) throw new Error('Selected image not found in gallery');
        const lightbox = createFootprintPhotoSwipeLightbox(state, modules);
        if (point && typeof point.x === 'number' && typeof point.y === 'number') lightbox.loadAndOpen(startIndex, dataSource, point);
        else lightbox.loadAndOpen(startIndex, dataSource);
        opened = true;
    }).catch(error => {
        if (state.destroyed || opened) return;
        console.warn('Falling back to the original travel image link:', error);
        fallback();
    }).then(() => {
        galleryState.opening = false;
        galleryState.gallery.classList.remove('is-opening');
        galleryState.gallery.setAttribute('aria-busy', 'false');
        if (!opened && !state.destroyed) {
            state.activeGallery = null;
            state.activeTrigger = null;
        }
    });
}

function destroyFootprintGalleries() {
    const state = window._footprintGalleryState;
    if (!state || state.destroyed) return;
    state.destroyed = true;
    state.observers.forEach(observer => observer.disconnect());
    state.galleries.forEach(galleryState => {
        if (galleryState.scrollFrame) {
            if (window.cancelAnimationFrame) window.cancelAnimationFrame(galleryState.scrollFrame);
            else window.clearTimeout(galleryState.scrollFrame);
        }
        galleryState.slides.forEach(slide => slide.classList.remove('is-opening'));
    });
    state.cleanup.forEach(cleanup => cleanup());
    if (state.lightbox) state.lightbox.destroy();
    state.galleries = [];
    state.observers = [];
    state.cleanup = [];
    state.dimensionsCache.clear();
    state.lightbox = null;
    state.activeGallery = null;
    state.activeTrigger = null;
    if (window._footprintGalleryState === state) window._footprintGalleryState = null;
}

function registerFootprintGalleryState(state, gallery, track, slides, counter) {
    if (!track || !slides.length) return;
    const existingIndex = slides.findIndex(slide => slide.classList.contains('is-active'));
    const galleryState = {
        gallery,
        track,
        slides,
        total: slides.length,
        counter,
        currentIndex: -1,
        observer: null,
        scrollFrame: null,
        opening: false,
    };
    state.galleries.push(galleryState);
    updateFootprintGalleryActive(galleryState, existingIndex >= 0 ? existingIndex : 0);
    observeFootprintGallerySlide(galleryState, state);
    bindFootprintGalleryInteractions(galleryState, state);
}

function initFootprintGallery() {
    const root = getFootprintGalleryRoot();
    if (!root) return;
    const existingState = window._footprintGalleryState;
    if (existingState && existingState.root === root && !existingState.destroyed) {
        window.pjaxSendEventSet.add(destroyFootprintGalleries);
        return;
    }
    if (existingState) destroyFootprintGalleries();
    const state = {
        root,
        galleries: [],
        observers: [],
        cleanup: [],
        modulePromise: null,
        moduleErrorLogged: false,
        dimensionsCache: new Map(),
        lightbox: null,
        activeGallery: null,
        activeTrigger: null,
        destroyed: false,
    };
    window._footprintGalleryState = state;
    forEach(root.querySelectorAll('[data-footprint-gallery][data-footprint-gallery-ready="true"]'), gallery => {
        const track = gallery.querySelector('.footprint-gallery__track');
        const slides = track ? Array.prototype.slice.call(track.querySelectorAll('[data-footprint-slide]')) : [];
        const counter = gallery.querySelector('.footprint-gallery__counter');
        registerFootprintGalleryState(state, gallery, track, slides, counter);
    });
    collectFootprintImageGroups(root).forEach(group => {
        const total = group.images.length;
        const gallery = document.createElement('div');
        const countClass = total > 5 ? '5-plus' : String(total);
        gallery.className = `footprint-gallery footprint-gallery--count-${countClass}${total === 1 ? ' footprint-gallery--single' : ''}`;
        gallery.dataset.footprintGallery = 'true';
        gallery.dataset.footprintGalleryReady = 'true';
        gallery.style.setProperty('--gallery-columns', String(Math.min(total, 5)));
        gallery.setAttribute('role', 'region');
        gallery.setAttribute('aria-label', `旅行照片，共 ${total} 张`);
        gallery.setAttribute('aria-busy', 'false');
        const track = document.createElement('div');
        track.className = 'footprint-gallery__track';
        track.tabIndex = 0;
        track.setAttribute('role', 'group');
        track.setAttribute('aria-roledescription', 'carousel');
        track.setAttribute('aria-label', `旅行照片，共 ${total} 张`);
        gallery.appendChild(track);
        const slides = group.nodes.map((node, index) => {
            const slide = normalizeFootprintSlide(node, group.images[index], index, total);
            track.appendChild(slide);
            return slide;
        });
        let counter = null;
        if (total > 1) {
            counter = document.createElement('span');
            counter.className = 'footprint-gallery__counter';
            counter.setAttribute('aria-live', 'polite');
            counter.setAttribute('aria-atomic', 'true');
            counter.textContent = `1 / ${total}`;
            gallery.appendChild(counter);
        }
        group.paragraph.parentNode.replaceChild(gallery, group.paragraph);
        registerFootprintGalleryState(state, gallery, track, slides, counter);
    });
    window.pjaxSendEventSet.add(destroyFootprintGalleries);
}

function initHighlight() {
    forEach(document.querySelectorAll('.highlight > pre.chroma'), $preChroma => {
        const $chroma = document.createElement('div');
        $chroma.className = $preChroma.className;
        const $table = document.createElement('table');
        $chroma.appendChild($table);
        const $tbody = document.createElement('tbody');
        $table.appendChild($tbody);
        const $tr = document.createElement('tr');
        $tbody.appendChild($tr);
        const $td = document.createElement('td');
        $tr.appendChild($td);
        $preChroma.parentElement.replaceChild($chroma, $preChroma);
        $td.appendChild($preChroma);
    });
    forEach(document.querySelectorAll('.highlight > .chroma'), $chroma => {
        const $codeElements = $chroma.querySelectorAll('pre.chroma > code');
        if ($codeElements.length) {
            const $code = $codeElements[$codeElements.length - 1];
            const $header = document.createElement('div');
            $header.className = 'code-header ' + $code.className.toLowerCase();
            const $title = document.createElement('span');
            $title.classList.add('code-title');
            $title.insertAdjacentHTML('afterbegin', '<i class="arrow fas fa-chevron-right fa-fw"></i>');
            $title.addEventListener('click', () => {
                $chroma.classList.toggle('open');
            }, false);
            $header.appendChild($title);
            const $ellipses = document.createElement('span');
            $ellipses.insertAdjacentHTML('afterbegin', '<i class="fas fa-ellipsis-h fa-fw"></i>');
            $ellipses.classList.add('ellipses');
            $ellipses.addEventListener('click', () => {
                $chroma.classList.add('open');
            }, false);
            $header.appendChild($ellipses);
            const $copy = document.createElement('span');
            $copy.insertAdjacentHTML('afterbegin', '<i class="far fa-copy fa-fw"></i>');
            $copy.classList.add('copy');
            const code = $code.innerText;
            if (window.config.code.maxShownLines < 0 || code.split('\n').length < window.config.code.maxShownLines + 2) $chroma.classList.add('open');
            if (window.config.code.copyTitle) {
                $copy.setAttribute('data-clipboard-text', code);
                $copy.title = window.config.code.copyTitle;
                const clipboard = new ClipboardJS($copy);
                clipboard.on('success', _e => {
                    animateCSS($code, 'animate__flash');
                    $copy.firstElementChild.className = "fas fa-check fa-fw";
                    setTimeout(() => {
                        $copy.firstElementChild.className = "far fa-copy fa-fw";
                    }, 3000);
                });
                $header.appendChild($copy);
            }
            $chroma.insertBefore($header, $chroma.firstChild);
        }
    });
}

function initTable() {
    forEach(document.querySelectorAll('.content table'), $table => {
        if ($table.parentElement && $table.parentElement.classList.contains('table-wrapper')) return;

        const $wrapper = document.createElement('div');
        $wrapper.className = 'table-wrapper';
        $table.parentElement.replaceChild($wrapper, $table);
        $wrapper.appendChild($table);
    });
}

function initHeaderLink() {
    for (let num = 1; num <= 6; num++) {
        forEach(document.querySelectorAll('.single .content > h' + num), $header => {
            $header.classList.add('headerLink');
            $header.insertAdjacentHTML('afterbegin', `<a href="#${$header.id}" class="header-mark"></a>`);
        });
    }
}

function initToc() {
    const $tocCore = document.getElementById('TableOfContents');
    if ($tocCore === null) return;
    if (document.getElementById('toc-static').getAttribute('kept') || isTocStatic()) {
        const $tocContentStatic = document.getElementById('toc-content-static');
        if ($tocCore.parentElement !== $tocContentStatic) {
            $tocCore.parentElement.removeChild($tocCore);
            $tocContentStatic.appendChild($tocCore);
        }
        if (window._tocOnScroll) window.scrollEventSet.delete(window._tocOnScroll);
    } else {
        const $tocContentAuto = document.getElementById('toc-content-auto');
        if ($tocCore.parentElement !== $tocContentAuto) {
            $tocCore.parentElement.removeChild($tocCore);
            $tocContentAuto.appendChild($tocCore);
        }
        const $toc = document.getElementById('toc-auto');
        const $page = document.getElementsByClassName('page')[0];
        const rect = $page.getBoundingClientRect();
        $toc.style.left = `${rect.left + rect.width + 20}px`;
        $toc.style.maxWidth = `19%`;
        $toc.style.visibility = 'visible';
        const $tocLinkElements = $tocCore.querySelectorAll('a:first-child');
        const $tocLiElements = $tocCore.getElementsByTagName('li');
        const $headerLinkElements = document.getElementsByClassName('headerLink');
        const headerIsFixed = document.body.getAttribute('header-desktop') !== 'normal';
        const headerHeight = document.getElementById('header-desktop').offsetHeight;
        const TOP_SPACING = 20 + (headerIsFixed ? headerHeight : 0);
        const minTocTop = $toc.offsetTop;
        const minScrollTop = minTocTop - TOP_SPACING + (headerIsFixed ? 0 : headerHeight);
        window._tocOnScroll = (() => {
            const footerTop = document.getElementById('post-footer').offsetTop;
            const maxTocTop = footerTop - $toc.getBoundingClientRect().height;
            const maxScrollTop = maxTocTop - TOP_SPACING + (headerIsFixed ? 0 : headerHeight);
            if (window.newScrollTop < minScrollTop) {
                $toc.style.position = 'absolute';
                $toc.style.top = `${minTocTop}px`;
            } else if (window.newScrollTop > maxScrollTop) {
                $toc.style.position = 'absolute';
                $toc.style.top = `${maxTocTop}px`;
            } else {
                $toc.style.position = 'fixed';
                $toc.style.top = `${TOP_SPACING}px`;
            }

            forEach($tocLinkElements, $tocLink => { $tocLink.classList.remove('active'); });
            forEach($tocLiElements, $tocLi => { $tocLi.classList.remove('has-active'); });
            const INDEX_SPACING = 20 + (headerIsFixed ? headerHeight : 0);
            let activeTocIndex = $headerLinkElements.length - 1;
            for (let i = 0; i < $headerLinkElements.length - 1; i++) {
                const windowTop = $headerLinkElements[i].getBoundingClientRect().top;
                const nextTop = $headerLinkElements[i + 1].getBoundingClientRect().top;
                if ((i == 0 && windowTop > INDEX_SPACING)
                    || (windowTop <= INDEX_SPACING && nextTop > INDEX_SPACING)) {
                    activeTocIndex = i;
                    break;
                }
            }
            if (activeTocIndex >= 0 && activeTocIndex < $tocLinkElements.length) {
                $tocLinkElements[activeTocIndex].classList.add('active');
                let $parent = $tocLinkElements[activeTocIndex].parentElement;
                while ($parent !== $tocCore) {
                    $parent.classList.add('has-active');
                    $parent = $parent.parentElement.parentElement;
                }
            }
        });
        window._tocOnScroll();
        window.scrollEventSet.add(window._tocOnScroll);
    }
}

function initMath() {
    if (window.config.math) renderMathInElement(document.body, window.config.math);
}

function initMermaid() {
    const $mermaidElements = document.getElementsByClassName('mermaid');
    if ($mermaidElements.length) {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        forEach($mermaidElements, $mermaid => {
            mermaid.mermaidAPI.render('svg-' + $mermaid.id, window.data[$mermaid.id], svgCode => {
                $mermaid.insertAdjacentHTML('afterbegin', svgCode);
                document.getElementById('svg-' + $mermaid.id).children[0].remove();
            }, $mermaid);
        });
    }
}

function initEcharts() {
    window._echartsOnSwitchTheme = (() => {
        window._echartsArr = window._echartsArr || [];
        for (let i = 0; i < window._echartsArr.length; i++) {
            window._echartsArr[i].dispose();
        }
        window._echartsArr = [];
        forEach(document.getElementsByClassName('echarts'), $echarts => {
            const chart = echarts.init($echarts, window.isDark ? 'dark' : 'macarons', { renderer: 'svg' });
            chart.setOption(JSON.parse(window.data[$echarts.id]));
            window._echartsArr.push(chart);
        });
    });
    window.switchThemeEventSet.add(window._echartsOnSwitchTheme);
    window._echartsOnSwitchTheme();
    window._echartsOnResize = (() => {
        for (let i = 0; i < window._echartsArr.length; i++) {
            window._echartsArr[i].resize();
        }
    });
    window.resizeEventSet.add(window._echartsOnResize);
}

function initMapbox() {
    if (window.config.mapbox) {
        mapboxgl.accessToken = window.config.mapbox.accessToken;
        mapboxgl.setRTLTextPlugin(window.config.mapbox.RTLTextPlugin);
        window._mapboxArr = window._mapboxArr || [];
        forEach(document.getElementsByClassName('mapbox'), $mapbox => {
            const { lng, lat, zoom, lightStyle, darkStyle, marked, navigation, geolocate, scale, fullscreen } = window.data[$mapbox.id];
            const mapbox = new mapboxgl.Map({
                container: $mapbox,
                center: [lng, lat],
                zoom: zoom,
                minZoom: .2,
                style: window.isDark ? darkStyle : lightStyle,
                attributionControl: false,
            });
            if (marked) {
                new mapboxgl.Marker().setLngLat([lng, lat]).addTo(mapbox);
            }
            if (navigation) {
                mapbox.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
            }
            if (geolocate) {
                mapbox.addControl(new mapboxgl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true,
                    },
                    showUserLocation: true,
                    trackUserLocation: true,
                }), 'bottom-right');
            }
            if (scale) {
                mapbox.addControl(new mapboxgl.ScaleControl());
            }
            if (fullscreen) {
                mapbox.addControl(new mapboxgl.FullscreenControl());
            }
            mapbox.addControl(new MapboxLanguage());
            window._mapboxArr.push(mapbox);
        });
        window._mapboxOnSwitchTheme = (() => {
            forEach(window._mapboxArr, mapbox => {
                const $mapbox = mapbox.getContainer();
                const { lightStyle, darkStyle } = window.data[$mapbox.id];
                mapbox.setStyle(window.isDark ? darkStyle : lightStyle);
                mapbox.addControl(new MapboxLanguage());
            });
        });
        window.switchThemeEventSet.add(window._mapboxOnSwitchTheme);
    }
}

function initTypeit() {
    if (window.config.typeit) {
        const typeitConfig = window.config.typeit;
        const speed = typeitConfig.speed ? typeitConfig.speed : 100;
        const cursorSpeed = typeitConfig.cursorSpeed ? typeitConfig.cursorSpeed : 1000;
        const cursorChar = typeitConfig.cursorChar ? typeitConfig.cursorChar : '|';
        Object.values(typeitConfig.data).forEach(group => {
            const typeone = (i) => {
                const id = group[i];
                const instance = new TypeIt(`#${id}`, {
                    strings: window.data[id],
                    speed: speed,
                    lifeLike: true,
                    cursorSpeed: cursorSpeed,
                    cursorChar: cursorChar,
                    waitUntilVisible: true,
                    afterComplete: () => {
                        if (i === group.length - 1) {
                            if (typeitConfig.duration >= 0) window.setTimeout(() => {
                                instance.destroy();
                            }, typeitConfig.duration);
                            return;
                        }
                        instance.destroy();
                        typeone(i + 1);
                    },
                }).go();
            };
            typeone(0);
        });
    }
}

function initComment() {
    if (window.config.comment) {
        if (window.config.comment.gitalk) {
            window.config.comment.gitalk.body = decodeURI(window.location.href);
            const gitalk = new Gitalk(window.config.comment.gitalk);
            gitalk.render('gitalk');
        }
        if (window.config.comment.valine) new Valine(window.config.comment.valine);
        if (window.config.comment.waline) new Waline(window.config.comment.waline);
        if (window.config.comment.twikoo) twikoo.init(window.config.comment.twikoo);
        if (window.config.comment.utterances) {
            const utterancesConfig = window.config.comment.utterances;
            const script = document.createElement('script');
            script.src = 'https://utteranc.es/client.js';
            script.type = 'text/javascript';
            script.setAttribute('repo', utterancesConfig.repo);
            script.setAttribute('issue-term', utterancesConfig.issueTerm);
            if (utterancesConfig.label) script.setAttribute('label', utterancesConfig.label);
            script.setAttribute('theme', window.isDark ? utterancesConfig.darkTheme : utterancesConfig.lightTheme);
            script.crossOrigin = 'anonymous';
            script.async = true;
            document.getElementById('utterances').appendChild(script);
            window._utterancesOnSwitchTheme = (() => {
                const message = {
                    type: 'set-theme',
                    theme: window.isDark ? utterancesConfig.darkTheme : utterancesConfig.lightTheme,
                };
                const iframe = document.querySelector('.utterances-frame');
                iframe.contentWindow.postMessage(message, 'https://utteranc.es');
            });
            window.switchThemeEventSet.add(window._utterancesOnSwitchTheme);
        }
        if (window.config.comment.vssue) {
            let vssue = window.config.comment.vssue;
            new Vue({
                el: vssue.el,
                render: h => h('Vssue', {
                    props: {
                        title: vssue.title,
                        options: {
                            owner: vssue.owner,
                            repo: vssue.repo,
                            clientId: vssue.clientId,
                            clientSecret: vssue.clientSecret,
                        },
                    }
                })
            })
        }
    }
}

function initMeta() {
    function getMeta(metaName) {
        const metas = document.getElementsByTagName('meta');
        for (let i = 0; i < metas.length; i++) {
            if (metas[i].getAttribute('name') === metaName) {
                return metas[i];
            }
        }
        return '';
    }
    let themeColorMeta = getMeta('theme-color');
    if (window.isDark) {
        themeColorMeta.content = '#000000';
    } else {
        themeColorMeta.content = '#ffffff';
    }
    window._metaThemeColorOnSwitchTheme = (() => {
        if (window.isDark) {
            themeColorMeta.content = '#000000';
        } else {
            themeColorMeta.content = '#ffffff';
        }
    });
    window.switchThemeEventSet.add(window._metaThemeColorOnSwitchTheme);
}

function initCookieconsent() {
    if (window.config.cookieconsent) cookieconsent.initialise(window.config.cookieconsent);
}

function onScroll() {
    const $headers = [];
    const $viewComments = document.getElementById('view-comments');
    if (document.body.getAttribute('header-desktop') === 'auto') $headers.push(document.getElementById('header-desktop'));
    if (document.body.getAttribute('header-mobile') === 'auto') $headers.push(document.getElementById('header-mobile'));
    if (document.getElementById('comments')) {
        $viewComments.href = `#comments`;
        $viewComments.style.display = 'block';
    } else {
        $viewComments.style.display = 'null';
    }
    const $fixedButtons = document.getElementById('fixed-buttons');
    const ACCURACY = 20, MINIMUM = 100;
    function handleScrollEvent() {
        window.newScrollTop = getScrollTop();
        const scroll = window.newScrollTop - window.oldScrollTop;
        const isMobile = isMobileWindow();
        forEach($headers, $header => {
            if (scroll > ACCURACY) {
                $header.classList.remove('animate__fadeInDown');
                animateCSS($header, ['animate__fadeOutUp', 'animate__faster'], true);
            } else if (scroll < - ACCURACY || window.newScrollTop <= 20) {
                $header.classList.remove('animate__fadeOutUp');
                animateCSS($header, ['animate__fadeInDown', 'animate__faster'], true);
            }
        });
        if (window.newScrollTop > MINIMUM) {
            if (isMobile && scroll > ACCURACY) {
                $fixedButtons.classList.remove('animate__fadeIn');
                animateCSS($fixedButtons, ['animate__fadeOut', 'animate__faster'], true);
            } else if (!isMobile || scroll < - ACCURACY) {
                $fixedButtons.style.display = 'block';
                $fixedButtons.classList.remove('animate__fadeOut');
                animateCSS($fixedButtons, ['animate__fadeIn', 'animate__faster'], true);
            }
        } else {
            if (!isMobile) {
                $fixedButtons.classList.remove('animate__fadeIn');
                animateCSS($fixedButtons, ['animate__fadeOut', 'animate__faster'], true);
            }
            $fixedButtons.style.display = 'none';
        }
        for (let event of window.scrollEventSet) event();
        window.oldScrollTop = window.newScrollTop;
    }
    window.addEventListener('scroll', handleScrollEvent, false);
    document.addEventListener('pjax:send', function () {
        window.removeEventListener('scroll', handleScrollEvent);
    });
}

function onResize() {
    window.addEventListener('resize', () => {
        if (!window._resizeTimeout) {
            window._resizeTimeout = window.setTimeout(() => {
                window._resizeTimeout = null;
                for (let event of window.resizeEventSet) event();
                window.initToc();
                window.initMermaid();
                window.initSearch();
            }, 100);
        }
    }, false);
}

function onClickMask() {
    document.getElementById('mask').addEventListener('click', () => {
        for (let event of window.clickMaskEventSet) event();
        document.body.classList.remove('blur');
    }, false);
}


function initTagExplorer() {
    const explorer = document.querySelector('.tag-explorer');
    if (!explorer) return;

    const controls = explorer.querySelector('.tag-explorer-controls');
    const searchInput = explorer.querySelector('[data-tag-search]');
    const cards = Array.from(explorer.querySelectorAll('[data-tag-card]'));
    const filters = Array.from(explorer.querySelectorAll('[data-tag-filter]'));
    const resultCount = explorer.querySelector('[data-tag-result-count]');
    const empty = explorer.querySelector('[data-tag-empty]');
    let activeFilter = 'all';

    if (!controls || !searchInput || filters.length === 0 || cards.length === 0) return;

    const normalize = value => (value || '').trim().toLocaleLowerCase();
    const matchesFilter = card => activeFilter === 'all' || card.dataset.tagCategory === activeFilter;

    const update = () => {
        const query = normalize(searchInput && searchInput.value);
        let visibleCount = 0;
        cards.forEach(card => {
            const matched = matchesFilter(card) && normalize(card.dataset.tagName).includes(query);
            card.hidden = !matched;
            if (matched) visibleCount += 1;
        });
        if (resultCount) resultCount.textContent = visibleCount;
        if (empty) empty.hidden = visibleCount !== 0;
    };

    searchInput.addEventListener('input', update, false);
    filters.forEach(filter => {
        filter.addEventListener('click', () => {
            activeFilter = filter.dataset.tagFilter || 'all';
            filters.forEach(item => item.classList.toggle('active', item === filter));
            update();
        }, false);
    });

    searchInput.disabled = false;
    filters.forEach(filter => {
        filter.disabled = false;
    });
    controls.dataset.enhanced = 'true';
    controls.setAttribute('aria-disabled', 'false');
    explorer.classList.add('tag-explorer--ready');

    update();
}

function safeInit(name, fn) {
    try {
        if (typeof fn === 'function') fn();
    } catch (err) {
        console.error(`Failed to initialize ${name}:`, err);
    }
}

function init() {
    safeInit('page config', restorePjaxPageConfig);
    safeInit('core state', () => {
        window.data = window.config.data;
        window.isDark = document.body.getAttribute('theme') !== 'light';
        window.newScrollTop = getScrollTop();
        window.oldScrollTop = window.newScrollTop;
        window.scrollEventSet = new Set();
        window.resizeEventSet = new Set();
        window.switchThemeEventSet = new Set();
        window.clickMaskEventSet = new Set();
        window.pjaxSendEventSet = new Set();
    });
    safeInit('tag explorer', initTagExplorer);
    safeInit('object fit images', () => {
        if (window.objectFitImages) objectFitImages();
    });
    safeInit('SVG icons', initSVGIcon);
    safeInit('Twemoji', initTwemoji);
    safeInit('mobile menu', initMenuMobile);
    safeInit('theme switcher', initSwitchTheme);
    safeInit('theme selector', initSelectTheme);
    safeInit('meta', initMeta);
    safeInit('search', initSearch);
    safeInit('details', initDetails);
    safeInit('light gallery', initLightGallery);
    safeInit('footprint gallery', initFootprintGallery);
    safeInit('highlight', initHighlight);
    safeInit('table', initTable);
    safeInit('header links', initHeaderLink);
    safeInit('math', initMath);
    safeInit('Mermaid', initMermaid);
    safeInit('ECharts', initEcharts);
    safeInit('TypeIt', initTypeit);
    safeInit('Mapbox', initMapbox);
    safeInit('cookie consent', initCookieconsent);
    safeInit('table of contents', initToc);
    safeInit('comments', initComment);
    safeInit('scroll handler', onScroll);
    safeInit('resize handler', onResize);
    safeInit('click mask', onClickMask);
}

const themeInit = () => {
    init();
};

if (document.readyState !== 'loading') {
    themeInit();
} else {
    document.addEventListener('DOMContentLoaded', themeInit, false);
}

let pjax = new Pjax({
    selectors: [
        ".pjax-title",
        "main",
        ".menu-item",
        ".pjax-assets",
        "#fixed-buttons",
        ".search-dropdown"
    ]
})

document.addEventListener('pjax:success', function () {
    themeInit();
});

document.addEventListener('pjax:send', function () {
    for (let event of window.pjaxSendEventSet) event();
    for (let event of window.clickMaskEventSet) event();
    document.body.classList.remove('blur');
});

topbar.config({
    autoRun: true,
    barThickness: 3,
    barColors: {
        '0': '#55bde2'
    },
    shadowBlur: 0,
    shadowColor: 'rgba(0, 0, 0, .5)',
    className: 'topbar',
})
document.addEventListener('pjax:send', topbar.show);
document.addEventListener('pjax:complete', topbar.hide);
document.addEventListener('pjax:error', topbar.hide);
