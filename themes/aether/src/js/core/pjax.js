(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const noop = Aether.utils.noop;

    const selectors = [
        '.pjax-title',
        'main',
        '.menu-item',
        '.pjax-assets',
        '#fixed-buttons',
    ];

    function focusMain() {
        const main = document.querySelector('main');
        if (!main) return;
        main.setAttribute('tabindex', '-1');
        try {
            main.focus({ preventScroll: true });
        } catch (error) {
            main.focus();
        }
    }

    function announceRoute(context) {
        const announcer = document.getElementById('route-announcer');
        if (!announcer) return;
        const title = document.querySelector('.pjax-title');
        const message = title && title.textContent.trim() ? `已进入：${title.textContent.trim()}` : '页面已更新';
        announcer.textContent = '';
        if (context.state.announcementTimer) root.clearTimeout(context.state.announcementTimer);
        context.state.announcementTimer = root.setTimeout(() => {
            announcer.textContent = message;
            context.state.announcementTimer = null;
        }, 50);
    }

    modules.pjax = {
        name: 'pjax',
        init(context) {
            if (typeof root.Pjax !== 'function') {
                console.warn('Pjax is unavailable; continuing with full page navigation.');
                return noop;
            }

            const pjax = new root.Pjax({
                selectors,
                // New links go to the top, popstate restores history, and Pjax
                // handles a URL hash by scrolling to its target element.
                scrollTo: true,
                scrollRestoration: true,
            });
            const onSend = () => {
                if (context.pageContext && context.pageContext.emit) {
                    context.pageContext.emit(context.pageContext.events.pjaxSend);
                    context.pageContext.emit(context.pageContext.events.mask);
                }
                if (typeof context.onPageSend === 'function') context.onPageSend();
                document.body.classList.remove('blur');
            };
            const onSuccess = () => {
                if (typeof context.onPageSuccess === 'function') context.onPageSuccess();
                focusMain();
                announceRoute(context);
            };

            context.listen(document, 'pjax:send', onSend);
            context.listen(document, 'pjax:success', onSuccess);

            if (root.topbar && typeof root.topbar.config === 'function') {
                root.topbar.config({
                    autoRun: true,
                    barThickness: 3,
                    barColors: { '0': '#55bde2' },
                    shadowBlur: 0,
                    shadowColor: 'rgba(0, 0, 0, .5)',
                    className: 'topbar',
                });
                if (typeof root.topbar.show === 'function') context.listen(document, 'pjax:send', root.topbar.show);
                if (typeof root.topbar.hide === 'function') {
                    context.listen(document, 'pjax:complete', root.topbar.hide);
                    context.listen(document, 'pjax:error', root.topbar.hide);
                }
            }

            return () => {
                if (context.state.announcementTimer) root.clearTimeout(context.state.announcementTimer);
                if (pjax && typeof pjax.destroy === 'function') pjax.destroy();
            };
        },
    };
})(window);
