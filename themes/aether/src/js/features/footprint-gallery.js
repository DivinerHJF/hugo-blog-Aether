(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const forEach = Aether.utils.forEach;
    const activeRoots = new WeakMap();

function getFootprintGalleryRoot(context) {
    const galleryConfig = context.config && context.config.footprintGallery;
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
            openFootprintPhotoSwipe(state, galleryState, galleryState.currentIndex, galleryState.slides[galleryState.currentIndex]);
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
        openFootprintPhotoSwipe(state, galleryState, index, slide, {
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
    const galleryConfig = state.context.config && state.context.config.footprintGallery;
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

function openFootprintPhotoSwipe(state, galleryState, index, trigger, point) {
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

function destroyFootprintGalleries(state) {
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

function initFootprintGallery(context) {
    const root = getFootprintGalleryRoot(context);
    if (!root) return Aether.utils.noop;
    const existingState = activeRoots.get(root);
    if (existingState && !existingState.destroyed) return Aether.utils.noop;
    const state = {
        root,
        context,
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
    activeRoots.set(root, state);
    return () => {
        destroyFootprintGalleries(state);
        if (activeRoots.get(root) === state) activeRoots.delete(root);
    };
}

    modules.footprintGallery = {
        name: 'footprint-gallery',
        selector: '[data-footprint-category="travel"]',
        init: initFootprintGallery,
    };
})(window);
