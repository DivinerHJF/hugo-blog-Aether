(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;

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

    modules.toc = {
        name: 'table-of-contents',
        init: initToc,
    };
})(window);
