(function (root) {
    'use strict';

    const Aether = root.Aether;
    const modules = Aether.modules;
    const forEach = Aether.utils.forEach;

    function restorePageConfig() {
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
                if (config && typeof config === 'object') root.config = config;
            } catch (error) {
                console.warn('Unable to restore the current page config after PJAX:', error);
            }
        });
    }

    modules.config = {
        name: 'page-config',
        init(context) {
            restorePageConfig();
            context.config = root.config || {};
            context.data = context.config.data || {};
            return Aether.utils.noop;
        },
    };
})(window);
