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
        '.search-dropdown',
    ];

    modules.pjax = {
        name: 'pjax',
        init(context) {
            if (typeof root.Pjax !== 'function') {
                console.warn('Pjax is unavailable; continuing with full page navigation.');
                return noop;
            }

            const pjax = new root.Pjax({ selectors });
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
                if (pjax && typeof pjax.destroy === 'function') pjax.destroy();
            };
        },
    };
})(window);
