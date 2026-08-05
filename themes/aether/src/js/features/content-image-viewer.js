(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const activeRoots = new WeakMap();
    const IMAGE_EXTENSION = /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i;

    function getContentRoot(context) {
        const config = context.config && context.config.contentImageViewer;
        if (!config || !config.enabled) return null;
        const content = document.querySelector('.single .content');
        if (!content || content.closest('.footprint-page[data-footprint-category="travel"]')) return null;
        return content;
    }

    function toAbsoluteURL(value) {
        if (!modules.photoSwipe.isUsableURL(value)) return '';
        try {
            const url = new root.URL(value, document.baseURI);
            url.hash = '';
            return url.href;
        } catch (error) {
            return value.trim();
        }
    }

    function getImageCandidates(image) {
        return [
            image && image.getAttribute('data-pswp-src'),
            image && image.currentSrc,
            image && image.getAttribute('src'),
            image && image.getAttribute('data-src'),
        ].filter(modules.photoSwipe.isUsableURL);
    }

    function isSameImageURL(left, right) {
        const leftURL = toAbsoluteURL(left);
        const rightURL = toAbsoluteURL(right);
        return leftURL !== '' && leftURL === rightURL;
    }

    function isExcludedImage(image) {
        return image.matches([
            '.icon',
            '.emoji',
            '.logo',
            '.avatar',
            '.badge',
            '.no-lightbox',
            '[data-no-lightbox]',
        ].join(',')) || Boolean(image.closest('.footprint-gallery, [data-footprint-gallery], pre, code'));
    }

    function isEligibleImageLink(link, image) {
        if (!link) return true;
        if (link.hasAttribute('data-image-link')) return true;
        const href = link.getAttribute('href');
        if (!modules.photoSwipe.isUsableURL(href)) return false;
        if (getImageCandidates(image).some(candidate => isSameImageURL(href, candidate))) return true;
        return IMAGE_EXTENSION.test(href);
    }

    function resolveImageSource(image, link) {
        const candidates = [];
        if (link && link.hasAttribute('data-image-link')) candidates.push(link.getAttribute('href'));
        if (link && IMAGE_EXTENSION.test(link.getAttribute('href') || '')) candidates.push(link.getAttribute('href'));
        candidates.push(...getImageCandidates(image));
        return candidates.find(modules.photoSwipe.isUsableURL) || '';
    }

    function getCaption(image) {
        const explicitCaption = image.getAttribute('data-content-image-caption');
        if (explicitCaption) return explicitCaption.trim();
        const figure = image.closest('figure');
        const caption = figure && figure.querySelector('figcaption.image-caption');
        return caption ? caption.textContent.trim() : '';
    }

    function prepareImage(image, content) {
        if (isExcludedImage(image)) return null;
        const existingLink = image.closest('a');
        if (existingLink && !content.contains(existingLink)) return null;
        if (existingLink && !isEligibleImageLink(existingLink, image)) return null;

        const source = resolveImageSource(image, existingLink);
        if (!modules.photoSwipe.isUsableURL(source)) return null;

        const link = existingLink || document.createElement('a');
        if (!existingLink) {
            link.href = source;
            image.parentNode.insertBefore(link, image);
            link.appendChild(image);
        }
        link.classList.add('content-image-viewer__item');
        link.dataset.contentImageViewerReady = 'true';
        link.dataset.contentImage = 'true';
        if (!link.dataset.pswpSrc) link.dataset.pswpSrc = source;
        const srcset = image.getAttribute('srcset') || image.getAttribute('data-srcset');
        if (srcset && !link.dataset.pswpSrcset) link.dataset.pswpSrcset = srcset;
        link.setAttribute('aria-label', image.getAttribute('alt') ? `查看图片：${image.getAttribute('alt')}` : '查看图片');
        return link;
    }

    function collectTriggers(content) {
        const triggers = [];
        const seen = new Set();
        utils.forEach(content.querySelectorAll('img'), image => {
            const trigger = prepareImage(image, content);
            if (trigger && !seen.has(trigger)) {
                seen.add(trigger);
                triggers.push(trigger);
            }
        });
        return triggers;
    }

    function buildSlide(trigger, index) {
        const image = trigger.querySelector('img');
        const source = trigger.dataset.pswpSrc || trigger.getAttribute('href');
        if (!image || !modules.photoSwipe.isUsableURL(source)) return Promise.reject(new Error('Image source unavailable'));
        return modules.photoSwipe.loadDimensions(source, trigger, image).then(dimensions => {
            const thumbnail = image.currentSrc || image.getAttribute('src') || image.getAttribute('data-src');
            const srcset = trigger.dataset.pswpSrcset || image.getAttribute('srcset') || image.getAttribute('data-srcset');
            const item = {
                src: source,
                width: dimensions.width,
                height: dimensions.height,
                alt: image.getAttribute('alt') || '',
                title: getCaption(image),
                msrc: modules.photoSwipe.isUsableURL(thumbnail) ? thumbnail : source,
                contentImageIndex: index,
                element: image,
            };
            if (srcset) item.srcset = srcset;
            return item;
        });
    }

    function focusTrigger(trigger) {
        if (!trigger || !document.documentElement.contains(trigger)) return;
        try {
            trigger.focus({ preventScroll: true });
        } catch (error) {
            trigger.focus();
        }
    }

    function openViewer(state, index, trigger, point) {
        if (state.destroyed || state.opening || !trigger) return;
        state.opening = true;
        state.activeTrigger = trigger;
        Promise.all(state.triggers.map((item, itemIndex) => {
            return buildSlide(item, itemIndex)
                .then(slide => ({ index: itemIndex, slide }))
                .catch(error => ({ index: itemIndex, error }));
        })).then(results => {
            if (state.destroyed) return null;
            const valid = results.filter(result => result.slide);
            const selected = results.find(result => result.index === index && result.slide);
            if (!selected || !valid.length) throw new Error('Selected image dimensions unavailable');
            const dataSource = valid.map(result => result.slide);
            const startIndex = dataSource.findIndex(slide => slide.contentImageIndex === selected.index);
            if (startIndex < 0) throw new Error('Selected image not found in article gallery');
            const lightboxPromise = state.lightbox
                ? Promise.resolve(state.lightbox)
                : modules.photoSwipe.createLightbox(state.context).then(lightbox => {
                    state.lightbox = lightbox;
                    lightbox.on('destroy', () => {
                        if (!state.destroyed) {
                            const activeTrigger = state.activeTrigger;
                            state.activeTrigger = null;
                            focusTrigger(activeTrigger);
                        }
                    });
                    return lightbox;
                });
            return lightboxPromise.then(lightbox => {
                if (state.destroyed) return null;
                if (point && typeof point.x === 'number' && typeof point.y === 'number') {
                    lightbox.loadAndOpen(startIndex, dataSource, point);
                } else {
                    lightbox.loadAndOpen(startIndex, dataSource);
                }
                return lightbox;
            });
        }).catch(error => {
            if (state.destroyed) return;
            console.warn('Falling back to the original article image link:', error);
            window.location.assign(trigger.getAttribute('href') || trigger.dataset.pswpSrc);
            state.activeTrigger = null;
        }).then(() => {
            state.opening = false;
        });
    }

    function initContentImageViewer(context) {
        const content = getContentRoot(context);
        if (!content) return utils.noop;
        const existingState = activeRoots.get(content);
        if (existingState && !existingState.destroyed) return utils.noop;

        const triggers = collectTriggers(content);
        if (!triggers.length) return utils.noop;

        const state = {
            context,
            content,
            triggers,
            lightbox: null,
            activeTrigger: null,
            opening: false,
            destroyed: false,
        };
        const onClick = event => {
            if (event.button && event.button !== 0) return;
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const trigger = event.target.closest('[data-content-image-viewer-ready="true"]');
            if (!trigger || !content.contains(trigger)) return;
            const index = triggers.indexOf(trigger);
            if (index < 0) return;
            event.preventDefault();
            openViewer(state, index, trigger, { x: event.clientX, y: event.clientY });
        };
        context.listen(content, 'click', onClick, false);
        activeRoots.set(content, state);

        return () => {
            state.destroyed = true;
            if (state.lightbox) state.lightbox.destroy();
            if (activeRoots.get(content) === state) activeRoots.delete(content);
        };
    }

    modules.contentImageViewer = {
        name: 'content-image-viewer',
        selector: '.single .content',
        init: initContentImageViewer,
    };
})(window);
