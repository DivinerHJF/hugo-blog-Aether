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
    const PLACEHOLDER_SOURCE = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

    function isUsableURL(value) {
        if (!value) return false;
        const url = value.trim();
        return url !== '' && url !== '#' && !/^(?:data|javascript|about):/i.test(url);
    }

    function shouldReduceMotion() {
        return root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function getLightboxAppearance() {
        const theme = (document.body && document.body.getAttribute('theme')) || 'light';
        const appearances = {
            light: {
                bgOpacity: 0.78,
                mainClass: 'aether-pswp aether-pswp--light',
            },
            dark: {
                bgOpacity: 0.84,
                mainClass: 'aether-pswp aether-pswp--dark',
            },
            black: {
                bgOpacity: 0.88,
                mainClass: 'aether-pswp aether-pswp--black',
            },
        };
        return appearances[theme] || appearances.light;
    }

    function getLightboxPadding(viewport) {
        if (viewport.x < 680) {
            return {
                top: 56,
                bottom: 68,
                left: 10,
                right: 10,
            };
        }
        return {
            top: 64,
            bottom: 76,
            left: 56,
            right: 56,
        };
    }

    function applyLightboxAppearance(lightbox) {
        const appearance = getLightboxAppearance();
        const reducedMotion = shouldReduceMotion();
        if (!lightbox || !lightbox.options) return appearance;
        Object.assign(lightbox.options, {
            mainClass: appearance.mainClass,
            bgOpacity: appearance.bgOpacity,
            showHideAnimationType: reducedMotion ? 'none' : 'zoom',
            showAnimationDuration: reducedMotion ? 0 : 280,
            hideAnimationDuration: reducedMotion ? 0 : 225,
            zoomAnimationDuration: reducedMotion ? 0 : 260,
        });
        const pswp = lightbox.pswp;
        if (pswp && pswp.element) {
            pswp.element.classList.remove('aether-pswp', 'aether-pswp--light', 'aether-pswp--dark', 'aether-pswp--black');
            appearance.mainClass.split(' ').forEach(className => pswp.element.classList.add(className));
            pswp.options.bgOpacity = appearance.bgOpacity;
            if (pswp.bg) pswp.bg.style.opacity = String(pswp.bgOpacity * appearance.bgOpacity);
        }
        return appearance;
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

    function createPlaceholderSlide(index, metadata) {
        return Object.assign({
            src: PLACEHOLDER_SOURCE,
            width: 1,
            height: 1,
            alt: '',
            msrc: PLACEHOLDER_SOURCE,
            placeholder: true,
            index,
        }, metadata || {});
    }

    function updateSlide(lightbox, dataSource, index, item) {
        const pswp = lightbox && lightbox.pswp;
        if (!pswp || pswp.options.dataSource !== dataSource) return false;
        pswp.options.dataSource[index] = item;
        if (typeof pswp.refreshSlideContent === 'function') pswp.refreshSlideContent(index);
        return true;
    }

    function setDataLoading(lightbox, isLoading, dataSource) {
        const pswp = lightbox && lightbox.pswp;
        if (!pswp || !pswp.element) return;
        if (dataSource && pswp.options.dataSource !== dataSource) return;
        pswp.element.classList.toggle('aether-pswp--data-loading', Boolean(isLoading));
        pswp.options.allowPanToNext = !isLoading;
        pswp.element.querySelectorAll('.pswp__button--arrow').forEach(button => {
            button.disabled = Boolean(isLoading);
        });
    }

    function scheduleIdle(callback) {
        let cancelled = false;
        let handle = null;
        const run = deadline => {
            if (!cancelled) callback(deadline);
        };
        if (typeof root.requestIdleCallback === 'function') {
            handle = { type: 'idle', value: root.requestIdleCallback(run, { timeout: 1000 }) };
        } else {
            handle = { type: 'timeout', value: root.setTimeout(run, 100) };
        }
        return () => {
            cancelled = true;
            if (!handle) return;
            if (handle.type === 'idle' && typeof root.cancelIdleCallback === 'function') {
                root.cancelIdleCallback(handle.value);
            } else if (handle.type === 'timeout') {
                root.clearTimeout(handle.value);
            }
            handle = null;
        };
    }

    function positionCaption(element, pswp) {
        if (!element || element.hidden || !pswp || !pswp.element) return;
        const image = pswp.element.querySelector('.pswp__item[aria-hidden="false"] .pswp__img') || pswp.element.querySelector('.pswp__img');
        if (!image) return;

        const rootRect = pswp.element.getBoundingClientRect();
        const imageRect = image.getBoundingClientRect();
        const isMobile = root.matchMedia && root.matchMedia('(max-width: 680px)').matches;
        const safeInline = isMobile ? 10 : 56;
        const rootFontSize = parseFloat(root.getComputedStyle(document.documentElement).fontSize) || 16;
        const maxCaptionWidth = Math.min(
            44 * rootFontSize,
            Math.max(0, rootRect.width - (safeInline * 2)),
        );
        const captionWidth = Math.min(imageRect.width, maxCaptionWidth);
        if (!rootRect.width || !imageRect.width || !captionWidth) return;

        const imageCenter = imageRect.left - rootRect.left + (imageRect.width / 2);
        const minLeft = safeInline;
        const maxLeft = rootRect.width - safeInline - captionWidth;
        const captionLeft = Math.min(
            Math.max(imageCenter - (captionWidth / 2), minLeft),
            maxLeft,
        );

        // Use explicit geometry instead of transform-based centering. Motion
        // preferences are then free to disable transforms without moving the
        // caption, and narrow viewports stay aligned with the visible image.
        element.style.right = 'auto';
        element.style.left = `${captionLeft}px`;
        element.style.width = `${captionWidth}px`;
        element.style.maxWidth = 'none';
        element.style.margin = '0';
        element.style.transform = 'none';

        const captionRect = element.getBoundingClientRect();
        if (!rootRect.height || !imageRect.height || !captionRect.height) return;

        const gap = 12;
        const safeTop = 12;
        const safeBottom = isMobile ? 16 : 18;
        const imageBottom = imageRect.bottom - rootRect.top;
        const imageTop = imageRect.top - rootRect.top;
        const desiredTop = imageBottom + gap;
        const maxTop = rootRect.height - safeBottom - captionRect.height;
        const topSpace = imageTop - captionRect.height - gap;

        if (desiredTop <= maxTop) {
            element.style.top = `${desiredTop}px`;
            element.style.bottom = 'auto';
        } else if (topSpace >= safeTop) {
            element.style.top = `${topSpace}px`;
            element.style.bottom = 'auto';
        } else {
            // Very tall images leave no room below or above. Keep the caption in
            // the safe bottom area instead of letting it leave the viewport.
            element.style.top = 'auto';
            element.style.bottom = 'var(--aether-pswp-caption-safe-bottom)';
        }
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
                    let frame = 0;
                    const cancelFrame = () => {
                        if (!frame) return;
                        if (typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(frame);
                        else root.clearTimeout(frame);
                        frame = 0;
                    };
                    const schedulePosition = () => {
                        if (frame || element.hidden) return;
                        const updatePosition = () => {
                            frame = 0;
                            positionCaption(element, pswp);
                        };
                        frame = typeof root.requestAnimationFrame === 'function'
                            ? root.requestAnimationFrame(updatePosition)
                            : root.setTimeout(updatePosition, 0);
                    };
                    const update = () => {
                        const data = pswp.currSlide && pswp.currSlide.data;
                        const caption = data && data.title ? String(data.title).trim() : '';
                        element.textContent = caption;
                        element.hidden = !caption;
                        schedulePosition();
                    };
                    pswp.on('change', update);
                    pswp.on('resize', schedulePosition);
                    pswp.on('zoomPanUpdate', schedulePosition);
                    pswp.on('initialZoomInEnd', schedulePosition);
                    pswp.on('openingAnimationEnd', schedulePosition);
                    pswp.on('destroy', cancelFrame);
                    update();
                },
            });
        });
    }

    function setPhotoViewerOpen(isOpen) {
        if (document.documentElement) {
            document.documentElement.classList.toggle('aether-photo-viewer-open', isOpen);
        }
    }

    function createLightbox(context, options, configure) {
        return load(context).then(loaded => {
            const appearance = getLightboxAppearance();
            const reducedMotion = shouldReduceMotion();
            const lightbox = new loaded.PhotoSwipeLightbox(Object.assign({
                dataSource: [],
                pswpModule: loaded.PhotoSwipe,
                mainClass: appearance.mainClass,
                bgOpacity: appearance.bgOpacity,
                showHideAnimationType: reducedMotion ? 'none' : 'zoom',
                showAnimationDuration: reducedMotion ? 0 : 280,
                hideAnimationDuration: reducedMotion ? 0 : 225,
                zoomAnimationDuration: reducedMotion ? 0 : 260,
                easing: 'cubic-bezier(.22, .8, .2, 1)',
                spacing: 0.06,
                initialZoomLevel: 'fit',
                secondaryZoomLevel: 1,
                maxZoomLevel: 3,
                imageClickAction: 'zoom',
                bgClickAction: 'close',
                tapAction: 'toggle-controls',
                doubleTapAction: 'zoom',
                paddingFn: getLightboxPadding,
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
            lightbox.on('beforeOpen', () => setPhotoViewerOpen(true));
            lightbox.on('close', () => setPhotoViewerOpen(false));
            lightbox.on('destroy', () => setPhotoViewerOpen(false));
            if (typeof configure === 'function') configure(lightbox);
            applyLightboxAppearance(lightbox);
            if (context && context.events && context.events.theme) {
                const updateAppearance = () => applyLightboxAppearance(lightbox);
                context.events.theme.add(updateAppearance);
                if (typeof context.addCleanup === 'function') {
                    context.addCleanup(() => context.events.theme.delete(updateAppearance));
                }
            }
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
        getLightboxAppearance,
        applyLightboxAppearance,
        createPlaceholderSlide,
        updateSlide,
        setDataLoading,
        scheduleIdle,
        createLightbox,
    };
})(window);
