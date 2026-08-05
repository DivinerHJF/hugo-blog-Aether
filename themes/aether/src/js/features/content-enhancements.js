(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const utils = Aether.utils;
    const forEach = utils.forEach;

    function initObjectFit(context) {
        if (context.config.compatibility && context.config.compatibility.objectFit && root.objectFitImages) root.objectFitImages();
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

    function initDetails(context) {
        forEach(document.getElementsByClassName('details'), details => {
            const summary = details.getElementsByClassName('details-summary')[0];
            if (summary) context.listen(summary, 'click', () => details.classList.toggle('open'));
        });
        return utils.noop;
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
                copy.setAttribute('data-clipboard-text', code.innerText);
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

    function initTable() {
        forEach(document.querySelectorAll('.content table'), table => {
            if (table.parentElement && table.parentElement.classList.contains('table-wrapper')) return;
            const wrapper = document.createElement('div');
            wrapper.className = 'table-wrapper';
            table.parentElement.replaceChild(wrapper, table);
            wrapper.appendChild(table);
        });
        return utils.noop;
    }

    function initHeaderLink() {
        for (let level = 1; level <= 6; level += 1) {
            forEach(document.querySelectorAll(`.single .content > h${level}`), header => {
                header.classList.add('headerLink');
                if (!header.querySelector('.header-mark')) header.insertAdjacentHTML('afterbegin', `<a href="#${header.id}" class="header-mark"></a>`);
            });
        }
        return utils.noop;
    }

    const features = [
        { name: 'object fit images', init: initObjectFit },
        { name: 'SVG icons', init: initSVGIcon },
        { name: 'Twemoji', init: initTwemoji },
        { name: 'details', init: initDetails },
        { name: 'highlight', init: initHighlight },
        { name: 'table', init: initTable },
        { name: 'header links', init: initHeaderLink },
    ];

    modules.contentEnhancements = {
        name: 'content-enhancements',
        init(context) {
            features.forEach(feature => utils.safeInit(feature.name, feature.init, context));
            return utils.noop;
        },
    };
})(window);
