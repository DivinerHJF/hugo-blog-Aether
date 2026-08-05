(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const shared = Aether.photoSwipe = Aether.photoSwipe || {
        moduleKey: '',
        modulePromise: null,
        dimensionsCache: new Map(),
    };

    function isUsableURL(value) {
        if (!value) return false;
        const url = value.trim();
        return url !== '' && url !== '#' && !/^(?:data|javascript|about):/i.test(url);
    }

    function shouldReduceMotion() {
        return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function readDimension(element, attribute) {
        if (!element) return '';
        return element.getAttribute(`data-pswp-${attribute}`) || element.getAttribute(attribute) || '';
    }

    function readDimensions(trigger, image) {
        const declaredWidth = Number(readDimension(trigger, 'width') || readDimension(image, 'width'));
        const declaredHeight = Number(readDimension(trigger, 'height') || readDimension(image, 'height'));
        if (declaredWidth > 0 && declaredHeight > 0) return { width: declaredWidth, height: declaredHeight };
        if (image && image.naturalWidth > 0 && image.naturalHeight > 0) {
            return { width: image.naturalWidth, height: image.naturalHeight };
        }
        return null;
    }

    function loadDimensions(source, trigger, image) {
        const cached = shared.dimensionsCache.get(source);
        if (cached) return cached;

        const existingDimensions = readDimensions(trigger, image);
        if (existingDimensions) {
            const immediate = Promise.resolve(existingDimensions);
            shared.dimensionsCache.set(source, immediate);
            return immediate;
        }

        const promise = new Promise((resolve, reject) => {
            const probe = new root.Image();
            let settled = false;
            const timeout = root.setTimeout(() => finish(new Error('Image dimensions timed out')), 5000);
            const finish = (error, dimensions) => {
                if (settled) return;
                settled = true;
                root.clearTimeout(timeout);
                if (error) reject(error);
                else resolve(dimensions);
            };
            probe.onload = () => {
                if (probe.naturalWidth > 0 && probe.naturalHeight > 0) {
                    finish(null, { width: probe.naturalWidth, height: probe.naturalHeight });
                } else {
                    finish(new Error('Image dimensions unavailable'));
                }
            };
            probe.onerror = () => finish(new Error('Image failed to load'));
            probe.src = source;
        });
        const tracked = promise.then(
            dimensions => dimensions,
            error => {
                shared.dimensionsCache.delete(source);
                throw error;
            },
        );
        shared.dimensionsCache.set(source, tracked);
        return tracked;
    }

    function getConfig(context) {
        return context && context.config && context.config.photoSwipe;
    }

    function load(context) {
        const config = getConfig(context);
        if (!config || !config.lightboxModuleURL || !config.coreModuleURL) {
            return Promise.reject(new Error('PhotoSwipe module URLs are not configured'));
        }
        const moduleKey = `${config.lightboxModuleURL}|${config.coreModuleURL}`;
        if (shared.modulePromise && shared.moduleKey === moduleKey) return shared.modulePromise;

        shared.moduleKey = moduleKey;
        shared.modulePromise = Promise.all([
            import(config.lightboxModuleURL),
            import(config.coreModuleURL),
        ]).then(imports => ({
            PhotoSwipeLightbox: imports[0].default,
            PhotoSwipe: imports[1].default,
        })).catch(error => {
            if (shared.moduleKey === moduleKey) {
                shared.moduleKey = '';
                shared.modulePromise = null;
            }
            throw error;
        });
        return shared.modulePromise;
    }

    function registerCaption(lightbox) {
        lightbox.on('uiRegister', () => {
            if (!lightbox.pswp || !lightbox.pswp.ui) return;
            lightbox.pswp.ui.registerElement({
                name: 'aether-caption',
                order: 9,
                isButton: false,
                appendTo: 'root',
                html: '',
                onInit: (element, pswp) => {
                    element.className = 'pswp__custom-caption';
                    element.setAttribute('aria-live', 'polite');
                    const update = () => {
                        const data = pswp.currSlide && pswp.currSlide.data;
                        const caption = data && data.title ? String(data.title).trim() : '';
                        element.textContent = caption;
                        element.hidden = !caption;
                    };
                    pswp.on('change', update);
                    update();
                },
            });
        });
    }

    function createLightbox(context, options, configure) {
        return load(context).then(loaded => {
            const lightbox = new loaded.PhotoSwipeLightbox(Object.assign({
                dataSource: [],
                pswpModule: loaded.PhotoSwipe,
                showHideAnimationType: shouldReduceMotion() ? 'none' : 'fade',
                bgClickAction: 'close',
                closeOnVerticalDrag: true,
                escKey: true,
                loop: false,
                returnFocus: false,
                wheelToZoom: true,
                closeTitle: '关闭',
                arrowPrevTitle: '上一张',
                arrowNextTitle: '下一张',
                zoomTitle: '缩放',
            }, options || {}));
            registerCaption(lightbox);
            if (typeof configure === 'function') configure(lightbox);
            lightbox.init();
            return lightbox;
        });
    }

    modules.photoSwipe = {
        name: 'photoswipe',
        init() {
            return utils.noop;
        },
        isUsableURL,
        load,
        loadDimensions,
        createLightbox,
    };
})(window);
